/**
 * VS Code Web Replica — Core API & WebSocket Server
 * 
 * Technology: TypeScript (Node.js / Bun)
 * Port: 3001
 * 
 * Responsibilities:
 *   - REST API for file CRUD, workspace management, auth, git, extensions
 *   - WebSocket (Socket.IO) for real-time terminal, file watching, LSP relay
 *   - Service registry & health checks for sandbox/search/copilot microservices
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuid } from 'uuid';

const PORT = 3001;

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  language?: string;
  children?: FileNode[];
  createdAt: number;
  updatedAt: number;
  size: number;
}

interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
}

interface ServiceStatus {
  name: string;
  url: string;
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
}

interface TerminalSession {
  id: string;
  cwd: string;
  createdAt: number;
  active: boolean;
}

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const workspaces = new Map<string, Workspace>();
const files = new Map<string, FileNode>();
const terminalSessions = new Map<string, TerminalSession>();
const serviceRegistry = new Map<string, ServiceStatus>();

// Initialize default workspace
const defaultWsId = uuid();
workspaces.set(defaultWsId, {
  id: defaultWsId,
  name: 'my-project',
  rootPath: '/home/user/workspace',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// ─── Service Registry ────────────────────────────────────────────────────────

const SERVICE_ENDPOINTS = {
  sandbox: process.env.SANDBOX_URL || 'http://localhost:3002',
  search: process.env.SEARCH_URL || 'http://localhost:3003',
  copilot: process.env.COPILOT_URL || 'http://localhost:3004',
};

async function checkServiceHealth(name: string, url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    const status: ServiceStatus = {
      name,
      url,
      healthy: res.ok,
      lastCheck: Date.now(),
      responseTime: Date.now() - start,
    };
    serviceRegistry.set(name, status);
    return status;
  } catch {
    const status: ServiceStatus = { name, url, healthy: false, lastCheck: Date.now() };
    serviceRegistry.set(name, status);
    return status;
  }
}

// Periodic health check every 30s
setInterval(() => {
  for (const [name, url] of Object.entries(SERVICE_ENDPOINTS)) {
    checkServiceHealth(name, url);
  }
}, 30000);

// Initial check
setTimeout(() => {
  for (const [name, url] of Object.entries(SERVICE_ENDPOINTS)) {
    checkServiceHealth(name, url);
  }
}, 1000);

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const path = url.pathname;
  const body = await readBody(req);

  try {
    // ── Health ──
    if (path === '/health' && req.method === 'GET') {
      return json(res, {
        status: 'ok',
        service: 'core-api',
        version: '1.0.0',
        uptime: process.uptime(),
        services: Object.fromEntries(serviceRegistry),
      });
    }

    // ── Workspaces ──
    if (path === '/api/workspaces' && req.method === 'GET') {
      return json(res, Array.from(workspaces.values()));
    }
    if (path === '/api/workspaces' && req.method === 'POST') {
      const ws: Workspace = { id: uuid(), name: body.name || 'untitled', rootPath: body.rootPath || '/home/user/workspace', createdAt: Date.now(), updatedAt: Date.now() };
      workspaces.set(ws.id, ws);
      broadcastWS('workspace:created', ws);
      return json(res, ws, 201);
    }
    if (path.startsWith('/api/workspaces/') && req.method === 'GET') {
      const id = path.split('/').pop()!;
      const ws = workspaces.get(id);
      return ws ? json(res, ws) : json(res, { error: 'Not found' }, 404);
    }

    // ── Files ──
    if (path === '/api/files' && req.method === 'GET') {
      const wsId = url.searchParams.get('workspace') || defaultWsId;
      const wsFiles = Array.from(files.values()).filter(f => f.path.startsWith(workspaces.get(wsId)?.rootPath || ''));
      return json(res, wsFiles);
    }
    if (path === '/api/files' && req.method === 'POST') {
      const file: FileNode = {
        id: uuid(), name: body.name || 'untitled.txt', type: body.type || 'file',
        path: body.path || '/home/user/workspace/untitled.txt', content: body.content ?? '',
        language: body.language, children: body.children,
        createdAt: Date.now(), updatedAt: Date.now(), size: (body.content || '').length,
      };
      files.set(file.id, file);
      broadcastWS('file:created', file);
      return json(res, file, 201);
    }
    if (path.startsWith('/api/files/') && req.method === 'GET') {
      const id = path.split('/').pop()!;
      const file = files.get(id);
      return file ? json(res, file) : json(res, { error: 'Not found' }, 404);
    }
    if (path.startsWith('/api/files/') && req.method === 'PUT') {
      const id = path.split('/').pop()!;
      const file = files.get(id);
      if (!file) return json(res, { error: 'Not found' }, 404);
      const updated = { ...file, ...body, updatedAt: Date.now(), size: (body.content ?? file.content ?? '').length };
      files.set(id, updated);
      broadcastWS('file:updated', updated);
      return json(res, updated);
    }
    if (path.startsWith('/api/files/') && req.method === 'DELETE') {
      const id = path.split('/').pop()!;
      const file = files.get(id);
      if (!file) return json(res, { error: 'Not found' }, 404);
      files.delete(id);
      broadcastWS('file:deleted', { id, path: file.path });
      return json(res, { success: true });
    }

    // ── File Search (proxy to search service) ──
    if (path === '/api/search' && req.method === 'POST') {
      const searchService = serviceRegistry.get('search');
      if (searchService?.healthy) {
        try {
          const proxyRes = await fetch(`${searchService.url}/api/search`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
          });
          return json(res, await proxyRes.json());
        } catch { /* fallback below */ }
      }
      // Fallback: simple in-memory search
      const { query, matchCase, wholeWord, useRegex, fileTypes } = body;
      if (!query) return json(res, { results: [], total: 0, time: 0 });
      const startTime = Date.now();
      const results: Array<{ path: string; name: string; line: number; content: string; matchStart: number; matchEnd: number }> = [];
      for (const file of files.values()) {
        if (!file.content) continue;
        if (fileTypes?.length && !fileTypes.includes(file.language)) continue;
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let searchStr = line;
          let pattern = query;
          if (!matchCase) { searchStr = searchStr.toLowerCase(); pattern = pattern.toLowerCase(); }
          let idx = searchStr.indexOf(pattern);
          if (useRegex) {
            try {
              const regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
              const matches = Array.from(line.matchAll(regex));
              for (const m of matches) {
                if (m.index !== undefined) results.push({ path: file.path, name: file.name, line: i + 1, content: line, matchStart: m.index, matchEnd: m.index + m[0].length });
              }
            } catch { /* invalid regex */ }
            continue;
          }
          if (wholeWord) {
            const wordRegex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, matchCase ? 'g' : 'gi');
            const matches = Array.from(line.matchAll(wordRegex));
            for (const m of matches) {
              if (m.index !== undefined) results.push({ path: file.path, name: file.name, line: i + 1, content: line, matchStart: m.index, matchEnd: m.index + m[0].length });
            }
            continue;
          }
          while (idx !== -1) {
            results.push({ path: file.path, name: file.name, line: i + 1, content: line, matchStart: idx, matchEnd: idx + pattern.length });
            idx = searchStr.indexOf(pattern, idx + 1);
          }
        }
      }
      return json(res, { results, total: results.length, time: Date.now() - startTime });
    }

    // ── Code Execution (proxy to sandbox service) ──
    if (path === '/api/execute' && req.method === 'POST') {
      const sandboxService = serviceRegistry.get('sandbox');
      if (sandboxService?.healthy) {
        try {
          const proxyRes = await fetch(`${sandboxService.url}/api/execute`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            signal: AbortSignal.timeout(body.timeout || 30000),
          });
          return json(res, await proxyRes.json());
        } catch { /* fallback below */ }
      }
      // Fallback: simulated execution
      const { code, language, timeout: execTimeout } = body;
      const startTime = Date.now();
      let output = '';
      let error: string | null = null;
      let exitCode = 0;
      try {
        if (['javascript', 'typescript'].includes(language?.toLowerCase())) {
          const logs: string[] = [];
          const fn = new Function('__console', `"use strict";\n${code.replace(/console\.log/g, '__console.log')}`);
          fn({ log: (...a: unknown[]) => logs.push(a.map(String).join(' ')) });
          output = logs.join('\n') || '[Process exited with code 0]';
        } else if (language?.toLowerCase() === 'python') {
          const lines = code.split('\n');
          const outputs: string[] = [];
          for (const line of lines) {
            const m = line.match(/print\s*\(\s*["'](.+)["']\s*\)/);
            if (m) outputs.push(m[1]);
          }
          output = outputs.join('\n') || '[Python] Code parsed successfully';
        } else {
          output = `[${language}] Execution simulated (no runtime)`;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        exitCode = 1;
      }
      return json(res, {
        id: uuid(), code, language, output, error, exitCode,
        executionTime: Date.now() - startTime,
        timestamp: Date.now(),
        status: exitCode === 0 ? 'completed' : 'error',
      });
    }

    // ── AI Completion (proxy to copilot service) ──
    if (path === '/api/copilot/completions' && req.method === 'POST') {
      const copilotService = serviceRegistry.get('copilot');
      if (copilotService?.healthy) {
        try {
          const proxyRes = await fetch(`${copilotService.url}/api/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
          });
          return json(res, await proxyRes.json());
        } catch { /* fallback below */ }
      }
      // Fallback: template-based completion
      return json(res, generateFallbackCompletion(body));
    }

    // ── Terminal Sessions ──
    if (path === '/api/terminals' && req.method === 'GET') {
      return json(res, Array.from(terminalSessions.values()));
    }
    if (path === '/api/terminals' && req.method === 'POST') {
      const session: TerminalSession = {
        id: uuid(), cwd: body.cwd || '/home/user/workspace',
        createdAt: Date.now(), active: true,
      };
      terminalSessions.set(session.id, session);
      broadcastWS('terminal:created', session);
      return json(res, session, 201);
    }
    if (path.startsWith('/api/terminals/') && req.method === 'DELETE') {
      const id = path.split('/').pop()!;
      terminalSessions.delete(id);
      broadcastWS('terminal:closed', { id });
      return json(res, { success: true });
    }

    // ── Auth ──
    if (path === '/api/auth/login' && req.method === 'POST') {
      const { password } = body;
      if (password === 'vscode') {
        const token = uuid();
        return json(res, { success: true, token, username: 'coder' });
      }
      return json(res, { success: false, error: 'Invalid password' }, 401);
    }
    if (path === '/api/auth/verify' && req.method === 'POST') {
      return json(res, { valid: true, username: 'coder' });
    }

    // ── Git (simulated) ──
    if (path === '/api/git/status' && req.method === 'GET') {
      return json(res, {
        branch: 'main', staged: [], modified: ['src/App.tsx', 'src/index.css'],
        untracked: ['src/components/terminal/'], ahead: 0, behind: 0,
      });
    }
    if (path === '/api/git/log' && req.method === 'GET') {
      return json(res, [
        { hash: 'a457920', message: 'Merge branches editor and menu-ai', date: Date.now() - 86400000, author: 'coder' },
        { hash: 'b1c7811', message: 'Add editor with monaco integration', date: Date.now() - 172800000, author: 'coder' },
      ]);
    }

    // ── Extensions (simulated marketplace) ──
    if (path === '/api/extensions' && req.method === 'GET') {
      return json(res, [
        { id: 'ms-python.python', name: 'Python', publisher: 'Microsoft', version: '2024.0.1', installed: true },
        { id: 'dbaeumer.vscode-eslint', name: 'ESLint', publisher: 'Microsoft', version: '2.4.4', installed: true },
        { id: 'esbenp.prettier-vscode', name: 'Prettier', publisher: 'Prettier', version: '10.1.0', installed: false },
        { id: 'rust-lang.rust-analyzer', name: 'rust-analyzer', publisher: 'rust-lang', version: '0.3.1', installed: false },
      ]);
    }

    // ── Service Registry ──
    if (path === '/api/services' && req.method === 'GET') {
      return json(res, Object.fromEntries(serviceRegistry));
    }

    // ── Port Forwarding ──
    if (path === '/api/ports' && req.method === 'GET') {
      return json(res, [
        { localPort: 3000, remotePort: 3000, protocol: 'http', name: 'Next.js Dev Server', running: true },
        { localPort: 8080, remotePort: 8080, protocol: 'http', name: 'code-server', running: true },
      ]);
    }

    // 404
    return json(res, { error: 'Not found', path }, 404);
  } catch (err) {
    console.error('Request error:', err);
    return json(res, { error: 'Internal server error' }, 500);
  }
});

// ─── WebSocket Server ────────────────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 5000,
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Terminal I/O
  socket.on('terminal:input', (data: { sessionId: string; input: string }) => {
    // In production, this would forward to a PTY process
    const output = simulateTerminalOutput(data.input);
    socket.emit('terminal:output', { sessionId: data.sessionId, output, timestamp: Date.now() });
  });

  socket.on('terminal:resize', (data: { sessionId: string; cols: number; rows: number }) => {
    // Resize PTY (simulated)
  });

  // File watching
  socket.on('file:subscribe', (data: { paths: string[] }) => {
    data.paths.forEach(p => socket.join(`file:${p}`));
  });

  socket.on('file:unsubscribe', (data: { paths: string[] }) => {
    data.paths.forEach(p => socket.leave(`file:${p}`));
  });

  // LSP relay
  socket.on('lsp:request', (data: { id: string; method: string; params: unknown }) => {
    // In production, relay to language server
    socket.emit('lsp:response', { id: data.id, result: null });
  });

  // AI completion stream
  socket.on('copilot:complete', async (data: { requestId: string; prefix: string; suffix: string; language: string; fileName: string }) => {
    // Try copilot service first
    const copilotService = serviceRegistry.get('copilot');
    if (copilotService?.healthy) {
      try {
        const res = await fetch(`${copilotService.url}/api/completions/stream`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data), signal: AbortSignal.timeout(3000),
        });
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            socket.emit('copilot:chunk', { requestId: data.requestId, chunk: decoder.decode(value) });
          }
          socket.emit('copilot:done', { requestId: data.requestId });
          return;
        }
      } catch { /* fallback */ }
    }
    // Fallback
    const completion = generateFallbackCompletion(data);
    socket.emit('copilot:chunk', { requestId: data.requestId, chunk: JSON.stringify(completion) });
    socket.emit('copilot:done', { requestId: data.requestId });
  });

  // Session management
  socket.on('session:join', (data: { workspaceId: string }) => {
    socket.join(`workspace:${data.workspaceId}`);
    socket.data.workspaceId = data.workspaceId;
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

function broadcastWS(event: string, data: unknown) {
  io.emit(event, data);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(res: import('http').ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req: import('http').IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function simulateTerminalOutput(input: string): string {
  const tokens = input.trim().split(/\s+/);
  const cmd = tokens[0];
  switch (cmd) {
    case 'ls': return 'node_modules  src  public  package.json  tsconfig.json';
    case 'pwd': return '/home/user/workspace';
    case 'whoami': return 'user';
    case 'date': return new Date().toString();
    case 'echo': return tokens.slice(1).join(' ');
    case 'clear': return '\x1b[2J\x1b[H';
    default: return `${cmd}: command not found`;
  }
}

function generateFallbackCompletion(context: { prefix?: string; suffix?: string; language?: string; fileName?: string }) {
  const templates: Record<string, string[]> = {
    typescript: [
      'const result = await fetchData();\nconsole.log(result);',
      'interface Props {\n  children: React.ReactNode;\n  className?: string;\n}',
      'export function Component({ props }: Props) {\n  return <div>{props.children}</div>;\n}',
    ],
    python: [
      'def process_data(data: list) -> dict:\n    """Process the input data."""\n    results = {}\n    for item in data:\n        results[item["id"]] = item\n    return results',
      'class DataProcessor:\n    def __init__(self, config):\n        self.config = config\n\n    def process(self, input_data):\n        return [self._transform(item) for item in input_data]',
    ],
    javascript: [
      'const result = await fetchData();\nconsole.log(result);',
      'export function handler(req, res) {\n  const { method } = req;\n  switch (method) {\n    case "GET": return res.status(200).json({ data: [] });\n  }\n}',
    ],
    go: [
      'func handler(w http.ResponseWriter, r *http.Request) {\n  w.Header().Set("Content-Type", "application/json")\n  json.NewEncoder(w).Encode(map[string]string{"status": "ok"})\n}',
    ],
    rust: [
      'fn process(input: &str) -> Result<String, Box<dyn std::error::Error>> {\n    let data = parse_input(input)?;\n    let result = transform(data)?;\n    Ok(result.to_string())\n}',
    ],
  };
  const lang = context.language?.toLowerCase() || 'typescript';
  const langTemplates = templates[lang] || templates.typescript;
  const text = langTemplates[Math.floor(Math.random() * langTemplates.length)];
  return {
    id: `comp-${Date.now()}`,
    text,
    displayText: text.split('\n')[0] + (text.includes('\n') ? ' ...' : ''),
    language: lang,
    confidence: 0.75 + Math.random() * 0.2,
    source: 'fallback',
  };
}

// ─── Start Server ────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  VS Code Core API & WebSocket Server            ║`);
  console.log(`║  Technology: TypeScript (Node.js / Bun)         ║`);
  console.log(`║  HTTP:     http://localhost:${PORT}                 ║`);
  console.log(`║  WebSocket: ws://localhost:${PORT}                  ║`);
  console.log(`║  Endpoints:                                     ║`);
  console.log(`║    GET  /health                                 ║`);
  console.log(`║    GET  /api/workspaces                         ║`);
  console.log(`║    POST /api/workspaces                         ║`);
  console.log(`║    GET  /api/files                              ║`);
  console.log(`║    POST /api/files                              ║`);
  console.log(`║    PUT  /api/files/:id                          ║`);
  console.log(`║    DEL  /api/files/:id                          ║`);
  console.log(`║    POST /api/search                             ║`);
  console.log(`║    POST /api/execute                            ║`);
  console.log(`║    POST /api/copilot/completions                ║`);
  console.log(`║    GET  /api/terminals                          ║`);
  console.log(`║    POST /api/terminals                          ║`);
  console.log(`║    POST /api/auth/login                         ║`);
  console.log(`║    GET  /api/git/status                         ║`);
  console.log(`║    GET  /api/extensions                         ║`);
  console.log(`║    GET  /api/services                           ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
});
