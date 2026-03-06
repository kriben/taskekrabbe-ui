import { useState } from 'react';
import type { TaskInfo } from '../types';

interface Props {
  sourceTask: TaskInfo;
  targetTask: TaskInfo;
  onConfirm: (mapping: Record<string, string>) => void;
  onClose: () => void;
}

export function DependencyConfigModal({ sourceTask, targetTask, onConfirm, onClose }: Props) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const field of targetTask.input_fields) {
      // Auto-map matching output field names
      const match = sourceTask.output_fields.find((f) => f.name === field.name);
      if (match) m[field.name] = match.name;
    }
    return m;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 20,
          minWidth: 360,
          color: '#e0e0e0',
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
          Configure Field Mapping
        </h3>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          {sourceTask.name} → {targetTask.name}
        </div>

        {targetTask.input_fields.map((field) => (
          <div key={field.name} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 120, fontSize: 12 }}>
              {field.name} <span style={{ color: '#666' }}>({field.type_name})</span>
            </span>
            <select
              value={mapping[field.name] || ''}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [field.name]: e.target.value }))
              }
              style={{
                flex: 1,
                padding: '4px 8px',
                background: '#2a2a2a',
                color: '#e0e0e0',
                border: '1px solid #555',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="">-- unmapped --</option>
              {sourceTask.output_fields.map((sf) => (
                <option key={sf.name} value={sf.name}>
                  {sf.name} ({sf.type_name})
                </option>
              ))}
            </select>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '5px 14px',
              background: '#444',
              color: '#ccc',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            style={{
              padding: '5px 14px',
              background: '#4a9eff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
