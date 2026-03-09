import { useWorkflowStore } from '../store/workflowStore';
import type { TaskNodeData, ConfigNodeData, FieldInfo } from '../types';

function FieldList({ fields, label }: { fields: FieldInfo[]; label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
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
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span>
            {f.name}
            {!f.required && <span style={{ color: '#cbd5e1' }}>?</span>}
          </span>
          <span style={{ color: '#2563eb' }}>{f.type_name}</span>
        </div>
      ))}
    </div>
  );
}

function ConfigNodePanel({ data }: { data: ConfigNodeData }) {
  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#15803d' }}>
        Config Node
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
        Provides static YAML configuration values to a task.
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
        Fields
      </div>
      {data.fields.map((f) => (
        <div
          key={f.name}
          style={{
            padding: '3px 0',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span style={{ color: '#15803d' }}>{f.name}</span>
          <span style={{ color: '#4ade80' }}>{f.type_name}</span>
        </div>
      ))}
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedNodeId, nodes, edges, deleteNode, toggleConfigField } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) {
    return (
      <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>
        Select a node to see details
      </div>
    );
  }

  // Config node: show simplified panel
  if (selectedNode.type === 'configNode') {
    return <ConfigNodePanel data={selectedNode.data as unknown as ConfigNodeData} />;
  }

  const data = selectedNode.data as unknown as TaskNodeData;
  const { taskInfo } = data;

  // Determine which fields are currently config fields
  const configNode = nodes.find(
    (n) => n.type === 'configNode' && (n.data as ConfigNodeData).targetTaskNodeId === selectedNode.id,
  );
  const configFieldNames = new Set(
    configNode ? (configNode.data as unknown as ConfigNodeData).fields.map((f) => f.name) : [],
  );

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {data.instanceName || taskInfo.name}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, wordBreak: 'break-all' }}>
        {taskInfo.import_path}
      </div>

      <FieldList fields={taskInfo.input_fields} label={`Input: ${taskInfo.input_type_name}`} />
      <FieldList fields={taskInfo.output_fields} label={`Output: ${taskInfo.output_type_name}`} />

      {taskInfo.timeout_seconds && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          Timeout: {taskInfo.timeout_seconds}s
        </div>
      )}

      {/* Config Fields Section */}
      {taskInfo.input_fields.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>
            Config Fields
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
            Toggle fields to receive values from YAML config instead of upstream tasks.
          </div>
          {taskInfo.input_fields.map((f) => (
            <label
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 0',
                fontSize: 12,
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <input
                type="checkbox"
                checked={configFieldNames.has(f.name)}
                onChange={() => toggleConfigField(selectedNode.id, f.name)}
                style={{ accentColor: '#15803d' }}
              />
              <span>{f.name}</span>
              <span style={{ color: '#4ade80', marginLeft: 'auto' }}>{f.type_name}</span>
            </label>
          ))}
        </div>
      )}

      <button
        onClick={() => deleteNode(selectedNode.id)}
        style={{
          marginTop: 8,
          padding: '5px 14px',
          background: '#dc2626',
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
