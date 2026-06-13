import { useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import { processCommand } from './shellCommands';
import { TerminalOutput } from './TerminalOutput';
import { TerminalInput } from './TerminalInput';
import { streamClaudeReply } from './streamClaude';

const CLAUDE_BANNER =
  '● Claude (claude-sonnet-4-6)\n' +
  '  \n' +
  '  Welcome to Claude Code. How can I help you today?\n' +
  '  Type a message or /help for commands, /exit to leave.\n';

export function Terminal() {
  const store = useTerminalStore();
  const { terminals, activeTerminalId } = store;
  const active = terminals.find((t) => t.id === activeTerminalId) || terminals[0];
  const streamAbortRef = useRef(false);
  // Maintain per-terminal conversation history for multi-turn Claude chat
  const historyRef = useRef<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});

  const handleCommand = useCallback(
    async (cmd: string) => {
      if (!active) return;
      const promptText =
        active.mode === 'claude'
          ? `> ${cmd}`
          : `user@vscode:${active.cwd.replace('/home/runner/workspace/artifacts/api-server/workspace', '/home/user/workspace')}$ ${cmd}`;
      store.addOutput(active.id, { type: 'prompt', text: promptText });
      store.addHistory(active.id, cmd);

      if (active.mode === 'claude') {
        const trimmed = cmd.trim();
        if (trimmed === '/exit') {
          store.setMode(active.id, 'shell');
          store.addOutput(active.id, { type: 'output', text: '[exited Claude REPL]' });
          return;
        }
        if (trimmed === '/clear') {
          store.clearOutput(active.id);
          historyRef.current[active.id] = [];
          return;
        }
        if (trimmed === '/help') {
          store.addOutput(active.id, {
            type: 'output',
            text: 'Commands:\n  /help   Show this help\n  /clear  Clear conversation\n  /exit   Exit Claude REPL',
          });
          return;
        }

        // Real Claude streaming
        streamAbortRef.current = false;
        const termHistory = historyRef.current[active.id] || [];

        await streamClaudeReply(
          store,
          active.id,
          trimmed,
          termHistory,
          () => streamAbortRef.current
        );

        // Update history for multi-turn context
        const lastOutputs = store.terminals
          .find(t => t.id === active.id)?.output || [];
        const lastClaudeOutput = [...lastOutputs].reverse().find(l => l.type === 'claude-output');
        if (lastClaudeOutput) {
          historyRef.current[active.id] = [
            ...termHistory,
            { role: 'user' as const, content: trimmed },
            { role: 'assistant' as const, content: lastClaudeOutput.text },
          ].slice(-20); // keep last 20 turns
        }
        return;
      }

      // Shell mode — use real backend exec for most commands
      const result = processCommand(cmd, active.cwd, 'shell');

      if (result.clear) {
        store.clearOutput(active.id);
        return;
      }

      if (result.enterClaude) {
        store.setMode(active.id, 'claude');
        historyRef.current[active.id] = [];
        store.addOutput(active.id, { type: 'output', text: CLAUDE_BANNER });
        return;
      }

      // If the command is a real shell command, call the backend
      const tokens = cmd.trim().split(/\s+/);
      const builtins = new Set(['cd', 'clear', 'echo', 'claude', 'help', 'git', 'npm', 'node', 'python', 'python3', 'whoami', 'date', 'uname']);
      const isBuiltin = builtins.has(tokens[0]);

      if (!isBuiltin && !result.error && result.output === '' && !result.success) {
        // Try real execution
        try {
          const resp = await fetch('/api/terminal/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd, cwd: active.cwd }),
          });
          const data = await resp.json() as { stdout: string; stderr: string; exitCode: number; cwd: string };

          if (data.stdout) {
            store.addOutput(active.id, { type: 'output', text: data.stdout.replace(/\n$/, '') });
          }
          if (data.stderr) {
            store.addOutput(active.id, { type: 'error', text: data.stderr.replace(/\n$/, '') });
          }
          if (data.cwd && data.cwd !== active.cwd) {
            store.setCwd(active.id, data.cwd);
          }
          return;
        } catch {
          // Fall through to simulated result
        }
      }

      if (result.output) {
        const lineType = result.error ? 'error' : result.success ? 'success' : 'output';
        store.addOutput(active.id, { type: lineType as 'output' | 'error' | 'success', text: result.output });
      }

      if (result.newCwd !== active.cwd) {
        store.setCwd(active.id, result.newCwd);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.id, active?.cwd, active?.mode, store]
  );

  const handleInterrupt = useCallback(() => {
    if (!active) return;
    if (active.mode === 'claude') {
      streamAbortRef.current = true;
      store.addOutput(active.id, { type: 'info', text: '^C (interrupted)' });
    } else {
      store.addOutput(active.id, { type: 'info', text: '^C' });
    }
  }, [active, store]);

  if (!active)
    return <div style={{ padding: 8, opacity: 0.5 }}>No terminal</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--vscode-panel-border)',
          padding: '0 4px',
          flexShrink: 0,
        }}
      >
        {terminals.map((t) => (
          <button
            key={t.id}
            onClick={() => store.setActiveTerminal(t.id)}
            style={{
              padding: '4px 12px',
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
            }}
          >
            {t.name}
            {active.mode === 'claude' && t.id === activeTerminalId && (
              <span style={{ fontSize: 10, color: '#75beff', marginLeft: 2 }}>AI</span>
            )}
            <span
              onClick={(e) => {
                e.stopPropagation();
                store.closeTerminal(t.id);
              }}
              style={{ marginLeft: 4, cursor: 'pointer', opacity: 0.5, fontSize: 10 }}
            >
              ×
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            let maxNum = 1;
            for (const t of terminals) {
              const m = t.name.match(/^bash-(\d+)$/);
              if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
              if (t.name === 'bash') maxNum = Math.max(maxNum, 1);
            }
            store.createTerminal(`bash-${maxNum + 1}`);
          }}
          style={{ padding: '4px 8px', fontSize: 14, background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', opacity: 0.6 }}
        >
          +
        </button>
      </div>
      <TerminalOutput lines={active.output} />
      <TerminalInput
        onSubmit={handleCommand}
        onInterrupt={handleInterrupt}
        history={active.history}
        cwd={active.cwd}
        mode={active.mode}
      />
    </div>
  );
}
