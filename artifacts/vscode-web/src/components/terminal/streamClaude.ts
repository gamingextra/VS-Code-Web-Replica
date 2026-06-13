import type { TerminalState } from '@/store/terminalStore';

type Store = TerminalState;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamClaudeReply(
  store: Store,
  terminalId: string,
  userMessage: string,
  history: ChatTurn[],
  isAborted: () => boolean
) {
  try {
    const response = await fetch('/api/claude/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history,
        systemPrompt: `You are Claude, an AI coding assistant integrated into a VS Code-like terminal.
Help users with coding tasks, debugging, and writing code.
When showing code, use markdown code blocks with language identifiers.
Be concise but thorough. Use tool indicators like ● Read(file), ● Edit(file), ● Bash(cmd) to show your work steps before the result.`,
      }),
    });

    if (!response.ok || !response.body) {
      store.appendOutput(terminalId, `\nError: Failed to connect to Claude API\n`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (isAborted()) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done) return;
          if (data.error) {
            store.appendOutput(terminalId, `\nError: ${data.error}\n`);
            return;
          }
          if (data.content) {
            store.appendOutput(terminalId, data.content);
          }
        } catch {
          // ignore parse errors on individual SSE lines
        }
      }
    }
  } catch (err) {
    store.appendOutput(terminalId, `\nNetwork error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }
}
