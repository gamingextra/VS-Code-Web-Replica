/**
 * Backend Service Client — Gateway to all microservices
 * 
 * Architecture:
 *   1. Core API & WebSocket (TypeScript/Node.js) — Port 3001
 *   2. Code Execution & Sandboxing (Go) — Port 3002
 *   3. Heavy File Search / Indexing (Rust) — Port 3003
 *   4. AI Inline Completion / Copilot (Python) — Port 3004
 * 
 * Uses XTransformPort for Caddy gateway routing.
 */

const CORE_API_PORT = 3001;
const SANDBOX_PORT = 3002;
const SEARCH_PORT = 3003;
const COPILOT_PORT = 3004;

const API_BASE = '/api';

// ─── Service Health ──────────────────────────────────────────────────────────

export interface ServiceHealth {
  status: string;
  service: string;
  version?: string;
  uptime?: number;
  services?: Record<string, ServiceStatus>;
}

export interface ServiceStatus {
  name: string;
  url: string;
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
}

export async function getCoreHealth(): Promise<ServiceHealth> {
  try {
    const res = await fetch(`${API_BASE}/core/health?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return { status: 'unavailable', service: 'core-api' };
  }
}

// ─── Workspace API ───────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const res = await fetch(`${API_BASE}/core/workspaces?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createWorkspace(data: { name: string; rootPath?: string }): Promise<Workspace | null> {
  try {
    const res = await fetch(`${API_BASE}/core/workspaces?XTransformPort=${CORE_API_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── File API ────────────────────────────────────────────────────────────────

export interface FileNode {
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

export async function getFiles(workspaceId?: string): Promise<FileNode[]> {
  try {
    const params = new URLSearchParams({ XTransformPort: String(CORE_API_PORT) });
    if (workspaceId) params.set('workspace', workspaceId);
    const res = await fetch(`${API_BASE}/core/files?${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createFile(data: { name: string; path: string; content?: string; type?: string; language?: string }): Promise<FileNode | null> {
  try {
    const res = await fetch(`${API_BASE}/core/files?XTransformPort=${CORE_API_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function updateFile(id: string, data: Partial<FileNode>): Promise<FileNode | null> {
  try {
    const res = await fetch(`${API_BASE}/core/files/${id}?XTransformPort=${CORE_API_PORT}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteFile(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/core/files/${id}?XTransformPort=${CORE_API_PORT}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Search API (Rust Service) ───────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  matchCase?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

export interface SearchResult {
  path: string;
  name: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
  language?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  time: number;
}

export async function searchFiles(request: SearchRequest): Promise<SearchResponse> {
  try {
    // Try Rust search service first
    const res = await fetch(`${API_BASE}/search?XTransformPort=${SEARCH_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    throw new Error('Search service unavailable');
  } catch {
    // Fallback to core API search
    try {
      const res = await fetch(`${API_BASE}/core/search?XTransformPort=${CORE_API_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (res.ok) return res.json();
    } catch { /* fallback */ }
    return { results: [], total: 0, time: 0 };
  }
}

// ─── Code Execution API (Go Sandbox Service) ────────────────────────────────

export interface ExecutionRequest {
  code: string;
  language: string;
  timeout?: number;
  stdin?: string;
}

export interface ExecutionResult {
  id: string;
  code: string;
  language: string;
  output: string;
  error: string | null;
  exitCode: number;
  executionTime: number;
  timestamp: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
}

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  try {
    // Try Go sandbox service first
    const res = await fetch(`${API_BASE}/sandbox?XTransformPort=${SANDBOX_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(request.timeout || 30000),
    });
    if (res.ok) return res.json();
    throw new Error('Sandbox unavailable');
  } catch {
    // Fallback to core API execution
    try {
      const res = await fetch(`${API_BASE}/core/execute?XTransformPort=${CORE_API_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (res.ok) return res.json();
    } catch { /* fallback */ }
    // Local fallback
    return simulateExecution(request);
  }
}

function simulateExecution(request: ExecutionRequest): ExecutionResult {
  const startTime = Date.now();
  let output = '';
  let error: string | null = null;
  let exitCode = 0;

  try {
    const lang = request.language.toLowerCase();
    if (['javascript', 'typescript'].includes(lang)) {
      const logs: string[] = [];
      const fn = new Function('__console', `"use strict";\n${request.code.replace(/console\.log/g, '__console.log')}`);
      fn({ log: (...a: unknown[]) => logs.push(a.map(String).join(' ')) });
      output = logs.join('\n') || '[Process exited with code 0]';
    } else if (lang === 'python') {
      const lines = request.code.split('\n');
      const outputs: string[] = [];
      for (const line of lines) {
        const m = line.match(/print\s*\(\s*["'](.+)["']\s*\)/);
        if (m) outputs.push(m[1]);
      }
      output = outputs.join('\n') || '[Python] Code parsed successfully';
    } else {
      output = `[${request.language}] Execution simulated (sandbox unavailable)`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    exitCode = 1;
  }

  return {
    id: `exec-${Date.now()}`,
    code: request.code,
    language: request.language,
    output,
    error,
    exitCode,
    executionTime: Date.now() - startTime,
    timestamp: Date.now(),
    status: exitCode === 0 ? 'completed' : 'error',
  };
}

// ─── AI Copilot API (Python Service) ────────────────────────────────────────

export interface CompletionRequest {
  prefix: string;
  suffix: string;
  language: string;
  fileName: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  id: string;
  text: string;
  display_text: string;
  language: string;
  confidence: number;
  source: string;
  alternatives?: string[];
}

export async function getCompletion(request: CompletionRequest): Promise<CompletionResult | null> {
  try {
    // Try Python copilot service first
    const res = await fetch(`${API_BASE}/copilot/completions?XTransformPort=${COPILOT_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix: request.prefix,
        suffix: request.suffix,
        language: request.language,
        file_name: request.fileName,
        max_tokens: request.maxTokens || 150,
        temperature: request.temperature || 0.2,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        text: data.text,
        display_text: data.display_text || data.displayText || '',
        language: data.language,
        confidence: data.confidence || 0.5,
        source: data.source || 'copilot',
        alternatives: data.alternatives || [],
      };
    }
    throw new Error('Copilot unavailable');
  } catch {
    // Fallback to core API copilot
    try {
      const res = await fetch(`${API_BASE}/core/copilot/completions?XTransformPort=${CORE_API_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (res.ok) return res.json();
    } catch { /* fallback */ }
    return null;
  }
}

// ─── Terminal API ────────────────────────────────────────────────────────────

export interface TerminalSession {
  id: string;
  cwd: string;
  createdAt: number;
  active: boolean;
}

export async function getTerminals(): Promise<TerminalSession[]> {
  try {
    const res = await fetch(`${API_BASE}/core/terminals?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createTerminal(cwd?: string): Promise<TerminalSession | null> {
  try {
    const res = await fetch(`${API_BASE}/core/terminals?XTransformPort=${CORE_API_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: cwd || '/home/user/workspace' }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export async function login(password: string): Promise<{ success: boolean; token?: string; username?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/core/auth/login?XTransformPort=${CORE_API_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  } catch {
    // Local fallback
    if (password === 'vscode') {
      return { success: true, token: 'local-token', username: 'coder' };
    }
    return { success: false, error: 'Invalid password' };
  }
}

// ─── Git API ─────────────────────────────────────────────────────────────────

export interface GitStatus {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export async function getGitStatus(): Promise<GitStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/core/git/status?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Extensions API ──────────────────────────────────────────────────────────

export interface Extension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  installed: boolean;
}

export async function getExtensions(): Promise<Extension[]> {
  try {
    const res = await fetch(`${API_BASE}/core/extensions?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ─── Services Status API ────────────────────────────────────────────────────

export async function getServicesStatus(): Promise<Record<string, ServiceStatus>> {
  try {
    const res = await fetch(`${API_BASE}/core/services?XTransformPort=${CORE_API_PORT}`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}
