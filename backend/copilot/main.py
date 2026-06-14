"""AI Inline Completion (Copilot) Service — FastAPI application.

Run with::

    cd /home/z/my-project/backend/copilot
    pip install -r requirements.txt
    python main.py

The service listens on **port 3004** and provides:

- ``POST /api/completions``        — synchronous code completion
- ``POST /api/completions/stream`` — streaming completion via SSE
- ``GET  /api/completions/health`` — health check & engine stats
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the copilot directory is on sys.path so absolute imports work
# regardless of how the script is invoked.
_SYS_DIR = str(Path(__file__).resolve().parent)
if _SYS_DIR not in sys.path:
    sys.path.insert(0, _SYS_DIR)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Inline Completion Service",
    description="Template-based, context-aware code completion for the VS Code Web Replica.",
    version="1.0.0",
)

# CORS — allow all origins for the dev sandbox
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


# ---------------------------------------------------------------------------
# Root health shortcut
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def root_health() -> dict:
    """Quick health check at the root path."""
    return {"status": "ok", "service": "copilot", "port": 3004}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3004,
        log_level="info",
    )
