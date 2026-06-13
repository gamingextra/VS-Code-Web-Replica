import type { TerminalState } from '@/store/terminalStore';

type Store = TerminalState;

export function streamClaudeReply(
  store: Store,
  terminalId: string,
  text: string,
  isAborted: () => boolean
) {
  const tokens = text.split(/(\s+|[\n\r])/g).filter(Boolean);
  let index = 0;

  const interval = setInterval(() => {
    if (isAborted()) {
      clearInterval(interval);
      return;
    }
    if (index >= tokens.length) {
      clearInterval(interval);
      return;
    }
    store.appendOutput(terminalId, tokens[index]);
    index++;
  }, 30);
}
