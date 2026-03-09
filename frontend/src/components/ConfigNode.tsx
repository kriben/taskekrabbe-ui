import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ConfigNodeData } from '../types';

export const ConfigNode = memo(function ConfigNode({ data, selected }: NodeProps) {
  const configData = data as unknown as ConfigNodeData;
  const { fields } = configData;

  return (
    <div
      style={{
        background: selected ? '#1a3a1a' : '#1a2e1a',
        border: `2px solid ${selected ? '#66d9a0' : '#3a6a3a'}`,
        borderRadius: 8,
        minWidth: 140,
        fontSize: 12,
        color: '#e0e0e0',
        boxShadow: selected ? '0 0 12px rgba(102,217,160,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '5px 10px',
          borderBottom: '1px solid #3a6a3a',
          fontWeight: 700,
          fontSize: 11,
          background: 'rgba(102,217,160,0.1)',
          borderRadius: '6px 6px 0 0',
          color: '#66d9a0',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Config
      </div>

      {/* Fields */}
      <div style={{ padding: '4px 10px' }}>
        {fields.map((f) => (
          <div key={f.name} style={{ position: 'relative', fontSize: 11, padding: '2px 0' }}>
            <Handle
              type="source"
              position={Position.Right}
              id={f.name}
              style={{
                background: '#66d9a0',
                width: 8,
                height: 8,
                right: -16,
                left: 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              title={`config: ${f.name}`}
            />
            <span style={{ color: '#aadaba' }}>{f.name}</span>
            <span style={{ color: '#6a8a6a' }}>: {f.type_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
