'use client';

import { useState, useEffect } from 'react';
import { useStatusBarStore } from '@/store/statusBarStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useNotificationStore } from '@/store/notificationStore';
import { GitBranchIcon, WarningIcon, ErrorIcon, BellIcon, CheckIcon } from '@/components/icons';
import { useWindowSize } from '@/hooks/useWindowSize';

const BRANCHES = ['main', 'develop', 'feature/auth'];
const INDENTS = ['Spaces: 2', 'Spaces: 4', 'Spaces: 8', 'Tab'];
const ENCODINGS = ['UTF-8', 'UTF-16', 'Latin-1'];
const EOLS = ['LF', 'CRLF'];
const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java',
  'C++', 'HTML', 'CSS', 'SCSS', 'JSON', 'YAML', 'Markdown',
  'SQL', 'Shell', 'Dockerfile', 'Vue', 'XML',
];

function PopoverPicker({
  trigger,
  options,
  value,
  onChange,
}: {
  trigger: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
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
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {trigger}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              bottom: 22,
              left: 0,
              backgroundColor: 'var(--vscode-dropdown-bg)',
              border: '1px solid var(--vscode-border)',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 10000,
              minWidth: 140,
              padding: '4px 0',
            }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--vscode-fg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: opt === value ? 'var(--vscode-list-active)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.backgroundColor = 'var(--vscode-list-hover)'; }}
                onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>{opt}</span>
                {opt === value && <span style={{ fontSize: 10 }}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function StatusBar() {
  const {
    branch,
    language,
    line,
    col,
    problems,
    encoding,
    eol,
    indentation,
  } = useStatusBarStore();
  const sidebar = useSidebarStore();
  const { width } = useWindowSize();
  const { unreadCount, toggleCenter } = useNotificationStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  // Simulate connection status monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Very rarely show "reconnecting" for a few seconds
      if (Math.random() < 0.005) {
        setConnectionStatus('reconnecting');
        setTimeout(() => setConnectionStatus('connected'), 2000);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasProblems = problems.errors > 0 || problems.warnings > 0;

  const showCursorPos = width >= 480;
  const showIndent = width >= 580;
  const showEncoding = width >= 680;
  const showEol = width >= 760;
  const showLanguage = width >= 420;

  return (
    <div
      style={{
        height: 22,
        backgroundColor: connectionStatus === 'connected'
          ? 'var(--vscode-statusBar-bg)'
          : '#8b5a00',
        color: 'var(--vscode-statusBar-fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        fontSize: 12,
        fontWeight: 400,
        flexShrink: 0,
        userSelect: 'none',
        overflow: 'hidden',
        minWidth: 0,
        transition: 'background-color 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', flexShrink: 0 }}>
        {/* Remote Connection Indicator */}
        <button
          title={
            connectionStatus === 'connected'
              ? 'Connected to code-server at 127.0.0.1:8080'
              : connectionStatus === 'reconnecting'
              ? 'Reconnecting...'
              : 'Disconnected'
          }
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
            fontWeight: 600,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.287 6.783l-.8-.8A4.784 4.784 0 018 3.5c1.78 0 3.35.975 4.188 2.433l-.866.5A3.784 3.784 0 008 4.5a3.784 3.784 0 00-3.713 2.283zm1.6 1.6l-.8-.8A2.79 2.79 0 018 6.5c1.04 0 1.94.57 2.413 1.413l-.866.5A1.79 1.79 0 008 7.5a1.79 1.79 0 00-1.113.883zM8 10a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? '#4ec9b0' : connectionStatus === 'reconnecting' ? '#dcb74a' : '#f48771',
                animation: connectionStatus === 'reconnecting' ? 'pulse 1s infinite' : 'none',
              }}
            />
            {connectionStatus === 'connected' && 'Remote'}
            {connectionStatus === 'reconnecting' && 'Reconnecting'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </span>
        </button>

        <PopoverPicker
          trigger={<><GitBranchIcon size={14} /><span style={{ marginLeft: 3 }}>{branch}</span></>}
          options={BRANCHES}
          value={branch}
          onChange={(v) => useStatusBarStore.setState({ branch: v })}
        />

        <StatusBarItem>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 7.5A5.5 5.5 0 018 2.5V0l4 3-4 3V4.5a3.5 3.5 0 103.5 3.5h2A5.5 5.5 0 012.5 7.5z" />
          </svg>
        </StatusBarItem>

        <button
          onClick={() => { sidebar.setView('explorer'); if (!sidebar.isVisible) sidebar.toggle(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px',
            height: 22, background: 'transparent', border: 'none',
            color: 'inherit', cursor: 'pointer', fontSize: 12, fontWeight: 400,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {hasProblems ? (
            <>
              {problems.errors > 0 && <><ErrorIcon size={14} /><span>{problems.errors}</span></>}
              {problems.warnings > 0 && <><WarningIcon size={14} /><span>{problems.warnings}</span></>}
            </>
          ) : (
            <CheckIcon size={14} />
          )}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
        {showCursorPos && (
          <StatusBarItem>
            <span>Ln {line}, Col {col}</span>
          </StatusBarItem>
        )}

        {showIndent && (
          <PopoverPicker
            trigger={<span>{indentation}</span>}
            options={INDENTS}
            value={indentation}
            onChange={(v) => useStatusBarStore.setState({ indentation: v })}
          />
        )}

        {showEncoding && (
          <PopoverPicker
            trigger={<span>{encoding}</span>}
            options={ENCODINGS}
            value={encoding}
            onChange={(v) => useStatusBarStore.setState({ encoding: v })}
          />
        )}

        {showEol && (
          <PopoverPicker
            trigger={<span>{eol}</span>}
            options={EOLS}
            value={eol}
            onChange={(v) => useStatusBarStore.setState({ eol: v })}
          />
        )}

        {showLanguage && (
          <PopoverPicker
            trigger={<span>{language}</span>}
            options={LANGUAGES}
            value={language}
            onChange={(v) => useStatusBarStore.setState({ language: v })}
          />
        )}

        {/* Notification Bell with unread badge */}
        <button
          onClick={toggleCenter}
          title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            height: 22,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            position: 'relative',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <BellIcon size={14} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#f48771',
                color: '#ffffff',
                fontSize: 7,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function StatusBarItem({ children }: { children: React.ReactNode }) {
  return (
    <button
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
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}
