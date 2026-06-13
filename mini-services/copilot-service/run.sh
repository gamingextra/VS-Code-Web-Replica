#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COPILOT_DIR="$SCRIPT_DIR/../../backend/copilot"
VENV_DIR="$COPILOT_DIR/.venv"

# Create venv and install deps if needed
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  pip install -r "$COPILOT_DIR/requirements.txt"
else
  source "$VENV_DIR/bin/activate"
fi

# Start the FastAPI server on port 3004
cd "$COPILOT_DIR"
exec python main.py
