---
name: VS Code Web project
description: Key facts, decisions, and quirks for the VS Code web replica in artifacts/vscode-web
---

## AI Integration
- NOT Anthropic SDK — NVIDIA NIM via `openai` npm package
- Model: `meta/llama-3.3-70b-instruct`
- Key env var: `ANTHROPIC_API_KEY` (value starts with `nvapi-`)
- Base URL: `https://integrate.api.nvidia.com/v1`

## Stack
- Frontend: React + Vite at `/` (artifact slug `vscode-web`)
- Backend: Express 5 at `artifacts/api-server` port 8080
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Terminal: real shell via `spawn(SHELL, ['-c', command])` in `/api/terminal/exec`
- Tailwind v4: CSS must use `@import "tailwindcss"` (NOT `@tailwind base/components/utilities`)

## Key Stores
- `sidebarStore`: has `toggle()`, `show()`, `setView()`, `setWidth()` — NO `hide()` method
- `settingsStore` (new): font size, word wrap, minimap, auto-save, zen mode — persisted to localStorage as `vscode-settings`
- `editorStore`: `splits` array, `activeSplitIndex`, `setActiveSplitIndex()` — split editor is supported
- `fileSystemStore`: `createFile`, `createFolder`, `createFileAtRoot`, `createFolderAtRoot`, `deleteNode`, `renameNode`, `updateNodeContent`

## Features Implemented (as of last session)
- File explorer with right-click context menus (rename, delete, new file/folder, copy path)
- Inline rename (F2 or context menu) and inline new file/folder input
- Settings panel (Ctrl+,) with categories: commonly used, font, editor, cursor, formatting, files, appearance
- Split editor UI (Ctrl+\\): multiple Monaco instances side-by-side, per-split tab bars, close button
- Breadcrumbs bar above each Monaco instance showing file path
- Auto-save with configurable delay (debounced per-tab timer in App.tsx)
- Zen Mode (Ctrl+K Z): hides TitleBar, ActivityBar, Sidebar, StatusBar, BottomPanel
- Format Document (Shift+Alt+F) wired to Monaco's built-in action
- Zoom in/out (Ctrl+= / Ctrl+-) via settingsStore
- Keyboard Shortcuts panel (Ctrl+K Ctrl+S)
- 50+ command palette commands (Ctrl+Shift+P) organized by category
- Replace All in Search panel (replaces across all files in fileSystemStore)
- Toast notifications via sonner (bottom-right)
- TabBar now shows active split's tabs only
- Settings persist to localStorage

## Pre-existing TypeScript Errors (NOT mine — do not fix)
- `src/components/ui/resizable.tsx` — react-resizable-panels API mismatch

## Gotchas
- After API server code changes: must run build then restart workflow
- `useEditorStore.subscribe()` returns unsubscribe function — use in useEffect cleanup
- Monaco `path` prop = model key — same path in two splits shares the model (correct behavior)
- `editorRefs` is a `Map<splitId, editor>` exported from EditorArea for external format-doc access
