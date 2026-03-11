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
import type { TaskInfo, ExistingWorkflow, TaskNodeData, ConfigNodeData, WorkflowDef, WorkflowNodeDef } from '../types';
import * as api from '../api/client';
import { layoutNodes } from '../layout';

interface WorkflowStore {
  // Data from backend
  scannedDirectory: string | null;
  availableTasks: TaskInfo[];
  existingWorkflows: ExistingWorkflow[];

  // Graph state
  nodes: Node[];
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
  toggleConfigField: (taskNodeId: string, fieldName: string) => void;
  buildWorkflowDef: () => WorkflowDef;
  autoLayout: () => void;
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
    const newNode: Node = {
      id,
      type: 'taskNode',
      position,
      data: { taskInfo: task, instanceName: null } satisfies TaskNodeData,
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
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

  toggleConfigField: (taskNodeId: string, fieldName: string) => {
    const { nodes, edges } = get();

    const taskNode = nodes.find((n) => n.id === taskNodeId && n.type === 'taskNode');
    if (!taskNode) return;
    const taskData = taskNode.data as TaskNodeData;
    const fieldInfo = taskData.taskInfo.input_fields.find((f) => f.name === fieldName);
    if (!fieldInfo) return;

    // Find existing config node for this task
    const existingConfigNode = nodes.find(
      (n) => n.type === 'configNode' && (n.data as ConfigNodeData).targetTaskNodeId === taskNodeId,
    );

    if (existingConfigNode) {
      const configData = existingConfigNode.data as ConfigNodeData;
      const hasField = configData.fields.some((f) => f.name === fieldName);

      if (hasField) {
        // Remove the field
        const newFields = configData.fields.filter((f) => f.name !== fieldName);
        const configEdgeId = `cfgedge_${existingConfigNode.id}_${taskNodeId}_${fieldName}`;
        const newEdges = edges.filter((e) => e.id !== configEdgeId);

        if (newFields.length === 0) {
          // Remove config node entirely
          set({
            nodes: nodes.filter((n) => n.id !== existingConfigNode.id),
            edges: newEdges,
          });
        } else {
          // Update config node fields
          set({
            nodes: nodes.map((n) =>
              n.id === existingConfigNode.id
                ? { ...n, data: { ...configData, fields: newFields } }
                : n,
            ),
            edges: newEdges,
          });
        }
      } else {
        // Add the field
        const newFields = [...configData.fields, { name: fieldInfo.name, type_name: fieldInfo.type_name }];
        const targetHandle = taskData.taskInfo.input_fields.length > 1 ? fieldName : 'input';
        const newEdge: Edge = {
          id: `cfgedge_${existingConfigNode.id}_${taskNodeId}_${fieldName}`,
          source: existingConfigNode.id,
          target: taskNodeId,
          sourceHandle: fieldName,
          targetHandle,
          type: 'configEdge',
          animated: false,
        };

        set({
          nodes: nodes.map((n) =>
            n.id === existingConfigNode.id
              ? { ...n, data: { ...configData, fields: newFields } }
              : n,
          ),
          edges: [...edges, newEdge],
        });
      }
    } else {
      // Create new config node
      const configNodeId = `config_${++nodeIdCounter}`;
      const configNode: Node = {
        id: configNodeId,
        type: 'configNode',
        position: { x: taskNode.position.x - 200, y: taskNode.position.y - 50 },
        data: {
          targetTaskNodeId: taskNodeId,
          fields: [{ name: fieldInfo.name, type_name: fieldInfo.type_name }],
        } satisfies ConfigNodeData,
      };
      const targetHandle = taskData.taskInfo.input_fields.length > 1 ? fieldName : 'input';
      const configEdge: Edge = {
        id: `cfgedge_${configNodeId}_${taskNodeId}_${fieldName}`,
        source: configNodeId,
        target: taskNodeId,
        sourceHandle: fieldName,
        targetHandle,
        type: 'configEdge',
        animated: false,
      };

      set({
        nodes: [...nodes, configNode],
        edges: [...edges, configEdge],
      });
    }
  },

  buildWorkflowDef: (): WorkflowDef => {
    const { nodes, edges, workflowName } = get();

    // Separate config nodes from task nodes
    const taskNodes = nodes.filter((n) => n.type !== 'configNode');
    const configNodeIds = new Set(nodes.filter((n) => n.type === 'configNode').map((n) => n.id));

    // Build config fields map: taskNodeId -> field names from config edges
    const configFieldsMap: Record<string, string[]> = {};
    for (const edge of edges) {
      if (edge.type === 'configEdge' && configNodeIds.has(edge.source)) {
        if (!configFieldsMap[edge.target]) {
          configFieldsMap[edge.target] = [];
        }
        if (edge.sourceHandle) {
          configFieldsMap[edge.target].push(edge.sourceHandle);
        }
      }
    }

    // Filter out config edges for dependency building
    const dataEdges = edges.filter((e) => e.type !== 'configEdge' && !configNodeIds.has(e.source));

    // Build dependency map: target node -> list of source data edges
    const incomingEdges: Record<string, Edge[]> = {};
    for (const edge of dataEdges) {
      if (!incomingEdges[edge.target]) {
        incomingEdges[edge.target] = [];
      }
      incomingEdges[edge.target].push(edge);
    }

    // Map node IDs to task names
    const nodeNameMap: Record<string, string> = {};
    for (const node of taskNodes) {
      const data = node.data as TaskNodeData;
      nodeNameMap[node.id] = data.instanceName || data.taskInfo.name;
    }

    const tasks: WorkflowNodeDef[] = [];
    for (const node of taskNodes) {
      const data = node.data as TaskNodeData;
      const incoming = incomingEdges[node.id] || [];

      let depends_on: WorkflowNodeDef['depends_on'] = null;
      if (incoming.length === 1) {
        const edge = incoming[0];
        const sourceHandle = edge.sourceHandle;
        const sourceName = nodeNameMap[edge.source];
        const targetHandle = edge.targetHandle || 'input';
        if (sourceHandle && sourceHandle !== 'output') {
          // Field routing: [task_name, field_name]
          depends_on = [sourceName, sourceHandle];
        } else if (targetHandle !== 'input') {
          // Single dep with named target field: use dict to preserve mapping
          depends_on = { [targetHandle]: sourceName };
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

      const config_fields = configFieldsMap[node.id] ?? null;

      tasks.push({
        task_import_path: data.taskInfo.import_path,
        instance_name: data.instanceName,
        depends_on,
        config_fields,
      });
    }

    // Result task: last task node with no outgoing data edges
    const sourcesWithOutgoing = new Set(dataEdges.map((e) => e.source));
    const sinks = taskNodes.filter((n) => !sourcesWithOutgoing.has(n.id));
    const result_task = sinks.length === 1 ? nodeNameMap[sinks[0].id] : null;

    return { name: workflowName, tasks, result_task };
  },

  loadExistingWorkflow: (wf: ExistingWorkflow) => {
    const { availableTasks } = get();
    const newNodes: Node[] = [];
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
        position: { x: 0, y: 0 }, // will be set by layoutNodes
        data: { taskInfo, instanceName: taskDef.instance_name } satisfies TaskNodeData,
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
          // If the target has multiple input fields, find the matching field
          // by looking for a field whose type matches the source output type
          let targetHandle = 'input';
          if (taskInfo.input_fields.length > 1) {
            const sourceNode = newNodes.find((n) => n.id === sourceId);
            if (sourceNode) {
              const sourceData = sourceNode.data as TaskNodeData;
              const sourceOutputType = sourceData.taskInfo.output_type_name;
              const match = taskInfo.input_fields.find((f) => f.type_name === sourceOutputType);
              if (match) {
                targetHandle = match.name;
              }
            }
          }
          newEdges.push({
            id: `edge_${sourceId}_${targetId}`,
            source: sourceId,
            target: targetId,
            sourceHandle: 'output',
            targetHandle,
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

    // Create config nodes for tasks that have config_fields
    for (const taskDef of wf.tasks) {
      const taskInfo = availableTasks.find(
        (t) =>
          t.import_path === taskDef.task_import_path ||
          t.import_path.endsWith(`.${taskDef.task_import_path.split('.').pop()}`)
      );
      if (!taskInfo) continue;
      if (!taskDef.config_fields || taskDef.config_fields.length === 0) continue;

      const taskName = taskDef.instance_name || taskInfo.name;
      const taskNodeId = nameToNodeId[taskName];
      if (!taskNodeId) continue;

      const taskNode = newNodes.find((n) => n.id === taskNodeId);
      if (!taskNode) continue;

      const fields = taskDef.config_fields
        .map((fieldName) => {
          const field = taskInfo.input_fields.find((f) => f.name === fieldName);
          return field ? { name: field.name, type_name: field.type_name } : null;
        })
        .filter((f): f is { name: string; type_name: string } => f !== null);

      if (fields.length === 0) continue;

      const configNodeId = `config_${++nodeIdCounter}`;
      newNodes.push({
        id: configNodeId,
        type: 'configNode',
        position: { x: taskNode.position.x - 200, y: taskNode.position.y - 50 },
        data: { targetTaskNodeId: taskNodeId, fields } satisfies ConfigNodeData,
      });

      for (const field of fields) {
        const targetHandle = taskInfo.input_fields.length > 1 ? field.name : 'input';
        newEdges.push({
          id: `cfgedge_${configNodeId}_${taskNodeId}_${field.name}`,
          source: configNodeId,
          target: taskNodeId,
          sourceHandle: field.name,
          targetHandle,
          type: 'configEdge',
          animated: false,
        });
      }
    }

    set({
      nodes: layoutNodes(newNodes, newEdges),
      edges: newEdges,
      workflowName: wf.name,
      validationErrors: [],
      generatedYaml: '',
      selectedNodeId: null,
    });
  },

  deleteNode: (id: string) => {
    set((state) => {
      const nodeToDelete = state.nodes.find((n) => n.id === id);

      // If deleting a task node, also remove its associated config node
      let configNodeIdToRemove: string | null = null;
      if (nodeToDelete?.type === 'taskNode') {
        const configNode = state.nodes.find(
          (n) => n.type === 'configNode' && (n.data as ConfigNodeData).targetTaskNodeId === id,
        );
        if (configNode) {
          configNodeIdToRemove = configNode.id;
        }
      }

      const idsToRemove = new Set([id]);
      if (configNodeIdToRemove) idsToRemove.add(configNodeIdToRemove);

      return {
        nodes: state.nodes.filter((n) => !idsToRemove.has(n.id)),
        edges: state.edges.filter((e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target)),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    set({ nodes: layoutNodes(nodes, edges) });
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
