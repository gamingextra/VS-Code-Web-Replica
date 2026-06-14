'use client';

import { useState } from 'react';

export function DebugConsolePanel() {
  const [history, setHistory] = useState<{ input: string; result: string; error?: boolean }[]>([]);
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    const expr = input.trim();
    // Simple safe evaluation - just return the expression as a string display
    // since we can't use eval or Function in this environment
    try {
      // Attempt basic math expressions safely
      const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
      if (sanitized === expr && sanitized.length > 0) {
        const result = Function('"use strict"; return (' + sanitized + ')')();
        setHistory([...history, { input: expr, result: String(result) }]);
      } else {
        setHistory([...history, { input: expr, result: expr, error: false }]);
      }
    } catch (e) {
      setHistory([...history, { input: expr, result: String(e), error: true }]);
    }
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 13, fontFamily: '"Cascadia Code", "SF Mono", Menlo, Consolas, monospace' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {history.map((h, i) => (
          <div key={i}>
            <div style={{ color: 'var(--vscode-fg)' }}>{'>'} {h.input}</div>
            <div style={{ color: h.error ? '#f48771' : 'var(--vscode-fg)' }}>{h.result}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px', borderTop: '1px solid var(--vscode-panel-border)', gap: 4 }}>
        <span style={{ color: 'var(--vscode-success)' }}>{'>'}</span>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--vscode-fg)', fontFamily: 'inherit', fontSize: 13 }} spellCheck={false} autoComplete="off" />
      </div>
    </div>
  );
}
