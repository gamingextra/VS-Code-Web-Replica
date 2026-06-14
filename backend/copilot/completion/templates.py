"""Language-specific completion templates for the AI Inline Completion service.

Each template entry describes:
- ``trigger``: a regex pattern matched against the tail of the prefix text
- ``body``: the completion text (may contain ``{indent}`` placeholder)
- ``confidence``: base confidence for this pattern (0-1)
- ``completion_type``: the :class:`CompletionType` this template addresses
"""

from __future__ import annotations

import re
from typing import NamedTuple

from .models import CompletionType


class Template(NamedTuple):
    """A single completion template."""
    trigger: str  # regex matched against the end of prefix
    body: str  # completion text, may contain {indent} placeholder
    confidence: float  # 0.0 – 1.0
    completion_type: CompletionType


# ---------------------------------------------------------------------------
# Helper to indent a multi-line body
# ---------------------------------------------------------------------------

def _ind(body: str, indent: str) -> str:
    """Replace ``{indent}`` placeholder and indent subsequent lines."""
    lines = body.replace("{indent}", indent).split("\n")
    out: list[str] = []
    for i, line in enumerate(lines):
        if i == 0:
            out.append(line)
        else:
            stripped = line.lstrip()
            if stripped:
                out.append(indent + line if not line.startswith(indent) else line)
            else:
                out.append("")
    return "\n".join(out)


# =====================================================================
# TYPESCRIPT
# =====================================================================

TYPESCRIPT_TEMPLATES: list[Template] = [
    # --- Functions ---
    Template(
        trigger=r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*\{?\s*$",
        body="{indent}const result = await fetchData();\n{indent}return result;",
        confidence=0.72,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(",
        body=") {\n{indent}return;\n}",
        confidence=0.50,
        completion_type=CompletionType.FUNCTION_PARAM,
    ),
    Template(
        trigger=r"const\s+\w+\s*=\s*(?:async\s+)?\(",
        body=") => {\n{indent}\n{indent}}",
        confidence=0.65,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    # --- Interfaces ---
    Template(
        trigger=r"interface\s+\w+\s*\{?\s*$",
        body=" {\n{indent}id: string;\n{indent}name: string;\n}",
        confidence=0.70,
        completion_type=CompletionType.CLASS_BODY,
    ),
    # --- React hooks ---
    Template(
        trigger=r"const\s*\[\s*\w+\s*,\s*set\w+\s*\]\s*=\s*useState",
        body="(initialValue);",
        confidence=0.80,
        completion_type=CompletionType.VARIABLE,
    ),
    Template(
        trigger=r"useEffect\s*\(\s*\(",
        body=") => {\n{indent}// Setup\n{indent}return () => {\n{indent}  // Cleanup\n{indent}};\n{indent}}, []);",
        confidence=0.78,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"useCallback\s*\(\s*\(",
        body=") => {\n{indent}\n{indent}}, []);",
        confidence=0.70,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"useMemo\s*\(\s*\(",
        body=") => {\n{indent}return computed;\n{indent}}, []);",
        confidence=0.70,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    # --- Control flow ---
    Template(
        trigger=r"if\s*\(",
        body="condition) {\n{indent}// Handle true case\n{indent}} else {\n{indent}// Handle false case\n{indent}}",
        confidence=0.60,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"try\s*\{?\s*$",
        body=" {\n{indent}const result = await operation();\n{indent}return result;\n{indent}} catch (error) {\n{indent}console.error(error);\n{indent}throw error;\n{indent}}",
        confidence=0.68,
        completion_type=CompletionType.TRY_CATCH,
    ),
    Template(
        trigger=r"for\s*\(\s*(?:let|const|var)\s+",
        body="item of items) {\n{indent}process(item);\n{indent}}",
        confidence=0.62,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"while\s*\(",
        body="condition) {\n{indent}// Loop body\n{indent}}",
        confidence=0.55,
        completion_type=CompletionType.LOOP,
    ),
    # --- Imports ---
    Template(
        trigger=r"import\s+\{",
        body="} from 'module';",
        confidence=0.55,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"import\s+\w+\s+from",
        body="'module';",
        confidence=0.55,
        completion_type=CompletionType.IMPORT,
    ),
    # --- Classes ---
    Template(
        trigger=r"class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+\w+)?\s*\{?\s*$",
        body=" {\n{indent}constructor() {\n{indent}  // Initialize\n{indent}}\n\n{indent}method() {\n{indent}  // TODO: implement\n{indent}}\n}",
        confidence=0.60,
        completion_type=CompletionType.CLASS_BODY,
    ),
    # --- Exports ---
    Template(
        trigger=r"export\s+default\s+function",
        body=" Page() {\n{indent}return <main>\n{indent}  <h1>Hello World</h1>\n{indent}</main>;\n{indent}}",
        confidence=0.58,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    # --- Return ---
    Template(
        trigger=r"return\s+$",
        body="result;",
        confidence=0.65,
        completion_type=CompletionType.RETURN,
    ),
    # --- Console ---
    Template(
        trigger=r"console\.log",
        body="(data);",
        confidence=0.75,
        completion_type=CompletionType.EXPRESSION,
    ),
    # --- Async / await ---
    Template(
        trigger=r"async\s+",
        body="function handler(req: Request): Promise<Response> {\n{indent}try {\n{indent}  const data = await req.json();\n{indent}  return Response.json({ success: true, data });\n{indent}} catch (error) {\n{indent}  return Response.json({ error: 'Invalid request' }, { status: 400 });\n{indent}}\n}",
        confidence=0.50,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
]

# =====================================================================
# JAVASCRIPT
# =====================================================================

JAVASCRIPT_TEMPLATES: list[Template] = [
    Template(
        trigger=r"(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{?\s*$",
        body="{indent}const result = await fetchData();\n{indent}return result;",
        confidence=0.72,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"const\s+\w+\s*=\s*(?:async\s+)?\(",
        body=") => {\n{indent}\n{indent}}",
        confidence=0.65,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"module\.exports",
        body=" = {\n{indent}handler,\n{indent}middleware,\n{indent}};",
        confidence=0.68,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"async\s+",
        body="function processQueue(items) {\n{indent}for (const item of items) {\n{indent}  await processItem(item);\n{indent}}\n}",
        confidence=0.50,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"if\s*\(",
        body="condition) {\n{indent}// Handle true case\n{indent}} else {\n{indent}// Handle false case\n{indent}}",
        confidence=0.60,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"try\s*\{?\s*$",
        body=" {\n{indent}const result = await operation();\n{indent}return result;\n{indent}} catch (error) {\n{indent}console.error(error);\n{indent}throw error;\n{indent}}",
        confidence=0.68,
        completion_type=CompletionType.TRY_CATCH,
    ),
    Template(
        trigger=r"for\s*\(\s*(?:let|const|var)\s+",
        body="item of items) {\n{indent}process(item);\n{indent}}",
        confidence=0.62,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"export\s+function\s+",
        body="handler(req, res) {\n{indent}const { method } = req;\n{indent}switch (method) {\n{indent}  case 'GET':\n{indent}    return res.status(200).json({ data: [] });\n{indent}  default:\n{indent}    return res.status(405).end();\n{indent}}\n}",
        confidence=0.52,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"require\s*\(",
        body="'module');",
        confidence=0.60,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"class\s+\w+",
        body=" {\n{indent}constructor() {\n{indent}  // Initialize\n{indent}}\n}",
        confidence=0.58,
        completion_type=CompletionType.CLASS_BODY,
    ),
]

# =====================================================================
# PYTHON
# =====================================================================

PYTHON_TEMPLATES: list[Template] = [
    # --- Function defs ---
    Template(
        trigger=r"def\s+\w+\s*\([^)]*\)\s*(?:->\s*[\w\[\],\s]+\s*)?:\s*$",
        body="{indent}\"\"\"Docstring.\"\"\"\n{indent}pass",
        confidence=0.75,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"async\s+def\s+\w+\s*\([^)]*\)\s*(?:->\s*[\w\[\],\s]+\s*)?:\s*$",
        body="{indent}\"\"\"Async docstring.\"\"\"\n{indent}result = await operation()\n{indent}return result",
        confidence=0.72,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"def\s+__init__\s*\(self[^)]*\):\s*$",
        body="{indent}self.data = []\n{indent}self.config = config",
        confidence=0.70,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"def\s+\w+\s*\(self",
        body=", *args, **kwargs):\n{indent}\"\"\"Method docstring.\"\"\"\n{indent}pass",
        confidence=0.55,
        completion_type=CompletionType.FUNCTION_PARAM,
    ),
    # --- Classes ---
    Template(
        trigger=r"class\s+\w+(?:\([^)]*\))?:\s*$",
        body="{indent}\"\"\"Class docstring.\"\"\"\n\n{indent}def __init__(self, config):\n{indent}    self.config = config\n{indent}    self.data = []\n\n{indent}def process(self, input_data):\n{indent}    return [self._transform(item) for item in input_data]\n\n{indent}def _transform(self, item):\n{indent}    return item",
        confidence=0.62,
        completion_type=CompletionType.CLASS_BODY,
    ),
    # --- Imports ---
    Template(
        trigger=r"from\s+[\w.]+\s+import\s*$",
        body="List, Dict, Optional",
        confidence=0.65,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"import\s+$",
        body="os\nimport sys",
        confidence=0.50,
        completion_type=CompletionType.IMPORT,
    ),
    # --- Control flow ---
    Template(
        trigger=r"if\s+__name__\s*==\s*[\"']__main__[\"']\s*:\s*$",
        body="{indent}main()",
        confidence=0.85,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"if\s+",
        body="condition:\n{indent}pass\n{indent}else:\n{indent}pass",
        confidence=0.55,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"for\s+\w+\s+in\s+",
        body="items:\n{indent}process(item)",
        confidence=0.60,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"while\s+",
        body="condition:\n{indent}pass",
        confidence=0.55,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"try:\s*$",
        body="{indent}result = operation()\n{indent}except Exception as e:\n{indent}    logger.error(f'Operation failed: {e}')\n{indent}    raise",
        confidence=0.68,
        completion_type=CompletionType.TRY_CATCH,
    ),
    Template(
        trigger=r"with\s+",
        body="open(file_path, 'r') as f:\n{indent}data = f.read()",
        confidence=0.62,
        completion_type=CompletionType.EXPRESSION,
    ),
    # --- Return ---
    Template(
        trigger=r"return\s+$",
        body="result",
        confidence=0.70,
        completion_type=CompletionType.RETURN,
    ),
    # --- Variable ---
    Template(
        trigger=r"\w+\s*=\s*$",
        body="None",
        confidence=0.40,
        completion_type=CompletionType.VARIABLE,
    ),
    # --- Decorators ---
    Template(
        trigger=r"@\w+(?:\([^)]*\))?\s*$",
        body="\ndef decorator_target():\n{indent}pass",
        confidence=0.50,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
]

# =====================================================================
# GO
# =====================================================================

GO_TEMPLATES: list[Template] = [
    Template(
        trigger=r"func\s+(?:\([^)]+\)\s*)?\w+\s*\([^)]*\)\s*(?:\([^)]*\))?\s*\{?\s*$",
        body="{indent}result, err := doWork()\n{indent}if err != nil {\n{indent}\treturn err\n{indent}}\n{indent}return result",
        confidence=0.70,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"func\s+\w+\s*\(w\s+http\.ResponseWriter,\s*r\s+\*http\.Request\)",
        body=") {\n{indent}w.Header().Set(\"Content-Type\", \"application/json\")\n{indent}json.NewEncoder(w).Encode(map[string]string{\"status\": \"ok\"})\n}",
        confidence=0.72,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"type\s+\w+\s+struct\s*\{?\s*$",
        body=" struct {\n{indent}Port     int    `json:\"port\"`\n{indent}Host     string `json:\"host\"`\n{indent}Database string `json:\"database\"`\n}",
        confidence=0.72,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"type\s+\w+\s+interface\s*\{?\s*$",
        body=" interface {\n{indent}Method() error\n}",
        confidence=0.65,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"if\s+err\s*!=\s*nil\s*\{?\s*$",
        body=" {\n{indent}log.Printf(\"Error: %v\", err)\n{indent}return err\n{indent}}",
        confidence=0.82,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"go\s+func",
        body="() {\n{indent}// Background task\n{indent}result := processAsync()\n{indent}ch <- result\n{indent}}()",
        confidence=0.62,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"for\s+",
        body="_, item := range items {\n{indent}process(item)\n{indent}}",
        confidence=0.65,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"import\s*\(\s*$",
        body="\n{indent}\"fmt\"\n{indent}\"log\"\n{indent}\"net/http\"\n)",
        confidence=0.55,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"defer\s+",
        body="close()",  # Placeholder
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
]

# =====================================================================
# RUST
# =====================================================================

RUST_TEMPLATES: list[Template] = [
    Template(
        trigger=r"fn\s+\w+\s*\([^)]*\)\s*(?:->\s*[^{]+)?\s*\{?\s*$",
        body="{indent}let data = parse_input(input)?;\n{indent}let result = transform(data)?;\n{indent}Ok(result)",
        confidence=0.68,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"pub\s+(?:async\s+)?fn\s+\w+\s*\(",
        body=") -> Result<(), Box<dyn std::error::Error>> {\n{indent}Ok(())\n}",
        confidence=0.65,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"struct\s+\w+\s*\{?\s*$",
        body=" {\n{indent}port: u16,\n{indent}host: String,\n{indent}debug: bool,\n}",
        confidence=0.72,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"impl\s+\w+\s*\{?\s*$",
        body=" {\n{indent}fn new() -> Self {\n{indent}    Self {\n{indent}        port: 8080,\n{indent}        host: \"127.0.0.1\".to_string(),\n{indent}        debug: false,\n{indent}    }\n{indent}}\n}",
        confidence=0.65,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"enum\s+\w+\s*\{?\s*$",
        body=" {\n{indent}Variant1,\n{indent}Variant2(String),\n{indent}Variant3 { field: i32 },\n}",
        confidence=0.68,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"match\s+",
        body="result {\n{indent}Ok(value) => println!(\"Success: {}\", value),\n{indent}Err(e) => eprintln!(\"Error: {}\", e),\n{indent}}",
        confidence=0.70,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"if\s+let\s+",
        body="Some(value) = option {\n{indent}// Handle Some\n{indent}} else {\n{indent}// Handle None\n{indent}}",
        confidence=0.65,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"use\s+",
        body="std::collections::HashMap;",
        confidence=0.50,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"for\s+\w+\s+in\s+",
        body="0..n {\n{indent}// Loop body\n{indent}}",
        confidence=0.60,
        completion_type=CompletionType.LOOP,
    ),
]

# =====================================================================
# JAVA
# =====================================================================

JAVA_TEMPLATES: list[Template] = [
    Template(
        trigger=r"(?:public|private|protected)?\s*(?:static\s+)?(?:\w+(?:<[^>]+>)?)\s+\w+\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{?\s*$",
        body="{indent}// TODO: implement\n{indent}return null;",
        confidence=0.60,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"(?:public\s+)?class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w\s,]+)?\s*\{?\s*$",
        body=" {\n{indent}private String name;\n\n{indent}public ClassName() {\n{indent}    this.name = \"\";\n{indent}}\n}",
        confidence=0.62,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"(?:public\s+)?class\s+\s*$",
        body="MyClass {\n{indent}private String name;\n\n{indent}public MyClass() {\n{indent}    this.name = \"\";\n{indent}}\n}",
        confidence=0.55,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"import\s+",
        body="java.util.*;",
        confidence=0.55,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"try\s*\{?\s*$",
        body=" {\n{indent}var result = operation();\n{indent}} catch (Exception e) {\n{indent}e.printStackTrace();\n{indent}}",
        confidence=0.62,
        completion_type=CompletionType.TRY_CATCH,
    ),
    Template(
        trigger=r"for\s*\(",
        body="int i = 0; i < items.size(); i++) {\n{indent}var item = items.get(i);\n{indent}process(item);\n{indent}}",
        confidence=0.58,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"if\s*\(",
        body="condition) {\n{indent}// Handle true case\n{indent}} else {\n{indent}// Handle false case\n{indent}}",
        confidence=0.55,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"@Override\s*$",
        body="\n{indent}public String toString() {\n{indent}    return \"\";\n{indent}}",
        confidence=0.60,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
]

# =====================================================================
# C#
# =====================================================================

CSHARP_TEMPLATES: list[Template] = [
    Template(
        trigger=r"(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[^>]+>)?)\s+\w+\s*\([^)]*\)\s*\{?\s*$",
        body="{indent}// TODO: implement\n{indent}return default;",
        confidence=0.60,
        completion_type=CompletionType.FUNCTION_BODY,
    ),
    Template(
        trigger=r"(?:public\s+)?class\s+\w+",
        body="{\n{indent}public string Name { get; set; }\n{indent}public int Id { get; set; }\n}",
        confidence=0.62,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"(?:public\s+)?class\s+\s*$",
        body="MyClass\n{\n{indent}public string Name { get; set; }\n{indent}public int Id { get; set; }\n}",
        confidence=0.55,
        completion_type=CompletionType.CLASS_BODY,
    ),
    Template(
        trigger=r"using\s+",
        body="System;",
        confidence=0.55,
        completion_type=CompletionType.IMPORT,
    ),
    Template(
        trigger=r"try\s*\{?\s*$",
        body="{\n{indent}var result = Operation();\n{indent}}\n{indent}catch (Exception ex)\n{indent}{\n{indent}    Console.WriteLine(ex.Message);\n{indent}}",
        confidence=0.60,
        completion_type=CompletionType.TRY_CATCH,
    ),
    Template(
        trigger=r"foreach\s*\(",
        body="var item in items) {\n{indent}Process(item);\n{indent}}",
        confidence=0.65,
        completion_type=CompletionType.LOOP,
    ),
    Template(
        trigger=r"if\s*\(",
        body="condition) {\n{indent}// Handle true case\n{indent}} else {\n{indent}// Handle false case\n{indent}}",
        confidence=0.55,
        completion_type=CompletionType.CONDITIONAL,
    ),
    Template(
        trigger=r"namespace\s+",
        body="MyNamespace;\n\npublic class MyClass\n{\n{indent}\n}",
        confidence=0.50,
        completion_type=CompletionType.EXPRESSION,
    ),
]

# =====================================================================
# HTML
# =====================================================================

HTML_TEMPLATES: list[Template] = [
    Template(
        trigger=r"<div",
        body=" class=\"container\">\n{indent}</div>",
        confidence=0.72,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<html",
        body=" lang=\"en\">\n<head>\n{indent}<meta charset=\"UTF-8\">\n{indent}<title>Title</title>\n</head>\n<body>\n{indent}\n</body>\n</html>",
        confidence=0.68,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<form",
        body=" action=\"/submit\" method=\"POST\">\n{indent}<label for=\"name\">Name:</label>\n{indent}<input type=\"text\" id=\"name\" name=\"name\">\n{indent}<button type=\"submit\">Submit</button>\n</form>",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<table",
        body=">\n{indent}<thead>\n{indent}  <tr>\n{indent}    <th>Header</th>\n{indent}  </tr>\n{indent}</thead>\n{indent}<tbody>\n{indent}  <tr>\n{indent}    <td>Data</td>\n{indent}  </tr>\n{indent}</tbody>\n</table>",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<ul",
        body=">\n{indent}<li>Item 1</li>\n{indent}<li>Item 2</li>\n{indent}<li>Item 3</li>\n</ul>",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<script",
        body=">\n{indent}// JavaScript code\n</script>",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"<style",
        body=">\n{indent}.class {\n{indent}  property: value;\n{indent}}\n</style>",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
]

# =====================================================================
# CSS
# =====================================================================

CSS_TEMPLATES: list[Template] = [
    Template(
        trigger=r"\.\w+\s*\{?\s*$",
        body=" {\n{indent}display: flex;\n{indent}flex-direction: column;\n{indent}padding: 1rem;\n}",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"#\w+\s*\{?\s*$",
        body=" {\n{indent}width: 100%;\n{indent}max-width: 1200px;\n{indent}margin: 0 auto;\n}",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"@media\s+",
        body="(max-width: 768px) {\n{indent}.container {\n{indent}  flex-direction: column;\n{indent}}\n}",
        confidence=0.62,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"@keyframes\s+\w+\s*\{?\s*$",
        body=" {\n{indent}from {\n{indent}  opacity: 0;\n{indent}}\n{indent}to {\n{indent}  opacity: 1;\n{indent}}\n}",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r":root\s*\{?\s*$",
        body=" {\n{indent}--primary: #007bff;\n{indent}--secondary: #6c757d;\n{indent}--font-size: 16px;\n}",
        confidence=0.70,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"display:\s*$",
        body="flex;",
        confidence=0.75,
        completion_type=CompletionType.PROPERTY,
    ),
]

# =====================================================================
# SQL
# =====================================================================

SQL_TEMPLATES: list[Template] = [
    Template(
        trigger=r"SELECT\s+$",
        body="* FROM table_name WHERE condition = value;",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"SELECT\s+.*\s+FROM\s+\w+\s+WHERE\s+$",
        body="column = value;",
        confidence=0.68,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"CREATE\s+TABLE\s+\w+\s*\(\s*$",
        body="\n{indent}id INTEGER PRIMARY KEY,\n{indent}name VARCHAR(255) NOT NULL,\n{indent}created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
        confidence=0.70,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"INSERT\s+INTO\s+\w+\s*",
        body="(column1, column2) VALUES (value1, value2);",
        confidence=0.65,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"UPDATE\s+\w+\s+SET\s+$",
        body="column = value WHERE condition;",
        confidence=0.62,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"DELETE\s+FROM\s+",
        body="table_name WHERE condition;",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"JOIN\s+",
        body="table2 ON table1.id = table2.table1_id",
        confidence=0.60,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"ORDER\s+BY\s+",
        body="column ASC;",
        confidence=0.70,
        completion_type=CompletionType.EXPRESSION,
    ),
    Template(
        trigger=r"GROUP\s+BY\s+",
        body="column HAVING COUNT(*) > 1;",
        confidence=0.58,
        completion_type=CompletionType.EXPRESSION,
    ),
]


# =====================================================================
# REGISTRY
# =====================================================================

LANGUAGE_TEMPLATES: dict[str, list[Template]] = {
    "typescript": TYPESCRIPT_TEMPLATES,
    "typescriptreact": TYPESCRIPT_TEMPLATES,
    "tsx": TYPESCRIPT_TEMPLATES,
    "javascript": JAVASCRIPT_TEMPLATES,
    "javascriptreact": JAVASCRIPT_TEMPLATES,
    "jsx": JAVASCRIPT_TEMPLATES,
    "python": PYTHON_TEMPLATES,
    "go": GO_TEMPLATES,
    "rust": RUST_TEMPLATES,
    "java": JAVA_TEMPLATES,
    "csharp": CSHARP_TEMPLATES,
    "html": HTML_TEMPLATES,
    "css": CSS_TEMPLATES,
    "scss": CSS_TEMPLATES,
    "less": CSS_TEMPLATES,
    "sql": SQL_TEMPLATES,
}


def get_templates(language: str) -> list[Template]:
    """Return templates for the given language, falling back to TypeScript."""
    key = language.lower().strip()
    return LANGUAGE_TEMPLATES.get(key, TYPESCRIPT_TEMPLATES)


def match_templates(prefix: str, language: str, max_results: int = 5) -> list[tuple[Template, float]]:
    """Match templates against the end of the prefix text.

    Returns a list of ``(template, match_score)`` tuples sorted by score
    descending.  The *match_score* is the product of the template confidence
    and a heuristic score derived from how much of the prefix the trigger
    regex captures.

    Matching strategy:
    1. **Strict match** – trigger anchored to end-of-string (``\\s*$``).
    2. **Relaxed match** – trigger found in the tail, possibly followed by
       more text (e.g. ``match result `` still triggers the ``match`` template).
       Relaxed matches receive a small score penalty.
    """
    templates = get_templates(language)

    # Use the last ~200 chars of prefix for matching (keep it fast)
    tail = prefix[-200:] if len(prefix) > 200 else prefix

    scored: list[tuple[Template, float]] = []
    seen: set[int] = set()

    for tmpl in templates:
        # --- Strict: trigger must be at the very end of the prefix ---
        m = re.search(tmpl.trigger + r"\s*$", tail, re.IGNORECASE | re.MULTILINE)
        if m:
            match_len = len(m.group(0))
            position_bonus = 1.0 + (match_len / max(len(tail), 1)) * 0.3
            score = tmpl.confidence * min(position_bonus, 1.5)
            scored.append((tmpl, round(score, 4)))
            seen.add(id(tmpl))
            continue

        # --- Relaxed: trigger found anywhere in the tail ---
        m = re.search(tmpl.trigger, tail, re.IGNORECASE | re.MULTILINE)
        if m:
            # Position bonus: how close to the end of the tail
            match_end = m.end()
            proximity = match_end / max(len(tail), 1)  # 1.0 = at end
            if proximity < 0.4:
                continue  # Too far from the cursor position
            # Penalty for relaxed match (0.7×)
            score = tmpl.confidence * 0.7 * (0.6 + proximity * 0.4)
            scored.append((tmpl, round(score, 4)))
            seen.add(id(tmpl))

    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:max_results]
