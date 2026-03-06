"""FastAPI app with CORS and route registration."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from taskekrabbe_ui_backend.models import ScanRequest, ScanResponse
from taskekrabbe_ui_backend.routes import scan, tasks, workflows
from taskekrabbe_ui_backend.scanner import scan_directory

app = FastAPI(title="Taskekrabbe UI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(scan.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")


# Override scan endpoint to also update caches
@app.post("/api/scan", response_model=ScanResponse)
def scan_endpoint(request: ScanRequest) -> ScanResponse:
    from pathlib import Path

    from fastapi import HTTPException

    directory = Path(request.directory)
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {request.directory}")

    result = scan_directory(directory)

    # Update caches
    tasks.update_cache(result.tasks)
    workflows.update_cache(result.workflows, directory=request.directory)

    return result


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
