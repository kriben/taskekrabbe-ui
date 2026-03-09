"""Generate workflow.yaml from a WorkflowDef."""

from __future__ import annotations

import yaml

from taskekrabbe_ui_backend.models import WorkflowDef


def generate_yaml(workflow_def: WorkflowDef) -> str:
    """Build YamlWorkflowConfig-compatible YAML from a WorkflowDef."""
    tasks_section = []
    for node in workflow_def.tasks:
        entry: dict[str, object] = {"task": node.task_import_path}
        if node.instance_name:
            entry["name"] = node.instance_name
        if node.depends_on is not None:
            entry["depends_on"] = node.depends_on
        if node.config_fields:
            entry["config_fields"] = node.config_fields
        tasks_section.append(entry)

    config = {
        "workflow": {
            "name": workflow_def.name,
            "tasks": tasks_section,
        }
    }

    if workflow_def.result_task:
        config["workflow"]["result_task"] = workflow_def.result_task

    return yaml.dump(config, default_flow_style=False, sort_keys=False)
