"""Context extractor – parses code around the cursor to build a :class:`CodeContext`.

The extractor performs lightweight, regex-based structural analysis of the
*prefix* and *suffix* text.  It intentionally avoids full AST parsing so it
remains fast (sub-millisecond) and language-agnostic.
"""

from __future__ import annotations

import re
from typing import Optional

from .models import CodeContext, CompletionType


class ContextExtractor:
    """Extract structural context from the code surrounding the cursor."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(self, prefix: str, suffix: str, language: str) -> CodeContext:
        """Build a :class:`CodeContext` from the code around the cursor.

        Parameters
        ----------
        prefix:
            All text before the cursor.
        suffix:
            All text after the cursor.
        language:
            Language identifier (e.g. ``"typescript"``, ``"python"``).
        """
        lang = language.lower().strip()

        imports = self._extract_imports(prefix, lang)
        func_sig = self._extract_function_sig(prefix, lang)
        class_name = self._extract_class_name(prefix, lang)
        indent_level, indent_char = self._detect_indent(prefix)
        last_line = self._get_last_line(prefix)
        surrounding = self._get_surrounding_code(prefix)
        variables = self._extract_variables(prefix, lang)
        comment_above = self._extract_comment_above(prefix, lang)
        completion_type = self._infer_completion_type(
            prefix, suffix, lang, func_sig, class_name, last_line
        )

        return CodeContext(
            imports=imports,
            function_sig=func_sig,
            class_name=class_name,
            indent_level=indent_level,
            indent_char=indent_char,
            completion_type=completion_type,
            surrounding_code=surrounding,
            last_line=last_line,
            variable_names=variables,
            comment_above=comment_above,
        )

    # ------------------------------------------------------------------
    # Import extraction
    # ------------------------------------------------------------------

    _IMPORT_PATTERNS: dict[str, list[str]] = {
        "typescript": [
            r"import\s+.*?from\s*['\"].*?['\"]",
            r"import\s*['\"].*?['\"]",
        ],
        "javascript": [
            r"import\s+.*?from\s*['\"].*?['\"]",
            r"import\s*['\"].*?['\"]",
            r"const\s+\w+\s*=\s*require\s*\(['\"].*?['\"]",
        ],
        "python": [
            r"from\s+[\w.]+\s+import\s+[\w\s,.*]+",
            r"import\s+[\w.\s,]+",
        ],
        "go": [
            r'import\s+"[^"]*"',
            r"import\s+\([^)]+\)",
        ],
        "rust": [
            r"use\s+[\w:]+;",
        ],
        "java": [
            r"import\s+[\w.]+\s*;",
        ],
        "csharp": [
            r"using\s+[\w.]+\s*;",
        ],
    }

    def _extract_imports(self, prefix: str, lang: str) -> list[str]:
        patterns = self._IMPORT_PATTERNS.get(lang, self._IMPORT_PATTERNS.get("typescript", []))
        results: list[str] = []
        for pat in patterns:
            for m in re.finditer(pat, prefix, re.MULTILINE):
                text = m.group(0).strip()
                if text not in results:
                    results.append(text)
        return results[:20]  # cap

    # ------------------------------------------------------------------
    # Function signature
    # ------------------------------------------------------------------

    _FUNC_SIG_PATTERNS: dict[str, str] = {
        "typescript": r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?",
        "javascript": r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)",
        "python": r"def\s+\w+\s*\([^)]*\)(?:\s*->\s*[^:]+)?",
        "go": r"func\s+(?:\([^)]+\)\s*)?\w+\s*\([^)]*\)(?:\s*\([^)]*\))?",
        "rust": r"(?:pub\s+)?(?:async\s+)?fn\s+\w+\s*\([^)]*\)(?:\s*->\s*[^{]+)?",
        "java": r"(?:public|private|protected)?\s*(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+\w+\s*\([^)]*\)",
        "csharp": r"(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[^>]+>)?)\s+\w+\s*\([^)]*\)",
    }

    def _extract_function_sig(self, prefix: str, lang: str) -> Optional[str]:
        pat = self._FUNC_SIG_PATTERNS.get(lang)
        if not pat:
            # Fallback generic pattern
            pat = r"\w+\s*\([^)]*\)"
        matches = list(re.finditer(pat, prefix, re.MULTILINE))
        if matches:
            return matches[-1].group(0).strip()
        return None

    # ------------------------------------------------------------------
    # Class name
    # ------------------------------------------------------------------

    _CLASS_PATTERNS: dict[str, str] = {
        "typescript": r"class\s+(\w+)",
        "javascript": r"class\s+(\w+)",
        "python": r"class\s+(\w+)",
        "go": r"type\s+(\w+)\s+struct",
        "rust": r"struct\s+(\w+)",
        "java": r"class\s+(\w+)",
        "csharp": r"class\s+(\w+)",
    }

    def _extract_class_name(self, prefix: str, lang: str) -> Optional[str]:
        pat = self._CLASS_PATTERNS.get(lang)
        if not pat:
            return None
        matches = list(re.finditer(pat, prefix, re.MULTILINE))
        if matches:
            return matches[-1].group(1)
        return None

    # ------------------------------------------------------------------
    # Indentation
    # ------------------------------------------------------------------

    def _detect_indent(self, prefix: str) -> tuple[int, str]:
        """Return ``(indent_level, indent_char)`` for the current line."""
        last_line = self._get_last_line(prefix)
        if not last_line:
            return (0, " ")
        # Count leading spaces or tabs
        stripped = last_line.lstrip()
        leading = last_line[: len(last_line) - len(stripped)]
        if "\t" in leading:
            indent_char = "\t"
            indent_level = len(leading)
        else:
            indent_char = " "
            indent_level = len(leading)
            # Try to detect 2-space vs 4-space
            if indent_level > 0 and indent_level % 4 != 0 and indent_level % 2 == 0:
                pass  # 2-space indent
        return (indent_level, indent_char)

    # ------------------------------------------------------------------
    # Last line & surrounding code
    # ------------------------------------------------------------------

    @staticmethod
    def _get_last_line(prefix: str) -> str:
        lines = prefix.rstrip().split("\n")
        return lines[-1] if lines else ""

    @staticmethod
    def _get_surrounding_code(prefix: str, max_lines: int = 8) -> str:
        lines = prefix.rstrip().split("\n")
        snippet = lines[-max_lines:] if len(lines) > max_lines else lines
        return "\n".join(snippet)

    # ------------------------------------------------------------------
    # Variable names
    # ------------------------------------------------------------------

    def _extract_variables(self, prefix: str, lang: str) -> list[str]:
        """Heuristic extraction of variable names declared in the prefix."""
        if lang in ("typescript", "javascript", "typescriptreact", "javascriptreact"):
            pat = r"(?:const|let|var)\s+(\w+)"
        elif lang == "python":
            pat = r"(\w+)\s*=\s*"
        elif lang == "go":
            pat = r"(?:var|const)\s+(\w+)|(\w+)\s*:?="
        elif lang == "rust":
            pat = r"let\s+(?:mut\s+)?(\w+)"
        elif lang == "java":
            pat = r"(?:int|long|String|boolean|double|float|var)\s+(\w+)"
        elif lang == "csharp":
            pat = r"(?:var|int|long|string|bool|double|float)\s+(\w+)"
        else:
            pat = r"(\w+)\s*=\s*"

        names: list[str] = []
        seen: set[str] = set()
        for m in re.finditer(pat, prefix, re.MULTILINE):
            # Go has two capture groups
            name = m.group(1) or (m.group(2) if m.lastindex and m.lastindex >= 2 else None)
            if name and name not in seen and not name.startswith("__"):
                seen.add(name)
                names.append(name)
        return names[:15]

    # ------------------------------------------------------------------
    # Comment above cursor
    # ------------------------------------------------------------------

    _COMMENT_PATTERNS: dict[str, str] = {
        "typescript": r"//\s*(.*)",
        "javascript": r"//\s*(.*)",
        "python": r"#\s*(.*)",
        "go": r"//\s*(.*)",
        "rust": r"//\s*(.*)",
        "java": r"//\s*(.*)",
        "csharp": r"//\s*(.*)",
        "html": r"<!--\s*(.*?)\s*-->",
        "css": r"/\*\s*(.*?)\s*\*/",
        "sql": r"--\s*(.*)",
    }

    def _extract_comment_above(self, prefix: str, lang: str) -> Optional[str]:
        pat = self._COMMENT_PATTERNS.get(lang, r"//\s*(.*)")
        lines = prefix.rstrip().split("\n")
        # Walk backwards from the last non-empty line
        for line in reversed(lines):
            stripped = line.strip()
            if not stripped:
                continue
            m = re.match(pat, stripped)
            if m:
                return m.group(1).strip()
            break  # First non-empty, non-comment line => stop
        return None

    # ------------------------------------------------------------------
    # Completion type inference
    # ------------------------------------------------------------------

    def _infer_completion_type(
        self,
        prefix: str,
        suffix: str,
        lang: str,
        func_sig: Optional[str],
        class_name: Optional[str],
        last_line: str,
    ) -> CompletionType:
        tail = prefix.rstrip()
        stripped_last = last_line.strip()

        # --- Language-specific heuristics ---

        if lang in ("typescript", "javascript", "typescriptreact", "javascriptreact"):
            if re.search(r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{?\s*$", tail):
                return CompletionType.FUNCTION_BODY
            if re.search(r"interface\s+\w+\s*\{?\s*$", tail):
                return CompletionType.CLASS_BODY
            if re.search(r"const\s*\[", stripped_last):
                return CompletionType.VARIABLE
            if re.search(r"use(?:State|Effect|Callback|Memo|Ref)", stripped_last):
                return CompletionType.FUNCTION_BODY
            if re.search(r"import\s+", stripped_last):
                return CompletionType.IMPORT
            if re.search(r"try\s*\{?\s*$", tail):
                return CompletionType.TRY_CATCH
            if re.search(r"for\s*\(", stripped_last):
                return CompletionType.LOOP
            if re.search(r"if\s*\(", stripped_last):
                return CompletionType.CONDITIONAL
            if re.search(r"return\s*$", stripped_last):
                return CompletionType.RETURN
            if re.search(r"class\s+\w+", stripped_last):
                return CompletionType.CLASS_BODY

        elif lang == "python":
            if re.search(r"def\s+\w+\s*\([^)]*\)\s*(?:->[^:]+)?:\s*$", tail):
                return CompletionType.FUNCTION_BODY
            if re.search(r"async\s+def\s+\w+\s*\([^)]*\)\s*(?:->[^:]+)?:\s*$", tail):
                return CompletionType.FUNCTION_BODY
            if re.search(r"class\s+\w+(?:\([^)]*\))?:\s*$", tail):
                return CompletionType.CLASS_BODY
            if re.search(r"from\s+[\w.]+\s+import\s*$", stripped_last):
                return CompletionType.IMPORT
            if re.search(r"import\s+$", stripped_last):
                return CompletionType.IMPORT
            if re.search(r"if\s+__name__\s*==\s*['\"]__main__['\"]\s*:\s*$", tail):
                return CompletionType.CONDITIONAL
            if re.search(r"try:\s*$", tail):
                return CompletionType.TRY_CATCH
            if re.search(r"for\s+\w+\s+in\s+", stripped_last):
                return CompletionType.LOOP
            if re.search(r"while\s+", stripped_last):
                return CompletionType.LOOP
            if re.search(r"if\s+", stripped_last):
                return CompletionType.CONDITIONAL
            if re.search(r"return\s*$", stripped_last):
                return CompletionType.RETURN
            if re.search(r"@\w+", stripped_last):
                return CompletionType.FUNCTION_BODY

        elif lang == "go":
            if re.search(r"func\s+", stripped_last):
                return CompletionType.FUNCTION_BODY
            if re.search(r"type\s+\w+\s+struct\s*\{?\s*$", tail):
                return CompletionType.CLASS_BODY
            if re.search(r"if\s+err\s*!=\s*nil", stripped_last):
                return CompletionType.CONDITIONAL
            if re.search(r"for\s+", stripped_last):
                return CompletionType.LOOP
            if re.search(r"import\s*\(\s*$", tail):
                return CompletionType.IMPORT

        elif lang == "rust":
            if re.search(r"fn\s+\w+", stripped_last):
                return CompletionType.FUNCTION_BODY
            if re.search(r"struct\s+\w+", stripped_last):
                return CompletionType.CLASS_BODY
            if re.search(r"impl\s+\w+", stripped_last):
                return CompletionType.CLASS_BODY
            if re.search(r"match\s+", stripped_last):
                return CompletionType.CONDITIONAL
            if re.search(r"use\s+", stripped_last):
                return CompletionType.IMPORT
            if re.search(r"for\s+\w+\s+in\s+", stripped_last):
                return CompletionType.LOOP

        # --- Generic fallbacks ---

        if func_sig and not class_name:
            return CompletionType.FUNCTION_BODY
        if class_name:
            return CompletionType.CLASS_BODY

        return CompletionType.UNKNOWN


# Module-level singleton
context_extractor = ContextExtractor()
