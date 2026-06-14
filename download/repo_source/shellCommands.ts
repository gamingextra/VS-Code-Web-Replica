import { workspaceStore } from '@/store/workspaceStore';

export interface CommandResult {
  output: string;
  newCwd: string;
  error?: boolean;
  clear?: boolean;
  enterClaude?: boolean;
  exitClaude?: boolean;
  streamReply?: string;
  success?: boolean;
}

const CANNED_REPLIES = [
  'I\'ll analyze the codebase to find the issue.\n\n\u25CF Read(src/App.tsx)\nReading the root component...\n\nThe problem is a missing dependency in the useEffect hook. Let me propose a fix.\n\n\u25CF Edit(src/App.tsx)\n-  useEffect(() => { fetchData(); }, []);\n+  useEffect(() => { fetchData(); }, [userId]);\n\nDone! The component now re-fetches when userId changes.',
  'Let me run the tests to verify everything works.\n\n\u25CF Bash(npm test)\n> my-react-app@1.0.0 test\n> vitest\n\n PASS  src/components/Button.test.tsx\n PASS  src/utils/helpers.test.tsx\n\nTest Suites: 2 passed, 2 total\nTests:       8 passed, 8 total\n\nAll tests pass! Ready to commit.',
  'I\'ll refactor this to use a custom hook for better reusability.\n\n\u25CF Read(src/App.tsx)\nReading current implementation...\n\n\u25CF Read(src/hooks/useAuth.ts)\nChecking existing hooks...\n\n\u25CF Edit(src/App.tsx)\n-  const [user, setUser] = useState(null);\n-  useEffect(() => { ... }, [token]);\n+  const { user, loading } = useAuth();\n\nClean and reusable. The hook is already well-tested.',
  'Let me generate unit tests for this component.\n\n\u25CF Read(src/components/Button.tsx)\nReading component code...\n\n\u25CF Edit(src/components/Button.test.tsx)\n+  import { render, screen, fireEvent } from \'@testing-library/react\';\n+  import { Button } from \'./Button\';\n+\n+  test(\'renders with label\', () => {\n+    render(<Button>Click me</Button>);\n+    expect(screen.getByText(\'Click me\')).toBeInTheDocument();\n+  });\n+\n+  test(\'calls onClick\', () => {\n+    const fn = jest.fn();\n+    render(<Button onClick={fn}>Click</Button>);\n+    fireEvent.click(screen.getByText(\'Click\'));\n+    expect(fn).toHaveBeenCalled();\n+  });\n\nTests generated and ready to run.',
];

function pickCannedReply(): string {
  return CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
}

const BASE = '/home/user/workspace';

function resolvePath(input: string, cwd: string): string {
  if (input.startsWith('/')) return input;
  if (input === '~') return BASE;
  if (input.startsWith('~/')) return BASE + input.slice(1);
  if (cwd === '/') return '/' + input;
  return cwd + '/' + input;
}

function getParent(p: string): string {
  if (p === BASE) return BASE;
  const idx = p.lastIndexOf('/');
  if (idx <= 0) return BASE;
  return p.slice(0, idx) || BASE;
}

function fmtSize(n: number): string { return String(n).padStart(6, ' '); }

let currentBranch = 'main';
const branches = ['main', 'develop', 'feature/auth'];
const gitCommits = [
  { hash: 'a457920', msg: 'Merge branches editor and menu-ai', date: 'Mon Jan 15 09:30' },
  { hash: 'b1c7811', msg: 'Add editor with monaco integration', date: 'Mon Jan 15 08:45' },
  { hash: 'c205d86', msg: 'Implement AI agent panel', date: 'Sun Jan 14 16:20' },
  { hash: '63fdb17', msg: 'Initial scaffold with sidebar', date: 'Sun Jan 14 10:00' },
  { hash: 'e3a9b12', msg: 'Setup project with vite and tailwind', date: 'Sat Jan 13 14:30' },
];

export function processCommand(input: string, cwd: string, mode: 'shell' | 'claude' = 'shell'): CommandResult {
  if (mode === 'claude') {
    const trimmed = input.trim();
    if (trimmed === '/exit') return { output: '', newCwd: cwd, exitClaude: true };
    if (trimmed === '/clear') return { output: '', newCwd: cwd, clear: true };
    if (trimmed === '/help') {
      return {
        output: 'Available commands:\n  /help   Show this help\n  /clear  Clear conversation\n  /status Show model status\n  /model  Show current model\n  /exit   Exit Claude REPL',
        newCwd: cwd,
      };
    }
    if (trimmed === '/status') return { output: 'claude-opus-4-7 \u00b7 context 1.2k/1M \u00b7 ^C to interrupt', newCwd: cwd };
    if (trimmed === '/model') return { output: 'Current model: claude-opus-4-7\nMax context: 1M tokens', newCwd: cwd };
    return { output: '', newCwd: cwd, streamReply: pickCannedReply() };
  }

  const tokens = input.trim().split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  switch (cmd) {
    case 'help': {
      const cmds = [
        ['ls', 'List files in current directory'],
        ['ls -la', 'List files with details'],
        ['cd <dir>', 'Change directory'],
        ['cd ..', 'Go to parent directory'],
        ['pwd', 'Print working directory'],
        ['cat <file>', 'Display file contents'],
        ['clear', 'Clear terminal'],
        ['echo <text>', 'Print text'],
        ['git <cmd>', 'Git commands (status, log, branch)'],
        ['npm <cmd>', 'NPM commands (run dev, install)'],
        ['mkdir <dir>', 'Create a directory'],
        ['touch <file>', 'Create an empty file'],
        ['whoami', 'Print current user'],
        ['date', 'Print current date'],
        ['uname', 'Print system info'],
        ['claude', 'Enter Claude REPL mode'],
        ['help', 'Show this help message'],
      ];
      const maxCmd = Math.max(...cmds.map(c => c[0].length));
      const lines = cmds.map(([c, d]) => `  ${c.padEnd(maxCmd + 2)}${d}`);
      return { output: 'Available commands:\n' + lines.join('\n'), newCwd: cwd };
    }
    case 'ls': {
      const showAll = args.includes('-la') || args.includes('-al') || args.includes('-a') || args.includes('-l');
      const dirArg = args.find(a => !a.startsWith('-'));
      const target = dirArg ? resolvePath(dirArg, cwd) : cwd;
      const content = workspaceStore.getContent(target);
      if (content !== undefined) return { output: target.split('/').pop() || '', newCwd: cwd };
      const entries = workspaceStore.listDir(target);
      if (entries.length === 0) {
        if (!workspaceStore.hasDir(target) && !workspaceStore.hasFile(target)) {
          return { output: `ls: cannot access '${dirArg || target}': No such file or directory`, newCwd: cwd, error: true };
        }
        return { output: '', newCwd: cwd };
      }
      if (showAll) {
        const lines = entries.map(name => {
          const full = target === BASE ? `${BASE}/${name}` : `${target}/${name}`;
          const meta = workspaceStore.getMeta(full);
          if (meta) {
            const perms = meta.isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            return `${perms} user user ${fmtSize(meta.size)} ${meta.date} ${name}`;
          }
          return `-rw-r--r-- user user ${fmtSize(0)} Jan 15 10:00 ${name}`;
        });
        lines.unshift('drwxr-xr-x user user   4096 Jan 15 10:00 .');
        lines.unshift('drwxr-xr-x user user   4096 Jan 15 10:00 ..');
        return { output: lines.join('\n'), newCwd: cwd };
      }
      return { output: entries.join('  '), newCwd: cwd };
    }
    case 'cd': {
      const target = args[0] || '~';
      if (target === '..') return { output: '', newCwd: getParent(cwd) };
      if (target === '~') return { output: '', newCwd: BASE };
      const resolved = resolvePath(target, cwd);
      if (!workspaceStore.hasDir(resolved)) return { output: `cd: no such file or directory: ${target}`, newCwd: cwd, error: true };
      return { output: '', newCwd: resolved };
    }
    case 'pwd': return { output: cwd, newCwd: cwd };
    case 'cat': {
      if (args.length === 0) return { output: 'cat: missing file operand', newCwd: cwd, error: true };
      const fp = resolvePath(args[0], cwd);
      const content = workspaceStore.getContent(fp);
      if (content === undefined) return { output: `cat: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
      return { output: content, newCwd: cwd };
    }
    case 'clear': return { output: '', newCwd: cwd, clear: true };
    case 'echo': return { output: args.join(' '), newCwd: cwd };
    case 'git': {
      const sub = args[0];
      if (sub === 'status') {
        let out = `On branch ${currentBranch}\n`;
        out += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n\tmodified:   src/components/terminal/Terminal.tsx\n\tmodified:   src/store/terminalStore.ts\n\nChanges not staged for commit:\n  (use "git add <file>..." to update)\n  (use "git restore <file>..." to discard changes)\n\tmodified:   src/App.tsx\n\tmodified:   src/index.css\n\nUntracked files:\n  (use "git add <file>..." to include)\n\tsrc/components/terminal/`;
        return { output: out, newCwd: cwd };
      }
      if (sub === 'log') return { output: gitCommits.map(c => `${c.hash} - ${c.msg} (${c.date})`).join('\n'), newCwd: cwd };
      if (sub === 'branch') return { output: branches.map(b => b === currentBranch ? `* \x1b[32m${b}\x1b[0m` : `  ${b}`).join('\n'), newCwd: cwd };
      if (sub === 'checkout') {
        const bn = args[1];
        if (!bn) return { output: 'git checkout: missing branch name', newCwd: cwd, error: true };
        if (!branches.includes(bn)) return { output: `error: pathspec '${bn}' did not match any known branch`, newCwd: cwd, error: true };
        currentBranch = bn;
        return { output: `Switched to branch '${bn}'`, newCwd: cwd };
      }
      return { output: `git: '${sub}' is not a git command.`, newCwd: cwd, error: true };
    }
    case 'npm': {
      const sub = args[0];
      if (sub === 'run' && args[1] === 'dev') return { output: `> my-react-app@1.0.0 dev\n> vite\n\n  VITE v5.0.8  ready in 234ms\n\n  \x1b[32m\u279c\x1b[0m  Local:   http://localhost:5173/\n  \x1b[32m\u279c\x1b[0m  Network: http://192.168.1.42:5173/`, newCwd: cwd };
      if (sub === 'install' || sub === 'i') return { output: 'added 142 packages in 2.1s', newCwd: cwd };
      return { output: `npm ERR! Missing script: "${args.slice(1).join(' ')}"`, newCwd: cwd, error: true };
    }
    case 'mkdir': {
      if (args.length === 0) return { output: 'mkdir: missing operand', newCwd: cwd, error: true };
      workspaceStore.setContent(resolvePath(args[0], cwd) + '/.gitkeep', '');
      return { output: '', newCwd: cwd, success: true };
    }
    case 'touch': {
      if (args.length === 0) return { output: 'touch: missing file operand', newCwd: cwd, error: true };
      const tp = resolvePath(args[0], cwd);
      if (!workspaceStore.hasFile(tp)) workspaceStore.setContent(tp, '');
      return { output: '', newCwd: cwd };
    }
    case 'rm': return { output: '', newCwd: cwd };
    case 'whoami': return { output: 'user', newCwd: cwd };
    case 'date': return { output: new Date().toString(), newCwd: cwd };
    case 'uname': return { output: 'Linux vscode-web 5.15.0', newCwd: cwd };
    case 'claude': return { output: '', newCwd: cwd, enterClaude: true };
    default: return { output: `${cmd}: command not found`, newCwd: cwd, error: true };
  }
}
