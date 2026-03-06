import { useWorkflowStore } from '../store/workflowStore';

export function WorkflowList() {
  const { existingWorkflows, loadExistingWorkflow } = useWorkflowStore();

  if (existingWorkflows.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid #444', padding: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
        Existing Workflows
      </div>
      {existingWorkflows.map((wf) => (
        <div
          key={`${wf.name}-${wf.source}`}
          onClick={() => loadExistingWorkflow(wf)}
          style={{
            padding: '6px 8px',
            marginBottom: 3,
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>{wf.name}</div>
          <div style={{ color: '#888', fontSize: 10 }}>
            {wf.source} · {wf.tasks.length} tasks
          </div>
        </div>
      ))}
    </div>
  );
}
