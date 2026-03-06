import { useState, type DragEvent } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import type { TaskInfo } from '../types';

export function TaskPalette() {
  const { availableTasks } = useWorkflowStore();
  const [search, setSearch] = useState('');

  const filtered = availableTasks.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.import_path.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (e: DragEvent, task: TaskInfo) => {
    e.dataTransfer.setData('application/taskekrabbe-task', JSON.stringify(task));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 8, fontWeight: 700, fontSize: 14, borderBottom: '1px solid #444' }}>
        Tasks ({availableTasks.length})
      </div>
      <div style={{ padding: 8 }}>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 8px',
            border: '1px solid #555',
            borderRadius: 4,
            background: '#2a2a2a',
            color: '#e0e0e0',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        {filtered.length === 0 && (
          <div style={{ color: '#888', fontSize: 12, padding: 8 }}>
            {availableTasks.length === 0 ? 'Scan a directory to discover tasks' : 'No matches'}
          </div>
        )}
        {filtered.map((task) => (
          <div
            key={task.import_path}
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            style={{
              padding: '8px 10px',
              marginBottom: 4,
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: 6,
              cursor: 'grab',
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{task.name}</div>
            <div style={{ color: '#aaa', fontSize: 11 }}>
              {task.input_type_name} → {task.output_type_name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
