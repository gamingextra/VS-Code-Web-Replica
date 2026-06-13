// Package main is the entry point for the VS Code Web Replica sandbox service.
// This service provides secure code execution in Docker containers with
// resource limits, network isolation, and real-time output streaming.
//
// The service exposes the following HTTP endpoints:
//   - POST /api/execute       — Execute code in a sandboxed container
//   - GET  /api/execute/:id   — Get the status of an execution
//   - GET  /api/execute/:id/stream — Stream execution output via SSE
//   - GET  /api/languages     — List supported programming languages
//   - GET  /health            — Health check endpoint
//
// Environment Variables:
//   - PORT              — HTTP server port (default: 3002)
//   - GIN_MODE          — Gin mode: debug, release, test (default: release)
//   - SANDBOX_MEMORY_MB — Container memory limit in MB (default: 512)
//   - SANDBOX_CPU_QUOTA — Container CPU quota in microseconds (default: 100000 = 1 core)
//   - SANDBOX_PIDS_LIMIT— Maximum PIDs per container (default: 100)
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vscode-replica/sandbox/api"
	"github.com/vscode-replica/sandbox/runner"
)

const (
	// DefaultPort is the default HTTP server port.
	DefaultPort = 3002

	// ShutdownTimeout is the maximum time to wait for graceful shutdown.
	ShutdownTimeout = 15 * time.Second
)

func main() {
	// Configure logging
	logger := log.New(os.Stdout, "[sandbox] ", log.LstdFlags|log.Lshortfile)
	logger.Println("Starting VS Code Replica Sandbox Service...")

	// Configure Gin mode
	ginMode := getEnv("GIN_MODE", "release")
	gin.SetMode(ginMode)

	// Create sandbox configuration
	sandboxConfig := buildSandboxConfig()
	logger.Printf("Sandbox config: Memory=%dMB, CPUQuota=%d, PidsLimit=%d, NetworkDisabled=%v",
		sandboxConfig.Constraints.MemoryLimitMB,
		sandboxConfig.Constraints.CPUQuota,
		sandboxConfig.Constraints.PidsLimit,
		sandboxConfig.NetworkDisabled,
	)

	// Initialize the code execution runner
	codeRunner, err := runner.NewRunner(sandboxConfig)
	if err != nil {
		logger.Fatalf("Failed to initialize runner: %v", err)
	}
	defer codeRunner.Close()

	logger.Println("Docker runner initialized successfully")

	// Create Gin engine
	engine := gin.New()

	// Middleware
	engine.Use(gin.Recovery())                 // Recover from panics
	engine.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/health"}, // Don't log health checks
	}))

	// CORS middleware for development
	engine.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Register API routes
	handler := api.NewHandler(codeRunner)
	handler.RegisterRoutes(engine)

	// Determine server port
	port := getEnvInt("PORT", DefaultPort)
	addr := fmt.Sprintf(":%d", port)

	// Create HTTP server
	server := &http.Server{
		Addr:         addr,
		Handler:      engine,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second, // Long timeout for SSE streaming
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Printf("Sandbox service listening on %s", addr)
		logger.Printf("Supported languages: %v", runner.GetSupportedLanguageIDs())

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	logger.Printf("Received signal %v, shutting down gracefully...", sig)

	// Give outstanding requests a deadline to complete
	ctx, cancel := context.WithTimeout(context.Background(), ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Printf("Server forced to shutdown: %v", err)
	}

	logger.Println("Sandbox service stopped")
}

// buildSandboxConfig creates the sandbox configuration from environment variables
// with sensible defaults.
func buildSandboxConfig() runner.SandboxConfig {
	config := runner.DefaultSandboxConfig()

	// Override from environment variables
	if memMB := getEnvInt64("SANDBOX_MEMORY_MB", 0); memMB > 0 {
		config.Constraints.MemoryLimitMB = memMB
	}
	if cpuQuota := getEnvInt64("SANDBOX_CPU_QUOTA", 0); cpuQuota > 0 {
		config.Constraints.CPUQuota = cpuQuota
	}
	if pidsLimit := getEnvInt64("SANDBOX_PIDS_LIMIT", 0); pidsLimit > 0 {
		config.Constraints.PidsLimit = pidsLimit
	}
	if defaultTimeout := getEnvInt("SANDBOX_DEFAULT_TIMEOUT", 0); defaultTimeout > 0 {
		config.Constraints.DefaultTimeoutSeconds = defaultTimeout
	}
	if maxTimeout := getEnvInt("SANDBOX_MAX_TIMEOUT", 0); maxTimeout > 0 {
		config.Constraints.MaxTimeoutSeconds = maxTimeout
	}

	return config
}

// getEnv returns the value of the environment variable named by the key,
// or the provided default value if the variable is not set or empty.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt returns the integer value of the environment variable named by the key,
// or the provided default value if the variable is not set, empty, or cannot be parsed.
func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("Warning: invalid integer value for env %s=%s, using default %d", key, value, defaultValue)
		return defaultValue
	}
	return intValue
}

// getEnvInt64 returns the int64 value of the environment variable named by the key,
// or the provided default value if the variable is not set, empty, or cannot be parsed.
func getEnvInt64(key string, defaultValue int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		log.Printf("Warning: invalid int64 value for env %s=%s, using default %d", key, value, defaultValue)
		return defaultValue
	}
	return intValue
}
