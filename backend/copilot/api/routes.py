"""FastAPI router for completion endpoints."""

from __future__ import annotations

import asyncio
import json
import time
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from completion.engine import completion_engine
from completion.models import CompletionRequest, CompletionResult

router = APIRouter(prefix="/api", tags=["completions"])


# ---------------------------------------------------------------------------
# POST /api/completions — synchronous completion
# ---------------------------------------------------------------------------

@router.post("/completions", response_model=CompletionResult)
async def create_completion(request: CompletionRequest) -> CompletionResult:
    """Return a single code completion for the given context.

    The response includes the completion text, a confidence score, the
    source of the completion (template / context-aware / cache), and
    optional alternatives.
    """
    start = time.monotonic()

    try:
        result = completion_engine.complete(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Completion engine error: {exc}") from exc

    elapsed_ms = (time.monotonic() - start) * 1000
    # Attach timing metadata via a header isn't possible here, but we log it.
    # In production you'd use structlog / OpenTelemetry.
    if elapsed_ms > 500:
        # Slow completion warning — still return the result
        pass

    return result


# ---------------------------------------------------------------------------
# POST /api/completions/stream — streaming completion via SSE
# ---------------------------------------------------------------------------

@router.post("/completions/stream")
async def stream_completion(request: CompletionRequest) -> EventSourceResponse:
    """Stream a code completion via Server-Sent Events.

    The SSE stream emits the following event types:

    - ``partial``  – incremental text fragments
    - ``result``   – the full :class:`CompletionResult` as JSON
    - ``done``     – signals the stream has ended
    """

    async def event_generator() -> AsyncGenerator[dict, None]:
        start = time.monotonic()

        try:
            result = completion_engine.complete(request)
        except Exception as exc:
            yield {
                "event": "error",
                "data": json.dumps({"detail": str(exc)}),
            }
            return

        # Simulate streaming by yielding the text in small chunks
        text = result.text
        chunk_size = max(1, len(text) // 6)  # ~6 chunks
        pos = 0

        while pos < len(text):
            end = min(pos + chunk_size, len(text))
            chunk = text[pos:end]
            pos = end
            yield {
                "event": "partial",
                "data": json.dumps({"text": chunk}),
            }
            # Small delay to simulate streaming
            await asyncio.sleep(0.02)

        # Send the full result
        yield {
            "event": "result",
            "data": result.model_dump_json(),
        }

        elapsed_ms = (time.monotonic() - start) * 1000
        yield {
            "event": "done",
            "data": json.dumps({"elapsed_ms": round(elapsed_ms, 2)}),
        }

    return EventSourceResponse(event_generator())


# ---------------------------------------------------------------------------
# GET /api/completions/health — health check
# ---------------------------------------------------------------------------

@router.get("/completions/health")
async def health_check() -> dict:
    """Health check endpoint with model/engine information."""
    stats = completion_engine.stats
    return {
        "status": "ok",
        "engine": "template-based",
        "version": "1.0.0",
        "languages": [
            "typescript", "typescriptreact", "tsx",
            "javascript", "javascriptreact", "jsx",
            "python", "go", "rust", "java", "csharp",
            "html", "css", "scss", "less", "sql",
        ],
        "stats": stats,
    }
