'use client';

import { useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import { processCommand } from './shellCommands';
import { TerminalOutput } from './TerminalOutput';
import { TerminalInput } from './TerminalInput';
import { useBreakpoint } from '@/hooks/useWindowSize';

export function Terminal() {
  const store = useTerminalStore();
  const { terminals, activeTerminalId } = store;
  const active = terminals.find((t) => t.id === activeTerminalId) || terminals[0];
  const { isMobile } = useBreakpoint();

  const handleCommand = useCallback(
    async (cmd: string) => {
      const currentActive = terminals.find((t) => t.id === activeTerminalId) || terminals[0];
      if (!currentActive) return;
      const promptText = `user@vscode:${currentActive.cwd.replace('/home/user/workspace', '~')}$ ${cmd}`;
      store.addOutput(currentActive.id, { type: 'prompt', text: promptText });
      store.addHistory(currentActive.id, cmd);

      const result = processCommand(cmd, currentActive.cwd);

      if (result.clear) { store.clearOutput(currentActive.id); return; }
      if (result.enterClaude) { store.addOutput(currentActive.id, { type: 'output', text: 'Claude REPL not available in this environment.' }); return; }

      if (result.output) {
        const lineType = result.error ? 'error' : result.success ? 'success' : 'output';
        store.addOutput(currentActive.id, { type: lineType as 'output' | 'error' | 'success', text: result.output });
      }

      if (result.newCwd !== currentActive.cwd) {
        store.setCwd(currentActive.id, result.newCwd);
      }
    },
    [terminals, activeTerminalId, store]
  );

  const handleInterrupt = useCallback(() => {
    if (!active) return;
    store.addOutput(active.id, { type: 'info', text: '^C' });
  }, [active, store]);

  if (!active) return <div style={{ padding: 8, opacity: 0.5 }}>No terminal</div>;

  // Mobile: larger close buttons and new terminal button
  const tabCloseBtnSize = isMobile ? 32 : 20;
  const newTermBtnSize = isMobile ? 32 : 24;
  const tabHeight = isMobile ? 36 : 28;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--vscode-panel-border)', padding: '0 4px', flexShrink: 0, minHeight: isMobile ? 36 : undefined }}>
        {terminals.map((t) => (
          <button
            key={t.id}
            onClick={() => store.setActiveTerminal(t.id)}
            style={{
              padding: isMobile ? '4px 8px' : '4px 12px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              borderBottom: t.id === activeTerminalId ? '1px solid #fff' : '1px solid transparent',
              color: 'var(--vscode-fg)',
              opacity: t.id === activeTerminalId ? 1 : 0.6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              minHeight: isMobile ? 36 : undefined,
            }}
          >
            {t.name}
            <span
              onClick={(e) => { e.stopPropagation(); store.closeTerminal(t.id); }}
              style={{
                marginLeft: 4,
                cursor: 'pointer',
                opacity: 0.5,
                fontSize: 10,
                width: tabCloseBtnSize,
                height: tabCloseBtnSize,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
              }}
              onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              ×
            </span>
          </button>
        ))}
        <button
          onClick={() => store.createTerminal()}
          style={{
            width: newTermBtnSize,
            height: newTermBtnSize,
            fontSize: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-fg)',
            cursor: 'pointer',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            flexShrink: 0,
          }}
          onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          +
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <TerminalOutput lines={active.output} />
      </div>
      <TerminalInput onSubmit={handleCommand} onInterrupt={handleInterrupt} history={active.history} cwd={active.cwd} />
    </div>
  );
}
