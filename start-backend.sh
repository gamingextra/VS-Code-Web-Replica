#!/bin/bash
# Backend Services Startup Script
# Starts all available backend microservices for VS Code Web Replica

echo "╔══════════════════════════════════════════════════════╗"
echo "║  VS Code Web Replica — Backend Services Startup     ║"
echo "╚══════════════════════════════════════════════════════╝"

PROJECT_ROOT="/home/z/my-project"

# ─── 1. Core API & WebSocket (TypeScript/Node.js — Port 3001) ────────────
echo ""
echo "Starting Core API & WebSocket Server (TypeScript — Port 3001)..."
nohup bun --hot $PROJECT_ROOT/mini-services/core-api/index.ts > /tmp/core-api.log 2>&1 &
CORE_PID=$!
echo "  PID: $CORE_PID | Log: /tmp/core-api.log"

# ─── 2. Code Execution & Sandboxing (Go — Port 3002) ─────────────────────
if command -v go &> /dev/null; then
  echo ""
  echo "Starting Code Execution Sandbox (Go — Port 3002)..."
  cd $PROJECT_ROOT/backend/sandbox && go run main.go > /tmp/sandbox.log 2>&1 &
  SANDBOX_PID=$!
  echo "  PID: $SANDBOX_PID | Log: /tmp/sandbox.log"
else
  echo ""
  echo "⊘ Go Sandbox (Port 3002) — Go runtime not available, using Core API fallback"
fi

# ─── 3. Heavy File Search / Indexing (Rust — Port 3003) ──────────────────
if command -v cargo &> /dev/null; then
  echo ""
  echo "Starting File Search & Indexing Service (Rust — Port 3003)..."
  cd $PROJECT_ROOT/backend/search && cargo run > /tmp/search.log 2>&1 &
  SEARCH_PID=$!
  echo "  PID: $SEARCH_PID | Log: /tmp/search.log"
else
  echo ""
  echo "⊘ Rust Search (Port 3003) — Rust runtime not available, using Core API fallback"
fi

# ─── 4. AI Inline Completion / Copilot (Python — Port 3004) ──────────────
if command -v python3 &> /dev/null; then
  echo ""
  echo "Starting AI Copilot Service (Python — Port 3004)..."
  nohup python3 -u $PROJECT_ROOT/backend/copilot/main.py > /tmp/copilot.log 2>&1 &
  COPILOT_PID=$!
  echo "  PID: $COPILOT_PID | Log: /tmp/copilot.log"
else
  echo ""
  echo "⊘ Python Copilot (Port 3004) — Python runtime not available, using template fallback"
fi

# Wait for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 5

# Health checks
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Service Health Checks                               ║"
echo "╚══════════════════════════════════════════════════════╝"

check_service() {
  local name=$1
  local port=$2
  local tech=$3
  
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$port/health 2>/dev/null | grep -q "200"; then
    echo "  ✓ $name ($tech — Port $port): HEALTHY"
  else
    echo "  ✗ $name ($tech — Port $port): UNAVAILABLE"
  fi
}

echo ""
check_service "Core API & WebSocket" 3001 "TypeScript/Node.js"
check_service "Code Execution Sandbox" 3002 "Go"
check_service "File Search & Indexing" 3003 "Rust"
check_service "AI Inline Completion" 3004 "Python"

echo ""
echo "All services started. Use 'kill \$(lsof -ti:3001) \$(lsof -ti:3004)' to stop them."
echo ""
echo "Architecture:"
echo "  1. Core API & WebSocket — TypeScript (Node.js) → Port 3001"
echo "  2. Code Execution & Sandboxing — Go → Port 3002"
echo "  3. Heavy File Search / Indexing — Rust → Port 3003"
echo "  4. AI Inline Completion (Copilot) — Python → Port 3004"
echo ""
echo "Next.js API Gateway: http://localhost:3000/api/core/health"
