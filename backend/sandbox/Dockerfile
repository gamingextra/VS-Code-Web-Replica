# =============================================================================
# Multi-stage Dockerfile for VS Code Web Replica Sandbox Service
# =============================================================================
# This Dockerfile builds the Go sandbox service and packages it in a minimal
# runtime image with Docker CLI access for container management.
#
# Build: docker build -t vscode-sandbox .
# Run:   docker run -d -p 3002:3002 -v /var/run/docker.sock:/var/run/docker.sock vscode-sandbox
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the Go binary
# ---------------------------------------------------------------------------
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum first for better layer caching
COPY go.mod go.sum* ./

# Download dependencies (this layer is cached if go.mod/go.sum don't change)
RUN go mod download || go mod tidy

# Copy the source code
COPY . .

# Build the binary with optimizations
# - CGO_ENABLED=0: Static binary, no C dependencies
# - -ldflags="-s -w": Strip debug info and symbol table for smaller binary
# - -trimpath: Remove local file system paths from the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /sandbox-service \
    .

# ---------------------------------------------------------------------------
# Stage 2: Create the minimal runtime image
# ---------------------------------------------------------------------------
FROM alpine:3.19

# Install runtime dependencies
# - ca-certificates: For HTTPS connections to Docker registries
# - tzdata: For timezone support
# - docker-cli: For communicating with the Docker daemon
# - curl: For health checks
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    docker-cli \
    curl

# Create a non-root user for running the service
RUN addgroup -g 1000 -S sandbox && \
    adduser -u 1000 -S sandbox -G sandbox

# Set the working directory
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /sandbox-service /app/sandbox-service

# Make the binary executable
RUN chmod +x /app/sandbox-service

# Create directory for temporary sandbox files
RUN mkdir -p /tmp/sandbox && \
    chown -R sandbox:sandbox /tmp/sandbox /app

# Switch to non-root user
USER sandbox

# Expose the service port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Environment variables with defaults
ENV PORT=3002 \
    GIN_MODE=release \
    SANDBOX_MEMORY_MB=512 \
    SANDBOX_CPU_QUOTA=100000 \
    SANDBOX_PIDS_LIMIT=100 \
    SANDBOX_DEFAULT_TIMEOUT=10 \
    SANDBOX_MAX_TIMEOUT=120

# Metadata labels
LABEL maintainer="VS Code Web Replica Team" \
      version="1.0.0" \
      description="Secure code execution sandbox service for VS Code Web Replica" \
      service="sandbox"

# Run the service
ENTRYPOINT ["/app/sandbox-service"]
