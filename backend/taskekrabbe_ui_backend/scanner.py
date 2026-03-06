"""Task & workflow discovery via runtime import and introspection."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

from taskekrabbe.task import Task, get_input_type, get_output_type
from taskekrabbe.workflow import Workflow
from taskekrabbe.yaml_config import YamlWorkflowConfig

from taskekrabbe_ui_backend.models import (
    ExistingWorkflow,
    FieldInfo,
    ScanResponse,
    TaskInfo,
    WorkflowNodeDef,
)


def _extract_fields(model_cls: type[BaseModel]) -> list[FieldInfo]:
    """Extract field info from a Pydantic model class."""
    fields = []
    for name, field in model_cls.model_fields.items():
        annotation = field.annotation
        type_name = getattr(annotation, "__name__", str(annotation)) if annotation else "Any"
        fields.append(
            FieldInfo(
                name=name,
                type_name=type_name,
                required=field.is_required(),
                default=field.default if not field.is_required() else None,
            )
        )
    return fields


def _type_name(tp: type) -> str:
    """Get a human-readable type name."""
    return getattr(tp, "__name__", str(tp))


def _task_import_path(task_cls: type[Task[Any, Any]], module_name: str) -> str:
    """Build a dotted import path for a task class."""
    return f"{module_name}.{task_cls.__name__}"


def _inspect_task(task_cls: type[Task[Any, Any]], module_name: str) -> TaskInfo:
    """Build a TaskInfo from a Task subclass."""
    input_type = get_input_type(task_cls)
    output_type = get_output_type(task_cls)
    return TaskInfo(
        name=task_cls.name,
        import_path=_task_import_path(task_cls, module_name),
        input_type_name=_type_name(input_type),
        input_fields=_extract_fields(input_type),
        output_type_name=_type_name(output_type),
        output_fields=_extract_fields(output_type),
        timeout_seconds=task_cls.timeout_seconds,
    )


def _extract_workflow_nodes(workflow: Workflow) -> list[WorkflowNodeDef]:
    """Extract WorkflowNodeDef list from a built Workflow."""
    nodes = []
    for task_name, task_cls in workflow.topological_order():
        deps = workflow.get_dependencies(task_name)
        config_fields = list(workflow.get_config_fields(task_name)) or None

        # Convert stored deps to serializable format
        depends_on: str | list[str] | dict[str, str | list[str]] | None = None
        if deps is None:
            depends_on = None
        elif isinstance(deps, str):
            depends_on = deps
        elif isinstance(deps, tuple):
            depends_on = list(deps)
        elif isinstance(deps, dict):
            depends_on = {}
            for field, ref in deps.items():
                if isinstance(ref, tuple):
                    depends_on[field] = list(ref)
                else:
                    depends_on[field] = ref

        # Use custom name if it differs from the class name
        instance_name = task_name if task_name != task_cls.__name__ else None

        # Build import path from the task class module
        module = task_cls.__module__
        import_path = f"{module}.{task_cls.__name__}"

        nodes.append(
            WorkflowNodeDef(
                task_import_path=import_path,
                instance_name=instance_name,
                depends_on=depends_on,
                config_fields=config_fields,
            )
        )
    return nodes


def scan_directory(directory: Path) -> ScanResponse:
    """Scan a directory for Task subclasses and workflows.

    1. Temporarily add directory to sys.path
    2. Walk for .py files and import each module
    3. Find all concrete Task subclasses
    4. Walk for .yaml files and try parsing as YamlWorkflowConfig
    5. Find Workflow instances in imported modules
    """
    directory = directory.resolve()
    tasks: list[TaskInfo] = []
    workflows: list[ExistingWorkflow] = []
    seen_tasks: set[str] = set()
    seen_workflow_names: set[str] = set()

    # Temporarily add directory to sys.path
    added_to_path = False
    if str(directory) not in sys.path:
        sys.path.insert(0, str(directory))
        added_to_path = True

    # Also add parent directory for relative imports
    parent = str(directory.parent)
    added_parent = False
    if parent not in sys.path:
        sys.path.insert(0, parent)
        added_parent = True

    try:
        # Walk .py files
        imported_modules: list[str] = []
        for py_file in sorted(directory.rglob("*.py")):
            if py_file.name.startswith("_"):
                continue
            # Build module name relative to directory
            rel = py_file.relative_to(directory)
            module_name = str(rel.with_suffix("")).replace("/", ".").replace("\\", ".")

            try:
                # Evict cached module so we always import from the target directory
                if module_name in sys.modules:
                    del sys.modules[module_name]
                module = importlib.import_module(module_name)
                imported_modules.append(module_name)
            except Exception:
                continue

            # Find Task subclasses
            for attr_name in dir(module):
                obj = getattr(module, attr_name)
                if (
                    isinstance(obj, type)
                    and issubclass(obj, Task)
                    and obj is not Task
                    and not getattr(obj, "__abstractmethods__", set())
                    and obj.__module__ == module.__name__
                ):
                    import_path = _task_import_path(obj, module_name)
                    if import_path not in seen_tasks:
                        seen_tasks.add(import_path)
                        try:
                            task_info = _inspect_task(obj, module_name)
                            tasks.append(task_info)
                        except TypeError:
                            # Can't resolve type args — skip
                            pass

            # Find Workflow instances
            for attr_name in dir(module):
                obj = getattr(module, attr_name)
                if isinstance(obj, Workflow) and obj.name not in seen_workflow_names:
                    seen_workflow_names.add(obj.name)
                    workflows.append(
                        ExistingWorkflow(
                            name=obj.name,
                            source="python",
                            file_path=str(py_file),
                            tasks=_extract_workflow_nodes(obj),
                            result_task=obj._result_task_name,
                        )
                    )

        # Walk .yaml files
        for yaml_file in sorted(directory.rglob("*.yaml")):
            try:
                raw = yaml.safe_load(yaml_file.read_text())
                if not isinstance(raw, dict) or "workflow" not in raw:
                    continue
                config = YamlWorkflowConfig.model_validate(raw)
                wf_name = config.workflow.name
                if wf_name in seen_workflow_names:
                    continue
                seen_workflow_names.add(wf_name)

                # Convert TaskConfig entries to WorkflowNodeDef
                nodes = []
                for tc in config.workflow.tasks:
                    task_path = tc.task or tc.workflow or ""
                    deps = tc.depends_on
                    nodes.append(
                        WorkflowNodeDef(
                            task_import_path=task_path,
                            instance_name=tc.name,
                            depends_on=deps,
                            config_fields=None,
                        )
                    )
                workflows.append(
                    ExistingWorkflow(
                        name=wf_name,
                        source="yaml",
                        file_path=str(yaml_file),
                        tasks=nodes,
                        result_task=config.workflow.result_task,
                    )
                )
            except Exception:
                continue

    finally:
        # Clean up imported modules to avoid polluting future scans
        for mod_name in imported_modules:
            sys.modules.pop(mod_name, None)
        if added_to_path:
            sys.path.remove(str(directory))
        if added_parent and parent in sys.path:
            sys.path.remove(parent)

    return ScanResponse(tasks=tasks, workflows=workflows)
