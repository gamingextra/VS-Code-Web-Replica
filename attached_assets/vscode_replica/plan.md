# VS Code Web Replica — Build Plan

## Overview
Build a single-URL VS Code Web replica with ≥80% interactivity. Every clickable element must respond.

## Skill Selection
- **Capability**: `vibecoding-webapp-swarm` — React + TypeScript + Tailwind + shadcn/ui
- **Artifact**: `webapp-building-swarm` — deployment via deploy_website

## Architecture
Single-page app with these major subsystems:
- **Monaco Editor** (monaco-editor npm package) — multi-tab, syntax highlighting, themes
- **Activity Bar** (5 views: Explorer, Search, SCM, Run & Debug, Extensions)
- **Top Menu** (8 dropdowns with working items)
- **Terminal** (custom shell with 12+ commands, Claude REPL)
- **Status Bar** (clickable items)
- **Bottom Panel** (Terminal, Problems, Output, Debug Console)
- **Extensions** (30 cards, 5 functional)
- **AI Agent Panel** (Copilot-style streaming)
- **Keyboard Shortcuts** (30+)
- **IndexedDB Persistence** (complete state survival)

## Build Stages

### Stage 1 — Scaffold & Core Shell (Shell Builder)
- Project scaffold with Vite + React + TypeScript + Tailwind
- CSS variables matching VS Code Dark+ theme exactly
- App shell layout: title bar, activity bar, sidebar, editor area, bottom panel, status bar
- Keyboard shortcut system (global keydown listener)
- IndexedDB persistence layer setup

### Stage 2 — Monaco Editor Integration (Editor Builder)
- monaco-editor package integration
- Multi-tab system with dirty tracking
- Syntax highlighting for 20+ languages
- Theme support (Dark+, Light+, Solarized, Monokai, GitHub)
- Editor commands: find, replace, comment, format, etc.
- Split editor support

### Stage 3 — Explorer & File System (Explorer Builder)
- File tree with create/delete/rename files & folders
- IndexedDB-backed file system
- Click opens new editor tab
- File icons by extension

### Stage 4 — Search, SCM, Run & Debug, Extensions (Feature Builders A)
- Search: cross-file grep with regex and replace
- SCM: git staging, commit, diff, branch, log
- Run & Debug: launch configs, run button, output
- Extensions: 30 cards, 5 functional (Prettier, ESLint, GitLens, Live Server, REST Client)

### Stage 5 — Terminal, Bottom Panel, Status Bar (Feature Builders B)
- Terminal: shell with 12+ commands, history, multiple tabs
- Claude REPL mode with streaming responses and tool calls
- Problems panel with mock lint warnings
- Output panel with channel dropdown
- Debug Console with JS expression evaluation
- Status bar with clickable items

### Stage 6 — Top Menu, Command Palette, AI Agent (Feature Builders C)
- 8 top menu dropdowns (File, Edit, Selection, View, Go, Run, Terminal, Help)
- Command Palette (Cmd+K searchable)
- AI Agent sidebar panel with streaming tokens
- All 30+ keyboard shortcuts wired up

### Stage 7 — Integration, Testing, Deployment (Integration Agent)
- Wire all subsystems together
- Acceptance test all 6 hard checks
- Fix any issues
- Deploy as single static site

## File Structure
```
/mnt/agents/output/vscode-web/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── store/          # Zustand stores
│   ├── components/
│   │   ├── layout/     # Shell components
│   │   ├── editor/     # Monaco wrapper + tabs
│   │   ├── sidebar/    # 5 activity views
│   │   ├── terminal/   # Terminal + shell
│   │   ├── menu/       # Top menu bar
│   │   ├── statusbar/  # Bottom status bar
│   │   ├── panel/      # Bottom panel
│   │   ├── extensions/ # Extension cards
│   │   └── ai-agent/   # AI copilot panel
│   ├── hooks/          # Keyboard shortcuts, etc.
│   ├── utils/          # Shell commands, persistence
│   └── data/           # Mock data (extensions, git, etc.)
```
