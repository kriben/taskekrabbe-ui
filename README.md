# Taskekrabbe UI — Workflow Configuration Editor

Visual DAG editor for [taskekrabbe](../taskekrabbe) workflows. Browse tasks, view I/O schemas, and construct workflows via drag-and-drop — outputting valid `workflow.yaml` files.

## Quick Start

### Backend

```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate
pip install -e .
uvicorn taskekrabbe_ui_backend.app:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Usage

1. Enter a directory path containing taskekrabbe task modules (e.g., `/workspace/taskekrabbe/examples`)
2. Click **Scan** to discover tasks and existing workflows
3. Drag tasks from the left palette onto the canvas
4. Connect nodes by dragging from output handles (right, orange) to input handles (left, blue)
5. Click **Validate** to check the workflow
6. Click **Export YAML** to generate the workflow configuration
