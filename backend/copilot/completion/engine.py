"""Completion engine – orchestrates template matching, context awareness, and caching.

The engine is the core of the copilot service.  Given a :class:`CompletionContext`,
it:

1. Checks the LRU cache for an identical request.
2. Extracts code context via :mod:`context`.
3. Matches templates via :mod:`templates`.
4. Applies context-aware post-processing (indentation, variable substitution).
5. Returns a :class:`CompletionResult` with confidence scoring.
"""

from __future__ import annotations

import hashlib
import time
import uuid
from collections import OrderedDict
from typing import Optional

from .context import context_extractor
from .models import (
    CodeContext,
    CompletionContext,
    CompletionRequest,
    CompletionResult,
    CompletionSource,
    CompletionType,
)
from .templates import _ind, match_templates


# ---------------------------------------------------------------------------
# LRU Cache
# ---------------------------------------------------------------------------

class LRUCache:
    """Simple LRU cache with a maximum size."""

    def __init__(self, maxsize: int = 100) -> None:
        self._maxsize = maxsize
        self._cache: OrderedDict[str, CompletionResult] = OrderedDict()

    def get(self, key: str) -> Optional[CompletionResult]:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key: str, value: CompletionResult) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        while len(self._cache) > self._maxsize:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        self._cache.clear()

    @property
    def size(self) -> int:
        return len(self._cache)


def _cache_key(request: CompletionRequest) -> str:
    """Deterministic hash of the request for cache lookup."""
    raw = f"{request.prefix}||{request.suffix}||{request.language}||{request.max_tokens}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Completion Engine
# ---------------------------------------------------------------------------

class CompletionEngine:
    """Main completion engine with template matching, context awareness, and caching."""

    def __init__(self, cache_size: int = 100) -> None:
        self._cache = LRUCache(maxsize=cache_size)
        self._context_extractor = context_extractor
        self._request_count = 0
        self._cache_hit_count = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def complete(self, request: CompletionRequest) -> CompletionResult:
        """Produce a completion for the given request.

        This is the primary entry point called by the API layer.
        """
        self._request_count += 1

        # 1. Check cache
        key = _cache_key(request)
        cached = self._cache.get(key)
        if cached is not None:
            self._cache_hit_count += 1
            # Return a fresh id so the client can distinguish requests
            return CompletionResult(
                id=str(uuid.uuid4()),
                text=cached.text,
                display_text=cached.display_text,
                language=cached.language,
                confidence=cached.confidence,
                source=CompletionSource.CACHE,
                alternatives=cached.alternatives,
            )

        # 2. Extract code context
        code_ctx = self._context_extractor.extract(
            prefix=request.prefix,
            suffix=request.suffix,
            language=request.language,
        )

        # 3. Build full context
        ctx = CompletionContext(request=request, code_context=code_ctx)

        # 4. Match templates
        matches = match_templates(request.prefix, request.language, max_results=5)

        if not matches:
            result = self._fallback_completion(request, code_ctx)
        else:
            best_template, best_score = matches[0]
            result = self._build_result(request, code_ctx, best_template, best_score, matches[1:])

        # 5. Post-processing: context-aware enhancements
        result = self._enhance_with_context(result, code_ctx)

        # 6. Trim to max_tokens (rough heuristic: 1 token ≈ 4 chars)
        max_chars = request.max_tokens * 4
        if len(result.text) > max_chars:
            result.text = result.text[:max_chars].rstrip()
            # Recompute display_text
            first_line = result.text.split("\n")[0]
            if result.text.count("\n") > 0:
                result.display_text = f"{first_line} ..."
            else:
                result.display_text = first_line

        # 7. Cache result
        self._cache.put(key, result)

        return result

    @property
    def stats(self) -> dict:
        """Return engine statistics."""
        return {
            "total_requests": self._request_count,
            "cache_hits": self._cache_hit_count,
            "cache_size": self._cache.size,
            "cache_hit_rate": (
                round(self._cache_hit_count / max(self._request_count, 1), 4)
            ),
        }

    def clear_cache(self) -> None:
        self._cache.clear()

    # ------------------------------------------------------------------
    # Result construction
    # ------------------------------------------------------------------

    def _build_result(
        self,
        request: CompletionRequest,
        code_ctx: CodeContext,
        template: "tuple",  # (Template, score)
        score: float,
        alternatives: list["tuple"],
    ) -> CompletionResult:
        from .templates import Template

        tmpl: Template = template
        indent_str = code_ctx.indent_char * code_ctx.indent_level
        text = _ind(tmpl.body, indent_str)

        alt_texts: list[str] = []
        for alt_tmpl, _ in alternatives[:3]:
            alt_texts.append(_ind(alt_tmpl.body, indent_str))

        # Boost confidence if completion type matches extracted context type
        confidence = min(score, 1.0)
        if tmpl.completion_type == code_ctx.completion_type:
            confidence = min(confidence + 0.10, 1.0)

        source = CompletionSource.TEMPLATE
        # If we have strong context agreement, mark as context-aware
        if code_ctx.completion_type != CompletionType.UNKNOWN and tmpl.completion_type == code_ctx.completion_type:
            source = CompletionSource.CONTEXT_AWARE
            confidence = min(confidence + 0.05, 1.0)

        return CompletionResult(
            id=str(uuid.uuid4()),
            text=text,
            display_text="",
            language=request.language,
            confidence=round(confidence, 4),
            source=source,
            alternatives=alt_texts,
        )

    # ------------------------------------------------------------------
    # Fallback when no templates match
    # ------------------------------------------------------------------

    def _fallback_completion(
        self, request: CompletionRequest, code_ctx: CodeContext
    ) -> CompletionResult:
        """Generate a generic completion when no template matches."""
        indent_str = code_ctx.indent_char * code_ctx.indent_level
        last_line = code_ctx.last_line.strip()
        ct = code_ctx.completion_type

        # Heuristic: if the last line ends with certain patterns, suggest something
        text = ""
        confidence = 0.25

        if ct == CompletionType.FUNCTION_BODY:
            text = f"{indent_str}pass" if request.language == "python" else f"{indent_str}// TODO: implement"
            confidence = 0.40
        elif ct == CompletionType.CLASS_BODY:
            text = f"{indent_str}pass" if request.language == "python" else f"{indent_str}// TODO: implement"
            confidence = 0.35
        elif ct == CompletionType.RETURN:
            text = f"{indent_str}result" if request.language == "python" else f"{indent_str}result;"
            confidence = 0.40
        elif ct == CompletionType.IMPORT:
            if request.language == "python":
                text = "os"
            elif request.language in ("typescript", "javascript"):
                text = "'module'"
            else:
                text = "stdlib"
            confidence = 0.25
        elif last_line.endswith("."):
            # Property / method access
            text = "method()"
            confidence = 0.20
        elif last_line.endswith("="):
            text = "value"
            confidence = 0.20
        elif last_line.endswith("("):
            text = ")"
            confidence = 0.30
        elif last_line.endswith("{"):
            text = f"\n{indent_str}  "
            confidence = 0.15
        else:
            # Very generic: just suggest continuing the pattern
            text = ""
            confidence = 0.10

        return CompletionResult(
            id=str(uuid.uuid4()),
            text=text,
            display_text="",
            language=request.language,
            confidence=confidence,
            source=CompletionSource.TEMPLATE,
            alternatives=[],
        )

    # ------------------------------------------------------------------
    # Context-aware enhancements
    # ------------------------------------------------------------------

    def _enhance_with_context(
        self, result: CompletionResult, code_ctx: CodeContext
    ) -> CompletionResult:
        """Apply post-processing based on extracted code context.

        Currently does:
        - Substitute known variable names into templates that use generic names
        - Ensure indentation matches the detected style
        """
        text = result.text

        # If the result uses generic placeholder variable names and we have
        # real variable names from context, perform a lightweight substitution.
        generic_vars = ["result", "data", "item", "value"]
        if code_ctx.variable_names:
            for generic in generic_vars:
                # Only substitute the first occurrence to keep it natural
                if generic in text:
                    # Pick the most recently declared variable that isn't the generic itself
                    for var in reversed(code_ctx.variable_names):
                        if var != generic and len(var) > 1:
                            text = text.replace(generic, var, 1)
                            break
                    break  # Only substitute one generic variable

        # Ensure function body completions for Python don't use {} style
        if result.language == "python":
            # Remove stray semicolons
            text = text.replace(";", "")
            # Remove stray curly braces (common in template leakage)
            text = text.replace("{", "").replace("}", "")
            # Clean up double blanks
            while "\n\n\n" in text:
                text = text.replace("\n\n\n", "\n\n")

        result.text = text

        # Recompute display_text
        first_line = text.split("\n")[0] if text else ""
        num_lines = text.count("\n") + 1
        if num_lines > 1:
            result.display_text = f"{first_line} ..."
        else:
            result.display_text = first_line

        return result


# Module-level singleton
completion_engine = CompletionEngine(cache_size=100)
