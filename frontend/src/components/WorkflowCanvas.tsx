import { useCallback, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../store/workflowStore';
import { TaskNode } from './TaskNode';
import { ConfigNode } from './ConfigNode';
import { ConnectionLine } from './ConnectionLine';
import { ConfigEdge } from './ConfigEdge';
import type { TaskInfo, TaskNodeData } from '../types';

const nodeTypes: NodeTypes = {
  taskNode: TaskNode,
  configNode: ConfigNode,
};

const edgeTypes: EdgeTypes = {
  default: ConnectionLine,
  configEdge: ConfigEdge,
};

/** Get the type_name for a handle on a node. */
function getHandleType(node: Node<TaskNodeData>, handleId: string | null, side: 'source' | 'target'): string | null {
  const taskData = node.data as unknown as TaskNodeData;
  const { taskInfo } = taskData;

  if (side === 'source') {
    if (!handleId || handleId === 'output') {
      return taskInfo.output_type_name;
    }
    const field = taskInfo.output_fields.find((f) => f.name === handleId);
    return field?.type_name ?? null;
  } else {
    if (!handleId || handleId === 'input') {
      return taskInfo.input_type_name;
    }
    const field = taskInfo.input_fields.find((f) => f.name === handleId);
    return field?.type_name ?? null;
  }
}

export function WorkflowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addTaskNode, setSelectedNode } =
    useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/taskekrabbe-task');
      if (!data) return;

      const task: TaskInfo = JSON.parse(data);

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      addTaskNode(task, position);
    },
    [addTaskNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      // Config nodes skip type validation
      if (sourceNode.type === 'configNode') return true;

      const sourceType = getHandleType(sourceNode as Node<TaskNodeData>, connection.sourceHandle ?? null, 'source');
      const targetType = getHandleType(targetNode as Node<TaskNodeData>, connection.targetHandle ?? null, 'target');

      if (!sourceType || !targetType) return false;

      return sourceType === targetType;
    },
    [nodes]
  );

  const workflowName = useWorkflowStore((s) => s.workflowName);

  return (
    <div style={{ flex: 1, height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          padding: '4px 16px',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          fontSize: 14,
          fontWeight: 600,
          color: '#334155',
          pointerEvents: 'none',
        }}
      >
        Workflow: {workflowName}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        colorMode="light"
        defaultEdgeOptions={{ animated: false }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          style={{ background: '#ffffff' }}
          nodeColor={(node) => (node.type === 'configNode' ? '#15803d' : '#2563eb')}
          maskColor="rgba(255,255,255,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
