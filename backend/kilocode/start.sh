#!/usr/bin/env bash
# Start Kilocode daemon + integration service
set -e

echo "🚀 Starting Kilocode integration..."

# Check if kilo CLI is installed
if ! command -v kilo &> /dev/null; then
    echo "⚠️  Kilocode CLI not found. Installing..."
    npm install -g @kilocode/cli
fi

echo "✅ Kilocode CLI version: $(kilo --version)"

# Start the kilo daemon if not already running
if ! kilo daemon status &> /dev/null; then
    echo "🔧 Starting Kilo daemon..."
    kilo daemon start --hostname 0.0.0.0 --port 4096 --cors "http://localhost:3000" 2>/dev/null || true
    sleep 3
fi

# Verify daemon is running
if kilo daemon status &> /dev/null; then
    echo "✅ Kilo daemon running at $(kilo daemon status 2>&1 | grep url | awk '{print $2}')"
else
    echo "❌ Failed to start Kilo daemon"
    echo "   Try manually: kilo daemon start"
    exit 1
fi

# Start the integration service
echo "🔧 Starting Kilocode integration service on port 3005..."
cd "$(dirname "$0")"

# Use bun if available, otherwise node with tsx
if command -v bun &> /dev/null; then
    exec bun run index.ts
elif command -v npx &> /dev/null; then
    exec npx tsx index.ts
else
    echo "❌ Neither bun nor npx found"
    exit 1
fi
