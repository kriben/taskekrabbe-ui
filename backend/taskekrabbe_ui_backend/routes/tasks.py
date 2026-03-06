"""GET /api/tasks — return cached task list."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from taskekrabbe_ui_backend.models import TaskInfo

router = APIRouter()

# Cache populated by scan endpoint
_task_cache: list[TaskInfo] = []


def update_cache(tasks: list[TaskInfo]) -> None:
    global _task_cache
    _task_cache = list(tasks)


@router.get("/tasks", response_model=list[TaskInfo])
def list_tasks() -> list[TaskInfo]:
    return _task_cache


@router.get("/tasks/{import_path:path}", response_model=TaskInfo)
def get_task(import_path: str) -> TaskInfo:
    for task in _task_cache:
        if task.import_path == import_path:
            return task
    raise HTTPException(status_code=404, detail=f"Task not found: {import_path}")
