import type {
  ScanResponse,
  TaskInfo,
  ValidationResponse,
  GenerateYamlResponse,
  MermaidResponse,
  WorkflowDef,
  ExistingWorkflow,
} from '../types';

const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function scanDirectory(directory: string): Promise<ScanResponse> {
  return fetchJson<ScanResponse>(`${BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory }),
  });
}

export async function getTasks(): Promise<TaskInfo[]> {
  return fetchJson<TaskInfo[]>(`${BASE}/tasks`);
}

export async function getTask(importPath: string): Promise<TaskInfo> {
  return fetchJson<TaskInfo>(`${BASE}/tasks/${importPath}`);
}

export async function getWorkflows(): Promise<ExistingWorkflow[]> {
  return fetchJson<ExistingWorkflow[]>(`${BASE}/workflows`);
}

export async function validateWorkflow(workflow: WorkflowDef): Promise<ValidationResponse> {
  return fetchJson<ValidationResponse>(`${BASE}/workflows/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });
}

export async function generateYaml(workflow: WorkflowDef): Promise<GenerateYamlResponse> {
  return fetchJson<GenerateYamlResponse>(`${BASE}/workflows/generate-yaml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });
}

export async function getMermaid(workflow: WorkflowDef): Promise<MermaidResponse> {
  return fetchJson<MermaidResponse>(`${BASE}/workflows/mermaid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });
}

export async function saveWorkflow(
  workflow: WorkflowDef,
  outputPath: string
): Promise<{ status: string; path: string }> {
  return fetchJson(`${BASE}/workflows/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, output_path: outputPath }),
  });
}
