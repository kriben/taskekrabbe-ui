import { useWorkflowStore } from '../store/workflowStore';

export function InputYamlPreview() {
  const { generatedInputYaml } = useWorkflowStore();

  if (!generatedInputYaml) {
    return (
      <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
        Click "Export Input YAML" to generate input configuration
      </div>
    );
  }

  return (
    <pre
      style={{
        padding: 12,
        margin: 0,
        fontSize: 12,
        lineHeight: 1.5,
        overflow: 'auto',
        height: '100%',
        background: '#f8fafc',
        color: '#334155',
        fontFamily: 'monospace',
      }}
    >
      {generatedInputYaml}
    </pre>
  );
}
