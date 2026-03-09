import { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export function DirectoryPicker() {
  const [directory, setDirectory] = useState('/workspace/taskekrabbe/examples/text_analysis');
  const [error, setError] = useState<string | null>(null);
  const { scanDirectory, isScanning, scannedDirectory } = useWorkflowStore();

  const handleScan = async () => {
    setError(null);
    try {
      await scanDirectory(directory);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
      <label style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Directory:</label>
      <input
        type="text"
        value={directory}
        onChange={(e) => setDirectory(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
        style={{
          flex: 1,
          padding: '6px 10px',
          border: '1px solid #cbd5e1',
          borderRadius: 4,
          background: '#ffffff',
          color: '#1e293b',
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      />
      <button
        onClick={handleScan}
        disabled={isScanning}
        style={{
          padding: '6px 16px',
          background: isScanning ? '#cbd5e1' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isScanning ? 'wait' : 'pointer',
          fontWeight: 600,
        }}
      >
        {isScanning ? 'Scanning...' : 'Scan'}
      </button>
      {scannedDirectory && !error && (
        <span style={{ color: '#16a34a', fontSize: 13 }}>Scanned</span>
      )}
      {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
    </div>
  );
}
