import { useWorkflowStore } from '../store/workflowStore';
import type { TaskNodeData, FieldInfo } from '../types';

function FieldList({ fields, label }: { fields: FieldInfo[]; label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      {fields.map((f) => (
        <div
          key={f.name}
          style={{
            padding: '3px 0',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid #333',
          }}
        >
          <span>
            {f.name}
            {!f.required && <span style={{ color: '#666' }}>?</span>}
          </span>
          <span style={{ color: '#8bc' }}>{f.type_name}</span>
        </div>
      ))}
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedNodeId, nodes, deleteNode } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) {
    return (
      <div style={{ padding: 16, color: '#888', fontSize: 13 }}>
        Select a node to see details
      </div>
    );
  }

  const data = selectedNode.data as unknown as TaskNodeData;
  const { taskInfo } = data;

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {data.instanceName || taskInfo.name}
      </div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 12, wordBreak: 'break-all' }}>
        {taskInfo.import_path}
      </div>

      <FieldList fields={taskInfo.input_fields} label={`Input: ${taskInfo.input_type_name}`} />
      <FieldList fields={taskInfo.output_fields} label={`Output: ${taskInfo.output_type_name}`} />

      {taskInfo.timeout_seconds && (
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
          Timeout: {taskInfo.timeout_seconds}s
        </div>
      )}

      <button
        onClick={() => deleteNode(selectedNode.id)}
        style={{
          marginTop: 8,
          padding: '5px 14px',
          background: '#a33',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Remove Node
      </button>
    </div>
  );
}
