import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TaskNodeData } from '../types';

export const TaskNode = memo(function TaskNode({ data, selected }: NodeProps) {
  const taskData = data as unknown as TaskNodeData;
  const { taskInfo, instanceName } = taskData;

  return (
    <div
      style={{
        background: selected ? '#2a3a5a' : '#1e1e2e',
        border: `2px solid ${selected ? '#4a9eff' : '#444'}`,
        borderRadius: 8,
        minWidth: 180,
        fontSize: 12,
        color: '#e0e0e0',
        boxShadow: selected ? '0 0 12px rgba(74,158,255,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Input handles */}
      {taskInfo.input_type_name !== 'Inputs' ? (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#4a9eff', width: 10, height: 10 }}
        />
      ) : (
        taskInfo.input_fields.map((field, i) => (
          <Handle
            key={field.name}
            type="target"
            position={Position.Left}
            id={field.name}
            style={{
              background: '#4a9eff',
              width: 8,
              height: 8,
              top: `${28 + i * 16}px`,
            }}
            title={`${field.name}: ${field.type_name}`}
          />
        ))
      )}

      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid #444',
          fontWeight: 700,
          fontSize: 13,
          background: 'rgba(74,158,255,0.1)',
          borderRadius: '6px 6px 0 0',
        }}
      >
        {instanceName || taskInfo.name}
      </div>

      {/* I/O types */}
      <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ color: '#8bc' }}>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' }}>In</div>
          {taskInfo.input_type_name === 'Inputs' ? (
            taskInfo.input_fields.map((f) => (
              <div key={f.name} style={{ fontSize: 11 }}>
                {f.name}: <span style={{ color: '#acd' }}>{f.type_name}</span>
              </div>
            ))
          ) : (
            taskInfo.input_type_name
          )}
        </div>
        <div style={{ color: '#bc8', textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' }}>Out</div>
          {taskInfo.output_type_name === 'Outputs' ? (
            taskInfo.output_fields.map((f) => (
              <div key={f.name} style={{ fontSize: 11 }}>
                {f.name}: <span style={{ color: '#dca' }}>{f.type_name}</span>
              </div>
            ))
          ) : (
            taskInfo.output_type_name
          )}
        </div>
      </div>

      {/* Output handles */}
      {taskInfo.output_type_name !== 'Outputs' ? (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#ff9e4a', width: 10, height: 10 }}
        />
      ) : (
        taskInfo.output_fields.map((field, i) => (
          <Handle
            key={field.name}
            type="source"
            position={Position.Right}
            id={field.name}
            style={{
              background: '#ff9e4a',
              width: 8,
              height: 8,
              top: `${28 + i * 16}px`,
            }}
            title={`${field.name}: ${field.type_name}`}
          />
        ))
      )}
    </div>
  );
});
