# Architecture Documentation

This document provides an in-depth look at the VS Code Web Replica's architecture, design decisions, data flows, and integration patterns.

---

## Table of Contents

- [System Overview](#system-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [State Management Architecture](#state-management-architecture)
- [API Gateway Pattern](#api-gateway-pattern)
- [WebSocket Architecture](#websocket-architecture)
- [Theming Architecture](#theming-architecture)
- [Responsive Design Architecture](#responsive-design-architecture)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Technology Decisions](#technology-decisions)

---

## System Overview

VS Code Web Replica is a **polyglot microservices application** that replicates the VS Code IDE experience in the browser. The system is composed of a Next.js frontend that serves as both the UI and an API gateway, plus four specialized backend services each written in the language best suited for their domain.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Next.js Frontend (Port 3000)                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │  Monaco   │ │ Zustand  │ │  API     │ │ Socket.IO│ │ CSS      │ │ │
│  │  │  Editor   │ │  Stores  │ │  Client  │ │  Client  │ │  Themes  │ │ │
│  │  └──────────┘ └──────────┘ └────┬─────┘ └────┬─────┘ └──────────┘ │ │
│  └──────────────────────────────────┼───────────┼──────────────────────┘ │
│                                     │           │                        │
└─────────────────────────────────────┼───────────┼────────────────────────┘
                                      │ HTTP      │ WebSocket
                              ┌───────▼───────────▼────────┐
                              │   Caddy Reverse Proxy       │
                              │        (Port 81)            │
                              └───┬──────┬──────┬──────┬───┘
                                  │      │      │      │
                     ┌────────────▼┐  ┌──▼───┐  ┌▼────┐ ┌▼──────────┐
                     │  Core API   │  │Search│  │Sandbox│ Kilo Code │
                     │  Node.js    │  │Rust  │  │  Go   │TypeScript │
                     │  :3001      │  │:3003 │  │ :3002 │  :3005    │
                     └──────┬──────┘  └──────┘  └───────┘ └──────────┘
                            │
                     ┌──────▼──────┐
                     │   SQLite    │
                     │  (Prisma)   │
                     └─────────────┘
```

### Design Principles

1. **Polyglot by Design** — Each backend service uses the language optimized for its domain
2. **Graceful Degradation** — Every backend feature has a client-side fallback
3. **API Gateway Pattern** — Next.js API routes centralize backend communication
4. **State Isolation** — Zustand stores are domain-specific with minimal cross-store dependencies
5. **Theme-First UI** — All visual properties flow through CSS custom properties
6. **Mobile-First Responsive** — Touch-friendly defaults enhanced for desktop

---

## Frontend Architecture

### Component Hierarchy

```
page.tsx (Home)
├── LoginScreen (if not authenticated)
└── Main IDE Layout
    ├── TitleBar
    │   ├── Menu Items (File, Edit, View, Go, Run, Terminal, Help)
    │   └── Mobile Hamburger Button
    ├── ActivityBar
    │   ├── Explorer Icon
    │   ├── Search Icon
    │   ├── SCM Icon
    │   ├── Run & Debug Icon
    │   ├── Extensions Icon
    │   ├── Accounts Icon (bottom)
    │   └── Settings Icon (bottom)
    ├── Sidebar (resizable)
    │   ├── ExplorerView
    │   │   └── FileTreeNode (recursive)
    │   ├── SearchView
    │   ├── SCMView
    │   ├── RunDebugView
    │   └── ExtensionsView
    ├── EditorArea
    │   ├── TabBar
    │   │   └── Tab[] (with scroll & overflow)
    │   ├── Breadcrumbs
    │   └── Monaco Editor (split into up to 3 panes)
    ├── BottomPanel (resizable)
    │   ├── Terminal
    │   │   ├── TerminalInput (with history & tab completion)
    │   │   └── TerminalOutput (ANSI-colored)
    │   ├── ProblemsPanel
    │   ├── OutputPanel
    │   ├── DebugConsolePanel
    │   └── PortsPanel
    ├── CodeExecutionPanel
    ├── StatusBar
    │   ├── Branch Picker
    │   ├── Language Indicator
    │   ├── Cursor Position
    │   ├── WebSocket Status
    │   └── Notification Bell
    ├── MobileBottomNav (mobile only)
    ├── CommandPalette (overlay)
    ├── SettingsPanel (modal)
    ├── NotificationCenter (panel)
    ├── WorkspaceTrustDialog (modal)
    └── WelcomePage (default tab)
```

### Rendering Pipeline

```
User Interaction
      │
      ▼
Zustand Store Update
      │
      ▼
React Re-render (subscribers only)
      │
      ▼
Monaco Editor Update (if content change)
      │
      ▼
Auto-save Trigger (debounced, if dirty)
      │
      ▼
API Client Call (if backend available)
      │
      ▼
WebSocket Broadcast (if connected)
```

### Key React Patterns

**Controlled Monaco Editor:**
The Monaco editor is synchronized with Zustand's `useEditorStore`. Content changes flow from Monaco → Store, and Store updates flow back to Monaco via `editor.setValue()`. This dual-binding is managed carefully to prevent infinite loops using a `isUpdatingFromStore` ref.

**Lazy Component Loading:**
Heavy components (Monaco editor, settings panel) are loaded lazily to reduce initial bundle size:
```typescript
const EditorArea = dynamic(() => import('@/components/layout/EditorArea'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
```

**Custom Event System:**
Inter-component communication uses `CustomEvent` on `document` for loosely-coupled messaging:
```typescript
// Emit
document.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'newTerminal' } }));

// Listen
document.addEventListener('vscode:command', handler);
```

---

## Backend Architecture

### Service Communication Patterns

```
┌──────────┐    HTTP/REST     ┌──────────┐    HTTP/REST     ┌──────────┐
│ Frontend │ ───────────────► │ Core API │ ───────────────► │ Search   │
│          │                  │          │                   │ (Rust)   │
│          │ ◄─────────────── │          │ ◄─────────────── │          │
└──────────┘    JSON/SSE      └────┬─────┘    JSON          └──────────┘
                                   │
                                   │ HTTP/REST
                                   │
                              ┌────▼─────┐    Docker API    ┌──────────┐
                              │ Sandbox  │ ───────────────► │ Docker   │
                              │  (Go)    │                   │ Container│
                              │          │ ◄─────────────── │          │
                              └──────────┘    SSE Stream    └──────────┘
                                   │
                                   │ HTTP/REST
                                   │
                              ┌────▼─────┐
                              │ Kilo Code│
                              │(TypeScript)│
                              └──────────┘
```

### Core API — Request Lifecycle

```
1. Request arrives at Core API (port 3001)
2. Authentication check (if required)
3. Route to appropriate handler
4. If proxy route (search/execute/kilocode):
   a. Forward request to target service
   b. If target unavailable → use local fallback
   c. Return response
5. If local route (files/workspaces/git):
   a. Process in-memory
   b. Broadcast changes via WebSocket
   c. Return response
6. Error handling with structured error responses
```

### Sandbox — Execution Pipeline

```
1. POST /api/execute with { code, language, options }
2. Validate language support
3. Create Docker container with:
   - Memory limit (default: 512MB)
   - CPU quota (default: 1 CPU)
   - PID limit (default: 100)
   - Network disabled
   - Read-only filesystem (except /tmp)
4. Write code to container's /tmp directory
5. Execute code with language-specific runner
6. Stream output via SSE:
   - stdout chunks → data: {"type":"stdout","content":"..."}
   - stderr chunks → data: {"type":"stderr","content":"..."}
   - exit code     → data: {"type":"exit","code":0}
7. Clean up container (or reuse for same language)
8. Return final result
```

### Search — Indexing Pipeline

```
1. On startup:
   a. Scan configured workspace directories
   b. Parse each file into tokens
   c. Build inverted index (term → file:line:column)
   d. Build trie for filename completion
2. On file change (via notify crate):
   a. Debounce 500ms
   b. Re-index changed file only
   c. Update inverted index incrementally
   d. Update trie if filename changed
3. On search request:
   a. Parse query (regex vs plain vs fuzzy)
   b. Query inverted index for content matches
   c. Query trie for filename matches
   d. Rank results by relevance (TF-IDF-like)
   e. Return ranked results with context snippets
```

### Kilo Code — AI Agent Pipeline

```
1. POST /api/completions with { file_path, language, prefix, suffix }
   OR chat/agent request with { message, mode, context }
2. Integration service (port 3005) bridges request to Kilocode CLI daemon (port 4096):
   a. Forward completion/chat/agent request to CLI daemon
   b. CLI daemon leverages configured LLM provider (500+ models supported)
3. Inline Completions (FIM — Fill-in-the-Middle):
   a. Extract code context (prefix, suffix, imports, signatures)
   b. Send FIM request to LLM via Kilocode daemon
   c. Stream completion tokens back via SSE
4. Multi-Turn Chat:
   a. Maintain conversation history with codebase context
   b. Support Code, Architect, Debug, Ask, and Orchestrator agent modes
   c. Stream responses with real-time code diffs
5. Agent Modes:
   a. Code Mode — Direct code edits with file diffs
   b. Architect Mode — Planning and design discussions
   c. Debug Mode — Error analysis and fix suggestions
   d. Ask Mode — General Q&A without code changes
   e. Orchestrator Mode — Multi-step task delegation
6. Codebase Indexing & MCP:
   a. Index workspace for semantic code search
   b. Manage MCP (Model Context Protocol) servers for tool integration
7. Real-Time Events (SSE):
   a. Stream completion tokens as they arrive
   b. Emit task progress, file changes, and agent state updates
   c. Support cancellation of in-progress requests
```

---

## Data Flow Diagrams

### File Operations

```
User creates file in ExplorerView
      │
      ▼
useFileSystemStore.createFile(name, path)
      │
      ├─► Update in-memory tree
      │
      ├─► If backend available:
      │     apiClient.createFile({ name, path, content })
      │          │
      │          ▼
      │     POST /api/core/files → Core API
      │          │
      │          ▼
      │     Core API: Store in memory + broadcast
      │          │
      │          ▼
      │     WebSocket: file:updated event
      │
      ├─► Auto-open in editor:
      │     useEditorStore.openTab(newFile)
      │
      └─► Notification: "File created"
```

### Code Execution

```
User clicks "Run" in CodeExecutionPanel
      │
      ▼
useCodeExecutionStore.executeCode(code, language)
      │
      ├─► Try backend:
      │     POST /api/core/execute → Core API
      │          │
      │          ▼
      │     Core API → POST localhost:3002/api/execute → Sandbox (Go)
      │          │
      │          ├─► Docker container created
      │          ├─► Code executed with resource limits
      │          ├─► SSE stream → output chunks
      │          └─► Container cleaned up
      │
      └─► Fallback (if backend unavailable):
            Local JavaScript eval() for JS
            Template-based output for Python/Go/Rust
```

### AI Completion

```
User types in Monaco Editor (800ms debounce)
      │
      ▼
useAICompletionStore.requestCompletion(file, position, prefix)
      │
      ├─► Try backend:
      │     POST /api/core/kilocode → Core API
      │          │
      │          ▼
      │     Core API → POST localhost:3005/api/completions → Kilo Code (TypeScript)
      │          │
      │          ├─► Context extraction
      │          ├─► FIM request to Kilocode CLI daemon (port 4096)
      │          ├─► LLM-powered completion generation
      │          └─► Return completions[]
      │
      └─► Fallback (if Kilo Code unavailable):
            Client-side template matching
            Language-specific snippet insertion
      │
      ▼
Display inline suggestion in Monaco (ghost text)
      │
      ├─► Tab → Accept (insert suggestion)
      └─► Esc → Dismiss
```

---

## State Management Architecture

### Store Dependency Graph

```
useEditorStore ←─── useFileSystemStore (file content)
      │
      ├── useThemeStore (editor theme)
      ├── useSettingsStore (editor settings)
      └── useAICompletionStore (completions)

useSidebarStore (independent)

useTerminalStore (independent)

useGitStore ←─── useFileSystemStore (file changes)

useExtensionStore (independent)

useAuthStore (independent, gates entire app)

useWebSocketStore ←─── useStatusBarStore (connection status)

useNotificationStore (independent, consumed by StatusBar)

useCodeExecutionStore ←─── useEditorStore (active code)

usePortStore (independent)

useStatusBarStore ←─── useGitStore, useEditorStore, useWebSocketStore
```

### Store Persistence

| Store | Persistence | Mechanism |
|-------|-------------|-----------|
| `useSettingsStore` | Yes | localStorage (all settings) |
| `useThemeStore` | Yes | localStorage (theme selection) |
| `useAuthStore` | Partial | localStorage (token, session) |
| All others | No | In-memory only (reset on refresh) |

### Store Communication Pattern

Stores communicate through:
1. **Direct import** — One store imports and calls another store's actions
2. **Custom events** — `vscode:command` events for loose coupling
3. **React components** — Components read from multiple stores and coordinate
4. **WebSocket messages** — Real-time updates from backend trigger store updates

---

## API Gateway Pattern

The Next.js API routes serve as an **API Gateway** that:
1. Centralizes all backend communication
2. Adds timeout handling (5-second default)
3. Provides unified error responses
4. Enables CORS-free client-side requests
5. Implements the cascading fallback strategy

### Fallback Strategy

```
Client Request
      │
      ▼
api-client.ts function
      │
      ├─► Try 1: Direct service call
      │     fetch('http://localhost:{PORT}/api/...')
      │          │
      │          ├─► Success → Return response
      │          └─► Failure → Try 2
      │
      ├─► Try 2: Core API proxy
      │     fetch('/api/core/{service}', ...)
      │          │
      │          ├─► Success → Return response
      │          └─► Failure → Try 3
      │
      └─► Try 3: Client-side fallback
            Local simulation / template response
```

### Caddy Port Routing

In production, Caddy uses the `XTransformPort` query parameter to route requests to the correct backend service:

```
Request: https://example.com/api/search?XTransformPort=3003
                                         │
                                         ▼
                              Caddy reads XTransformPort
                                         │
                                         ▼
                              Routes to localhost:3003
```

---

## WebSocket Architecture

### Connection Lifecycle

```
1. App loads → Socket.IO client connects to Core API (port 3001)
2. Connection established:
   - Client receives 'connect' event
   - Client joins workspace room via 'session:join'
   - WebSocketStore.status = 'connected'
3. Periodic health check:
   - Client sends ping every 30s
   - Server responds with latency measurement
   - WebSocketStore.latency updated
4. On disconnect:
   - WebSocketStore.status = 'disconnected'
   - Automatic reconnection with exponential backoff
   - UI shows disconnected indicator
5. On reconnect:
   - Socket.IO automatically rejoins rooms
   - State reconciliation if needed
```

### Event Flow

```
Terminal Input Flow:
  User types in TerminalInput
      │
      ▼
  Socket.IO: emit('terminal:input', { sessionId, data })
      │
      ▼
  Core API: receives input
      │
      ▼
  Core API: processes command (simulated shell)
      │
      ▼
  Socket.IO: emit('terminal:output', { sessionId, data })
      │
      ▼
  TerminalOutput: renders ANSI-colored output

File Watch Flow:
  Client: emit('file:subscribe', { path: '/workspace' })
      │
      ▼
  Core API: registers subscription
      │
      ▼
  [File changes on disk]
      │
      ▼
  Core API: emit('file:updated', { path, content })
      │
      ▼
  Client: useFileSystemStore.updateFile(path, content)

AI Completion Flow:
  Client: emit('kilocode:complete', { ...request })
      │
      ▼
  Core API: proxies to Kilo Code service
      │
      ▼
  Kilo Code: streams completions via Kilocode CLI daemon
      │
      ▼
  Core API: emit('kilocode:chunk', { text, confidence })
      │
      ▼
  Client: useAICompletionStore.appendChunk(text)
      │
      ▼
  Core API: emit('kilocode:done', { completions })
      │
      ▼
  Client: useAICompletionStore.finalizeCompletion()
```

---

## Theming Architecture

### CSS Custom Property Hierarchy

```
:root / .vs-light / .vs-monokai / .vs-solarized-dark / .vs-github
      │
      ├── Backgrounds (7 levels)
      │   ├── --vs-bg-main           # Main editor area
      │   ├── --vs-bg-sidebar        # Sidebar panel
      │   ├── --vs-bg-editor         # Editor background
      │   ├── --vs-bg-panel          # Bottom panel
      │   ├── --vs-bg-input          # Input fields
      │   ├── --vs-bg-dropdown       # Dropdown menus
      │   └── --vs-bg-hover          # Hover states
      │
      ├── Foregrounds (5 levels)
      │   ├── --vs-fg-primary        # Main text
      │   ├── --vs-fg-secondary      # Secondary text
      │   ├── --vs-fg-muted          # Muted/disabled text
      │   ├── --vs-fg-accent         # Accent text
      │   └── --vs-fg-on-accent      # Text on accent background
      │
      ├── Borders
      │   ├── --vs-border-default    # Default borders
      │   ├── --vs-border-focus      # Focus ring
      │   └── --vs-border-active     # Active element border
      │
      ├── Accents
      │   ├── --vs-accent            # Primary accent (blue)
      │   ├── --vs-accent-hover      # Accent hover state
      │   └── --vs-accent-muted      # Subtle accent
      │
      ├── Git Status Colors
      │   ├── --vs-git-added         # Green (new files)
      │   ├── --vs-git-modified      # Yellow (changed files)
      │   ├── --vs-git-deleted       # Red (deleted files)
      │   ├── --vs-git-untracked     # Green (untracked)
      │   ├── --vs-git-ignored       # Gray (ignored)
      │   └── --vs-git-conflict      # Purple (merge conflicts)
      │
      └── UI Elements
          ├── --vs-scrollbar-thumb   # Scrollbar color
          ├── --vs-badge-bg          # Badge background
          ├── --vs-badge-fg          # Badge text
          ├── --vs-selection-bg      # Text selection
          └── --vs-find-match-bg     # Search highlight
```

### Monaco Theme Synchronization

The `EditorArea.tsx` component maintains a mapping from CSS custom properties to Monaco token colors:

```
CSS Variable Change → themeStore.setTheme()
      │
      ▼
<html> class updated (e.g., add 'vs-monokai')
      │
      ▼
EditorArea re-renders with new Monaco theme definition
      │
      ▼
monaco.editor.defineTheme('custom', monacoThemeObject)
      │
      ▼
monaco.editor.setTheme('custom')
```

---

## Responsive Design Architecture

### Layout Adaptation Matrix

| Screen Width | Activity Bar | Sidebar | Tabs | Editor | Bottom Panel |
|--------------|-------------|---------|------|--------|-------------|
| 320–374px | Bottom nav (56px) | Overlay (full-width) | Scroll + "..." | Full-width, no minimap | 40% height, collapsible |
| 375–413px | Bottom nav (56px) | Overlay (full-width) | Scroll + "..." | Full-width, no minimap | 40% height, collapsible |
| 414–767px | Bottom nav (56px) | Overlay (280px max) | Scroll + "..." | Full-width | 40% height, collapsible |
| 768–1023px | Compact (48px icons) | Compact (48px icons) | Normal | Full-width | Normal |
| 1024px+ | Full (56px) | Resizable (170–600px) | Normal | Split capable | Resizable |

### Touch Interaction System

```
Touch Event Detection
      │
      ├── useSwipeGesture hook
      │   ├── minDistance: 50px
      │   ├── minVelocity: 0.3
      │   ├── edgeThreshold: 20px
      │   └── Directions: left, right, up, down
      │
      ├── Long Press Detection
      │   ├── delay: 500ms
      │   ├── Used for: tab close, context menus
      │   └── Cancel on move (>10px) or touch end
      │
      └── Touch Target Enforcement
          ├── Minimum: 44×44px (iOS HIG)
          ├── 8px grid spacing
          └── Applied via Tailwind: min-h-[44px] min-w-[44px]
```

### Mobile-Specific Components

| Component | Desktop | Mobile |
|-----------|---------|--------|
| Activity Bar | Left icon strip (56px wide) | Bottom navigation bar (56px tall) |
| Sidebar | Resizable side panel | Full-screen overlay with backdrop |
| Menu Bar | Horizontal menu items | Hamburger menu (dropdown) |
| Tab Close | Click X button | Long-press → close |
| Tab Overflow | Horizontal scroll | "..." indicator menu |
| Settings | Two-column panel | Slide-in drawer from bottom |
| Command Palette | Centered modal | Full-screen modal |

---

## Security Architecture

### Authentication Flow

```
1. User visits app → LoginScreen shown
2. User enters password
3. AuthStore.login(password) called
   ├── Try: POST /api/core/auth/login { password }
   │   └── Server validates → Returns JWT token
   └── Fallback: Local validation (password: "vscode")
4. Token stored in AuthStore + localStorage
5. Subsequent API calls include Authorization header
6. Token expiry → Auto-logout → Show LoginScreen
```

### Rate Limiting

Login attempts are rate-limited on the client side:
- Maximum 5 attempts per 60-second window
- Exponential backoff on repeated failures
- UI shows remaining lockout time

### Sandbox Security

Docker containers used for code execution are isolated with:

| Security Measure | Value | Purpose |
|-----------------|-------|---------|
| Memory limit | 512 MB | Prevent resource exhaustion |
| CPU quota | 1 CPU | Prevent CPU hogging |
| PID limit | 100 | Prevent fork bombs |
| Network mode | None | Prevent network access |
| Read-only root FS | Yes (except /tmp) | Prevent filesystem modification |
| Execution timeout | 30 seconds | Prevent infinite loops |
| User namespace | Rootless | Prevent privilege escalation |

### Input Sanitization

- **Debug Console** — `eval()` replaced with `new Function()` and math-only filtering
- **Terminal Input** — Commands validated against whitelist before execution
- **File Names** — Path traversal attacks prevented via path normalization
- **Code Execution** — Sandboxed in Docker containers (no host access)

---

## Deployment Architecture

### Docker Compose Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: vscode-net                 │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ frontend │  │core-api  │  │ sandbox  │  │  search  │   │
│  │  :3000   │  │  :3001   │  │  :3002   │  │  :3003   │   │
│  │          │  │          │  │ (Docker   │  │          │   │
│  │ Next.js  │  │ Node.js  │  │  socket) │  │  Rust    │   │
│  │          │  │+Socket.IO│  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘   │
│       │              │                                      │
│       │        ┌─────▼─────┐                                │
│       │        │ kilocode  │                                │
│       │        │  :3005    │                                │
│       │        │TypeScript │                                │
│       │        └───────────┘                                │
│       │                                                     │
│  ┌────▼─────────────────────────────────────────────────┐   │
│  │                 caddy (Port 81)                        │   │
│  │           Reverse Proxy + TLS Termination              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Health Check System

Each backend service exposes a `/health` endpoint. The Core API maintains a **service registry** that periodically checks all services:

```json
{
  "status": "healthy",
  "services": {
    "sandbox": { "status": "healthy", "latency": 12, "lastCheck": "2026-06-13T10:00:00Z" },
    "search": { "status": "healthy", "latency": 5, "lastCheck": "2026-06-13T10:00:00Z" },
    "kilocode": { "status": "degraded", "latency": 150, "lastCheck": "2026-06-13T10:00:00Z" }
  }
}
```

### Resource Allocation

| Service | CPU Limit | Memory Limit | Reason |
|---------|-----------|-------------|--------|
| sandbox | 2 CPUs | 1 GB | Needs resources for Docker containers |
| search | 2 CPUs | 512 MB | Indexing is CPU-intensive |
| kilocode | 1 CPU | 256 MB | Node.js bridge to Kilocode CLI daemon |
| core-api | Default | Default | Primarily I/O bound |
| frontend | Default | Default | SSR rendering |

---

## Technology Decisions

### Why Polyglot Backend?

| Service | Language | Rationale |
|---------|----------|-----------|
| **Core API** | TypeScript/Node.js | Shares types with frontend; excellent async I/O; Socket.IO native support; developer familiarity |
| **Sandbox** | Go | Docker SDK is first-class; excellent concurrency model; fast startup; low memory footprint; container management expertise in the ecosystem |
| **Search** | Rust | Zero-cost abstractions for search algorithms; predictable performance; memory-safe trie and inverted index; Axum framework provides excellent async HTTP |
| **Kilo Code** | TypeScript/Node.js | Open-source agentic coding platform (https://github.com/Kilo-Org/kilocode); supports 500+ LLM models; provides FIM completions, multi-turn chat, agent modes (Code, Architect, Debug, Ask, Orchestrator); TypeScript shares types with frontend for seamless integration |

### Why Next.js App Router?

- **Server Components** — Reduce client bundle size for heavy pages
- **API Routes** — Built-in API gateway without separate Express server
- **File-based Routing** — Intuitive project structure
- **Middleware** — Authentication and CORS handling
- **Optimized Builds** — Automatic code splitting and tree shaking

### Why Zustand over Redux/Context?

- **Minimal Boilerplate** — No actions, reducers, or selectors boilerplate
- **TypeScript Native** — Full type inference without manual typing
- **Performance** — Fine-grained subscriptions prevent unnecessary re-renders
- **Bundle Size** — ~1KB vs ~7KB (Redux) or Context overhead
- **DevTools** — Redux DevTools compatible via middleware

### Why Monaco Editor?

- **VS Code Parity** — Same editor engine ensures authentic experience
- **Language Support** — 30+ languages with syntax highlighting out of the box
- **Extensibility** — Support for custom languages, themes, and keybindings
- **Performance** — Handles large files (100K+ lines) efficiently
- **Familiarity** — Developers already know the shortcuts and behavior

### Why Docker for Code Execution?

- **Security** — Complete process and network isolation
- **Resource Control** — Memory, CPU, and PID limits prevent abuse
- **Language Support** — Any language with a Docker image can be supported
- **Consistency** — Same execution environment regardless of host OS
- **Cleanup** — Containers are ephemeral and automatically cleaned up

---

*This architecture documentation is maintained alongside the codebase. When making significant architectural changes, please update this document accordingly.*
