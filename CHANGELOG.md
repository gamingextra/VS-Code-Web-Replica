# Changelog

All notable changes to the VS Code Web Replica project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-14

### Added
- Kilo Code AI agent integration replacing Python copilot service
  - Inline code completions (FIM) with 500+ LLM model support
  - Multi-turn chat with session management
  - Agent modes: Code, Architect, Debug, Ask, Orchestrator
  - Codebase indexing for context-aware suggestions
  - MCP (Model Context Protocol) server management
  - Real-time event streaming (SSE)
  - Kilo CLI daemon integration (port 4096)
  - Integration service on port 3005 (TypeScript/Node.js)
- GitHub Pages deployment workflow
- Project landing page (docs/index.html)

### Changed
- Replaced Python copilot service (port 3004) with Kilo Code TypeScript service (port 3005)
- Updated API endpoints from /api/copilot/* to /api/kilocode/*
- Updated WebSocket events from copilot:* to kilocode:*
- Updated documentation across all files

## [0.2.0] - 2026-06-13

### Added

#### Frontend
- Full VS Code layout: TitleBar, ActivityBar, Sidebar, EditorArea, BottomPanel, StatusBar
- Monaco Editor integration with syntax highlighting for 30+ languages
- Split editor support (up to 3 panes)
- 5 color themes: Dark+, Light+, Monokai, Solarized Dark, GitHub
- Virtual file system with CRUD operations, context menus, drag-and-drop
- Simulated terminal with 40+ Unix commands, tab completion, command history
- Command palette with command mode (`>`) and file quick-open mode
- Settings panel with categories, search, and localStorage persistence
- Welcome page with Start actions, Recent files, and Walkthroughs
- Source control (Git) view with stage/unstage/commit/discard
- Extension marketplace with install/uninstall/toggle
- Notification center with info/warning/error/update types
- Workspace trust dialog
- Code execution panel with run button and results
- Port forwarding management panel
- AI code completion indicator with Tab/Esc interaction
- WebSocket status indicator with latency display
- Service health monitoring dashboard
- Authentication screen with rate limiting
- 15 Zustand stores for state management
- 22+ keyboard shortcuts (VS Code compatible)
- Auto-save with configurable delay
- Zen mode (distraction-free editing)
- Custom event system (`vscode:command`) for inter-component communication

#### Responsive Design
- Mobile-first responsive layout (320px to 4K+)
- Overlay sidebar with swipe-to-close on mobile
- Bottom navigation bar replacing Activity Bar on mobile
- Touch-optimized targets (minimum 44×44px, iOS HIG compliant)
- Swipe gesture support (left edge → open sidebar)
- Long-press to close tabs on mobile
- Tab overflow with "..." indicator on small screens
- Landscape mode auto-collapses bottom panel
- Safe area inset support for notched devices
- Virtual keyboard handling with `100dvh`/`100svh`
- Foldable device CSS grid layout support

#### Backend Services
- **Core API (TypeScript/Node.js, Port 3001)**: REST API + Socket.IO WebSocket for real-time communication, service registry with health checks, request proxying to specialized services
- **Sandbox Service (Go, Port 3002)**: Docker-based code execution with resource limits (memory, CPU, PID), network isolation, SSE streaming output, support for JavaScript, TypeScript, Python, Go, Rust
- **Search Service (Rust, Port 3003)**: Inverted index for full-text search, trie-based filename autocomplete, file watcher for incremental reindexing, regex and fuzzy matching support
- **Kilo Code Service (TypeScript/Node.js, Port 3005)**: AI-powered code completions via Kilo Code agent, multi-turn chat with session management, agent modes (Code, Architect, Debug, Ask, Orchestrator), codebase indexing, MCP server management, real-time event streaming (SSE)

#### Infrastructure
- Docker Compose configuration with 6 services
- Caddy reverse proxy with port-based routing
- Backend startup script with runtime detection and health checks
- API gateway pattern with cascading fallback strategy
- Prisma ORM with SQLite for user management
- Health check endpoints for all backend services

#### Documentation
- README.md with comprehensive project documentation
- CONTRIBUTING.md with development guidelines
- ARCHITECTURE.md with detailed architecture documentation
- CHANGELOG.md for version tracking

### Changed
- Replaced `eval()` in DebugConsolePanel with safe `new Function()` and math-only filtering
- Added ESLint ignore for download directory

### Security
- Docker container isolation with memory limits, CPU quotas, PID limits, and disabled networking
- Login rate limiting (5 attempts per 60 seconds)
- Path traversal prevention for file operations
- Input sanitization across terminal and debug console

## [0.1.0] - 2026-06-12

### Added
- Initial project scaffold with Next.js 16 + TypeScript + Tailwind CSS
- Basic VS Code-like layout with sidebar, editor area, and status bar
- Monaco editor integration
- Dark+ theme
- Basic file explorer
- Simulated terminal with core Unix commands
