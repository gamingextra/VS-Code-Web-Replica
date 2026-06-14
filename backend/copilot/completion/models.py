"""Pydantic models for the AI Inline Completion service."""

from __future__ import annotations

import uuid
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CompletionType(str, Enum):
    """What kind of completion is being requested."""
    FUNCTION_BODY = "function_body"
    FUNCTION_PARAM = "function_param"
    CLASS_BODY = "class_body"
    IMPORT = "import"
    LOOP = "loop"
    CONDITIONAL = "conditional"
    TRY_CATCH = "try_catch"
    VARIABLE = "variable"
    RETURN = "return"
    PROPERTY = "property"
    COMMENT = "comment"
    EXPRESSION = "expression"
    UNKNOWN = "unknown"


class CompletionSource(str, Enum):
    """Where the completion came from."""
    TEMPLATE = "template"
    CACHE = "cache"
    CONTEXT_AWARE = "context_aware"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CompletionRequest(BaseModel):
    """Incoming request from the editor."""
    prefix: str = Field(..., description="Text before the cursor")
    suffix: str = Field("", description="Text after the cursor")
    language: str = Field("typescript", description="Programming language")
    file_name: str = Field("", description="Name of the file being edited")
    max_tokens: int = Field(150, ge=10, le=1000, description="Max tokens for completion")
    temperature: float = Field(0.2, ge=0.0, le=1.0, description="Sampling temperature (unused for template engine)")

    model_config = {"json_schema_extra": {
        "examples": [{
            "prefix": "function add(a: number, b: number) ",
            "suffix": "\n}",
            "language": "typescript",
            "file_name": "math.ts",
            "max_tokens": 150,
            "temperature": 0.2,
        }]
    }}


class CompletionResult(BaseModel):
    """A single completion result."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str = Field(..., description="The full completion text")
    display_text: str = Field("", description="Shortened text for inline display")
    language: str = Field("typescript")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence score 0-1")
    source: CompletionSource = Field(CompletionSource.TEMPLATE)
    alternatives: list[str] = Field(default_factory=list, description="Alternative completions")

    def model_post_init(self, __context: object) -> None:
        if not self.display_text:
            first_line = self.text.split("\n")[0]
            num_lines = self.text.count("\n") + 1
            if num_lines > 1:
                self.display_text = f"{first_line} ..."
            else:
                self.display_text = first_line


# ---------------------------------------------------------------------------
# Internal context models
# ---------------------------------------------------------------------------

class CodeContext(BaseModel):
    """Extracted structural context from the code around the cursor."""
    imports: list[str] = Field(default_factory=list, description="Import statements found")
    function_sig: Optional[str] = Field(None, description="Nearest function signature above cursor")
    class_name: Optional[str] = Field(None, description="Nearest class name above cursor")
    indent_level: int = Field(0, description="Current indentation level (spaces)")
    indent_char: str = Field(" ", description="Indentation character (space or tab)")
    completion_type: CompletionType = Field(CompletionType.UNKNOWN)
    surrounding_code: str = Field("", description="Last few meaningful lines of code before cursor")
    last_line: str = Field("", description="The line the cursor is on")
    variable_names: list[str] = Field(default_factory=list, description="Variable names found in scope")
    comment_above: Optional[str] = Field(None, description="Comment directly above cursor line")


class CompletionContext(BaseModel):
    """Full context passed to the completion engine."""
    request: CompletionRequest
    code_context: CodeContext
