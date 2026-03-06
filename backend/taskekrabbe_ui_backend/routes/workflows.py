"""Workflow routes: validation, YAML generation, mermaid, save."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from taskekrabbe.exceptions import WorkflowRunnerError
from taskekrabbe.task import Task
from taskekrabbe.workflow import WorkflowBuilder
from taskekrabbe.yaml_config import import_class

from taskekrabbe_ui_backend.models import (
    ExistingWorkflow,
    GenerateYamlResponse,
    MermaidResponse,
    SaveRequest,
    ValidationResponse,
    WorkflowDef,
)
from taskekrabbe_ui_backend.yaml_generator import generate_yaml

router = APIRouter()

# Cache populated by scan endpoint
_workflow_cache: list[ExistingWorkflow] = []
_scanned_directory: str | None = None


def update_cache(workflows: list[ExistingWorkflow], directory: str | None = None) -> None:
    global _workflow_cache, _scanned_directory
    _workflow_cache = list(workflows)
    _scanned_directory = directory


@router.get("/workflows", response_model=list[ExistingWorkflow])
def list_workflows() -> list[ExistingWorkflow]:
    return _workflow_cache


def _resolve_tasks(workflow_def: WorkflowDef) -> dict[str, type[Task[Any, Any]]]:
    """Import and return task classes from a WorkflowDef."""
    task_registry: dict[str, type[Task[Any, Any]]] = {}
    for node in workflow_def.tasks:
        try:
            cls = import_class(node.task_import_path)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot import '{node.task_import_path}': {exc}",
            )
        if not (isinstance(cls, type) and issubclass(cls, Task)):
            raise HTTPException(
                status_code=400,
                detail=f"'{node.task_import_path}' is not a Task subclass",
            )
        task_registry[node.task_import_path] = cls
    return task_registry


def _build_workflow(workflow_def: WorkflowDef, task_registry: dict[str, type[Task[Any, Any]]]):
    """Build a real Workflow from a WorkflowDef for validation."""
    from taskekrabbe.workflow import Workflow

    builder = WorkflowBuilder(workflow_def.name, result_task=workflow_def.result_task)

    # Build name lookup: import_path -> registered name
    name_lookup: dict[str, str] = {}
    for node in workflow_def.tasks:
        cls = task_registry[node.task_import_path]
        registered_name = node.instance_name if node.instance_name else cls.name
        name_lookup[node.task_import_path] = registered_name

    for node in workflow_def.tasks:
        cls = task_registry[node.task_import_path]
        deps = node.depends_on
        config_fields = node.config_fields

        if deps is None:
            builder.add_task(cls, name=node.instance_name, config_fields=config_fields)
        elif isinstance(deps, str):
            builder.add_task(
                cls, name=node.instance_name, depends_on=deps, config_fields=config_fields
            )
        elif isinstance(deps, list):
            # [upstream, field] tuple
            if len(deps) == 2 and all(isinstance(e, str) for e in deps):
                builder.add_task(
                    cls,
                    name=node.instance_name,
                    depends_on=(deps[0], deps[1]),
                    config_fields=config_fields,
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid list depends_on for '{node.task_import_path}': {deps}",
                )
        elif isinstance(deps, dict):
            fan_in: dict[str, str | tuple[str, str]] = {}
            for field, upstream_ref in deps.items():
                if isinstance(upstream_ref, list):
                    if len(upstream_ref) == 2 and all(isinstance(e, str) for e in upstream_ref):
                        fan_in[field] = (upstream_ref[0], upstream_ref[1])
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid fan-in ref for field '{field}': {upstream_ref}",
                        )
                else:
                    fan_in[field] = upstream_ref
            builder.add_task(
                cls, name=node.instance_name, depends_on=fan_in, config_fields=config_fields
            )

    return builder.build()


@router.post("/workflows/validate", response_model=ValidationResponse)
def validate_workflow(workflow_def: WorkflowDef) -> ValidationResponse:
    # Ensure scanned directory is in sys.path for imports
    if _scanned_directory and _scanned_directory not in sys.path:
        sys.path.insert(0, _scanned_directory)

    errors: list[str] = []
    try:
        task_registry = _resolve_tasks(workflow_def)
        _build_workflow(workflow_def, task_registry)
    except HTTPException as exc:
        errors.append(exc.detail)
    except WorkflowRunnerError as exc:
        errors.append(str(exc))
    except Exception as exc:
        errors.append(f"Unexpected error: {exc}")

    return ValidationResponse(valid=len(errors) == 0, errors=errors)


@router.post("/workflows/generate-yaml", response_model=GenerateYamlResponse)
def generate_yaml_endpoint(workflow_def: WorkflowDef) -> GenerateYamlResponse:
    yaml_content = generate_yaml(workflow_def)
    return GenerateYamlResponse(yaml_content=yaml_content)


@router.post("/workflows/mermaid", response_model=MermaidResponse)
def mermaid_endpoint(workflow_def: WorkflowDef) -> MermaidResponse:
    if _scanned_directory and _scanned_directory not in sys.path:
        sys.path.insert(0, _scanned_directory)

    try:
        task_registry = _resolve_tasks(workflow_def)
        workflow = _build_workflow(workflow_def, task_registry)
        mermaid_str = workflow.to_mermaid()
        return MermaidResponse(mermaid=mermaid_str)
    except HTTPException:
        raise
    except WorkflowRunnerError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/workflows/save")
def save_workflow(request: SaveRequest) -> dict[str, str]:
    yaml_content = generate_yaml(request.workflow)
    output = Path(request.output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(yaml_content)
    return {"status": "saved", "path": str(output)}
