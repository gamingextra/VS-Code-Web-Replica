'use client';

import { useState, useRef, useEffect } from 'react';
import { useCodeExecutionStore, type ExecutionResult } from '@/store/codeExecutionStore';
import { useEditorStore } from '@/store/editorStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { Play, Square, Trash2, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

export function CodeExecutionPanel() {
  const { isExecuting, results, currentResult, showPanel, execute, clearResults, hidePanel } = useCodeExecutionStore();
  const { getActiveTab } = useEditorStore();
  const { isMobile } = useBreakpoint();
  const outputRef = useRef<HTMLDivElement>(null);

  const activeTab = getActiveTab();
  const language = activeTab?.path ? activeTab.path.split('.').pop() || 'plaintext' : 'plaintext';

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [results]);

  if (!showPanel) return null;

  const handleRun = () => {
    if (activeTab?.content) {
      execute(activeTab.content, language);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-panel-bg)',
        borderTop: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        maxHeight: isMobile ? '45vh' : '40vh',
        minHeight: 120,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isMobile ? '8px 12px' : '6px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          flexShrink: 0,
        }}
      >
        <Zap size={14} style={{ color: '#dcb74a' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--vscode-fg)', textTransform: 'uppercase' }}>
          Code Execution
        </span>
        <span style={{ fontSize: 10, opacity: 0.5, color: 'var(--vscode-fg)' }}>
          {language.toUpperCase()} Sandbox
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleRun}
          disabled={isExecuting || !activeTab?.content}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '6px 12px' : '4px 10px',
            background: isExecuting ? 'var(--vscode-input-bg)' : 'var(--vscode-button-bg)',
            border: 'none',
            borderRadius: 3,
            color: '#fff',
            fontSize: 11,
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            opacity: isExecuting ? 0.6 : 1,
          }}
        >
          {isExecuting ? <Square size={11} /> : <Play size={11} />}
          {isExecuting ? 'Running...' : 'Run Code'}
        </button>
        <button
          onClick={clearResults}
          title="Clear Results"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-fg)',
            cursor: 'pointer',
            borderRadius: 3,
            opacity: 0.5,
          }}
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={hidePanel}
          title="Close Panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-fg)',
            cursor: 'pointer',
            borderRadius: 3,
            opacity: 0.5,
          }}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="execution-output scrollable-child"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? '8px 12px' : '8px 16px',
          minHeight: 0,
        }}
      >
        {results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3, gap: 8 }}>
            <Play size={24} />
            <span style={{ fontSize: 12 }}>Click "Run Code" to execute in sandbox</span>
          </div>
        ) : (
          results.map((result) => <ExecutionResultView key={result.id} result={result} isMobile={isMobile} />)
        )}
      </div>
    </div>
  );
}

function ExecutionResultView({ result, isMobile }: { result: ExecutionResult; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(true);

  const statusIcon = result.status === 'completed'
    ? <CheckCircle2 size={12} style={{ color: 'var(--vscode-success)' }} />
    : result.status === 'error'
    ? <AlertCircle size={12} style={{ color: 'var(--vscode-error)' }} />
    : <Clock size={12} style={{ color: 'var(--vscode-warning)' }} />;

  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 4,
        border: '1px solid var(--vscode-border)',
        overflow: 'hidden',
      }}
    >
      {/* Result header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: isMobile ? '8px 10px' : '6px 10px',
          backgroundColor: 'var(--vscode-input-bg)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {statusIcon}
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--vscode-fg)' }}>
          {result.language.toUpperCase()} - Exit {result.exitCode}
        </span>
        <span style={{ fontSize: 10, opacity: 0.4 }}>
          {result.executionTime}ms
        </span>
        <div style={{ flex: 1 }} />
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>

      {/* Result body */}
      {expanded && (
        <div style={{ padding: isMobile ? '8px 10px' : '8px 12px' }}>
          {result.error && (
            <div
              style={{
                color: 'var(--vscode-error)',
                fontSize: 12,
                fontFamily: 'monospace',
                marginBottom: 8,
                padding: '4px 8px',
                backgroundColor: 'rgba(244, 135, 113, 0.1)',
                borderRadius: 3,
              }}
            >
              {result.error}
            </div>
          )}
          <pre
            style={{
              margin: 0,
              fontFamily: '"Cascadia Code", "SF Mono", Menlo, Monaco, monospace',
              fontSize: 12,
              lineHeight: 1.5,
              color: result.status === 'error' ? 'var(--vscode-error)' : 'var(--vscode-editor-fg)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {result.output}
          </pre>
        </div>
      )}
    </div>
  );
}
