"""POST /api/scan — scan a directory for tasks and workflows."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from taskekrabbe_ui_backend.models import ScanRequest, ScanResponse
from taskekrabbe_ui_backend.scanner import scan_directory

router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
def scan(request: ScanRequest) -> ScanResponse:
    directory = Path(request.directory)
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {request.directory}")
    return scan_directory(directory)
