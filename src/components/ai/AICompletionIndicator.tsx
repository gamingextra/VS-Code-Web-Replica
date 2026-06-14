'use client';

import { useAICompletionStore } from '@/store/aiCompletionStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { Sparkles, Check, X } from 'lucide-react';

export function AICompletionIndicator() {
  const { enabled, isProcessing, currentCompletion, acceptCompletion, dismissCompletion } = useAICompletionStore();
  const { isMobile } = useBreakpoint();

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: isMobile ? 80 : 40,
        right: 12,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-end',
        pointerEvents: isProcessing || currentCompletion ? 'auto' : 'none',
      }}
    >
      {isProcessing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: isMobile ? '8px 12px' : '6px 10px',
            backgroundColor: 'var(--vscode-dropdown-bg)',
            border: '1px solid var(--vscode-border)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: 12,
            color: 'var(--vscode-fg)',
            pointerEvents: 'auto',
          }}
        >
          <Sparkles size={14} className="ws-connecting" style={{ color: '#c586c0' }} />
          <span style={{ opacity: 0.8 }}>AI thinking...</span>
        </div>
      )}

      {currentCompletion && !isProcessing && (
        <div
          style={{
            maxWidth: isMobile ? '90vw' : 400,
            backgroundColor: 'var(--vscode-dropdown-bg)',
            border: '1px solid var(--vscode-border)',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderBottom: '1px solid var(--vscode-border)',
              backgroundColor: 'rgba(197, 134, 192, 0.1)',
              fontSize: 11,
              color: '#c586c0',
              fontWeight: 600,
            }}
          >
            <Sparkles size={12} />
            <span>AI Suggestion</span>
            <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>
              {currentCompletion.language}
            </span>
          </div>

          <div
            style={{
              padding: '8px 10px',
              fontSize: 12,
              fontFamily: '"Cascadia Code", "SF Mono", Menlo, Monaco, monospace',
              color: 'var(--vscode-editor-fg)',
              whiteSpace: 'pre-wrap',
              maxHeight: 120,
              overflow: 'auto',
              lineHeight: 1.4,
            }}
          >
            <span style={{ opacity: 0.4 }}>  </span>
            {currentCompletion.displayText}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderTop: '1px solid var(--vscode-border)',
            }}
          >
            <button
              onClick={acceptCompletion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '6px 10px' : '4px 8px',
                background: 'var(--vscode-button-bg)',
                border: 'none',
                borderRadius: 3,
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Check size={12} />
              Accept {isMobile ? '' : '(Tab)'}
            </button>
            <button
              onClick={dismissCompletion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '6px 10px' : '4px 8px',
                background: 'transparent',
                border: '1px solid var(--vscode-border)',
                borderRadius: 3,
                color: 'var(--vscode-fg)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <X size={12} />
              Dismiss {isMobile ? '' : '(Esc)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AICompletionToggle() {
  const { enabled, setEnabled } = useAICompletionStore();

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      title={enabled ? 'AI Completions: On' : 'AI Completions: Off'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 6px',
        height: 22,
        background: 'transparent',
        border: 'none',
        color: enabled ? '#c586c0' : 'var(--vscode-fg)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 400,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        opacity: enabled ? 1 : 0.5,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <Sparkles size={13} />
    </button>
  );
}
