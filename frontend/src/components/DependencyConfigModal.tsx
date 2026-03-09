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
        background: 'rgba(0,0,0,0.3)',
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 20,
          minWidth: 360,
          color: '#1e293b',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
          Configure Field Mapping
        </h3>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
          {sourceTask.name} → {targetTask.name}
        </div>

        {targetTask.input_fields.map((field) => (
          <div key={field.name} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 120, fontSize: 12 }}>
              {field.name} <span style={{ color: '#cbd5e1' }}>({field.type_name})</span>
            </span>
            <select
              value={mapping[field.name] || ''}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [field.name]: e.target.value }))
              }
              style={{
                flex: 1,
                padding: '4px 8px',
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
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
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
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
              background: '#2563eb',
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
