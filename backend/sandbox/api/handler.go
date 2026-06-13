// Package api provides HTTP handlers for the sandbox code execution service.
// It exposes REST endpoints for submitting code execution requests, querying
// execution status, and streaming output via Server-Sent Events (SSE).
package api

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vscode-replica/sandbox/runner"
)

// Handler manages HTTP API endpoints for the sandbox service.
// It delegates code execution to the Runner and handles request
// validation, response formatting, and error handling.
type Handler struct {
	// runner is the code execution engine.
	runner *runner.Runner

	// logger is the structured logger for API operations.
	logger *log.Logger
}

// NewHandler creates a new API handler with the given Runner.
func NewHandler(r *runner.Runner) *Handler {
	return &Handler{
		runner: r,
		logger: log.New(gin.DefaultWriter, "[api] ", log.LstdFlags|log.Lshortfile),
	}
}

// ExecuteResponse is the response body for POST /api/execute.
type ExecuteResponse struct {
	// ID is the unique execution identifier.
	ID string `json:"id"`

	// Status is the current execution status.
	Status runner.ExecutionStatus `json:"status"`

	// Output contains the combined stdout output.
	Output string `json:"output"`

	// Error contains any error messages.
	Error string `json:"error,omitempty"`

	// ExitCode is the process exit code.
	ExitCode int `json:"exitCode"`

	// ExecutionTime is the wall-clock execution time in milliseconds.
	ExecutionTime int64 `json:"executionTime"`

	// Language is the programming language that was executed.
	Language string `json:"language"`
}

// ExecuteResultResponse is the response body for GET /api/execute/:id.
type ExecuteResultResponse struct {
	// ID is the unique execution identifier.
	ID string `json:"id"`

	// Status is the current execution status.
	Status runner.ExecutionStatus `json:"status"`

	// Output contains the combined stdout output.
	Output string `json:"output"`

	// Error contains any error messages.
	Error string `json:"error,omitempty"`

	// ExitCode is the process exit code.
	ExitCode int `json:"exitCode"`

	// ExecutionTime is the wall-clock execution time in milliseconds.
	ExecutionTime int64 `json:"executionTime"`

	// Language is the programming language that was executed.
	Language string `json:"language"`

	// CreatedAt is the timestamp when the execution was created.
	CreatedAt time.Time `json:"createdAt"`

	// FinishedAt is the timestamp when the execution completed.
	FinishedAt time.Time `json:"finishedAt,omitempty"`
}

// HealthResponse is the response body for GET /health.
type HealthResponse struct {
	// Status is the health status ("ok" or "degraded").
	Status string `json:"status"`

	// Timestamp is the current server time.
	Timestamp time.Time `json:"timestamp"`

	// UptimeSeconds is the server uptime in seconds.
	UptimeSeconds int64 `json:"uptimeSeconds"`

	// SupportedLanguages lists the languages available for execution.
	SupportedLanguages []string `json:"supportedLanguages"`

	// Version is the service version.
	Version string `json:"version"`
}

// ErrorResponse is the standard error response body.
type ErrorResponse struct {
	// Error is the error message.
	Error string `json:"error"`

	// Code is the HTTP status code.
	Code int `json:"code"`

	// Details is an optional detailed error description.
	Details string `json:"details,omitempty"`
}

// ServiceStartTime records when the service was started.
var ServiceStartTime = time.Now()

// Version is the current service version.
const Version = "1.0.0"

// RegisterRoutes registers all API routes on the given Gin engine.
func (h *Handler) RegisterRoutes(engine *gin.Engine) {
	// Code execution endpoints
	engine.POST("/api/execute", h.Execute)
	engine.GET("/api/execute/:id", h.GetExecution)
	engine.GET("/api/execute/:id/stream", h.StreamExecution)

	// Health and info endpoints
	engine.GET("/health", h.HealthCheck)

	// Language info endpoint
	engine.GET("/api/languages", h.GetLanguages)
}

// Execute handles POST /api/execute.
// It accepts a code execution request, validates it, runs the code in a sandbox,
// and returns the execution result.
//
// Request body:
//
//	{
//	  "code": "console.log('hello')",   // required
//	  "language": "javascript",          // required
//	  "timeout": 10,                     // optional, seconds
//	  "stdin": "",                       // optional
//	  "stream": false                    // optional, if true use SSE streaming
//	}
//
// Response:
//
//	{
//	  "id": "uuid",
//	  "status": "completed",
//	  "output": "hello\n",
//	  "error": "",
//	  "exitCode": 0,
//	  "executionTime": 123,
//	  "language": "javascript"
//	}
func (h *Handler) Execute(c *gin.Context) {
	var req runner.ExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Invalid request body",
			Code:  http.StatusBadRequest,
			Details: fmt.Sprintf("Failed to parse request: %v. Required fields: code (string), language (string). "+
				"Optional: timeout (int, seconds), stdin (string)", err),
		})
		return
	}

	// Validate code is not empty
	if req.Code == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Code cannot be empty",
			Code:    http.StatusBadRequest,
			Details: "The 'code' field must contain the source code to execute",
		})
		return
	}

	// Validate language is supported
	if _, ok := runner.GetLanguageConfig(req.Language); !ok {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   fmt.Sprintf("Unsupported language: %s", req.Language),
			Code:    http.StatusBadRequest,
			Details: fmt.Sprintf("Supported languages: %v", runner.GetSupportedLanguageIDs()),
		})
		return
	}

	// Validate code size (max 1MB)
	if len(req.Code) > 1024*1024 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Code too large",
			Code:    http.StatusBadRequest,
			Details: fmt.Sprintf("Maximum code size is 1MB, got %d bytes", len(req.Code)),
		})
		return
	}

	// Validate timeout if specified
	if req.Timeout < 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid timeout",
			Code:    http.StatusBadRequest,
			Details: "Timeout must be a positive number in seconds",
		})
		return
	}

	h.logger.Printf("Execute request: language=%s, code_length=%d, timeout=%d",
		req.Language, len(req.Code), req.Timeout)

	// Execute the code
	result, err := h.runner.Execute(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Execution failed",
			Code:    http.StatusInternalServerError,
			Details: err.Error(),
		})
		return
	}

	// Return the result
	c.JSON(http.StatusOK, ExecuteResponse{
		ID:            result.ID,
		Status:        result.Status,
		Output:        result.Output,
		Error:         result.Error,
		ExitCode:      result.ExitCode,
		ExecutionTime: result.ExecutionTime,
		Language:      result.Language,
	})
}

// GetExecution handles GET /api/execute/:id.
// It returns the status and result of a previously submitted execution.
//
// Path parameters:
//   - id: The execution ID returned by POST /api/execute
//
// Response:
//
//	{
//	  "id": "uuid",
//	  "status": "completed",
//	  "output": "hello\n",
//	  "error": "",
//	  "exitCode": 0,
//	  "executionTime": 123,
//	  "language": "javascript",
//	  "createdAt": "2024-01-01T00:00:00Z",
//	  "finishedAt": "2024-01-01T00:00:01Z"
//	}
func (h *Handler) GetExecution(c *gin.Context) {
	execID := c.Param("id")
	if execID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Missing execution ID",
			Code:  http.StatusBadRequest,
		})
		return
	}

	result := h.runner.GetResult(execID)
	if result == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Execution not found",
			Code:    http.StatusNotFound,
			Details: fmt.Sprintf("No execution with ID: %s", execID),
		})
		return
	}

	c.JSON(http.StatusOK, ExecuteResultResponse{
		ID:            result.ID,
		Status:        result.Status,
		Output:        result.Output,
		Error:         result.Error,
		ExitCode:      result.ExitCode,
		ExecutionTime: result.ExecutionTime,
		Language:      result.Language,
		CreatedAt:     result.CreatedAt,
		FinishedAt:    result.FinishedAt,
	})
}

// StreamExecution handles GET /api/execute/:id/stream.
// It streams execution output in real-time using Server-Sent Events (SSE).
//
// The SSE events have the following format:
//   - event: output   (contains stdout or stderr data)
//   - event: status   (contains status updates)
//   - event: complete (sent when execution finishes)
//   - event: error    (sent on error)
//
// Each event's data field contains a JSON object:
//
//	{"type": "stdout|stderr", "data": "..."}
func (h *Handler) StreamExecution(c *gin.Context) {
	execID := c.Param("id")
	if execID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Missing execution ID",
			Code:  http.StatusBadRequest,
		})
		return
	}

	// Check if execution exists
	result := h.runner.GetResult(execID)
	if result == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "Execution not found",
			Code:    http.StatusNotFound,
			Details: fmt.Sprintf("No execution with ID: %s", execID),
		})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// If already completed, send final result and close
	if result.Status == runner.StatusCompleted ||
		result.Status == runner.StatusError ||
		result.Status == runner.StatusTimeout ||
		result.Status == runner.StatusCancelled {
		c.SSEvent("complete", ExecuteResultResponse{
			ID:            result.ID,
			Status:        result.Status,
			Output:        result.Output,
			Error:         result.Error,
			ExitCode:      result.ExitCode,
			ExecutionTime: result.ExecutionTime,
			Language:      result.Language,
			CreatedAt:     result.CreatedAt,
			FinishedAt:    result.FinishedAt,
		})
		return
	}

	// Subscribe to output stream
	ch := h.runner.Subscribe(execID)
	defer h.runner.Unsubscribe(execID, ch)

	// Send initial status
	c.SSEvent("status", map[string]string{
		"id":     execID,
		"status": string(result.Status),
	})

	c.Writer.Flush()

	// Stream output chunks
	for chunk := range ch {
		select {
		case <-c.Request.Context().Done():
			// Client disconnected
			h.logger.Printf("SSE client disconnected for execution %s", execID)
			return
		default:
		}

		c.SSEvent("output", chunk)
		c.Writer.Flush()
	}

	// Send completion event with final result
	finalResult := h.runner.GetResult(execID)
	if finalResult != nil {
		c.SSEvent("complete", ExecuteResultResponse{
			ID:            finalResult.ID,
			Status:        finalResult.Status,
			Output:        finalResult.Output,
			Error:         finalResult.Error,
			ExitCode:      finalResult.ExitCode,
			ExecutionTime: finalResult.ExecutionTime,
			Language:      finalResult.Language,
			CreatedAt:     finalResult.CreatedAt,
			FinishedAt:    finalResult.FinishedAt,
		})
		c.Writer.Flush()
	}
}

// HealthCheck handles GET /health.
// It returns the service health status, uptime, and supported languages.
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:            "ok",
		Timestamp:         time.Now(),
		UptimeSeconds:     int64(time.Since(ServiceStartTime).Seconds()),
		SupportedLanguages: runner.GetSupportedLanguageIDs(),
		Version:           Version,
	})
}

// LanguageInfo describes a supported programming language.
type LanguageInfo struct {
	// ID is the language identifier used in API requests.
	ID string `json:"id"`

	// Name is the display name of the language.
	Name string `json:"name"`

	// Image is the Docker image used for execution.
	Image string `json:"image"`

	// DefaultTimeoutSeconds is the default timeout for this language.
	DefaultTimeoutSeconds int `json:"defaultTimeoutSeconds"`

	// MaxTimeoutSeconds is the maximum allowed timeout.
	MaxTimeoutSeconds int `json:"maxTimeoutSeconds"`

	// NeedsCompile indicates whether the language requires compilation.
	NeedsCompile bool `json:"needsCompile"`
}

// GetLanguages handles GET /api/languages.
// It returns a list of all supported programming languages with their configurations.
func (h *Handler) GetLanguages(c *gin.Context) {
	languages := make([]LanguageInfo, 0)
	for id, config := range runner.SupportedLanguages {
		languages = append(languages, LanguageInfo{
			ID:                    id,
			Name:                  config.Name,
			Image:                 config.Image,
			DefaultTimeoutSeconds: config.DefaultTimeoutSeconds,
			MaxTimeoutSeconds:     config.MaxTimeoutSeconds,
			NeedsCompile:          config.NeedsCompile,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"languages": languages,
		"count":     len(languages),
	})
}
