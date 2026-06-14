'use client';

import { useState, useRef, useEffect } from 'react';
import { getCompletions } from './shellCommands';

interface Props {
  onSubmit: (cmd: string) => void | Promise<void>;
  onInterrupt: () => void;
  history: string[];
  cwd: string;
  mode?: 'shell' | 'claude';
}

export function TerminalInput({ onSubmit, onInterrupt, history, cwd, mode = 'shell' }: Props) {
  const [value, setValue] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [showCompletions, setShowCompletions] = useState(false);
  const [completions, setCompletions] = useState<string[]>([]);
  const [completionStart, setCompletionStart] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isClaude = mode === 'claude';
  const prompt = isClaude ? '>' : (cwd === '/home/user/workspace' ? '~' : cwd);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleTabComplete = () => {
    if (isClaude) return;
    const results = getCompletions(value, cwd);

    if (results.length === 0) {
      setShowCompletions(false);
      return;
    }

    if (results.length === 1) {
      // Single match - complete it
      const completion = results[0];
      const tokens = value.split(/\s+/);
      const lastToken = tokens[tokens.length - 1];
      const basePath = lastToken.includes('/')
        ? lastToken.substring(0, lastToken.lastIndexOf('/') + 1)
        : '';
      tokens[tokens.length - 1] = basePath + completion;
      setValue(tokens.join(' '));
      setShowCompletions(false);
      return;
    }

    // Multiple matches - find common prefix and show list
    const commonPrefix = findCommonPrefix(results);
    if (commonPrefix) {
      const tokens = value.split(/\s+/);
      const lastToken = tokens[tokens.length - 1];
      const basePath = lastToken.includes('/')
        ? lastToken.substring(0, lastToken.lastIndexOf('/') + 1)
        : '';
      tokens[tokens.length - 1] = basePath + commonPrefix;
      setValue(tokens.join(' '));
    }
    setCompletions(results);
    setCompletionStart(0);
    setShowCompletions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
    }
    else if (e.key === 'Enter') {
      e.preventDefault();
      setShowCompletions(false);
      if (value.trim()) { onSubmit(value.trim()); setValue(''); setHistIdx(-1); }
    }
    else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      setShowCompletions(false);
      onInterrupt();
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowCompletions(false);
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setValue(history[idx] || '');
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowCompletions(false);
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); setValue(''); } else { setHistIdx(idx); setValue(history[idx] || ''); }
    }
    else if (e.key === 'Escape') {
      setShowCompletions(false);
    }
    else {
      setShowCompletions(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px', gap: 4, fontFamily: '"Cascadia Code", "SF Mono", Menlo, Consolas, monospace', fontSize: 13, borderTop: '1px solid var(--vscode-panel-border)' }}>
        <span style={{ color: isClaude ? '#75beff' : 'var(--vscode-success)', whiteSpace: 'nowrap', userSelect: 'none' }}>
          {isClaude ? '>' : `user@vscode:${prompt}$`}
        </span>
        <input ref={inputRef} type="text" value={value} onChange={e => { setValue(e.target.value); setShowCompletions(false); }} onKeyDown={handleKeyDown} spellCheck={false} autoComplete="off" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--vscode-fg)', fontFamily: 'inherit', fontSize: 13, padding: 0, margin: 0 }} />
      </div>
      {showCompletions && completions.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 8,
            backgroundColor: 'var(--vscode-dropdown-bg)',
            border: '1px solid var(--vscode-border)',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            padding: '4px 0',
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 100,
            minWidth: 200,
          }}
        >
          {completions.map((c, i) => (
            <div
              key={c}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                fontFamily: '"Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
                color: 'var(--vscode-fg)',
                cursor: 'pointer',
                backgroundColor: i === completionStart ? 'var(--vscode-list-active)' : 'transparent',
              }}
              onClick={() => {
                const tokens = value.split(/\s+/);
                const lastToken = tokens[tokens.length - 1];
                const basePath = lastToken.includes('/')
                  ? lastToken.substring(0, lastToken.lastIndexOf('/') + 1)
                  : '';
                tokens[tokens.length - 1] = basePath + c;
                setValue(tokens.join(' '));
                setShowCompletions(false);
                inputRef.current?.focus();
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}
