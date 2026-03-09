import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ConfigNodeData } from '../types';

export const ConfigNode = memo(function ConfigNode({ data, selected }: NodeProps) {
  const configData = data as unknown as ConfigNodeData;
  const { fields } = configData;

  return (
    <div
      style={{
        background: selected ? '#f0fdf4' : '#ffffff',
        border: `2px solid ${selected ? '#15803d' : '#bbf7d0'}`,
        borderRadius: 8,
        minWidth: 140,
        fontSize: 12,
        color: '#1e293b',
        boxShadow: selected ? '0 0 12px rgba(21,128,61,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '5px 10px',
          borderBottom: '1px solid #bbf7d0',
          fontWeight: 700,
          fontSize: 11,
          background: 'rgba(21,128,61,0.08)',
          borderRadius: '6px 6px 0 0',
          color: '#15803d',
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
                background: '#15803d',
                width: 8,
                height: 8,
                right: -16,
                left: 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              title={`config: ${f.name}`}
            />
            <span style={{ color: '#15803d' }}>{f.name}</span>
            <span style={{ color: '#4ade80' }}>: {f.type_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
