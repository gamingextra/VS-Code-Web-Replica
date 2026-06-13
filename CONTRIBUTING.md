# Contributing to VS Code Web Replica

First off, thank you for considering contributing to VS Code Web Replica! It is people like you who make this project better for everyone.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Adding Backend Services](#adding-backend-services)
- [Adding Frontend Components](#adding-frontend-components)
- [Testing Guidelines](#testing-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by basic principles of respect and collaboration. Please be considerate, constructive, and inclusive in all interactions.

---

## How Can I Contribute?

### Types of Contributions

| Type | Examples |
|------|----------|
| **Bug Fixes** | Fix rendering issues, resolve API errors, correct state management bugs |
| **Features** | New sidebar views, editor enhancements, terminal commands, themes |
| **Backend Services** | New microservices, performance improvements, new API endpoints |
| **Documentation** | README improvements, API docs, architecture diagrams, code comments |
| **Responsive Design** | Mobile layout fixes, touch interaction improvements, breakpoint adjustments |
| **Testing** | Unit tests, integration tests, E2E tests |
| **Performance** | Bundle size reduction, lazy loading, search indexing optimization |

---

## Development Setup

### Prerequisites

Ensure you have the following tools installed:

```bash
# Required
node --version    # >= 18.x
bun --version     # >= 1.0 (recommended) or npm/yarn/pnpm
go version        # >= 1.21 (for sandbox service)
rustc --version   # >= 1.70 (for search service)
python --version  # >= 3.11 (for copilot service)
docker --version  # >= 24.0 (for containerized execution)
```

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/VS-Code-Web-Replica.git
cd VS-Code-Web-Replica

# Add upstream remote
git remote add upstream https://github.com/gamingextra/VS-Code-Web-Replica.git

# Switch to the development branch
git checkout feature/code-server-enhancements
```

### Install Dependencies

```bash
# Frontend dependencies
bun install

# Backend services (install dependencies individually)
cd mini-services/core-api && bun install && cd ../..
cd backend/copilot && pip install -r requirements.txt && cd ../..
```

### Start Development Environment

```bash
# Terminal 1: Frontend
bun dev

# Terminal 2: Backend services (auto-detects available runtimes)
./start-backend.sh

# Or start services individually:
# Core API:     cd mini-services/core-api && bun run index.ts
# Sandbox:      cd backend/sandbox && go run .
# Search:       cd backend/search && cargo run --release
# Copilot:      cd backend/copilot && python main.py
```

---

## Project Architecture

Understanding the architecture is crucial for effective contributions. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete architecture documentation.

**Key Principles:**
- **Microservices** — Each backend service is independent with its own technology stack
- **Graceful Degradation** — Every backend feature has a client-side fallback
- **State Isolation** — Zustand stores are domain-specific and independent
- **Type Safety** — TypeScript strict mode across the entire frontend
- **Component Composition** — Small, focused components composed into complex layouts

---

## Coding Standards

### TypeScript / React

```typescript
// Use functional components with explicit return types
export function MyComponent({ prop }: MyComponentProps): JSX.Element {
  // ...
}

// Use Zustand stores with typed slices
interface MyStoreState {
  items: Item[];
  addItem: (item: Item) => void;
}

const useMyStore = create<MyStoreState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));

// Use CSS custom properties for theming (not hardcoded colors)
<div className="bg-[var(--vs-bg-sidebar)]" />

// Use the cn() utility for conditional classes
import { cn } from '@/lib/utils';
<div className={cn('flex items-center', isActive && 'bg-[var(--vs-accent)]')} />
```

### Component Structure

```typescript
// 1. Imports (grouped: react, external, internal, types)
import { useState, useCallback } from 'react';
import { SomeIcon } from 'lucide-react';
import { useMyStore } from '@/store/myStore';
import type { MyItem } from '@/types';

// 2. Types
interface MyComponentProps {
  items: MyItem[];
  onSelect?: (item: MyItem) => void;
}

// 3. Component
export function MyComponent({ items, onSelect }: MyComponentProps): JSX.Element {
  // Hooks at the top
  const [isOpen, setIsOpen] = useState(false);
  const addItem = useMyStore((s) => s.addItem);

  // Event handlers
  const handleClick = useCallback((item: MyItem) => {
    onSelect?.(item);
  }, [onSelect]);

  // Render
  return (
    <div className="flex flex-col">
      {/* ... */}
    </div>
  );
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `EditorArea.tsx`, `TabBar.tsx` |
| Stores | camelCase with `use` prefix | `useEditorStore`, `useThemeStore` |
| Hooks | camelCase with `use` prefix | `useKeyboardShortcuts`, `useSwipeGesture` |
| CSS Variables | `--vs-{category}-{name}` | `--vs-bg-main`, `--vs-accent` |
| API Routes | kebab-case | `/api/core/execute`, `/api/search` |
| Files | PascalCase for components, camelCase for utilities | `TitleBar.tsx`, `api-client.ts` |

### CSS / Theming Rules

1. **Always use CSS custom properties** for colors — never hardcode hex values in components
2. **Use Tailwind utility classes** with `var()` references:
   ```html
   <div className="bg-[var(--vs-bg-sidebar)] text-[var(--vs-fg-primary)]" />
   ```
3. **Add new theme variables** to all 5 themes in `globals.css`
4. **Mobile-first responsive design** — use `md:` and `lg:` prefixes for larger screens
5. **Touch targets** — minimum 44×44px for interactive elements

### Go (Sandbox Service)

```go
// Follow standard Go project layout
// Use meaningful error wrapping
if err != nil {
    return fmt.Errorf("failed to create container: %w", err)
}

// Use structured configuration via environment variables
type Config struct {
    MemoryMB  int    `env:"SANDBOX_MEMORY_MB" envDefault:"512"`
    CPUQuota  int64  `env:"SANDBOX_CPU_QUOTA" envDefault:"100000"`
    Port      string `env:"SANDBOX_PORT" envDefault:"3002"`
}
```

### Rust (Search Service)

```rust
// Use Axum extractors for clean API handlers
async fn search_files(
    State(state): State<Arc<AppState>>,
    Json(query): Json<SearchQuery>,
) -> Json<SearchResponse> {
    // ...
}

// Use proper error types
#[derive(Debug, thiserror::Error)]
enum SearchError {
    #[error("index not initialized")]
    NotInitialized,
    #[error("invalid regex: {0}")]
    InvalidRegex(#[from] regex::Error),
}
```

### Python (Copilot Service)

```python
# Use Pydantic models for all API schemas
class CompletionRequest(BaseModel):
    file_path: str
    language: str
    prefix: str
    suffix: str = ""
    cursor_position: int = 0

# Use async endpoints for streaming
@router.post("/completions/stream")
async def stream_completions(request: CompletionRequest):
    async def generate():
        # yield SSE events
        yield f"data: {json.dumps(chunk)}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

## Git Workflow

### Branch Strategy

```
main                           ← Production-ready code only
  └── feature/code-server-enhancements  ← Active development branch
        ├── feature/my-new-feature      ← Your feature branch
        ├── fix/bug-description          ← Bug fix branch
        └── docs/documentation-update    ← Documentation branch
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(editor): add minimap toggle` |
| `fix` | Bug fix | `fix(sidebar): resolve swipe gesture on iOS` |
| `docs` | Documentation | `docs(readme): add API reference section` |
| `style` | Formatting, no code change | `style(terminal): fix indentation` |
| `refactor` | Code restructuring | `refactor(stores): extract common store patterns` |
| `perf` | Performance improvement | `perf(search): optimize trie traversal` |
| `test` | Adding tests | `feat(editor): add tab management tests` |
| `chore` | Build, tooling | `chore(docker): update Go base image` |

### Commit Best Practices

1. **Small, focused commits** — Each commit should do one thing
2. **Write clear subjects** — Imperative mood, under 72 characters
3. **Include context in body** — Explain "why" not just "what"
4. **Reference issues** — `Fixes #123` or `Relates to #456`

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors (`bun run build`)
- [ ] Linting passes (`bun run lint`)
- [ ] All existing functionality still works
- [ ] New features include appropriate fallback behavior
- [ ] Mobile responsiveness is maintained
- [ ] Theme variables are added to all 5 themes
- [ ] API changes are reflected in `api-client.ts`
- [ ] Documentation is updated if needed

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe how you tested this change.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] Mobile responsiveness is preserved
```

### Review Process

1. Submit PR against the `feature/code-server-enhancements` branch
2. At least one review is required before merging
3. Address all review comments
4. Ensure CI passes (if applicable)
5. Squash merge is preferred for feature branches

---

## Reporting Bugs

### Bug Report Template

```markdown
**Description:** A clear description of the bug.

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:** What you expected to happen.

**Actual Behavior:** What actually happened.

**Environment:**
- Browser: [e.g., Chrome 120]
- Device: [e.g., iPhone 15, Desktop]
- Screen Size: [e.g., 1920x1080]
- Theme: [e.g., Dark+]

**Screenshots:** If applicable.

**Console Errors:** Any relevant error messages from the browser console.
```

### Common Bug Areas

| Area | Known Issues |
|------|-------------|
| Mobile Layout | Virtual keyboard may overlap editor on some Android devices |
| Terminal | Some complex Unix pipes may not work as expected |
| Monaco Editor | Split pane focus may not follow mouse on touch devices |
| WebSocket | Reconnection may require manual page refresh after network interruption |

---

## Suggesting Features

### Feature Request Template

```markdown
**Problem:** What problem does this feature solve?

**Proposed Solution:** How should it work?

**Alternatives Considered:** Other approaches you have thought about.

**Additional Context:** Screenshots, mockups, or references to VS Code's implementation.

**Affected Components:** Which parts of the application would this touch?
- [ ] Frontend (React components)
- [ ] State management (Zustand stores)
- [ ] API routes
- [ ] Backend services (specify which)
- [ ] Responsive design
- [ ] Theming
```

### Priority Areas for Contributions

These are areas where we especially welcome contributions:

1. **xterm.js Integration** — Replace simulated terminal with a real terminal emulator
2. **File Upload/Download** — Drag-and-drop file upload and file download functionality
3. **Git Operations** — Real Git operations (clone, push, pull, diff) instead of simulation
4. **Extension Marketplace** — Load and run real VS Code extensions
5. **Workspace Persistence** — Save and restore workspace state across sessions
6. **Remote Connection** — SSH/remote development capabilities
7. **Cross-File Search** — Search across all files in workspace with result navigation
8. **Drag and Drop** — Tab reordering, file moving via drag and drop
9. **Breadcrumbs** — Editor breadcrumb navigation for symbol hierarchy
10. **Minimap** — Code minimap with viewport indicator

---

## Adding Backend Services

When adding a new backend microservice, follow this checklist:

### 1. Create the Service Directory

```
backend/
└── my-service/
    ├── main.py / main.go / src/main.rs   # Entry point
    ├── Dockerfile                          # Multi-stage build
    ├── Makefile                            # Build automation (optional)
    └── README.md                           # Service-specific docs
```

### 2. Implement Health Endpoint

Every service must expose `GET /health`:

```json
{
  "status": "healthy",
  "service": "my-service",
  "version": "1.0.0",
  "uptime": 3600
}
```

### 3. Add to Docker Compose

```yaml
my-service:
  build:
    context: ./backend/my-service
  ports:
    - "3005:3005"
  networks:
    - vscode-net
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 4. Add API Proxy Route

Create `src/app/api/core/my-service/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch('http://localhost:3005/api/my-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
```

### 5. Update Core API Service Registry

Add the new service to the health check registry in `mini-services/core-api/index.ts`.

### 6. Add Client-Side Fallback

Ensure the feature degrades gracefully when the service is unavailable by adding fallback logic in the relevant Zustand store or `api-client.ts`.

---

## Adding Frontend Components

### Component Checklist

1. **Create the component file** in the appropriate directory:
   - Layout → `src/components/layout/`
   - Sidebar view → `src/components/sidebar/`
   - Panel → `src/components/panel/`
   - Standalone → `src/components/`

2. **Use CSS custom properties** for all colors — never hardcode hex values

3. **Ensure responsive design**:
   ```tsx
   // Good: responsive with CSS variables
   <div className="flex flex-col md:flex-row bg-[var(--vs-bg-main)] p-2 md:p-4">
     <button className="h-11 w-11 md:h-8 md:w-8 min-h-[44px] md:min-h-0">
       Click
     </button>
   </div>
   ```

4. **Add touch support** for interactive elements:
   ```tsx
   // Minimum 44px touch target on mobile
   <button className="h-[44px] w-[44px] md:h-auto md:w-auto">
     <SomeIcon className="h-5 w-5" />
   </button>
   ```

5. **Update the relevant Zustand store** if the component needs shared state

6. **Add keyboard shortcut** if the component has a toggle/action

7. **Test across all 5 themes** — Dark+, Light+, Monokai, Solarized Dark, GitHub

---

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, manually verify:

- [ ] **Desktop (1920×1080)** — Full layout renders correctly
- [ ] **Tablet (768×1024)** — Compact sidebar mode works
- [ ] **Mobile (375×667)** — Overlay sidebar, bottom nav, touch interactions
- [ ] **All Themes** — Component renders correctly in all 5 themes
- [ ] **Keyboard Navigation** — Tab order makes sense, shortcuts work
- [ ] **Backend Offline** — Feature degrades gracefully when backend is down
- [ ] **Console Clean** — No errors or warnings in browser console

### Testing Backend Services

```bash
# Test Core API health
curl http://localhost:3001/health

# Test Search service
curl -X POST http://localhost:3003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

# Test Sandbox execution
curl -X POST http://localhost:3002/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"hello\")", "language": "python"}'

# Test Copilot completions
curl -X POST http://localhost:3004/api/completions \
  -H "Content-Type: application/json" \
  -d '{"file_path": "test.ts", "language": "typescript", "prefix": "function add() "}'
```

---

Thank you for contributing to VS Code Web Replica! Your efforts help make this project a valuable tool for developers everywhere.
