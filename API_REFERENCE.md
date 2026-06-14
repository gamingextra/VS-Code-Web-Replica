# VS Code Web Replica — API Reference

Complete API reference for all backend services and the frontend API gateway.

---

## Table of Contents

- [Authentication](#authentication)
- [Core API (Port 3001)](#core-api-port-3001)
- [Sandbox Service (Port 3002)](#sandbox-service-port-3002)
- [Search Service (Port 3003)](#search-service-port-3003)
- [Copilot Service (Port 3004)](#copilot-service-port-3004)
- [Frontend API Gateway](#frontend-api-gateway)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)

---

## Authentication

### POST /api/auth/login

Authenticate with a password to receive a JWT token.

**Request:**
```json
{
  "password": "vscode"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "user"
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Invalid password"
}
```

**Rate Limiting:** Maximum 5 attempts per 60-second window.

---

## Core API (Port 3001)

### Health Check

#### GET /health

Returns service health and registered backend service statuses.

**Response (200):**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "services": {
    "sandbox": { "status": "healthy", "latency": 12, "lastCheck": "2026-06-13T10:00:00Z" },
    "search": { "status": "healthy", "latency": 5, "lastCheck": "2026-06-13T10:00:00Z" },
    "copilot": { "status": "degraded", "latency": 150, "lastCheck": "2026-06-13T10:00:00Z" }
  }
}
```

### Workspaces

#### GET /api/workspaces

List all workspaces.

**Response (200):**
```json
{
  "workspaces": [
    {
      "id": "ws-1",
      "name": "my-project",
      "path": "/workspace/my-project",
      "createdAt": "2026-06-13T10:00:00Z"
    }
  ]
}
```

#### POST /api/workspaces

Create a new workspace.

**Request:**
```json
{
  "name": "new-project",
  "path": "/workspace/new-project"
}
```

**Response (201):**
```json
{
  "id": "ws-2",
  "name": "new-project",
  "path": "/workspace/new-project",
  "createdAt": "2026-06-13T10:30:00Z"
}
```

### Files

#### GET /api/files?workspaceId=:id

List files in a workspace.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workspaceId | string | Yes | Workspace ID |

**Response (200):**
```json
{
  "files": [
    {
      "id": "f-1",
      "name": "index.ts",
      "path": "/workspace/my-project/src/index.ts",
      "content": "console.log('hello')",
      "language": "typescript",
      "size": 22,
      "modifiedAt": "2026-06-13T10:00:00Z"
    }
  ]
}
```

#### POST /api/files

Create a new file.

**Request:**
```json
{
  "name": "utils.ts",
  "path": "/workspace/my-project/src/utils.ts",
  "content": "export function greet(name: string) { return `Hello, ${name}!`; }",
  "workspaceId": "ws-1"
}
```

**Response (201):**
```json
{
  "id": "f-2",
  "name": "utils.ts",
  "path": "/workspace/my-project/src/utils.ts",
  "content": "export function greet(name: string) { return `Hello, ${name}!`; }",
  "language": "typescript",
  "size": 58,
  "modifiedAt": "2026-06-13T10:30:00Z"
}
```

#### PUT /api/files/:id

Update a file's content.

**Request:**
```json
{
  "content": "export function greet(name: string): string { return `Hello, ${name}!`; }"
}
```

**Response (200):**
```json
{
  "id": "f-2",
  "name": "utils.ts",
  "path": "/workspace/my-project/src/utils.ts",
  "content": "export function greet(name: string): string { return `Hello, ${name}!`; }",
  "language": "typescript",
  "size": 69,
  "modifiedAt": "2026-06-13T10:35:00Z"
}
```

#### DELETE /api/files/:id

Delete a file.

**Response (204):** No content

### Search

#### POST /api/search

Search for content across files. Proxies to Rust search service with in-memory fallback.

**Request:**
```json
{
  "query": "function add",
  "type": "content",
  "options": {
    "caseSensitive": false,
    "wholeWord": false,
    "regex": false
  }
}
```

**Response (200):**
```json
{
  "results": [
    {
      "file": "src/math.ts",
      "line": 5,
      "column": 1,
      "text": "function add(a: number, b: number): number {",
      "matchLength": 12
    }
  ],
  "total": 1
}
```

### Code Execution

#### POST /api/execute

Execute code in a sandboxed environment. Proxies to Go sandbox service with local fallback.

**Request:**
```json
{
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "options": {
    "timeout": 10,
    "memoryLimit": 256
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": null,
  "exitCode": 0,
  "executionTime": 125
}
```

**Error Response (200):**
```json
{
  "success": false,
  "output": "",
  "error": "SyntaxError: Unexpected token",
  "exitCode": 1,
  "executionTime": 50
}
```

### AI Completions

#### POST /api/copilot/completions

Get AI code completions. Proxies to Python copilot service with template fallback.

**Request:**
```json
{
  "file_path": "src/index.ts",
  "language": "typescript",
  "prefix": "function add(a: number, b: number) ",
  "suffix": "\n}",
  "cursor_position": 35
}
```

**Response (200):**
```json
{
  "completions": [
    {
      "text": "{\n  return a + b;\n",
      "display_text": "return a + b",
      "confidence": 0.85,
      "source": "template"
    }
  ]
}
```

### Terminals

#### GET /api/terminals

List active terminal sessions.

**Response (200):**
```json
{
  "terminals": [
    {
      "id": "term-1",
      "name": "bash",
      "createdAt": "2026-06-13T10:00:00Z"
    }
  ]
}
```

#### POST /api/terminals

Create a new terminal session.

**Request:**
```json
{
  "name": "bash",
  "shell": "/bin/bash"
}
```

**Response (201):**
```json
{
  "id": "term-2",
  "name": "bash",
  "shell": "/bin/bash",
  "createdAt": "2026-06-13T10:30:00Z"
}
```

#### DELETE /api/terminals/:id

Close a terminal session.

**Response (204):** No content

### Git

#### GET /api/git/status

Get simulated git status.

**Response (200):**
```json
{
  "branch": "main",
  "ahead": 0,
  "behind": 0,
  "staged": [
    { "path": "src/index.ts", "status": "modified" }
  ],
  "changes": [
    { "path": "src/utils.ts", "status": "modified" },
    { "path": "README.md", "status": "untracked" }
  ]
}
```

### Extensions

#### GET /api/extensions

List available extensions (simulated marketplace).

**Response (200):**
```json
{
  "extensions": [
    {
      "id": "esbenp.prettier-vscode",
      "name": "Prettier",
      "publisher": "esbenp",
      "version": "10.1.0",
      "description": "Code formatter",
      "installed": false,
      "enabled": true
    }
  ]
}
```

### Ports

#### GET /api/ports

List port forwarding configurations.

**Response (200):**
```json
{
  "ports": [
    {
      "localPort": 3000,
      "targetPort": 3000,
      "protocol": "http",
      "running": true,
      "name": "Next.js Dev Server"
    }
  ]
}
```

### Services

#### GET /api/services

Get health status of all registered backend services.

**Response (200):**
```json
{
  "services": {
    "sandbox": { "status": "healthy", "latency": 12, "url": "http://localhost:3002" },
    "search": { "status": "healthy", "latency": 5, "url": "http://localhost:3003" },
    "copilot": { "status": "unhealthy", "latency": null, "url": "http://localhost:3004" }
  }
}
```

---

## Sandbox Service (Port 3002)

### POST /api/execute

Execute code in a Docker sandbox container.

**Request:**
```json
{
  "code": "print('hello from python')",
  "language": "python",
  "options": {
    "timeout": 30,
    "memoryLimit": 512,
    "cpuQuota": 100000
  }
}
```

**Response (200 — Non-streaming):**
```json
{
  "id": "exec-abc123",
  "success": true,
  "output": "hello from python\n",
  "error": null,
  "exitCode": 0,
  "executionTime": 250
}
```

**SSE Streaming Response:**
```
event: stdout
data: {"type":"stdout","content":"hello from python\n"}

event: exit
data: {"type":"exit","code":0}

event: done
data: {"type":"done","executionTime":250}
```

### GET /api/execute/:id

Get the result of a previous execution.

**Response (200):**
```json
{
  "id": "exec-abc123",
  "success": true,
  "output": "hello from python\n",
  "error": null,
  "exitCode": 0,
  "executionTime": 250
}
```

### GET /api/languages

List supported programming languages.

**Response (200):**
```json
{
  "languages": [
    { "id": "javascript", "name": "JavaScript", "extension": ".js", "runner": "node" },
    { "id": "typescript", "name": "TypeScript", "extension": ".ts", "runner": "npx tsx" },
    { "id": "python", "name": "Python", "extension": ".py", "runner": "python3" },
    { "id": "go", "name": "Go", "extension": ".go", "runner": "go run" },
    { "id": "rust", "name": "Rust", "extension": ".rs", "runner": "rustc && ./out" }
  ]
}
```

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "docker": "available",
  "containers": 0,
  "uptime": 3600
}
```

---

## Search Service (Port 3003)

### POST /api/search

Full-text content search across indexed files.

**Request:**
```json
{
  "query": "import React",
  "options": {
    "case_sensitive": false,
    "whole_word": false,
    "regex": false,
    "max_results": 50
  }
}
```

**Response (200):**
```json
{
  "results": [
    {
      "file_path": "src/app/page.tsx",
      "line_number": 1,
      "column": 1,
      "matched_text": "import React",
      "context": "import React from 'react';",
      "score": 1.0
    }
  ],
  "total_matches": 5,
  "files_searched": 42,
  "search_time_ms": 3
}
```

### POST /api/search/filenames

Search for files by name using trie-based autocomplete.

**Request:**
```json
{
  "prefix": "page",
  "max_results": 20
}
```

**Response (200):**
```json
{
  "results": [
    { "path": "src/app/page.tsx", "name": "page.tsx" },
    { "path": "src/pages/about.tsx", "name": "about.tsx" }
  ],
  "total": 2
}
```

### GET /api/search/suggest

Get search suggestions based on a partial query.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Partial search query |

**Response (200):**
```json
{
  "suggestions": [
    { "text": "import React", "type": "content" },
    { "text": "index.tsx", "type": "filename" }
  ]
}
```

### POST /api/index

Trigger a manual reindex of the workspace.

**Request:**
```json
{
  "paths": ["/workspace/my-project"],
  "force": false
}
```

**Response (202):**
```json
{
  "status": "indexing",
  "files_queued": 42
}
```

### GET /api/index/stats

Get indexing statistics.

**Response (200):**
```json
{
  "total_files": 42,
  "indexed_files": 40,
  "total_terms": 12500,
  "index_size_bytes": 524288,
  "last_updated": "2026-06-13T10:00:00Z"
}
```

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "indexed_files": 40,
  "uptime": 3600
}
```

---

## Copilot Service (Port 3004)

### POST /api/completions

Get synchronous code completions.

**Request:**
```json
{
  "file_path": "src/components/App.tsx",
  "language": "typescript",
  "prefix": "const [count, setCount] = ",
  "suffix": ";\n\nreturn <div>{count}</div>;",
  "cursor_position": 28,
  "max_completions": 3
}
```

**Response (200):**
```json
{
  "completions": [
    {
      "text": "useState(0)",
      "display_text": "useState(0)",
      "confidence": 0.92,
      "source": "template",
      "metadata": {
        "template_id": "react-useState",
        "language": "typescript"
      }
    }
  ],
  "context": {
    "language": "typescript",
    "framework": "react",
    "line_type": "variable_declaration"
  }
}
```

### POST /api/completions/stream

Get streaming code completions via Server-Sent Events.

**Request:** Same as `/api/completions`

**Response (SSE):**
```
event: start
data: {"request_id":"req-123","timestamp":"2026-06-13T10:00:00Z"}

event: completion_start
data: {"index":0,"confidence":0.92}

event: chunk
data: {"text":"useState"}

event: chunk
data: {"text":"(0)"}

event: completion_end
data: {"index":0,"full_text":"useState(0)","confidence":0.92}

event: done
data: {"total":1,"request_id":"req-123"}
```

### GET /api/completions/health

Completion engine health check.

**Response (200):**
```json
{
  "status": "healthy",
  "templates_loaded": 42,
  "languages_supported": 5,
  "avg_latency_ms": 15
}
```

### GET /health

Service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "0.2.0",
  "uptime": 3600
}
```

---

## Frontend API Gateway

All backend APIs are accessible through Next.js API routes at `/api/core/{service}`. The frontend API gateway adds:

- **Timeout handling** — 5-second default timeout for all backend requests
- **Error normalization** — Consistent error response format
- **CORS handling** — No CORS issues since requests are same-origin
- **Cascading fallback** — Automatic client-side simulation when backends are down

### Route Mapping

| Frontend Route | Backend Target |
|---------------|----------------|
| `/api/core/health` | `GET localhost:3001/health` |
| `/api/core/execute` | `POST localhost:3001/api/execute` |
| `/api/core/copilot` | `POST localhost:3001/api/copilot/completions` |
| `/api/core/search` | `POST localhost:3001/api/search` |
| `/api/core/auth` | `POST localhost:3001/api/auth/login` |
| `/api/core/terminals` | `GET/POST localhost:3001/api/terminals` |
| `/api/core/services` | `GET localhost:3001/api/services` |
| `/api/core/files` | `GET/POST/PUT/DELETE localhost:3001/api/files` |
| `/api/core/workspaces` | `GET/POST localhost:3001/api/workspaces` |
| `/api/core/git` | `GET localhost:3001/api/git/status` |
| `/api/core/extensions` | `GET localhost:3001/api/extensions` |
| `/api/core/ports` | `GET localhost:3001/api/ports` |
| `/api/sandbox` | `POST localhost:3002/api/execute` |
| `/api/search` | `POST localhost:3003/api/search` |
| `/api/copilot` | `POST localhost:3004/api/completions` |

---

## WebSocket Events

All WebSocket communication uses Socket.IO on port 3001.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `terminal:input` | `{ sessionId, data }` | Send keyboard input to terminal |
| `terminal:resize` | `{ sessionId, cols, rows }` | Resize terminal viewport |
| `file:subscribe` | `{ path }` | Subscribe to file change notifications |
| `file:unsubscribe` | `{ path }` | Unsubscribe from file changes |
| `lsp:request` | `{ language, method, params }` | Send LSP request |
| `copilot:complete` | `{ file, position, prefix, suffix }` | Request AI completion |
| `session:join` | `{ workspaceId, userId }` | Join collaborative workspace |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `terminal:output` | `{ sessionId, data }` | Terminal output stream |
| `file:updated` | `{ path, content, changeType }` | File change notification |
| `lsp:response` | `{ id, result }` | LSP response |
| `copilot:chunk` | `{ text, confidence }` | Streaming completion chunk |
| `copilot:done` | `{ completions[] }` | Completion stream finished |

---

## Error Handling

### Standard Error Response Format

All API errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (authentication required) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (backend down) |

### Fallback Behavior

When a backend service is unavailable, the system gracefully degrades:

| Service Down | Fallback |
|-------------|----------|
| Core API | Local in-memory state, simulated responses |
| Sandbox | Local JS `eval()` for JavaScript, template output for other languages |
| Search | Client-side in-memory string matching |
| Copilot | Template-based code completion |
| WebSocket | Polling-based state updates, real-time features disabled |
