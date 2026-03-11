"""Pydantic API response models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class FieldInfo(BaseModel):
    name: str
    type_name: str
    required: bool
    default: Any | None = None


class TaskInfo(BaseModel):
    name: str
    import_path: str
    input_type_name: str
    input_fields: list[FieldInfo]
    fan_in_input: bool = False
    output_type_name: str
    output_fields: list[FieldInfo]
    timeout_seconds: float | None = None


class WorkflowNodeDef(BaseModel):
    """A task instance within a workflow graph."""

    task_import_path: str
    instance_name: str | None = None
    depends_on: str | list[str] | dict[str, str | list[str]] | None = None
    config_fields: list[str] | None = None


class WorkflowDef(BaseModel):
    """Full workflow definition from the UI."""

    name: str
    tasks: list[WorkflowNodeDef]
    result_task: str | None = None


class ExistingWorkflow(BaseModel):
    """Discovered workflow (from YAML or Python)."""

    name: str
    source: str
    file_path: str
    tasks: list[WorkflowNodeDef]
    result_task: str | None = None


class ScanRequest(BaseModel):
    directory: str


class ScanResponse(BaseModel):
    tasks: list[TaskInfo]
    workflows: list[ExistingWorkflow]


class ValidationResponse(BaseModel):
    valid: bool
    errors: list[str]


class GenerateYamlResponse(BaseModel):
    yaml_content: str


class MermaidResponse(BaseModel):
    mermaid: str


class SaveRequest(BaseModel):
    workflow: WorkflowDef
    output_path: str
