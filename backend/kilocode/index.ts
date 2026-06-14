/**
 * Kilocode Integration Service
 * 
 * A Node.js service that bridges the VS Code Web Replica frontend
 * with the Kilocode CLI daemon (`kilo serve`) to provide:
 *   - AI inline code completions (FIM - Fill In Middle)
 *   - Chat-based coding assistance (multi-turn sessions)
 *   - Agent modes (Code, Architect, Debug, Ask, Orchestrator)
 *   - Codebase indexing & symbol search
 *   - Git integration (commit messages, diffs)
 *   - MCP server management
 *   - Real-time event streaming (SSE)
 * 
 * Kilocode (https://github.com/Kilo-Org/kilocode) is an open-source
 * agentic coding platform supporting 500+ LLM models.
 */

import http from 'node:http';

// ─── Configuration ─────────────────────────────────────────────────────────────

const KILO_PORT = parseInt(process.env.KILO_PORT || '4096', 10);
const KILO_HOST = process.env.KILO_HOST || '127.0.0.1';
const KILO_USERNAME = process.env.KILO_USERNAME || 'kilo';
const KILO_PASSWORD = process.env.KILO_PASSWORD || 'kilo';
const SERVICE_PORT = parseInt(process.env.KILOCODE_SERVICE_PORT || '3005', 10);

const KILO_BASE = `http://${KILO_HOST}:${KILO_PORT}`;
const KILO_AUTH = Buffer.from(`${KILO_USERNAME}:${KILO_PASSWORD}`).toString('base64');

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KiloSession {
  id: string;
  slug: string;
  projectID: string;
  directory: string;
  title: string;
  cost: number;
  tokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
  time: { created: number; updated: number };
  version: string;
}

interface KiloMessagePart {
  type: 'text' | 'tool-call' | 'tool-result' | 'thinking' | 'image';
  text?: string;
  toolCallID?: string;
  toolName?: string;
  toolResult?: string;
}

interface KiloMessage {
  info: {
    id: string;
    parentID: string;
    role: string;
    mode: string;
    agent: string;
    modelID: string;
    providerID: string;
    cost: number;
    tokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
    time: { created: number; completed: number };
    error?: { name: string; data: { message: string } };
    sessionID: string;
  };
  parts: KiloMessagePart[];
}

interface KiloModel {
  id: string;
  apiID: string;
  providerID: string;
  name: string;
  capabilities: { tools: boolean; input: string[]; output: string[] };
}

interface FIMRequest {
  file_path: string;
  language: string;
  prefix: string;
  suffix: string;
  cursor_position?: number;
  model?: string;
}

interface ChatRequest {
  message: string;
  session_id?: string;
  mode?: 'code' | 'architect' | 'debug' | 'ask' | 'orchestrator';
  model?: string;
  files?: string[];
}

// ─── Kilo API Client ───────────────────────────────────────────────────────────

async function kiloFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${KILO_BASE}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Basic ${KILO_AUTH}`,
    'Content-Type': 'application/json',
  };
  if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
    const oh = options.headers as Record<string, string>;
    Object.assign(headers, oh);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(30000),
    });

    if (res.status === 401) {
      throw new Error('Kilo daemon authentication failed — check KILO_USERNAME/KILO_PASSWORD');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Kilo API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED') {
      throw new Error('Kilo daemon not running — start with: kilo daemon start');
    }
    throw err;
  }
}

// ─── Session Management ────────────────────────────────────────────────────────

const sessionCache = new Map<string, KiloSession>();

async function getOrCreateSession(projectPath?: string): Promise<KiloSession> {
  const cacheKey = projectPath || 'global';

  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey)!;
    try {
      await kiloFetch(`/session/${cached.id}`);
      return cached;
    } catch {
      sessionCache.delete(cacheKey);
    }
  }

  const session = await kiloFetch('/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const modelID = process.env.KILO_MODEL || 'anthropic/claude-sonnet-4';
  const providerID = process.env.KILO_PROVIDER || 'kilo';

  try {
    await kiloFetch(`/session/${session.id}/init`, {
      method: 'POST',
      body: JSON.stringify({
        modelID,
        providerID,
        messageID: `msg_init_${Date.now()}`,
      }),
    });
  } catch (err: any) {
    console.warn(`[kilocode] Session init warning: ${err.message}`);
  }

  sessionCache.set(cacheKey, session);
  console.log(`[kilocode] Created session ${session.id} (${session.slug})`);
  return session;
}

// ─── Core API Handlers ─────────────────────────────────────────────────────────

async function handleHealth(): Promise<{ status: string; version: string; kilo: any }> {
  try {
    const health = await kiloFetch('/global/health');
    return { status: 'healthy', version: '1.0.0', kilo: health };
  } catch (err: any) {
    return { status: 'degraded', version: '1.0.0', kilo: { status: 'unavailable', error: err.message } };
  }
}

async function handleFIM(req: FIMRequest): Promise<any> {
  try {
    const result = await kiloFetch('/kilo/fim', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return result;
  } catch {
    try {
      const session = await getOrCreateSession();
      const prompt = `Complete the following ${req.language} code. Only output the completion, no explanation:\n\n${req.prefix}[CURSOR]${req.suffix}`;

      const message: KiloMessage = await kiloFetch(`/session/${session.id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          parts: [{ type: 'text', text: prompt }],
        }),
      });

      const textParts = message.parts
        .filter((p: KiloMessagePart) => p.type === 'text')
        .map((p: KiloMessagePart) => p.text || '')
        .join('');

      return {
        completions: [{
          text: textParts.trim(),
          display_text: textParts.split('\n')[0].trim(),
          confidence: 0.7,
          source: 'kilocode-session',
        }],
      };
    } catch (err: any) {
      throw new Error(`FIM completion failed: ${err.message}`);
    }
  }
}

async function handleChat(req: ChatRequest): Promise<any> {
  try {
    const session = await getOrCreateSession();

    if (req.mode) {
      try {
        await kiloFetch(`/session/${session.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ mode: req.mode }),
        });
      } catch { /* mode switch may not be supported */ }
    }

    const parts: KiloMessagePart[] = [{ type: 'text', text: req.message }];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        parts.push({ type: 'text', text: `\n[File: ${file}]` });
      }
    }

    const message: KiloMessage = await kiloFetch(`/session/${session.id}/message`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', parts }),
    });

    const textParts = message.parts
      .filter((p: KiloMessagePart) => p.type === 'text')
      .map((p: KiloMessagePart) => p.text || '');

    const toolCalls = message.parts
      .filter((p: KiloMessagePart) => p.type === 'tool-call')
      .map((p: KiloMessagePart) => ({ name: p.toolName, id: p.toolCallID }));

    return {
      session_id: session.id,
      message_id: message.info.id,
      role: message.info.role,
      mode: message.info.mode,
      model: message.info.modelID,
      provider: message.info.providerID,
      content: textParts.join('\n'),
      tool_calls: toolCalls,
      tokens: message.info.tokens,
      cost: message.info.cost,
      error: message.info.error?.data?.message || null,
    };
  } catch (err: any) {
    throw new Error(`Chat failed: ${err.message}`);
  }
}

async function handleModels(provider?: string): Promise<KiloModel[]> {
  try {
    const models = await kiloFetch('/api/model');
    if (provider) {
      return models.filter((m: KiloModel) => m.providerID === provider);
    }
    return models;
  } catch (err: any) {
    throw new Error(`Failed to fetch models: ${err.message}`);
  }
}

async function handleProviders(): Promise<any[]> {
  try {
    return await kiloFetch('/api/provider');
  } catch (err: any) {
    throw new Error(`Failed to fetch providers: ${err.message}`);
  }
}

async function handleSessions(): Promise<KiloSession[]> {
  try {
    return await kiloFetch('/session');
  } catch (err: any) {
    throw new Error(`Failed to fetch sessions: ${err.message}`);
  }
}

async function handleSessionMessages(sessionID: string): Promise<any> {
  try {
    return await kiloFetch(`/session/${sessionID}/message`);
  } catch (err: any) {
    throw new Error(`Failed to fetch session messages: ${err.message}`);
  }
}

async function handleDeleteSession(sessionID: string): Promise<boolean> {
  try {
    await kiloFetch(`/session/${sessionID}`, { method: 'DELETE' });
    for (const [key, session] of sessionCache.entries()) {
      if (session.id === sessionID) { sessionCache.delete(key); break; }
    }
    return true;
  } catch { return false; }
}

async function handleCommitMessage(diff?: string): Promise<string> {
  try {
    const result = await kiloFetch('/commit-message', {
      method: 'POST',
      body: JSON.stringify({ diff: diff || '' }),
    });
    return result.message || result;
  } catch (err: any) {
    throw new Error(`Commit message generation failed: ${err.message}`);
  }
}

async function handleEnhancePrompt(prompt: string): Promise<string> {
  try {
    const result = await kiloFetch('/enhance-prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    return result.enhanced || result;
  } catch (err: any) {
    throw new Error(`Prompt enhancement failed: ${err.message}`);
  }
}

async function handleConfig(): Promise<any> {
  try {
    return await kiloFetch('/config');
  } catch (err: any) {
    throw new Error(`Failed to fetch config: ${err.message}`);
  }
}

async function handleIndexingStatus(): Promise<any> {
  try {
    return await kiloFetch('/indexing/status');
  } catch (err: any) {
    throw new Error(`Failed to fetch indexing status: ${err.message}`);
  }
}

async function handleFindSymbol(query: string): Promise<any> {
  try {
    return await kiloFetch(`/find/symbol?q=${encodeURIComponent(query)}`);
  } catch (err: any) {
    throw new Error(`Symbol search failed: ${err.message}`);
  }
}

// ─── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url || '/', `http://localhost:${SERVICE_PORT}`);
  const path = url.pathname;
  const body: Buffer[] = [];

  req.on('data', (chunk) => body.push(chunk));
  await new Promise<void>((resolve) => req.on('end', resolve));

  const rawBody = Buffer.concat(body).toString();
  let jsonBody: any = null;
  try { jsonBody = rawBody ? JSON.parse(rawBody) : null; } catch { /* not JSON */ }

  const send = (status: number, data: any) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    if (path === '/health' && req.method === 'GET') {
      send(200, await handleHealth());
    }
    else if (path === '/api/completions' && req.method === 'POST') {
      send(200, await handleFIM(jsonBody));
    }
    else if (path === '/api/chat' && req.method === 'POST') {
      send(200, await handleChat(jsonBody));
    }
    else if (path === '/api/chat/stream' && req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      try {
        const session = await getOrCreateSession();
        const mode = jsonBody?.mode;
        if (mode) {
          try { await kiloFetch(`/session/${session.id}`, { method: 'PATCH', body: JSON.stringify({ mode }) }); } catch { /* ignore */ }
        }

        const message: KiloMessage = await kiloFetch(`/session/${session.id}/message`, {
          method: 'POST',
          body: JSON.stringify({ role: 'user', parts: [{ type: 'text', text: jsonBody?.message || '' }] }),
        });

        for (const part of message.parts) {
          if (part.type === 'text' && part.text) {
            res.write(`event: chunk\ndata: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`);
          } else if (part.type === 'tool-call') {
            res.write(`event: tool_call\ndata: ${JSON.stringify({ type: 'tool_call', name: part.toolName, id: part.toolCallID })}\n\n`);
          } else if (part.type === 'tool-result') {
            res.write(`event: tool_result\ndata: ${JSON.stringify({ type: 'tool_result', id: part.toolCallID, result: part.toolResult })}\n\n`);
          } else if (part.type === 'thinking') {
            res.write(`event: thinking\ndata: ${JSON.stringify({ type: 'thinking', content: part.text })}\n\n`);
          }
        }

        res.write(`event: done\ndata: ${JSON.stringify({
          session_id: session.id, message_id: message.info.id,
          model: message.info.modelID, tokens: message.info.tokens, cost: message.info.cost,
        })}\n\n`);
      } catch (err: any) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      }
      res.end();
    }
    else if (path === '/api/models' && req.method === 'GET') {
      send(200, await handleModels(url.searchParams.get('provider') || undefined));
    }
    else if (path === '/api/providers' && req.method === 'GET') {
      send(200, await handleProviders());
    }
    else if (path === '/api/sessions' && req.method === 'GET') {
      send(200, await handleSessions());
    }
    else if (path.startsWith('/api/sessions/') && path.endsWith('/messages') && req.method === 'GET') {
      send(200, await handleSessionMessages(path.split('/')[3]));
    }
    else if (path.startsWith('/api/sessions/') && req.method === 'DELETE') {
      send(200, { success: await handleDeleteSession(path.split('/')[3]) });
    }
    else if (path === '/api/commit-message' && req.method === 'POST') {
      send(200, { message: await handleCommitMessage(jsonBody?.diff) });
    }
    else if (path === '/api/enhance-prompt' && req.method === 'POST') {
      send(200, { enhanced: await handleEnhancePrompt(jsonBody?.prompt) });
    }
    else if (path === '/api/config' && req.method === 'GET') {
      send(200, await handleConfig());
    }
    else if (path === '/api/indexing/status' && req.method === 'GET') {
      send(200, await handleIndexingStatus());
    }
    else if (path === '/api/find/symbol' && req.method === 'GET') {
      send(200, await handleFindSymbol(url.searchParams.get('q') || ''));
    }
    else {
      send(404, { error: 'Not found', path });
    }
  } catch (err: any) {
    console.error(`[kilocode] Error ${req.method} ${path}:`, err.message);
    send(500, { error: err.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────

server.listen(SERVICE_PORT, () => {
  console.log(`[kilocode] Integration service on http://localhost:${SERVICE_PORT}`);
  console.log(`[kilocode] Connecting to Kilo daemon at ${KILO_BASE}`);
  console.log(`[kilocode] Endpoints: /health, /api/completions, /api/chat, /api/chat/stream, /api/models, /api/providers, /api/sessions, /api/commit-message, /api/enhance-prompt, /api/config, /api/indexing/status, /api/find/symbol`);
});

process.on('SIGINT', () => { console.log('\n[kilocode] Shutting down...'); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

export { server, handleHealth, handleFIM, handleChat, handleModels };
