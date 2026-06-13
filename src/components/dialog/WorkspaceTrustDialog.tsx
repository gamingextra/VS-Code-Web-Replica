'use client';

import { useState } from 'react';

interface WorkspaceTrustDialogProps {
  onTrust: () => void;
  onDismiss: () => void;
}

export function WorkspaceTrustDialog({ onTrust, onDismiss }: WorkspaceTrustDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleTrust = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('vscode-workspace-trusted', 'true');
    }
    onTrust();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--vscode-editor-bg)',
          border: '1px solid var(--vscode-border)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          maxWidth: 520,
          width: '90%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--vscode-border)',
            backgroundColor: 'var(--vscode-sidebar-bg)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 183, 74, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#dcb74a">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-.5 2.5v4h1v-4h-1zm0 5v1h1v-1h-1z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vscode-fg)' }}>
              Do you trust the authors of the files in this folder?
            </div>
            <div style={{ fontSize: 11, color: 'var(--vscode-fg)', opacity: 0.6, marginTop: 2 }}>
              code-server - Workspace Trust
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--vscode-fg)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Trusting a workspace allows extensions to execute code and enables all features.
            In an untrusted workspace, many features are restricted to protect you from
            potential security risks.
          </p>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(220, 183, 74, 0.08)',
              border: '1px solid rgba(220, 183, 74, 0.2)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--vscode-fg)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#dcb74a' }}>Features restricted in untrusted workspaces:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 16, opacity: 0.8 }}>
              <li>Terminal access</li>
              <li>Task execution</li>
              <li>Extension API access</li>
              <li>Debugging</li>
            </ul>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--vscode-fg)',
              opacity: 0.8,
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Trust all workspaces by default
          </label>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid var(--vscode-border)',
            backgroundColor: 'var(--vscode-sidebar-bg)',
          }}
        >
          <button
            onClick={onDismiss}
            style={{
              height: 28,
              padding: '0 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--vscode-border)',
              borderRadius: 4,
              color: 'var(--vscode-fg)',
              fontSize: 12,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            No, Don&apos;t Trust
          </button>
          <button
            onClick={handleTrust}
            style={{
              height: 28,
              padding: '0 14px',
              backgroundColor: '#0e639c',
              border: 'none',
              borderRadius: 4,
              color: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1177bb';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0e639c';
            }}
          >
            Yes, I Trust This Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
