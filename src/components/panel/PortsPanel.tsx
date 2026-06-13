'use client';

import { useState } from 'react';
import { usePortStore, type PortForward } from '@/store/portStore';

function PortItem({ port }: { port: PortForward }) {
  const { togglePort, removePort } = usePortStore();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        fontSize: 12,
        color: 'var(--vscode-fg)',
        borderBottom: '1px solid var(--vscode-border)',
      }}
    >
      {/* Status indicator */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: port.running ? '#4ec9b0' : '#666666',
          flexShrink: 0,
        }}
        title={port.running ? 'Running' : 'Stopped'}
      />

      {/* Port info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 500, color: '#569cd6', fontFamily: 'monospace' }}>
            :{port.localPort}
          </span>
          <span style={{ opacity: 0.5 }}>→</span>
          <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>
            :{port.remotePort}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: 'rgba(86, 156, 214, 0.15)',
              color: '#569cd6',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {port.protocol}
          </span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>
          {port.name}
          {port.pid && <span> (PID: {port.pid})</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => togglePort(port.id)}
          title={port.running ? 'Stop forwarding' : 'Start forwarding'}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid var(--vscode-border)',
            borderRadius: 3,
            color: port.running ? '#f48771' : '#4ec9b0',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {port.running ? '■' : '▶'}
        </button>
        {port.running && (
          <button
            onClick={() => {
              // Simulate opening the port in browser
              const url = `http://localhost:${port.localPort}`;
              navigator.clipboard.writeText(url);
            }}
            title="Copy URL"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid var(--vscode-border)',
              borderRadius: 3,
              color: 'var(--vscode-fg)',
              cursor: 'pointer',
              fontSize: 11,
              opacity: 0.6,
            }}
          >
            ⎘
          </button>
        )}
        <button
          onClick={() => removePort(port.id)}
          title="Remove port"
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid var(--vscode-border)',
            borderRadius: 3,
            color: 'var(--vscode-fg)',
            cursor: 'pointer',
            fontSize: 11,
            opacity: 0.4,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function PortsPanel() {
  const { ports, addPort } = usePortStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newPort, setNewPort] = useState('8080');
  const [newName, setNewName] = useState('');

  const runningPorts = ports.filter((p) => p.running);
  const stoppedPorts = ports.filter((p) => !p.running);

  const handleAddPort = () => {
    const portNum = parseInt(newPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return;
    addPort({
      localPort: portNum,
      remotePort: portNum,
      protocol: 'http',
      name: newName || `Port ${portNum}`,
    });
    setNewPort('8080');
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--vscode-fg)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--vscode-border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          PORTS ({runningPorts.length} running, {ports.length} total)
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            background: 'transparent',
            border: '1px solid var(--vscode-border)',
            borderRadius: 3,
            color: 'var(--vscode-fg)',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          Forward Port
        </button>
      </div>

      {/* Add Port Form */}
      {showAdd && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--vscode-border)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(e.target.value)}
            placeholder="Port"
            min={1}
            max={65535}
            style={{
              width: 70,
              height: 24,
              padding: '0 6px',
              backgroundColor: 'var(--vscode-input-bg)',
              border: '1px solid var(--vscode-border)',
              borderRadius: 3,
              color: 'var(--vscode-fg)',
              fontSize: 12,
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (optional)"
            style={{
              flex: 1,
              height: 24,
              padding: '0 6px',
              backgroundColor: 'var(--vscode-input-bg)',
              border: '1px solid var(--vscode-border)',
              borderRadius: 3,
              color: 'var(--vscode-fg)',
              fontSize: 12,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleAddPort}
            style={{
              height: 24,
              padding: '0 10px',
              backgroundColor: '#0e639c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 3,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Port List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {runningPorts.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#4ec9b0',
                padding: '6px 12px 2px',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Running
            </div>
            {runningPorts.map((port) => (
              <PortItem key={port.id} port={port} />
            ))}
          </>
        )}
        {stoppedPorts.length > 0 && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#888888',
                padding: '6px 12px 2px',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Stopped
            </div>
            {stoppedPorts.map((port) => (
              <PortItem key={port.id} port={port} />
            ))}
          </>
        )}
        {ports.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 16px',
              opacity: 0.4,
              fontSize: 12,
            }}
          >
            No forwarded ports. Click &quot;Forward Port&quot; to add one.
          </div>
        )}
      </div>
    </div>
  );
}
