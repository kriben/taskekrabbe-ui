import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowStore } from './store/workflowStore';
import { DirectoryPicker } from './components/DirectoryPicker';
import { TaskPalette } from './components/TaskPalette';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { WorkflowList } from './components/WorkflowList';
import { YamlPreview } from './components/YamlPreview';
import { InputYamlPreview } from './components/InputYamlPreview';
import { ToastContainer } from './components/ToastContainer';
import { useToastStore } from './store/toastStore';

type BottomTab = 'yaml' | 'input-yaml' | 'validation';

export default function App() {
  const {
    validate,
    exportYaml,
    exportInputYaml,
    validationErrors,
    workflowName,
    setWorkflowName,
    clearWorkflow,
    autoLayout,
    nodes,
  } = useWorkflowStore();
  const [bottomTab, setBottomTab] = useState<BottomTab>('yaml');
  const addToast = useToastStore((s) => s.addToast);
  const [bottomHeight, setBottomHeight] = useState(200);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = bottomHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - ev.clientY;
      const newHeight = Math.min(Math.max(startHeight.current + delta, 100), window.innerHeight - 200);
      setBottomHeight(newHeight);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [bottomHeight]);

  const handleValidate = async () => {
    await validate();
    setBottomTab('validation');
  };

  const handleExport = async () => {
    try {
      await exportYaml();
      setBottomTab('yaml');
      addToast('YAML generated');
    } catch (e) {
      addToast(`Export failed: ${e}`, 'error');
    }
  };

  const handleExportInputYaml = () => {
    try {
      exportInputYaml();
      setBottomTab('input-yaml');
      addToast('Input YAML generated');
    } catch (e) {
      addToast(`Export failed: ${e}`, 'error');
    }
  };

  return (
    <ReactFlowProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#f5f7fa',
          color: '#1e293b',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Main area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <div
            style={{
              width: 220,
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <TaskPalette />
            </div>
            <WorkflowList />
          </div>

          {/* Center canvas */}
          <WorkflowCanvas />

          {/* Right panel */}
          <div
            style={{
              width: 240,
              borderLeft: '1px solid #e2e8f0',
              background: '#ffffff',
              overflow: 'auto',
            }}
          >
            <TaskDetailPanel />
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onResizeStart}
          style={{
            height: 5,
            cursor: 'row-resize',
            background: '#e2e8f0',
            flexShrink: 0,
          }}
          title="Drag to resize"
        />

        {/* Bottom panel */}
        <div
          style={{
            height: bottomHeight,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              flexWrap: 'wrap',
            }}
          >
            <DirectoryPicker />
            <div style={{ flex: 1 }} />
            <label style={{ fontSize: 12, fontWeight: 600 }}>Name:</label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              style={{
                padding: '4px 8px',
                width: 140,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                background: '#ffffff',
                color: '#1e293b',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={handleValidate}
              disabled={nodes.length === 0}
              style={{
                padding: '5px 14px',
                background: nodes.length === 0 ? '#cbd5e1' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: nodes.length === 0 ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Validate
            </button>
            <button
              onClick={handleExport}
              disabled={nodes.length === 0}
              style={{
                padding: '5px 14px',
                background: nodes.length === 0 ? '#cbd5e1' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: nodes.length === 0 ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Export YAML
            </button>
            <button
              onClick={handleExportInputYaml}
              disabled={nodes.length === 0}
              style={{
                padding: '5px 14px',
                background: nodes.length === 0 ? '#cbd5e1' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: nodes.length === 0 ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Export Input YAML
            </button>
            <button
              onClick={autoLayout}
              disabled={nodes.length === 0}
              style={{
                padding: '5px 14px',
                background: nodes.length === 0 ? '#cbd5e1' : '#f1f5f9',
                color: nodes.length === 0 ? '#94a3b8' : '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                cursor: nodes.length === 0 ? 'default' : 'pointer',
                fontSize: 12,
              }}
            >
              Auto Layout
            </button>
            <button
              onClick={clearWorkflow}
              style={{
                padding: '5px 14px',
                background: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Clear
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
            {(['yaml', 'input-yaml', 'validation'] as BottomTab[]).map((tab) => {
              const label = tab === 'yaml'
                ? 'YAML Preview'
                : tab === 'input-yaml'
                  ? 'Input YAML'
                  : `Validation${validationErrors.length > 0 ? ` (${validationErrors.length})` : ''}`;
              return (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  style={{
                    padding: '4px 16px',
                    background: bottomTab === tab ? '#ffffff' : 'transparent',
                    color: bottomTab === tab ? '#2563eb' : '#94a3b8',
                    border: 'none',
                    borderBottom: bottomTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {bottomTab === 'yaml' && <YamlPreview />}
            {bottomTab === 'input-yaml' && <InputYamlPreview />}
            {bottomTab === 'validation' && (
              <div style={{ padding: 12, fontSize: 12 }}>
                {validationErrors.length === 0 ? (
                  <div style={{ color: '#16a34a' }}>Workflow is valid</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationErrors.map((err, i) => (
                      <li key={i} style={{ color: '#dc2626', marginBottom: 4 }}>
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </ReactFlowProvider>
  );
}
