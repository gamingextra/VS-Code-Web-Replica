# VS Code Web Replica

A full-featured, browser-based VS Code IDE replica built with Next.js 16, featuring a polyglot microservices backend — TypeScript (Core API), Go (Sandbox), Rust (Search), and Kilo Code (AI Coding Agent). Designed to deliver a production-grade, code-server-like development experience directly in the browser with full responsive support for mobile, tablet, and desktop devices.

![VS Code Web Replica](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go) ![Rust](https://img.shields.io/badge/Rust-1.70+-000000?logo=rust) ![Kilo Code](https://img.shields.io/badge/Kilo_Code-AI_Agent-orange?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker) ![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Docker)](#quick-start-docker)
  - [Local Development](#local-development)
  - [Backend Services](#backend-services)
- [Project Structure](#project-structure)
- [Frontend Components](#frontend-components)
- [State Management](#state-management)
- [Backend Microservices](#backend-microservices)
  - [Core API (TypeScript/Node.js)](#core-api-typescriptnodejs)
  - [Sandbox Service (Go)](#sandbox-service-go)
  - [Search Service (Rust)](#search-service-rust)
  - [Kilo Code AI Agent (TypeScript)](#kilo-code-ai-agent-typescriptnodejs)
- [API Reference](#api-reference)
- [Theming](#theming)
- [Responsive Design](#responsive-design)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core IDE Experience
- **Full VS Code Layout** — Title bar, activity bar, sidebar, editor area, bottom panel, and status bar faithfully recreated
- **Monaco Code Editor** — Syntax highlighting for 30+ languages, split editor (up to 3 panes), minimap, breadcrumbs, bracket matching
- **5 Color Themes** — Dark+ (default), Light+, Monokai, Solarized Dark, and GitHub themes with 35+ CSS custom properties each
- **Virtual File System** — In-memory file tree with CRUD operations, context menus, drag-and-drop, rename, expand/collapse
- **Command Palette** — `cmdk`-powered palette with command mode (`>` prefix) and quick file open mode (`Ctrl+P`)
- **Settings Panel** — Full settings UI with categories, search, and persistence to localStorage

### Terminal & Execution
- **Simulated Terminal** — 40+ Unix commands (ls, cd, git, npm, cat, grep, find, etc.), tab completion, command history, multi-tab support
- **Code Execution Sandbox** — Docker-based code execution with resource limits, network isolation, and SSE streaming output
- **Supported Languages** — JavaScript, TypeScript, Python, Go, Rust, and more with local fallback execution

### AI & Intelligence
- **AI-Powered Coding (Kilo Code)** — AI-powered coding agent with inline completions, multi-turn chat, and agent modes (Code, Architect, Debug, Ask, Orchestrator) via Kilo Code integration supporting 500+ LLM models
- **Streaming Completions** — Server-Sent Events (SSE) for real-time completion streaming
- **Context-Aware** — Language-specific templates and context extraction for intelligent suggestions
- **Tab to Accept / Esc to Dismiss** — VS Code-style inline completion interaction
- **Agent Modes** — Code, Architect, Debug, Ask, and Orchestrator modes for different coding workflows
- **Codebase Indexing** — Automatic codebase indexing for context-aware suggestions
- **MCP Server Management** — Model Context Protocol server integration

### Collaboration & Real-Time
- **WebSocket Communication** — Socket.IO for real-time terminal I/O, file watching, LSP relay, and AI completion streaming
- **Service Health Monitoring** — Real-time dashboard showing health status of all 4 backend microservices
- **Port Forwarding** — Start, stop, and manage forwarded ports directly from the UI

### Developer Tools
- **Source Control (Git)** — Stage/unstage changes, commit, branch switching, diff indicators (simulated)
- **Extension Marketplace** — Browse, install, uninstall, and toggle extensions
- **Full-Text Search** — Rust-powered search with inverted index, trie-based filename autocomplete, regex and fuzzy matching
- **Notification Center** — Toast and persistent notifications with actionable buttons
- **Workspace Trust Dialog** — VS Code-style workspace trust flow

### Mobile & Responsive
- **Touch-Optimized** — 44px minimum touch targets, swipe gestures, long-press actions
- **Adaptive Layout** — Mobile (overlay sidebar, bottom nav), Tablet (compact sidebar), Desktop (full layout)
- **Landscape & Foldable** — Special handling for landscape orientation and foldable devices
- **Virtual Keyboard** — Proper `100dvh`/`100svh` handling for mobile keyboard interactions
- **Safe Area Insets** — Support for notched devices with `env(safe-area-inset-*)`

### Security & Auth
- **Authentication** — code-server-style login with password, rate limiting, and local fallback
- **Sandbox Isolation** — Docker containers with memory limits, CPU quotas, PID limits, and disabled networking
- **Workspace Trust** — Explicit trust dialog before executing code in untrusted workspaces

---

## Architecture Overview

```
                          ┌─────────────────────────────────────────────────────┐
                          │                    Caddy (Port 81)                   │
                          │              Reverse Proxy + TLS Termination         │
                          └──────────┬──────────┬──────────┬──────────┬─────────┘
                                     │          │          │          │
                          ┌──────────▼──┐ ┌─────▼────┐ ┌───▼────┐ ┌──▼─────────┐
                          │  Frontend   │ │ Core API │ │Search  │ │ Kilo Code  │
                          │  Next.js    │ │  Node.js │ │ Rust   │ │ TypeScript │
                          │  Port 3000  │ │ Port 3001│ │Port 3003│ │ Port 3005  │
                          └─────────────┘ └────┬─────┘ └────────┘ └────────────┘
                                               │
                                          ┌────▼─────┐
                                          │ Sandbox  │
                                          │   Go     │
                                          │Port 3002 │
                                          └──────────┘
```

The application follows a **microservices architecture** with a polyglot backend:

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| **Frontend** | TypeScript (Next.js) | 3000 | UI rendering, client-side state, API gateway |
| **Core API** | TypeScript (Node.js) | 3001 | REST API, WebSocket routing, service registry |
| **Sandbox** | Go | 3002 | Code execution, Docker container management |
| **Search** | Rust | 3003 | Full-text indexing, filename autocomplete, fuzzy search |
| **Kilo Code** | TypeScript (Node.js) | 3005 | AI coding agent, inline completions, chat, agent modes, codebase indexing |
| **Caddy** | Go | 81 | Reverse proxy, TLS, port-based routing |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 16 | React framework with App Router |
| [React](https://react.dev/) | 19 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type-safe JavaScript |
| [Zustand](https://zustand.docs.pmnd.rs/) | 5 | Lightweight state management (15 stores) |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 0.55 | VS Code's editor engine |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | latest | Accessible UI components (50+ components) |
| [cmdk](https://cmdk.paco.me/) | 1.1 | Command palette component |
| [Lucide React](https://lucide.dev/) | 1.18 | Icon library |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animation library |
| [Socket.IO Client](https://socket.io/) | 4.8 | WebSocket client |
| [Prisma](https://www.prisma.io/) | 6 | Database ORM (SQLite) |

### Backend
| Service | Language | Framework | Key Libraries |
|---------|----------|-----------|---------------|
| Core API | TypeScript | Node.js + Socket.IO | `http`, `socket.io`, `node-fetch` |
| Sandbox | Go | Gin | `docker/sdk`, `gin-gonic/gin` |
| Search | Rust | Axum + Tokio | `notify` (file watching), `regex`, `serde` |
| Kilo Code | TypeScript | Node.js + HTTP | `kilocode`, `@kilocode/cli`, SSE streaming |

### Infrastructure
| Tool | Purpose |
|------|---------|
| [Docker Compose](https://docs.docker.com/compose/) | Multi-container orchestration |
| [Caddy](https://caddyserver.com/) | Reverse proxy with automatic HTTPS |
| [SQLite](https://www.sqlite.org/) | Embedded database (via Prisma) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18 (or Bun >= 1.0)
- **Go** >= 1.21 (for Sandbox service)
- **Rust** >= 1.70 (for Search service)
- **Kilocode CLI** (for AI agent) — `npm install -g @kilocode/cli`
- **Docker** >= 24.0 (for containerized execution & deployment)
- **Docker Compose** >= 2.20

### Quick Start (Docker)

The fastest way to get the entire stack running:

```bash
# Clone the repository
git clone https://github.com/gamingextra/VS-Code-Web-Replica.git
cd VS-Code-Web-Replica

# Switch to the feature branch
git checkout feature/code-server-enhancements

# Build and start all services
docker compose up --build

# Access the application
# Frontend:    http://localhost:81
# Core API:    http://localhost:81?XTransformPort=3001
# Sandbox:     http://localhost:81?XTransformPort=3002
# Search:      http://localhost:81?XTransformPort=3003
# Kilo Code:   http://localhost:81?XTransformPort=3005
```

Default login credentials: `password: vscode`

### Local Development

For active development, run the frontend and backend services separately:

```bash
# 1. Install frontend dependencies
bun install

# 2. Start the Next.js development server
bun dev

# 3. Start all backend services (from project root)
chmod +x start-backend.sh
./start-backend.sh
```

The `start-backend.sh` script automatically:
- Detects installed runtimes (Go, Rust, Python)
- Starts each service in the background
- Performs health checks with retries
- Provides graceful shutdown on Ctrl+C

#### Starting Backend Services Individually

**Core API (TypeScript/Node.js)**
```bash
cd mini-services/core-api
bun install
bun run index.ts
# Runs on http://localhost:3001
```

**Sandbox (Go)**
```bash
cd backend/sandbox
go run .
# Runs on http://localhost:3002
# Requires Docker daemon for container execution
```

**Search (Rust)**
```bash
cd backend/search
cargo run --release
# Runs on http://localhost:3003
```

**Kilo Code (TypeScript/Node.js)**
```bash
# Start Kilo daemon first
kilo daemon start --hostname 0.0.0.0 --port 4096

# Start the integration service
cd backend/kilocode
bun install
bun run index.ts
# Runs on http://localhost:3005
```

### Backend Services

Each backend service operates independently with its own health endpoint and graceful degradation. If a backend service is unavailable, the frontend falls back to client-side simulation:

| Service Unavailable | Fallback Behavior |
|---------------------|-------------------|
| Core API | Local in-memory state, simulated responses |
| Sandbox | Local JavaScript `eval()` for JS, template execution for Python/Go/Rust |
| Search | Client-side in-memory string matching |
| Kilo Code | Template-based code completion (language-specific snippets) |

---

## Project Structure

```
VS-Code-Web-Replica/
├── src/                          # Frontend source
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Main IDE page composition
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Theme CSS variables (5 themes)
│   │   └── api/                  # API route handlers (Next.js proxy)
│   │       ├── route.ts          # Health check
│   │       ├── core/             # Proxies to Core API (port 3001)
│   │       │   ├── health/       # Health status
│   │       │   ├── execute/      # Code execution
│   │       │   ├── kilocode/     # AI completions
│   │       │   ├── search/       # File search
│   │       │   ├── auth/         # Authentication
│   │       │   ├── terminals/    # Terminal sessions
│   │       │   ├── services/     # Service registry
│   │       │   ├── files/        # File CRUD
│   │       │   ├── workspaces/   # Workspace management
│   │       │   ├── git/          # Git operations
│   │       │   ├── extensions/   # Extension marketplace
│   │       │   └── ports/        # Port forwarding
│   │       ├── sandbox/          # Direct sandbox access (port 3002)
│   │       ├── kilocode/          # Direct Kilo Code access (port 3005)
│   │       └── search/           # Direct search access (port 3003)
│   ├── components/               # React components
│   │   ├── layout/               # Core IDE layout shells
│   │   ├── sidebar/              # Sidebar panel views
│   │   ├── terminal/             # Terminal emulator
│   │   ├── panel/                # Bottom panel sub-panels
│   │   ├── ai/                   # Kilo Code AI UI
│   │   ├── auth/                 # Authentication screens
│   │   ├── execution/            # Code execution panel
│   │   ├── ws/                   # WebSocket status
│   │   ├── notifications/        # Notification center
│   │   ├── dialog/               # Modal dialogs
│   │   ├── ui/                   # shadcn/ui components (50+)
│   │   ├── CommandPalette.tsx     # Command palette
│   │   └── icons.tsx             # Custom SVG icons
│   ├── store/                    # Zustand state stores (15)
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   ├── data/                     # Demo data & mock extensions
│   └── utils/                    # Helper functions
├── backend/                      # Backend microservices
│   ├── sandbox/                  # Go code execution sandbox
│   │   ├── main.go               # Entry point
│   │   ├── api/handler.go        # HTTP handlers
│   │   ├── runner/               # Docker container runner
│   │   │   ├── runner.go         # Container lifecycle
│   │   │   ├── sandbox.go        # Security config
│   │   │   └── languages.go      # Language definitions
│   │   ├── go.mod                # Go module
│   │   ├── Dockerfile            # Multi-stage build
│   │   └── Makefile              # Build automation
│   ├── search/                   # Rust file search & indexing
│   │   ├── src/
│   │   │   ├── main.rs           # Axum server setup
│   │   │   ├── api.rs            # HTTP handlers
│   │   │   ├── indexer.rs        # Inverted index builder
│   │   │   ├── searcher.rs       # Search engine (regex + fuzzy)
│   │   │   └── trie.rs           # Trie data structure
│   │   ├── Cargo.toml            # Rust dependencies
│   │   ├── Dockerfile            # Multi-stage build
│   │   └── Makefile              # Build automation
│   └── kilocode/                  # Kilo Code AI agent integration
│       ├── index.ts               # Integration service (port 3005)
│       ├── start.sh               # Kilo daemon + service startup
│       ├── package.json           # Node.js dependencies
│       └── Dockerfile             # Container build
├── mini-services/                # Lightweight Node.js services
│   └── core-api/                 # Core API + WebSocket server
│       ├── index.ts              # Full API server (3001)
│       ├── package.json          # Dependencies
│       └── Dockerfile            # Container build
├── examples/                     # Example code
│   └── websocket/                # Socket.IO chat example
├── prisma/                       # Database schema
│   └── schema.prisma             # User & Post models
├── docker-compose.yml            # Multi-container orchestration
├── Caddyfile                     # Reverse proxy configuration
├── start-backend.sh              # Local dev backend launcher
├── package.json                  # Frontend dependencies
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind + shadcn/ui config
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
└── ARCHITECTURE.md               # Architecture documentation
```

---

## Frontend Components

### Layout Components (`src/components/layout/`)

| Component | Description |
|-----------|-------------|
| `TitleBar.tsx` | Top menu bar with File/Edit/View/Go/Run/Terminal/Help menus, mobile hamburger toggle |
| `ActivityBar.tsx` | Left icon strip — Explorer, Search, SCM, Run & Debug, Extensions + bottom accounts/settings icons |
| `Sidebar.tsx` | Resizable sidebar panel with swipe-to-close on mobile, overlay mode on small screens |
| `TabBar.tsx` | Editor tabs with horizontal scrolling, overflow menu, long-press-to-close on mobile |
| `EditorArea.tsx` | Monaco editor wrapper with split panes (up to 3), breadcrumbs, theme synchronization |
| `BottomPanel.tsx` | Resizable bottom panel hosting Terminal, Problems, Output, Debug Console, and Ports tabs |
| `StatusBar.tsx` | Bottom status bar with branch picker, language, cursor position, WebSocket status, notifications |
| `SettingsPanel.tsx` | Full settings UI with two-column desktop layout and slide-in mobile drawer |
| `WelcomePage.tsx` | VS Code welcome tab with Start actions, Recent files, and Walkthroughs |

### Sidebar Views (`src/components/sidebar/`)

| Component | Description |
|-----------|-------------|
| `ExplorerView.tsx` | File tree explorer with create/rename/delete operations and context menus |
| `SearchView.tsx` | Full-text search with match highlighting and replace support |
| `SCMView.tsx` | Source control management — stage/unstage/commit/discard changes |
| `RunDebugView.tsx` | Run & Debug configurations panel |
| `ExtensionsView.tsx` | Extension marketplace with install/uninstall/toggle functionality |

### Specialized Components

| Component | Path | Description |
|-----------|------|-------------|
| `CommandPalette.tsx` | `src/components/` | `cmdk`-based palette with command mode (`>`) and file mode |
| `LoginScreen.tsx` | `src/components/auth/` | code-server-style login with rate limiting |
| `AICompletionIndicator.tsx` | `src/components/ai/` | Floating AI suggestion card with status toggle |
| `CodeExecutionPanel.tsx` | `src/components/execution/` | Sandbox execution panel with run button and results |
| `NotificationCenter.tsx` | `src/components/notifications/` | Notification panel with info/warning/error types |
| `WebSocketStatusIndicator.tsx` | `src/components/ws/` | Real-time latency indicator with detail popover |
| `ServiceHealthPanel.tsx` | `src/components/ws/` | Backend services health dashboard |
| `WorkspaceTrustDialog.tsx` | `src/components/dialog/` | VS Code workspace trust dialog |

---

## State Management

The application uses **15 Zustand stores** for fine-grained state management:

| Store | File | Key State | Purpose |
|-------|------|-----------|---------|
| `useEditorStore` | `editorStore.ts` | `tabs`, `splits`, `activeTab` | Editor tabs, split panes, dirty tracking |
| `useFileSystemStore` | `fileSystemStore.ts` | `root: FileNode[]` | Virtual file system with CRUD |
| `useSidebarStore` | `sidebarStore.ts` | `activeView`, `isVisible`, `width` | Sidebar view selection and sizing |
| `useTerminalStore` | `terminalStore.ts` | `terminals[]`, `output[]` | Terminal sessions and output |
| `useSettingsStore` | `settingsStore.ts` | 15+ settings | Editor preferences (persisted to localStorage) |
| `useThemeStore` | `themeStore.ts` | `theme` | Theme selection (5 themes) |
| `useAuthStore` | `authStore.ts` | `isAuthenticated`, `token` | Authentication state |
| `useGitStore` | `gitStore.ts` | `branch`, `changes[]`, `staged[]` | Source control state |
| `useExtensionStore` | `extensionStore.ts` | `extensions[]` | Extension marketplace |
| `useStatusBarStore` | `statusBarStore.ts` | `branch`, `language`, `line/col` | Status bar information |
| `useNotificationStore` | `notificationStore.ts` | `notifications[]` | Notification center |
| `useAICompletionStore` | `aiCompletionStore.ts` | `currentCompletion`, `isProcessing` | AI inline completions |
| `useCodeExecutionStore` | `codeExecutionStore.ts` | `isExecuting`, `results[]` | Sandbox execution |
| `useWebSocketStore` | `websocketStore.ts` | `status`, `latency` | WebSocket connection |
| `usePortStore` | `portStore.ts` | `ports[]` | Port forwarding |

All stores follow the Zustand slice pattern and are exported from `src/store/index.ts`.

---

## Backend Microservices

### Core API (TypeScript/Node.js)

**Port:** 3001 | **Location:** `mini-services/core-api/`

The central hub for all backend communication. Built with raw Node.js `http` and Socket.IO.

**Responsibilities:**
- REST API for files, workspaces, authentication, git, extensions, terminals, and ports
- WebSocket (Socket.IO) for real-time terminal I/O, file watching, LSP relay, and AI completion streaming
- Service registry with periodic health checks (every 30 seconds) for sandbox, search, and Kilo Code services
- Request proxying to specialized backend services with graceful fallback

**Key API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + service registry status |
| POST | `/api/auth/login` | Authenticate with password |
| GET/POST | `/api/workspaces` | Workspace CRUD |
| GET/POST/PUT/DELETE | `/api/files[/:id]` | File operations with WS broadcast |
| POST | `/api/search` | Search (proxies to Rust service) |
| POST | `/api/execute` | Code execution (proxies to Go service) |
| POST | `/api/completions` | AI completions (proxies to Kilo Code service) |
| GET/POST/DELETE | `/api/terminals[/:id]` | Terminal session management |
| GET | `/api/git/status` | Git status (simulated) |
| GET | `/api/extensions` | Extension marketplace |
| GET | `/api/services` | Service health registry |
| GET | `/api/ports` | Port forwarding information |

**WebSocket Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `terminal:input` | Client → Server | Terminal keyboard input |
| `terminal:output` | Server → Client | Terminal output stream |
| `terminal:resize` | Client → Server | Terminal dimension changes |
| `file:subscribe` | Client → Server | Subscribe to file change notifications |
| `file:updated` | Server → Client | File change notification |
| `lsp:request` | Client → Server | Language server protocol request |
| `lsp:response` | Server → Client | Language server protocol response |
| `kilocode:complete` | Client → Server | Request AI completion |
| `kilocode:chunk` | Server → Client | Streaming completion chunk |
| `kilocode:done` | Server → Client | Completion stream finished |
| `session:join` | Client → Server | Join a collaborative session |

---

### Sandbox Service (Go)

**Port:** 3002 | **Location:** `backend/sandbox/`

Docker-based code execution sandbox with strict resource limits and network isolation.

**Key Features:**
- Container-based execution with configurable memory, CPU, and PID limits
- Network isolation (containers have no network access)
- SSE (Server-Sent Events) streaming for real-time execution output
- Support for JavaScript, TypeScript, Python, Go, Rust, and more
- Graceful shutdown with 5-second timeout

**Default Sandbox Constraints:**

| Resource | Limit |
|----------|-------|
| Memory | 512 MB |
| CPU Quota | 100,000 (1 CPU) |
| PIDs | 100 |
| Network | Disabled |
| Timeout | 30 seconds |

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SANDBOX_MEMORY_MB` | 512 | Container memory limit |
| `SANDBOX_CPU_QUOTA` | 100000 | CPU quota in microseconds |
| `SANDBOX_PIDS_LIMIT` | 100 | Maximum process IDs |
| `SANDBOX_TIMEOUT` | 30 | Execution timeout in seconds |
| `SANDBOX_PORT` | 3002 | Server port |

---

### Search Service (Rust)

**Port:** 3003 | **Location:** `backend/search/`

High-performance file search and indexing engine built with Axum and Tokio.

**Key Features:**
- **Inverted Index** — Full-text content search with term frequency ranking
- **Trie Data Structure** — O(k) filename autocomplete where k is the query length
- **File Watching** — Incremental reindexing via the `notify` crate (debounced 500ms)
- **Regex Search** — Full regular expression support for advanced queries
- **Fuzzy Matching** — Approximate string matching for typo-tolerant search
- **Structured Logging** — JSON-formatted logs with the `tracing` crate

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Full-text content search |
| POST | `/api/search/filenames` | Filename search with trie autocomplete |
| GET | `/api/search/suggest` | Search suggestions |
| POST | `/api/index` | Trigger manual reindex |
| GET | `/api/index/stats` | Index statistics |
| GET | `/health` | Health check |

---

### Kilo Code AI Agent (TypeScript/Node.js)

**Port:** 3005 | **Location:** `backend/kilocode/`

AI-powered coding agent built on [Kilo Code](https://github.com/Kilo-Org/kilocode), an open-source agentic coding platform supporting 500+ LLM models.

**Key Features:**
- **Inline Completions (FIM)** — Fill-In-Middle code completions with context-aware suggestions
- **Multi-Turn Chat** — Conversational coding assistance with session management
- **Agent Modes** — Code, Architect, Debug, Ask, and Orchestrator modes for different workflows
- **Codebase Indexing** — Automatic indexing for context-aware suggestions and symbol search
- **MCP Server Management** — Model Context Protocol server integration for extensibility
- **Real-Time Events** — SSE streaming for live completion and agent status events
- **500+ LLM Models** — Supports OpenAI, Anthropic, Google, Mistral, local models, and more

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/completions` | Inline code completion (FIM) |
| POST | `/api/chat` | Multi-turn chat message |
| GET | `/api/sessions` | List chat sessions |
| POST | `/api/sessions` | Create new chat session |
| GET | `/api/agents` | List available agent modes |
| POST | `/api/index` | Trigger codebase indexing |
| GET | `/api/index/status` | Indexing status |
| GET | `/api/mcp/servers` | List MCP servers |
| POST | `/api/events` | SSE event stream |
| GET | `/health` | Service health check |

**Request Format (Completions):**
```json
{
  "file_path": "src/index.ts",
  "language": "typescript",
  "prefix": "function add(a: number, b: number) ",
  "suffix": "\n}",
  "cursor_position": 35
}
```

**Response Format:**
```json
{
  "completions": [
    {
      "text": "{\n  return a + b;\n",
      "display_text": "return a + b",
      "confidence": 0.85,
      "source": "kilocode"
    }
  ]
}
```

---

## API Reference

### Client-Side API Gateway

The `src/lib/api-client.ts` module provides typed functions for all backend endpoints. It implements a **cascading fallback** strategy:

```
1. Try direct service call (e.g., localhost:3003/api/search)
2. If failed → Try Core API proxy (e.g., localhost:3001/api/search)
3. If failed → Use local client-side simulation
```

The `XTransformPort` query parameter enables Caddy-based port routing in production.

**Available Functions:**

```typescript
// Health & Services
apiClient.healthCheck()
apiClient.getServices()

// Workspaces
apiClient.getWorkspaces()
apiClient.createWorkspace(data)

// Files
apiClient.getFiles(workspaceId)
apiClient.createFile(data)
apiClient.updateFile(id, data)
apiClient.deleteFile(id)

// Search
apiClient.searchFiles(query, options?)

// Execution
apiClient.executeCode(code, language, options?)

// AI Completions
apiClient.getCompletions(request)

// Authentication
apiClient.login(username, password)

// Git
apiClient.getGitStatus()

// Extensions
apiClient.getExtensions()

// Ports
apiClient.getPorts()
```

---

## Theming

The application supports 5 themes, each defined by 35+ CSS custom properties in `globals.css`:

| Theme | CSS Class | Type | Description |
|-------|-----------|------|-------------|
| **Dark+** | *(default)* | Dark | VS Code's default dark theme |
| **Light+** | `.vs-light` | Light | VS Code's default light theme |
| **Monokai** | `.vs-monokai` | Dark | Classic Monokai color scheme |
| **Solarized Dark** | `.vs-solarized-dark` | Dark | Solarized dark palette |
| **GitHub** | `.vs-github` | Light | GitHub's light color scheme |

**CSS Variable Categories:**
- Background layers (main, sidebar, editor, panel, input, dropdown)
- Foreground colors (primary, secondary, muted, accent)
- Border colors (default, focus, active)
- Git status colors (added, modified, deleted, untracked, ignored, conflict)
- UI element colors (scrollbar, badge, progress, selection, find match)
- Syntax highlighting (via Monaco token-level rules)

**Customizing Themes:**

Add a new theme class to `globals.css`:
```css
.my-custom-theme {
  --vs-bg-main: #1a1b26;
  --vs-bg-sidebar: #16161e;
  --vs-fg-primary: #a9b1d6;
  --vs-accent: #7aa2f7;
  /* ... define all 35+ variables */
}
```

Then register it in `src/store/themeStore.ts`.

---

## Responsive Design

The application is fully responsive with device-specific optimizations:

### Breakpoints

| Breakpoint | Width | Layout Mode |
|------------|-------|-------------|
| Mobile S | 320–374px | Overlay sidebar, bottom nav, no line numbers |
| Mobile M | 375–413px | Overlay sidebar, bottom nav |
| Mobile L | 414–767px | Overlay sidebar, bottom nav |
| Tablet | 768–1023px | Compact sidebar (icon-only, 48px) |
| Desktop | 1024px+ | Full layout |

### Mobile Adaptations

- **Overlay Sidebar** — Sidebar floats over editor with backdrop, swipe from left edge to open
- **Bottom Navigation** — Replaces Activity Bar with a touch-friendly bottom tab bar
- **Touch Targets** — Minimum 44×44px (iOS HIG compliant) with 8px grid spacing
- **Swipe Gestures** — Left edge → open sidebar, right swipe on sidebar → close
- **Tab Overflow** — Horizontal scroll with "..." overflow indicator
- **Long Press** — Long-press on tabs to close them
- **Thinner Scrollbars** — 6px width on mobile vs 10px on desktop
- **Virtual Keyboard** — `100dvh`/`100svh` handling for proper layout with mobile keyboards
- **Safe Areas** — `env(safe-area-inset-*)` for notched devices
- **Landscape Mode** — Auto-collapses bottom panel for more editor space
- **Foldable Devices** — CSS grid layout adapts to span/fold states

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Open Command Palette (command mode) |
| `Ctrl+P` | Quick Open File |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+`` ` | Toggle Terminal |
| `Ctrl+\` | Split Editor |
| `Ctrl+N` | New File |
| `Ctrl+W` | Close Tab |
| `Ctrl+S` | Save File |
| `Ctrl+Shift+E` | Show Explorer |
| `Ctrl+Shift+F` | Show Search |
| `Ctrl+Shift+G` | Show Source Control |
| `Ctrl+Shift+D` | Show Run & Debug |
| `Ctrl+Shift+X` | Show Extensions |
| `Alt+Z` | Toggle Word Wrap |
| `Tab` | Accept AI Completion |
| `Esc` | Dismiss AI Completion |
| `Ctrl+Shift+N` | Open New Window |
| `F11` | Toggle Zen Mode |

---

## Deployment

### Docker Compose (Recommended)

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

**Service Resource Allocation:**

| Service | CPUs | Memory | Health Check |
|---------|------|--------|-------------|
| core-api | default | default | `GET /health` (30s interval) |
| sandbox | 2 | 1 GB | `GET /health` (30s interval) |
| search | 2 | 512 MB | `GET /health` (30s interval) |
| kilocode | 1 | 256 MB | `GET /health` (30s interval) |
| frontend | default | default | `GET /` (30s interval) |
| caddy | default | default | — |

### Caddy Configuration

The `Caddyfile` listens on port 81 and routes requests using the `XTransformPort` query parameter:

- No parameter → Frontend (port 3000)
- `?XTransformPort=3001` → Core API
- `?XTransformPort=3002` → Sandbox
- `?XTransformPort=3003` → Search
- `?XTransformPort=3005` → Kilo Code

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Core API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3001` | WebSocket URL |
| `SANDBOX_MEMORY_MB` | 512 | Container memory limit |
| `SANDBOX_CPU_QUOTA` | 100000 | Container CPU quota |
| `SANDBOX_PIDS_LIMIT` | 100 | Container PID limit |
| `SANDBOX_TIMEOUT` | 30 | Execution timeout (seconds) |
| `SEARCH_PORT` | 3003 | Search service port |
| `KILOCODE_SERVICE_PORT` | 3005 | Kilo Code integration service port |
| `KILO_PORT` | 4096 | Kilo daemon port |
| `CORE_API_PORT` | 3001 | Core API port |

---

## Configuration

### Editor Settings (persisted to localStorage)

| Setting | Default | Options |
|---------|---------|---------|
| Font Size | 14 | 8–32 |
| Font Family | JetBrains Mono | Any monospace font |
| Tab Size | 2 | 2, 4, 8 |
| Word Wrap | off | off, on, wordWrapColumn |
| Minimap | enabled | enabled, disabled |
| Auto Save | afterDelay | off, afterDelay, onFocusChange |
| Cursor Style | line | line, block, underline |
| Zen Mode | off | on, off |
| Bracket Pair Colorization | enabled | enabled, disabled |
| Guides | enabled | enabled, disabled |

### Terminal Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Shell Type | bash | Simulated shell (bash/zsh) |
| Font Size | 14 | Terminal font size |
| Cursor Blink | true | Blinking cursor |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

**Quick Start:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

**Built with Next.js, TypeScript, Go, Rust, Kilo Code, and Docker**
