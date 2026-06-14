# =============================================================================
# Makefile for VS Code Search Service
# =============================================================================

.PHONY: build run dev test clean docker-build docker-run help

# Default target
help:
	@echo "VS Code Search Service - Available targets:"
	@echo ""
	@echo "  build         Build the service in release mode"
	@echo "  dev           Build and run in development mode"
	@echo "  run           Run the release binary"
	@echo "  test          Run tests"
	@echo "  clean         Remove build artifacts"
	@echo "  docker-build  Build the Docker image"
	@echo "  docker-run    Run the Docker container"

# Build the release binary
build:
	cargo build --release

# Build and run in development mode (with debug symbols and logging)
dev:
	RUST_LOG=debug cargo run

# Run the release binary
run: build
	RUST_LOG=info ./target/release/vscode-search-service

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Build Docker image
docker-build:
	docker build -t vscode-search-service .

# Run Docker container
# Mount the current workspace directory for indexing
docker-run:
	docker run -d \
		--name vscode-search \
		-p 3003:3003 \
		-v $(PWD)/../../:/workspace:ro \
		vscode-search-service

# Stop and remove Docker container
docker-stop:
	docker stop vscode-search && docker rm vscode-search
