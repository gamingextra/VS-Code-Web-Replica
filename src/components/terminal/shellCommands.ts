import { workspaceStore } from '@/store/workspaceStore';

export interface CommandResult {
  output: string;
  newCwd: string;
  error?: boolean;
  clear?: boolean;
  enterClaude?: boolean;
  success?: boolean;
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

// Tab completion support
export function getCompletions(input: string, cwd: string): string[] {
  const tokens = input.split(/\s+/);
  const cmd = tokens[0];
  const lastToken = tokens[tokens.length - 1];

  // Command completion
  if (tokens.length === 1 && !input.endsWith(' ')) {
    const commands = ['ls', 'cd', 'pwd', 'cat', 'clear', 'echo', 'git', 'npm', 'npx',
      'mkdir', 'touch', 'rm', 'rmdir', 'cp', 'mv', 'head', 'tail', 'wc',
      'grep', 'find', 'which', 'whoami', 'date', 'uname', 'hostname', 'env',
      'export', 'alias', 'history', 'man', 'curl', 'wget', 'ping', 'netstat',
      'df', 'du', 'free', 'top', 'ps', 'kill', 'chmod', 'chown',
      'node', 'python', 'python3', 'code-server', 'claude', 'help'];
    return commands.filter(c => c.startsWith(lastToken));
  }

  // File/directory completion for relevant commands
  const fileCommands = ['cd', 'ls', 'cat', 'head', 'tail', 'rm', 'cp', 'mv', 'touch', 'mkdir', 'chmod'];
  if (fileCommands.includes(cmd) && lastToken) {
    const targetDir = lastToken.includes('/')
      ? resolvePath(lastToken.substring(0, lastToken.lastIndexOf('/') + 1), cwd)
      : cwd;
    const prefix = lastToken.includes('/')
      ? lastToken.substring(lastToken.lastIndexOf('/') + 1)
      : lastToken;
    const entries = workspaceStore.listDir(targetDir);
    return entries.filter(e => e.startsWith(prefix)).map(e => {
      const fullPath = lastToken.includes('/')
        ? lastToken.substring(0, lastToken.lastIndexOf('/') + 1) + e
        : e;
      // Add trailing slash for directories
      const full = resolvePath(fullPath, cwd);
      if (workspaceStore.hasDir(full)) return fullPath + '/';
      return fullPath;
    });
  }

  // Git subcommand completion
  if (cmd === 'git' && tokens.length === 2) {
    const gitSubs = ['status', 'log', 'branch', 'checkout', 'add', 'commit', 'push', 'pull',
      'merge', 'rebase', 'stash', 'diff', 'fetch', 'remote', 'init', 'clone'];
    return gitSubs.filter(s => s.startsWith(lastToken));
  }

  // NPM subcommand completion
  if ((cmd === 'npm' || cmd === 'npx') && tokens.length === 2) {
    const npmSubs = ['install', 'run', 'init', 'start', 'build', 'test', 'lint', 'dev', 'ci'];
    return npmSubs.filter(s => s.startsWith(lastToken));
  }

  return [];
}

export function processCommand(input: string, cwd: string): CommandResult {
  const tokens = input.trim().split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  switch (cmd) {
    case 'help': {
      const cmds = [
        ['ls [-la]', 'List files in current directory'],
        ['cd <dir>', 'Change directory'],
        ['cd ..', 'Go to parent directory'],
        ['pwd', 'Print working directory'],
        ['cat <file>', 'Display file contents'],
        ['head <file>', 'Display first lines of file'],
        ['tail <file>', 'Display last lines of file'],
        ['wc <file>', 'Count lines, words, chars'],
        ['clear', 'Clear terminal'],
        ['echo <text>', 'Print text'],
        ['grep <pattern> <file>', 'Search for pattern in file'],
        ['find <name>', 'Find files by name'],
        ['git <cmd>', 'Git commands (status, log, branch, add, commit, diff)'],
        ['npm <cmd>', 'NPM commands (run dev, install, start, build, test)'],
        ['npx <cmd>', 'Run npm package binaries'],
        ['mkdir <dir>', 'Create a directory'],
        ['touch <file>', 'Create an empty file'],
        ['rm [-rf] <path>', 'Remove file or directory'],
        ['cp <src> <dest>', 'Copy file'],
        ['mv <src> <dest>', 'Move/rename file'],
        ['chmod <mode> <file>', 'Change file permissions'],
        ['which <cmd>', 'Show command location'],
        ['whoami', 'Print current user'],
        ['hostname', 'Print hostname'],
        ['date', 'Print current date'],
        ['uname [-a]', 'Print system info'],
        ['env', 'Print environment variables'],
        ['export KEY=VAL', 'Set environment variable'],
        ['alias', 'List aliases'],
        ['history', 'Show command history'],
        ['df [-h]', 'Show disk usage'],
        ['du <path>', 'Show directory size'],
        ['free [-h]', 'Show memory usage'],
        ['ps [aux]', 'Show running processes'],
        ['kill <pid>', 'Kill a process'],
        ['curl <url>', 'Fetch URL (simulated)'],
        ['ping <host>', 'Ping host (simulated)'],
        ['netstat [-tlnp]', 'Show network connections'],
        ['code-server', 'Show code-server info'],
        ['node', 'Start Node.js REPL'],
        ['python/python3', 'Start Python REPL'],
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
    case 'head': {
      if (args.length === 0) return { output: 'head: missing file operand', newCwd: cwd, error: true };
      let n = 10;
      const nIdx = args.indexOf('-n');
      if (nIdx !== -1 && args[nIdx + 1]) n = parseInt(args[nIdx + 1], 10);
      const file = args.find(a => !a.startsWith('-') && a !== args[nIdx + 1]);
      if (!file) return { output: 'head: missing file operand', newCwd: cwd, error: true };
      const fp = resolvePath(file, cwd);
      const content = workspaceStore.getContent(fp);
      if (content === undefined) return { output: `head: ${file}: No such file or directory`, newCwd: cwd, error: true };
      return { output: content.split('\n').slice(0, n).join('\n'), newCwd: cwd };
    }
    case 'tail': {
      if (args.length === 0) return { output: 'tail: missing file operand', newCwd: cwd, error: true };
      let n = 10;
      const nIdx = args.indexOf('-n');
      if (nIdx !== -1 && args[nIdx + 1]) n = parseInt(args[nIdx + 1], 10);
      const file = args.find(a => !a.startsWith('-') && a !== args[nIdx + 1]);
      if (!file) return { output: 'tail: missing file operand', newCwd: cwd, error: true };
      const fp = resolvePath(file, cwd);
      const content = workspaceStore.getContent(fp);
      if (content === undefined) return { output: `tail: ${file}: No such file or directory`, newCwd: cwd, error: true };
      const lines = content.split('\n');
      return { output: lines.slice(-n).join('\n'), newCwd: cwd };
    }
    case 'wc': {
      if (args.length === 0) return { output: 'wc: missing file operand', newCwd: cwd, error: true };
      const fp = resolvePath(args[0], cwd);
      const content = workspaceStore.getContent(fp);
      if (content === undefined) return { output: `wc: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;
      return { output: `  ${lines}  ${words} ${chars} ${args[0]}`, newCwd: cwd };
    }
    case 'grep': {
      if (args.length < 2) return { output: 'Usage: grep <pattern> <file>', newCwd: cwd, error: true };
      const pattern = args[0];
      const fp = resolvePath(args[1], cwd);
      const content = workspaceStore.getContent(fp);
      if (content === undefined) return { output: `grep: ${args[1]}: No such file or directory`, newCwd: cwd, error: true };
      try {
        const regex = new RegExp(pattern, 'g');
        const matchingLines = content.split('\n').filter(line => regex.test(line));
        if (matchingLines.length === 0) return { output: '', newCwd: cwd };
        return { output: matchingLines.join('\n'), newCwd: cwd };
      } catch {
        const matchingLines = content.split('\n').filter(line => line.includes(pattern));
        return { output: matchingLines.join('\n') || '', newCwd: cwd };
      }
    }
    case 'find': {
      const name = args[0] || '';
      if (!name) return { output: 'Usage: find <name>', newCwd: cwd, error: true };
      function findInDir(dir: string, prefix: string): string[] {
        const results: string[] = [];
        const entries = workspaceStore.listDir(dir);
        for (const entry of entries) {
          const fullPath = dir === BASE ? `${BASE}/${entry}` : `${dir}/${entry}`;
          const relPath = prefix ? `${prefix}/${entry}` : entry;
          if (entry.includes(name)) results.push(relPath);
          if (workspaceStore.hasDir(fullPath)) {
            results.push(...findInDir(fullPath, relPath));
          }
        }
        return results;
      }
      const results = findInDir(cwd, '.');
      if (results.length === 0) return { output: `No files matching '${name}' found`, newCwd: cwd };
      return { output: results.join('\n'), newCwd: cwd };
    }
    case 'clear': return { output: '', newCwd: cwd, clear: true };
    case 'echo': return { output: args.join(' '), newCwd: cwd };
    case 'git': {
      const sub = args[0];
      if (sub === 'status') {
        let out = `On branch ${currentBranch}\nChanges not staged for commit:\n  modified:   src/App.tsx\n  modified:   src/index.css\n\nUntracked files:\n  src/components/terminal/`;
        return { output: out, newCwd: cwd };
      }
      if (sub === 'log') return { output: gitCommits.map(c => `${c.hash} - ${c.msg} (${c.date})`).join('\n'), newCwd: cwd };
      if (sub === 'branch') return { output: branches.map(b => b === currentBranch ? `* ${b}` : `  ${b}`).join('\n'), newCwd: cwd };
      if (sub === 'checkout') {
        const bn = args[1];
        if (!bn) return { output: 'git checkout: missing branch name', newCwd: cwd, error: true };
        if (!branches.includes(bn)) return { output: `error: pathspec '${bn}' did not match any known branch`, newCwd: cwd, error: true };
        currentBranch = bn;
        return { output: `Switched to branch '${bn}'`, newCwd: cwd };
      }
      if (sub === 'add') return { output: '', newCwd: cwd, success: true };
      if (sub === 'commit') return { output: `[${currentBranch} abc1234] ${args.slice(1).join(' ') || 'Update files'}\n 2 files changed, 15 insertions(+), 3 deletions(-)`, newCwd: cwd };
      if (sub === 'diff') return { output: 'diff --git a/src/App.tsx b/src/App.tsx\nindex abc1234..def5678 100644\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -10,6 +10,8 @@\n+import NewComponent from "./NewComponent";\n+// Added new feature', newCwd: cwd };
      if (sub === 'remote') return { output: 'origin\thttps://github.com/user/workspace.git (fetch)\norigin\thttps://github.com/user/workspace.git (push)', newCwd: cwd };
      if (sub === 'stash') return { output: 'Saved working directory and index state WIP on main', newCwd: cwd };
      if (sub === 'push') return { output: `To https://github.com/user/workspace.git\n   abc1234..def5678  main -> main`, newCwd: cwd };
      if (sub === 'pull') return { output: 'Already up to date.', newCwd: cwd };
      if (sub === 'merge') return { output: `Merge made by the 'ort' strategy.\n 1 file changed, 5 insertions(+)`, newCwd: cwd };
      if (sub === 'init') return { output: `Reinitialized existing Git repository in ${cwd}/.git/`, newCwd: cwd };
      return { output: `git: '${sub}' is not a git command.`, newCwd: cwd, error: true };
    }
    case 'npm': case 'npx': {
      const sub = args[0];
      if (sub === 'run' && args[1] === 'dev') return { output: `> my-react-app@1.0.0 dev\n> vite\n\n  VITE v5.0.8  ready in 234ms\n\n  ➜  Local:   http://localhost:5173/\n  ➜  Network: http://192.168.1.42:5173/`, newCwd: cwd };
      if (sub === 'run' && args[1] === 'build') return { output: `> my-react-app@1.0.0 build\n> tsc && vite build\n\n✓ 42 modules transformed.\ndist/index.html     0.46 kB │ gzip: 0.29 kB\ndist/assets/index.js  142.63 kB │ gzip: 46.87 kB`, newCwd: cwd };
      if (sub === 'run' && args[1] === 'test') return { output: `> my-react-app@1.0.0 test\n> vitest\n\n ✓ src/App.test.tsx (3 tests) 5ms\n ✓ src/utils.test.ts (8 tests) 12ms\n\n Test Files  2 passed (2)\n      Tests  11 passed (11)`, newCwd: cwd };
      if (sub === 'run' && args[1] === 'lint') return { output: `> my-react-app@1.0.0 lint\n> eslint src/\n\n✖ 0 problems (0 errors, 0 warnings)`, newCwd: cwd };
      if (sub === 'run' && args[1] === 'start') return { output: `> my-react-app@1.0.0 start\n> serve dist\n\n   ┌──────────────────────────────────┐\n   │                                  │\n   │   Serving at http://localhost:3000│\n   │                                  │\n   └──────────────────────────────────┘`, newCwd: cwd };
      if (sub === 'install' || sub === 'i') return { output: 'added 142 packages in 2.1s', newCwd: cwd };
      if (sub === 'init') return { output: 'Wrote to /home/user/workspace/package.json', newCwd: cwd };
      if (sub === 'ci') return { output: 'added 142 packages in 1.8s', newCwd: cwd };
      return { output: `npm ERR! Missing script: "${args.slice(1).join(' ')}"`, newCwd: cwd, error: true };
    }
    case 'mkdir': {
      if (args.length === 0) return { output: 'mkdir: missing operand', newCwd: cwd, error: true };
      const recursive = args.includes('-p');
      const dirName = args.find(a => !a.startsWith('-')) || '';
      if (!dirName) return { output: 'mkdir: missing operand', newCwd: cwd, error: true };
      workspaceStore.setContent(resolvePath(dirName, cwd) + '/.gitkeep', '');
      return { output: '', newCwd: cwd, success: true };
    }
    case 'touch': {
      if (args.length === 0) return { output: 'touch: missing file operand', newCwd: cwd, error: true };
      const tp = resolvePath(args[0], cwd);
      if (!workspaceStore.hasFile(tp)) workspaceStore.setContent(tp, '');
      return { output: '', newCwd: cwd };
    }
    case 'rm': {
      const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
      const target = args.find(a => !a.startsWith('-'));
      if (!target) return { output: 'rm: missing operand', newCwd: cwd, error: true };
      return { output: '', newCwd: cwd };
    }
    case 'rmdir': {
      if (args.length === 0) return { output: 'rmdir: missing operand', newCwd: cwd, error: true };
      return { output: '', newCwd: cwd };
    }
    case 'cp': {
      if (args.length < 2) return { output: 'cp: missing file operand', newCwd: cwd, error: true };
      const srcContent = workspaceStore.getContent(resolvePath(args[0], cwd));
      if (srcContent === undefined) return { output: `cp: cannot stat '${args[0]}': No such file or directory`, newCwd: cwd, error: true };
      workspaceStore.setContent(resolvePath(args[1], cwd), srcContent);
      return { output: '', newCwd: cwd };
    }
    case 'mv': {
      if (args.length < 2) return { output: 'mv: missing file operand', newCwd: cwd, error: true };
      const srcContent = workspaceStore.getContent(resolvePath(args[0], cwd));
      if (srcContent === undefined) return { output: `mv: cannot stat '${args[0]}': No such file or directory`, newCwd: cwd, error: true };
      workspaceStore.setContent(resolvePath(args[1], cwd), srcContent);
      return { output: '', newCwd: cwd };
    }
    case 'chmod': {
      if (args.length < 2) return { output: 'chmod: missing operand', newCwd: cwd, error: true };
      return { output: '', newCwd: cwd };
    }
    case 'which': {
      if (args.length === 0) return { output: 'which: missing argument', newCwd: cwd, error: true };
      const paths: Record<string, string> = {
        node: '/usr/local/bin/node', npm: '/usr/local/bin/npm', npx: '/usr/local/bin/npx',
        git: '/usr/bin/git', python: '/usr/bin/python3', python3: '/usr/bin/python3',
        bash: '/bin/bash', sh: '/bin/sh', code_server: '/usr/local/bin/code-server',
        curl: '/usr/bin/curl', wget: '/usr/bin/wget', ping: '/usr/bin/ping',
      };
      const p = paths[args[0]];
      if (p) return { output: p, newCwd: cwd };
      return { output: `${args[0]} not found`, newCwd: cwd, error: true };
    }
    case 'whoami': return { output: 'user', newCwd: cwd };
    case 'hostname': return { output: 'code-server-web', newCwd: cwd };
    case 'date': return { output: new Date().toString(), newCwd: cwd };
    case 'uname': {
      if (args.includes('-a')) return { output: 'Linux code-server-web 5.15.0 #1 SMP x86_64 GNU/Linux', newCwd: cwd };
      return { output: 'Linux', newCwd: cwd };
    }
    case 'env': {
      const envLines = [
        'HOME=/home/user',
        'USER=user',
        'SHELL=/bin/bash',
        'PATH=/usr/local/bin:/usr/bin:/bin',
        'LANG=en_US.UTF-8',
        'TERM=xterm-256color',
        'NODE_VERSION=20.11.0',
        'CODE_SERVER_VERSION=4.89.0',
        'PORT=8080',
        'PWD=' + cwd,
      ];
      return { output: envLines.join('\n'), newCwd: cwd };
    }
    case 'export': {
      if (args.length === 0) return { output: '', newCwd: cwd };
      return { output: '', newCwd: cwd };
    }
    case 'alias': {
      return { output: "alias ll='ls -la'\nalias la='ls -a'\nalias cls='clear'", newCwd: cwd };
    }
    case 'history': {
      return { output: '    1  ls\n    2  cd src\n    3  cat App.tsx\n    4  git status\n    5  npm run dev', newCwd: cwd };
    }
    case 'df': {
      return { output: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   12G   36G  25% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm', newCwd: cwd };
    }
    case 'du': {
      const target = args[0] || '.';
      return { output: `12K\t${target}/src\n8K\t${target}/public\n4K\t${target}/package.json\n24K\t${target}`, newCwd: cwd };
    }
    case 'free': {
      return { output: '              total        used        free      shared  buff/cache   available\nMem:        8048572     2145320     3245672      285640     2657580     5340284\nSwap:       2097148           0     2097148', newCwd: cwd };
    }
    case 'ps': {
      return { output: '  PID TTY          TIME CMD\n 1000 ?        00:00:12 code-server\n 1234 ?        00:00:05 node\n 1567 pts/0    00:00:00 bash\n 1890 pts/0    00:00:00 ps', newCwd: cwd };
    }
    case 'kill': {
      if (args.length === 0) return { output: 'kill: missing PID', newCwd: cwd, error: true };
      return { output: '', newCwd: cwd };
    }
    case 'curl': {
      if (args.length === 0) return { output: 'curl: missing URL', newCwd: cwd, error: true };
      return { output: `<!DOCTYPE html>\n<html><body><h1>Simulated response from ${args[0]}</h1></body></html>`, newCwd: cwd };
    }
    case 'wget': {
      if (args.length === 0) return { output: 'wget: missing URL', newCwd: cwd, error: true };
      return { output: `--2024-01-15 10:00:00--  ${args[0]}\nResolving... 93.184.216.34\nConnecting... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1256 (1.2K) [text/html]\nSaving to: 'index.html'\n\n2024-01-15 10:00:01 (1.2 MB/s) - 'index.html' saved [1256/1256]`, newCwd: cwd };
    }
    case 'ping': {
      if (args.length === 0) return { output: 'ping: missing host', newCwd: cwd, error: true };
      return { output: `PING ${args[0]} (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=11.432 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=11.626 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=10.211 ms\n\n--- ${args[0]} ping statistics ---\n3 packets transmitted, 3 packets received, 0.0% packet loss`, newCwd: cwd };
    }
    case 'netstat': {
      return { output: 'Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program\ntcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      1000/code-server\ntcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN      1234/node\ntcp        0      0 127.0.0.1:5173          0.0.0.0:*               LISTEN      1567/vite', newCwd: cwd };
    }
    case 'man': {
      if (args.length === 0) return { output: 'What manual page do you want?', newCwd: cwd };
      return { output: `${args[0].toUpperCase()}(1)\n\nNAME\n    ${args[0]} - simulated command\n\nDESCRIPTION\n    This is a simulated manual page for the ${args[0]} command.\n    In a real code-server environment, you would see the actual man page.\n\nSee also: code-server documentation`, newCwd: cwd };
    }
    case 'node': return { output: 'Welcome to Node.js v20.11.0\n> ', newCwd: cwd };
    case 'python': case 'python3': return { output: 'Python 3.12.0\n>>> ', newCwd: cwd };
    case 'claude': return { output: '', newCwd: cwd, enterClaude: true };
    case 'code-server': {
      return {
        output: [
          'code-server v4.89.0',
          '',
          'Configuration:',
          '  - Config file: ~/.config/code-server/config.yaml',
          '  - Data directory: ~/.local/share/code-server',
          '  - Extensions: ~/.local/share/code-server/extensions',
          '  - Log file: ~/.local/share/code-server/code-server.log',
          '',
          'Server:',
          '  - Listening on: 0.0.0.0:8080',
          '  - Auth: password',
          '  - TLS: enabled (self-signed)',
          '',
          'Features:',
          '  - Extension marketplace: Open VSX',
          '  - Port forwarding: enabled',
          '  - File downloads: enabled',
          '  - File uploads: enabled',
          '',
          'CLI flags:',
          '  --auth password|none',
          '  --bind-addr 0.0.0.0:8080',
          '  --cert /path/to/cert',
          '  --cert-key /path/to/key',
          '  --disable-telemetry',
          '  --disable-update-check',
          '  --extensions-dir /path',
          '  --install-extension <ext>',
          '  --list-extensions',
          '  --user-data-dir /path',
        ].join('\n'),
        newCwd: cwd,
      };
    }
    default: return { output: `${cmd}: command not found`, newCwd: cwd, error: true };
  }
}
