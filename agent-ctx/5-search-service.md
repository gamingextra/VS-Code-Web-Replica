# Task 5: Rust Heavy File Search / Indexing Service

## Agent: Backend Search Service Developer
## Status: ✅ COMPLETED
## Date: 2026-03-04

## Summary

Created a complete, production-ready Rust microservice for high-performance file indexing and search at `/home/z/my-project/backend/search/`. The service provides parallel file walking with .gitignore support, an in-memory inverted index for full-text search, multiple search modes (regex, case-sensitive, whole-word, fuzzy), trie-based filename autocomplete, and file watching for incremental reindexing.

## Files Created

### Core Source Files

| File | Description | Lines |
|------|-------------|-------|
| `Cargo.toml` | Package manifest with all dependencies (axum, tokio, rayon, dashmap, notify, regex, etc.) | ~60 |
| `src/main.rs` | Entry point: Axum HTTP server on port 3003, file watcher, graceful shutdown, tracing setup | ~210 |
| `src/indexer.rs` | FileIndexer struct: parallel walking (ignore crate), inverted index (DashMap), file metadata, .gitignore support, tokenization with camelCase splitting | ~420 |
| `src/searcher.rs` | SearchEngine struct: case-insensitive/sensitive/whole-word/regex/fuzzy search, filename search, autocomplete suggestions | ~340 |
| `src/trie.rs` | Trie data structure: insert, search, starts_with, collect_suggestions with relevance ranking, remove | ~280 |
| `src/api.rs` | Axum route handlers: POST /api/search, POST /api/search/filenames, GET /api/search/suggest, POST /api/index, GET /api/index/stats, GET /health | ~230 |

### Infrastructure Files

| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build (rust:1.77-slim-bookworm builder → debian:bookworm-slim runtime), non-root user, health check |
| `.dockerignore` | Excludes target/, .git/, IDE files from Docker context |
| `Makefile` | Convenience targets: build, dev, run, test, clean, docker-build, docker-run |

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│  File Watcher│───▶│  File Indexer │◀───│  HTTP Server   │
│  (notify)    │    │  (inverted idx│    │  (Axum :3003)  │
└─────────────┘    │   + trie)     │    └───────┬───────┘
                     └──────┬───────┘            │
                     ┌──────▼───────┐    ┌───────▼───────┐
                     │ Search Engine │◀───│  API Handlers  │
                     │ (regex/fuzzy)│    │  (api.rs)     │
                     └──────────────┘    └───────────────┘
```

## Key Design Decisions

1. **DashMap for inverted index**: Lock-free concurrent hashmap enables parallel indexing without blocking reads
2. **Rayon for parallelism**: File indexing uses `par_iter()` to process files across all CPU cores
3. **ignore crate for walking**: Respects .gitignore, .ignore, and global gitignore patterns natively
4. **Token-level + prefix indexing**: Inverted index stores both exact tokens and 3-7 char prefixes for fast prefix matching
5. **camelCase splitting**: Sub-tokens generated for identifiers (e.g., `ButtonComponent` → `["button", "component"]`)
6. **Arc<str> / Arc<FileIndexer>**: Shared ownership with zero-copy where possible
7. **Debounced file watching**: 500ms debounce interval prevents excessive reindexing during bulk operations
8. **Memory guards**: MAX_FILE_SIZE (1MB), MAX_LINES_PER_FILE (50K), binary detection via NUL byte scanning

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with version info |
| POST | `/api/search` | Full-text search with options (match_case, whole_word, use_regex, file_types) |
| POST | `/api/search/filenames` | Filename search with prefix/substring matching |
| GET | `/api/search/suggest?q=prefix` | Autocomplete suggestions via trie |
| POST | `/api/index` | Trigger reindex (full or single file) |
| GET | `/api/index/stats` | Index statistics (file count, token count, memory, languages) |

## How to Build & Run

```bash
# Native build
cd backend/search
cargo build --release
WORKSPACE_PATH=/path/to/workspace RUST_LOG=info ./target/release/vscode-search-service

# Docker build
docker build -t vscode-search-service .
docker run -p 3003:3003 -v /path/to/workspace:/workspace vscode-search-service
```

## Dependencies

- **axum 0.7** — HTTP framework with macros
- **tokio 1** — Async runtime (full features)
- **rayon 1.10** — Data parallelism for file indexing
- **dashmap 6** — Concurrent hashmap for inverted index
- **ignore 0.4** — .gitignore-aware directory walking
- **notify 6** — File system watching
- **regex 1** — Regular expression search
- **serde/serde_json** — JSON serialization
- **tracing/tracing-subscriber** — Structured logging
- **tower-http** — CORS and tracing middleware
- **parking_lot** — Efficient RwLock for metadata and trie
- **chrono** — Timestamp handling
