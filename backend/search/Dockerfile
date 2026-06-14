# =============================================================================
# Multi-stage Dockerfile for VS Code Search Service
# =============================================================================
# This Dockerfile builds the Rust search service in two stages:
#
#   1. Builder stage: Compiles the Rust binary with all optimizations
#   2. Runtime stage: Creates a minimal image with only the compiled binary
#
# Build:  docker build -t vscode-search-service .
# Run:    docker run -p 3003:3003 -v /path/to/workspace:/workspace vscode-search-service
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the Rust binary
# ---------------------------------------------------------------------------
FROM rust:1.77-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a new empty shell project for dependency caching
WORKDIR /usr/src/vscode-search-service

# Copy manifests first for layer caching
COPY Cargo.toml Cargo.lock* ./

# Create a dummy main.rs to build dependencies first (layer cache optimization)
RUN mkdir src && \
    echo "fn main() { println!(\"Dependency build cache\"); }" > src/main.rs

# Build dependencies only (this layer is cached unless Cargo.toml changes)
RUN cargo build --release 2>/dev/null || true

# Now copy the actual source code
COPY src/ ./src/

# Touch the source files to force recompilation of our code (not dependencies)
RUN find src -name "*.rs" -exec touch {} +

# Build the actual binary
RUN cargo build --release

# Strip the binary for minimal size
RUN strip target/release/vscode-search-service || true

# ---------------------------------------------------------------------------
# Stage 2: Create the minimal runtime image
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies (only what's needed for the compiled binary)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd -r searchuser && \
    useradd -r -g searchuser -s /bin/false searchuser

# Copy the compiled binary from the builder stage
COPY --from=builder \
    /usr/src/vscode-search-service/target/release/vscode-search-service \
    /usr/local/bin/vscode-search-service

# Create the workspace mount point
RUN mkdir -p /workspace && \
    chown searchuser:searchuser /workspace

# Set environment variables
ENV RUST_LOG=info
ENV PORT=3003
ENV WORKSPACE_PATH=/workspace

# Expose the HTTP API port
EXPOSE 3003

# Switch to the non-root user
USER searchuser

# Set the working directory
WORKDIR /workspace

# Health check: verify the service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Run the search service
ENTRYPOINT ["vscode-search-service"]
