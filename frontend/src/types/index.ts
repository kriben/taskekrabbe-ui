export interface FieldInfo {
  name: string;
  type_name: string;
  required: boolean;
  default: unknown | null;
}

export interface TaskInfo {
  name: string;
  import_path: string;
  input_type_name: string;
  input_fields: FieldInfo[];
  fan_in_input: boolean;
  is_workflow_task: boolean;
  output_type_name: string;
  output_fields: FieldInfo[];
  timeout_seconds: number | null;
}

export interface WorkflowNodeDef {
  task_import_path: string;
  instance_name: string | null;
  depends_on: string | string[] | Record<string, string | string[]> | null;
  config_fields: string[] | null;
  is_workflow_task: boolean;
}

export interface WorkflowDef {
  name: string;
  tasks: WorkflowNodeDef[];
  result_task: string | null;
}

export interface ExistingWorkflow {
  name: string;
  source: string;
  file_path: string;
  tasks: WorkflowNodeDef[];
  result_task: string | null;
}

export interface ScanResponse {
  tasks: TaskInfo[];
  workflows: ExistingWorkflow[];
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
}

export interface GenerateYamlResponse {
  yaml_content: string;
}

export interface MermaidResponse {
  mermaid: string;
}

// React Flow node data
export interface TaskNodeData extends Record<string, unknown> {
  taskInfo: TaskInfo;
  instanceName: string | null;
}

export interface ConfigFieldInfo {
  name: string;
  type_name: string;
}

export interface ConfigNodeData extends Record<string, unknown> {
  targetTaskNodeId: string;
  fields: ConfigFieldInfo[];
}
