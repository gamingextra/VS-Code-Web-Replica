# Kilo Code Integration Guide

This document explains how Kilo Code is integrated into the VS Code Web Replica project, how the auto-update mechanism works, and how to manage the submodule.

---

## Architecture

```
VS Code Web Replica
├── vendor/kilocode/          ← Git submodule (tracks Kilo-Org/kilocode main branch)
├── backend/kilocode/         ← Integration bridge service (TypeScript/Node.js)
│   ├── index.ts              ← API bridge between frontend & Kilo daemon
│   ├── start.sh              ← Daemon + service startup script
│   ├── package.json          ← Node.js dependencies
│   └── Dockerfile            ← Container build
├── src/app/api/kilocode/     ← Frontend API gateway route
└── .github/workflows/
    └── update-kilocode.yml   ← Auto-update workflow
```

### How It Works

1. **`vendor/kilocode/`** — A git submodule pointing to the [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode) repository. This gives us access to the full Kilo Code source code for reference, building, and customization.

2. **`backend/kilocode/`** — A Node.js integration service that bridges the VS Code Web Replica frontend with the Kilo CLI daemon. It exposes REST and SSE endpoints that the frontend can call.

3. **Kilo CLI Daemon** — The actual AI engine (`kilo serve`) running on port 4096, which provides:
   - FIM (Fill-In-Middle) completions
   - Multi-turn chat sessions
   - Agent modes (Code, Architect, Debug, Ask, Orchestrator)
   - Codebase indexing
   - MCP server management

---

## Setup

### Initial Clone with Submodule

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/gamingextra/VS-Code-Web-Replica.git

# Or initialize submodules in an existing clone
git submodule update --init --recursive
```

### Start Kilo Code Services

```bash
# Option 1: Using the start script
cd backend/kilocode
chmod +x start.sh
./start.sh

# Option 2: Manual startup
# 1. Install and start the Kilo daemon
npm install -g @kilocode/cli
kilo daemon start --hostname 0.0.0.0 --port 4096 --cors "http://localhost:3000"

# 2. Start the integration service
cd backend/kilocode
bun install
bun run index.ts
```

---

## Auto-Update Workflow

The `.github/workflows/update-kilocode.yml` workflow automatically checks for Kilo Code updates:

- **Schedule**: Runs daily at 6:00 AM UTC
- **Manual trigger**: Available via the Actions tab → "Auto-Update Kilo Code Submodule" → "Run workflow"

### How It Works

1. Checks the current submodule commit vs the latest Kilo Code `main` branch
2. If there's a new commit, updates the submodule
3. Creates a **Pull Request** with the update for review
4. The PR includes:
   - Version/tag information
   - Changelog of commits between current and latest
   - A review checklist for breaking changes

### User Permission Model

The auto-update workflow **does not** push directly to any branch. Instead:

1. It creates a new branch (`chore/update-kilocode-XXX`)
2. Opens a Pull Request against `feature/code-server-enhancements`
3. A human reviews the PR for:
   - Breaking API changes
   - Compatibility with the integration bridge
   - Required updates to `backend/kilocode/index.ts`
4. After review, the PR is merged manually

### Force Update

To force an update check regardless of whether there's a new version:

1. Go to **Actions** → **Auto-Update Kilo Code Submodule**
2. Click **Run workflow**
3. Set **Force update** to `true`
4. Click **Run workflow**

---

## Manual Submodule Management

### Check Current Version

```bash
git submodule status vendor/kilocode
```

### Update to Latest

```bash
# Update submodule to latest main
cd vendor/kilocode
git pull origin main
cd ../..
git add vendor/kilocode
git commit -m "chore: update Kilo Code submodule to latest"
```

### Pin to a Specific Version

```bash
cd vendor/kilocode
git checkout v1.0.0  # or any tag/commit
cd ../..
git add vendor/kilocode
git commit -m "chore: pin Kilo Code to v1.0.0"
```

### Reset to Remote Version

```bash
git submodule update --remote vendor/kilocode
```

---

## Building from Source

If you want to build the Kilo Code CLI or extension from the vendored source:

```bash
cd vendor/kilocode

# Install dependencies
bun install

# Build the CLI
cd packages/opencode
bun run build

# Build the VS Code extension
cd ../kilo-vscode
bun run package
```

---

## Integration Bridge API

The integration service (`backend/kilocode/`) exposes these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/completions` | Inline FIM code completions |
| POST | `/api/completions/stream` | Streaming FIM completions (SSE) |
| POST | `/api/chat` | Multi-turn chat message |
| GET | `/api/sessions` | List chat sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/agents` | List available agent modes |
| POST | `/api/index` | Trigger codebase indexing |
| GET | `/api/index/status` | Indexing status |
| GET | `/api/mcp/servers` | List MCP servers |
| POST | `/api/events` | SSE event stream |
| GET | `/health` | Service health check |

---

## Troubleshooting

### Submodule not loading

```bash
git submodule update --init --recursive
```

### Kilo daemon won't start

```bash
# Check if port 4096 is in use
lsof -i :4096

# Kill existing daemon
kilo daemon stop

# Restart
kilo daemon start --hostname 0.0.0.0 --port 4096
```

### Integration service can't connect to daemon

Check that `KILO_HOST` and `KILO_PORT` environment variables match the daemon configuration.

---

## Kilo Code Package Reference

The vendored source at `vendor/kilocode/packages/` contains:

| Package | Purpose |
|---------|---------|
| `opencode` | CLI binary — the core AI engine |
| `kilo-vscode` | VS Code extension |
| `core` | Shared core library |
| `sdk` | SDK for building integrations |
| `kilo-gateway` | API gateway |
| `kilo-indexing` | Codebase indexing engine |
| `llm` | LLM provider integrations |
| `kilo-ui` | Shared UI components |
| `kilo-web-ui` | Web-specific UI components |
