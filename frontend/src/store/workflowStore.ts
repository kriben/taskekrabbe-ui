import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Connection,
  type XYPosition,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { TaskInfo, ExistingWorkflow, TaskNodeData, WorkflowDef, WorkflowNodeDef } from '../types';
import * as api from '../api/client';

interface WorkflowStore {
  // Data from backend
  scannedDirectory: string | null;
  availableTasks: TaskInfo[];
  existingWorkflows: ExistingWorkflow[];

  // Graph state
  nodes: Node<TaskNodeData>[];
  edges: Edge[];

  // UI state
  selectedNodeId: string | null;
  validationErrors: string[];
  generatedYaml: string;
  workflowName: string;
  isScanning: boolean;

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  addTaskNode: (task: TaskInfo, position: XYPosition) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNode: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  validate: () => Promise<void>;
  exportYaml: () => Promise<string>;
  loadExistingWorkflow: (wf: ExistingWorkflow) => void;
  deleteNode: (id: string) => void;
  buildWorkflowDef: () => WorkflowDef;
  clearWorkflow: () => void;
}

let nodeIdCounter = 0;

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  scannedDirectory: null,
  availableTasks: [],
  existingWorkflows: [],
  nodes: [],
  edges: [],
  selectedNodeId: null,
  validationErrors: [],
  generatedYaml: '',
  workflowName: 'new_workflow',
  isScanning: false,

  scanDirectory: async (path: string) => {
    set({ isScanning: true });
    try {
      const result = await api.scanDirectory(path);
      set({
        scannedDirectory: path,
        availableTasks: result.tasks,
        existingWorkflows: result.workflows,
        isScanning: false,
      });
    } catch (e) {
      set({ isScanning: false });
      throw e;
    }
  },

  addTaskNode: (task: TaskInfo, position: XYPosition) => {
    const id = `node_${++nodeIdCounter}`;
    const newNode: Node<TaskNodeData> = {
      id,
      type: 'taskNode',
      position,
      data: { taskInfo: task, instanceName: null },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<TaskNodeData>[],
    }));
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection: Connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
          type: 'default',
          animated: false,
        },
        state.edges,
      ),
    }));
  },

  setSelectedNode: (id: string | null) => {
    set({ selectedNodeId: id });
  },

  setWorkflowName: (name: string) => {
    set({ workflowName: name });
  },

  validate: async () => {
    const workflowDef = get().buildWorkflowDef();
    try {
      const result = await api.validateWorkflow(workflowDef);
      set({ validationErrors: result.errors });
    } catch (e) {
      set({ validationErrors: [`Validation request failed: ${e}`] });
    }
  },

  exportYaml: async () => {
    const workflowDef = get().buildWorkflowDef();
    try {
      const result = await api.generateYaml(workflowDef);
      set({ generatedYaml: result.yaml_content });
      return result.yaml_content;
    } catch (e) {
      throw e;
    }
  },

  buildWorkflowDef: (): WorkflowDef => {
    const { nodes, edges, workflowName } = get();

    // Build dependency map: target node -> list of source edges
    const incomingEdges: Record<string, Edge[]> = {};
    for (const edge of edges) {
      if (!incomingEdges[edge.target]) {
        incomingEdges[edge.target] = [];
      }
      incomingEdges[edge.target].push(edge);
    }

    // Map node IDs to task names
    const nodeNameMap: Record<string, string> = {};
    for (const node of nodes) {
      const data = node.data as TaskNodeData;
      nodeNameMap[node.id] = data.instanceName || data.taskInfo.name;
    }

    const tasks: WorkflowNodeDef[] = [];
    for (const node of nodes) {
      const data = node.data as TaskNodeData;
      const incoming = incomingEdges[node.id] || [];

      let depends_on: WorkflowNodeDef['depends_on'] = null;
      if (incoming.length === 1) {
        const sourceHandle = incoming[0].sourceHandle;
        const sourceName = nodeNameMap[incoming[0].source];
        if (sourceHandle && sourceHandle !== 'output') {
          // Field routing: [task_name, field_name]
          depends_on = [sourceName, sourceHandle];
        } else {
          depends_on = sourceName;
        }
      } else if (incoming.length > 1) {
        // Fan-in: map target handle -> source
        const fanIn: Record<string, string | string[]> = {};
        for (const edge of incoming) {
          const targetHandle = edge.targetHandle || 'input';
          const sourceName = nodeNameMap[edge.source];
          const sourceHandle = edge.sourceHandle;
          if (sourceHandle && sourceHandle !== 'output') {
            fanIn[targetHandle] = [sourceName, sourceHandle];
          } else {
            fanIn[targetHandle] = sourceName;
          }
        }
        depends_on = fanIn;
      }

      tasks.push({
        task_import_path: data.taskInfo.import_path,
        instance_name: data.instanceName,
        depends_on,
        config_fields: null,
      });
    }

    // Result task: last node with no outgoing edges
    const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
    const sinks = nodes.filter((n) => !sourcesWithOutgoing.has(n.id));
    const result_task = sinks.length === 1 ? nodeNameMap[sinks[0].id] : null;

    return { name: workflowName, tasks, result_task };
  },

  loadExistingWorkflow: (wf: ExistingWorkflow) => {
    const { availableTasks } = get();
    const newNodes: Node<TaskNodeData>[] = [];
    const newEdges: Edge[] = [];
    const nameToNodeId: Record<string, string> = {};

    // Create nodes
    wf.tasks.forEach((taskDef, i) => {
      const taskInfo = availableTasks.find((t) => {
        // Match by import path suffix or name
        return (
          t.import_path === taskDef.task_import_path ||
          t.import_path.endsWith(`.${taskDef.task_import_path.split('.').pop()}`)
        );
      });
      if (!taskInfo) return;

      const id = `node_${++nodeIdCounter}`;
      const name = taskDef.instance_name || taskInfo.name;
      nameToNodeId[name] = id;
      // Also map the import path for dependency resolution
      nameToNodeId[taskDef.task_import_path] = id;

      newNodes.push({
        id,
        type: 'taskNode',
        position: { x: 100 + (i % 3) * 300, y: 50 + Math.floor(i / 3) * 200 },
        data: { taskInfo, instanceName: taskDef.instance_name },
      });
    });

    // Create edges from depends_on
    for (const taskDef of wf.tasks) {
      const taskInfo = availableTasks.find(
        (t) =>
          t.import_path === taskDef.task_import_path ||
          t.import_path.endsWith(`.${taskDef.task_import_path.split('.').pop()}`)
      );
      if (!taskInfo) continue;
      const name = taskDef.instance_name || taskInfo.name;
      const targetId = nameToNodeId[name];
      if (!targetId) continue;

      const deps = taskDef.depends_on;
      if (!deps) continue;

      if (typeof deps === 'string') {
        const sourceId = nameToNodeId[deps];
        if (sourceId) {
          newEdges.push({
            id: `edge_${sourceId}_${targetId}`,
            source: sourceId,
            target: targetId,
            sourceHandle: 'output',
            targetHandle: 'input',
            animated: false,
          });
        }
      } else if (Array.isArray(deps) && deps.length === 2) {
        const sourceId = nameToNodeId[deps[0]];
        if (sourceId) {
          newEdges.push({
            id: `edge_${sourceId}_${targetId}_${deps[1]}`,
            source: sourceId,
            target: targetId,
            sourceHandle: deps[1],
            targetHandle: 'input',
            animated: false,
          });
        }
      } else if (typeof deps === 'object' && !Array.isArray(deps)) {
        for (const [field, ref] of Object.entries(deps)) {
          if (typeof ref === 'string') {
            const sourceId = nameToNodeId[ref];
            if (sourceId) {
              newEdges.push({
                id: `edge_${sourceId}_${targetId}_${field}`,
                source: sourceId,
                target: targetId,
                sourceHandle: 'output',
                targetHandle: field,
                animated: false,
              });
            }
          } else if (Array.isArray(ref) && ref.length === 2) {
            const sourceId = nameToNodeId[ref[0]];
            if (sourceId) {
              newEdges.push({
                id: `edge_${sourceId}_${targetId}_${field}`,
                source: sourceId,
                target: targetId,
                sourceHandle: ref[1],
                targetHandle: field,
                animated: false,
              });
            }
          }
        }
      }
    }

    set({
      nodes: newNodes,
      edges: newEdges,
      workflowName: wf.name,
      validationErrors: [],
      generatedYaml: '',
      selectedNodeId: null,
    });
  },

  deleteNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      validationErrors: [],
      generatedYaml: '',
      workflowName: 'new_workflow',
    });
  },
}));
