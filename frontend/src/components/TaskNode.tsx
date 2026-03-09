import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TaskNodeData } from '../types';

export const TaskNode = memo(function TaskNode({ data, selected }: NodeProps) {
  const taskData = data as unknown as TaskNodeData;
  const { taskInfo, instanceName } = taskData;

  return (
    <div
      style={{
        background: selected ? '#eff6ff' : '#ffffff',
        border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
        borderRadius: 8,
        minWidth: 180,
        fontSize: 12,
        color: '#1e293b',
        boxShadow: selected ? '0 0 12px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 700,
          fontSize: 13,
          background: 'rgba(37,99,235,0.06)',
          borderRadius: '6px 6px 0 0',
          color: '#1e40af',
        }}
      >
        {instanceName || taskInfo.name}
      </div>

      {/* I/O types */}
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ color: '#1e40af' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>In</div>
          {taskInfo.input_fields.length > 1 ? (
            taskInfo.input_fields.map((f) => (
              <div key={f.name} style={{ position: 'relative', fontSize: 11 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={f.name}
                  style={{
                    background: '#2563eb',
                    width: 8,
                    height: 8,
                    left: -16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  title={`${f.name}: ${f.type_name}`}
                />
                {f.name}: <span style={{ color: '#3b82f6' }}>{f.type_name}</span>
              </div>
            ))
          ) : (
            <div style={{ position: 'relative' }}>
              <Handle
                type="target"
                position={Position.Left}
                id="input"
                style={{
                  background: '#2563eb',
                  width: 10,
                  height: 10,
                  left: -16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              {taskInfo.input_type_name}
            </div>
          )}
        </div>
        <div style={{ color: '#9a3412', textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Out</div>
          {taskInfo.output_type_name === 'Outputs' ? (
            taskInfo.output_fields.map((f) => (
              <div key={f.name} style={{ position: 'relative', fontSize: 11 }}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={f.name}
                  style={{
                    background: '#ea580c',
                    width: 8,
                    height: 8,
                    right: -16,
                    left: 'auto',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  title={`${f.name}: ${f.type_name}`}
                />
                {f.name}: <span style={{ color: '#ea580c' }}>{f.type_name}</span>
              </div>
            ))
          ) : (
            <div style={{ position: 'relative' }}>
              <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{
                  background: '#ea580c',
                  width: 10,
                  height: 10,
                  right: -16,
                  left: 'auto',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              {taskInfo.output_type_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
