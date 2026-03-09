import { useWorkflowStore } from '../store/workflowStore';

export function WorkflowList() {
  const { existingWorkflows, loadExistingWorkflow } = useWorkflowStore();

  if (existingWorkflows.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid #e2e8f0', padding: 8, flexShrink: 0, maxHeight: '40%', overflow: 'auto' }}>
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
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>{wf.name}</div>
          <div style={{ color: '#94a3b8', fontSize: 10 }}>
            {wf.source} · {wf.tasks.length} tasks
          </div>
        </div>
      ))}
    </div>
  );
}
