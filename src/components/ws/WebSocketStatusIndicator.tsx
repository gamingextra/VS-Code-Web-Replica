'use client';

import { useState, useEffect } from 'react';
import { useWebSocketStore, type WSStatus } from '@/store/websocketStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';

const STATUS_CONFIG: Record<WSStatus, { color: string; label: string }> = {
  connected: { color: '#4ec9b0', label: 'Connected' },
  connecting: { color: '#dcb74a', label: 'Connecting...' },
  reconnecting: { color: '#dcb74a', label: 'Reconnecting...' },
  disconnected: { color: '#f48771', label: 'Disconnected' },
};

export function WebSocketStatusIndicator() {
  const { status, latency, connectedAt, reconnectAttempts, serverUrl, messages } = useWebSocketStore();
  const { isMobile } = useBreakpoint();
  const [showDetails, setShowDetails] = useState(false);
  const [uptime, setUptime] = useState('');

  const config = STATUS_CONFIG[status];

  useEffect(() => {
    if (!connectedAt) { setUptime('--'); return; }
    const updateUptime = () => {
      const diff = Date.now() - connectedAt;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) setUptime(`${hrs}h ${mins % 60}m`);
      else setUptime(`${mins}m`);
    };
    updateUptime();
    const interval = setInterval(updateUptime, 60000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => {
      useWebSocketStore.getState().simulateActivity();
    }, 5000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <>
      <button
        onClick={() => setShowDetails(!showDetails)}
        title={`WebSocket: ${config.label} (${latency}ms)`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 6px',
          height: 22,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 400,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span
          className={status === 'connecting' || status === 'reconnecting' ? 'ws-connecting' : undefined}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: config.color,
            flexShrink: 0,
          }}
        />
        {!isMobile && <span style={{ fontSize: 11 }}>{latency}ms</span>}
      </button>

      {showDetails && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowDetails(false)} />
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              right: 4,
              width: isMobile ? 'calc(100vw - 8px)' : 320,
              maxWidth: 400,
              backgroundColor: 'var(--vscode-dropdown-bg)',
              border: '1px solid var(--vscode-border)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 10000,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid var(--vscode-border)',
                backgroundColor: 'var(--vscode-sidebar-bg)',
              }}
            >
              <Activity size={14} style={{ color: config.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vscode-fg)' }}>
                WebSocket Connection
              </span>
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Status" value={config.label} valueColor={config.color} />
              <InfoRow label="Server" value={serverUrl} />
              <InfoRow label="Latency" value={`${latency}ms`} />
              <InfoRow label="Uptime" value={uptime} />
              <InfoRow label="Messages" value={String(messages.length)} />
              {reconnectAttempts > 0 && (
                <InfoRow label="Reconnects" value={String(reconnectAttempts)} valueColor="var(--vscode-warning)" />
              )}
            </div>

            {messages.length > 0 && (
              <div style={{ borderTop: '1px solid var(--vscode-border)', maxHeight: 150, overflow: 'auto' }}>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.5 }}>
                  Recent Messages
                </div>
                {messages.slice(-5).reverse().map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 12px',
                      fontSize: 11,
                      color: 'var(--vscode-fg)',
                    }}
                  >
                    <span style={{ fontSize: 9, color: msg.direction === 'sent' ? '#569cd6' : '#4ec9b0', fontWeight: 600 }}>
                      {msg.direction === 'sent' ? 'TX' : 'RX'}
                    </span>
                    <span style={{ opacity: 0.5 }}>{msg.type}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.data}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--vscode-fg)', opacity: 0.6 }}>{label}</span>
      <span style={{ color: valueColor || 'var(--vscode-fg)', fontFamily: 'monospace', fontSize: 11 }}>{value}</span>
    </div>
  );
}
