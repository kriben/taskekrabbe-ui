import { useWorkflowStore } from '../store/workflowStore';

export function YamlPreview() {
  const { generatedYaml } = useWorkflowStore();

  if (!generatedYaml) {
    return (
      <div style={{ padding: 12, color: '#888', fontSize: 12 }}>
        Click "Export YAML" to generate workflow configuration
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
        background: '#1a1a2e',
        color: '#c8d6e5',
        fontFamily: 'monospace',
      }}
    >
      {generatedYaml}
    </pre>
  );
}
