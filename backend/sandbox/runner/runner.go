// Package runner provides the code execution engine for the sandbox service.
// This file implements the core Runner that manages Docker container lifecycle
// for secure code execution, including container creation, start, output streaming,
// timeout enforcement, and cleanup.
package runner

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/google/uuid"
)

// ExecutionStatus represents the current state of a code execution.
type ExecutionStatus string

const (
	// StatusPending indicates the execution is queued but not yet started.
	StatusPending ExecutionStatus = "pending"

	// StatusRunning indicates the execution is currently in progress.
	StatusRunning ExecutionStatus = "running"

	// StatusCompleted indicates the execution finished successfully.
	StatusCompleted ExecutionStatus = "completed"

	// StatusError indicates the execution failed with an error.
	StatusError ExecutionStatus = "error"

	// StatusTimeout indicates the execution exceeded the time limit.
	StatusTimeout ExecutionStatus = "timeout"

	// StatusCancelled indicates the execution was cancelled by the user.
	StatusCancelled ExecutionStatus = "cancelled"
)

// ExecutionResult holds the complete result of a code execution.
type ExecutionResult struct {
	// ID is the unique identifier for this execution.
	ID string `json:"id"`

	// Language is the programming language used for execution.
	Language string `json:"language"`

	// Status is the current execution status.
	Status ExecutionStatus `json:"status"`

	// Output contains the combined stdout output from the execution.
	Output string `json:"output"`

	// Error contains any error output (stderr) from the execution.
	// This is empty for successful executions.
	Error string `json:"error,omitempty"`

	// ExitCode is the process exit code. 0 indicates success.
	// -1 indicates the container was killed (timeout or error).
	ExitCode int `json:"exitCode"`

	// ExecutionTime is the wall-clock execution time in milliseconds.
	ExecutionTime int64 `json:"executionTime"`

	// CreatedAt is the timestamp when the execution was created.
	CreatedAt time.Time `json:"createdAt"`

	// FinishedAt is the timestamp when the execution completed.
	// Zero value indicates the execution is still running.
	FinishedAt time.Time `json:"finishedAt,omitempty"`
}

// ExecutionRequest contains the parameters for a code execution request.
type ExecutionRequest struct {
	// Code is the source code to execute.
	Code string `json:"code" binding:"required"`

	// Language is the programming language of the code.
	Language string `json:"language" binding:"required"`

	// Timeout is the execution timeout in seconds. Optional.
	// If not specified, the language default is used.
	// If exceeding the language maximum, it will be clamped.
	Timeout int `json:"timeout,omitempty"`

	// Stdin is the standard input to pass to the program. Optional.
	Stdin string `json:"stdin,omitempty"`
}

// OutputChunk represents a chunk of output streamed from a running container.
type OutputChunk struct {
	// Type is either "stdout" or "stderr".
	Type string `json:"type"`

	// Data is the content of the output chunk.
	Data string `json:"data"`
}

// Runner manages the execution of code in sandboxed Docker containers.
// It handles the complete lifecycle: container creation, code mounting,
// execution, output collection, timeout enforcement, and cleanup.
type Runner struct {
	// dockerClient is the Docker API client.
	dockerClient *client.Client

	// sandboxConfig is the security sandbox configuration.
	sandboxConfig SandboxConfig

	// results stores execution results indexed by execution ID.
	// Protected by resultsMutex for concurrent access.
	results map[string]*ExecutionResult

	// resultsMutex protects the results map.
	resultsMutex sync.RWMutex

	// outputChannels stores SSE output channels for running executions.
	// Subscribers receive OutputChunk messages in real-time.
	outputChannels map[string][]chan OutputChunk

	// outputMutex protects the outputChannels map.
	outputMutex sync.RWMutex

	// logger is the structured logger for the runner.
	logger *log.Logger
}

// NewRunner creates a new Runner instance with the specified sandbox configuration.
// It initializes the Docker client and validates the configuration.
//
// Returns an error if:
//   - The Docker client cannot be created
//   - The sandbox configuration is invalid
//   - The Docker daemon is not accessible
func NewRunner(sandboxConfig SandboxConfig) (*Runner, error) {
	if err := ValidateSandboxConfig(sandboxConfig); err != nil {
		return nil, fmt.Errorf("invalid sandbox config: %w", err)
	}

	// Create Docker client using environment variables
	dockerClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Verify Docker daemon is accessible
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = dockerClient.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("Docker daemon not accessible: %w", err)
	}

	runner := &Runner{
		dockerClient:  dockerClient,
		sandboxConfig: sandboxConfig,
		results:       make(map[string]*ExecutionResult),
		outputChannels: make(map[string][]chan OutputChunk),
		logger:        log.New(os.Stdout, "[runner] ", log.LstdFlags|log.Lshortfile),
	}

	runner.logger.Println("Runner initialized successfully")
	runner.logger.Printf("Sandbox config: Memory=%dMB, CPU=1core, Network=disabled, ReadOnlyFS=%v",
		sandboxConfig.Constraints.MemoryLimitMB,
		sandboxConfig.ReadOnlyFilesystem,
	)

	return runner, nil
}

// Close cleans up resources used by the Runner, including closing the Docker client.
func (r *Runner) Close() error {
	if r.dockerClient != nil {
		return r.dockerClient.Close()
	}
	return nil
}

// Execute runs the given code in a sandboxed Docker container and returns
// the execution result. This method blocks until execution completes or times out.
//
// The execution flow:
//  1. Validate the language and request
//  2. Create a temporary directory with the source code
//  3. Pull the Docker image if not available
//  4. Create and start the container
//  5. Stream output in real-time
//  6. Wait for completion or timeout
//  7. Clean up the container and temporary directory
func (r *Runner) Execute(ctx context.Context, req ExecutionRequest) (*ExecutionResult, error) {
	// Validate language
	langConfig, ok := GetLanguageConfig(req.Language)
	if !ok {
		return nil, fmt.Errorf("unsupported language: %s. Supported: %v",
			req.Language, GetSupportedLanguageIDs())
	}

	// Determine timeout
	timeout := langConfig.DefaultTimeoutSeconds
	if req.Timeout > 0 {
		timeout = req.Timeout
	}
	if timeout > langConfig.MaxTimeoutSeconds {
		timeout = langConfig.MaxTimeoutSeconds
	}
	if timeout > r.sandboxConfig.Constraints.MaxTimeoutSeconds {
		timeout = r.sandboxConfig.Constraints.MaxTimeoutSeconds
	}

	// Create execution result
	execID := uuid.New().String()
	result := &ExecutionResult{
		ID:        execID,
		Language:  req.Language,
		Status:    StatusPending,
		ExitCode:  -1,
		CreatedAt: time.Now(),
	}

	r.storeResult(result)

	// Create execution context with timeout
	execCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()

	// Create temporary directory for the source code
	sandboxDir, err := os.MkdirTemp("", "sandbox-"+execID+"-*")
	if err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to create sandbox directory: %v", err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}
	defer os.RemoveAll(sandboxDir)

	// Write source code to file
	sourceFile := filepath.Join(sandboxDir, "main"+langConfig.Extension)
	if err := os.WriteFile(sourceFile, []byte(req.Code), 0644); err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to write source file: %v", err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}

	// Ensure the Docker image is available
	if err := r.ensureImage(execCtx, langConfig.Image); err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to pull Docker image %s: %v", langConfig.Image, err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}

	// Build the execution command
	cmd := r.buildCommand(langConfig, req.Stdin)

	// Create the Docker container
	containerConfig := r.sandboxConfig.ToContainerConfig(langConfig)
	containerConfig.Cmd = cmd

	// If stdin is provided, open stdin
	if req.Stdin != "" {
		containerConfig.OpenStdin = true
		containerConfig.StdinOnce = true
	}

	hostConfig := r.sandboxConfig.ToHostConfig(sandboxDir)

	resp, err := r.dockerClient.ContainerCreate(execCtx, containerConfig, hostConfig, nil, nil, "sandbox-"+execID)
	if err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to create container: %v", err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}

	// Ensure container cleanup
	containerID := resp.ID
	defer r.cleanupContainer(containerID)

	// Update status to running
	r.updateResult(execID, func(r *ExecutionResult) {
		r.Status = StatusRunning
	})

	r.logger.Printf("Execution %s: container %s created for %s code", execID, containerID[:12], req.Language)

	// Attach to the container for I/O
	attachOpts := container.AttachOptions{
		Stream: true,
		Stdin:  req.Stdin != "",
		Stdout: true,
		Stderr: true,
	}

	hijackedResp, err := r.dockerClient.ContainerAttach(execCtx, containerID, attachOpts)
	if err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to attach to container: %v", err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}
	defer hijackedResp.Close()

	// Write stdin if provided
	if req.Stdin != "" {
		go func() {
			hijackedResp.Conn.Write([]byte(req.Stdin))
			hijackedResp.Conn.Close()
		}()
	}

	// Start the container
	if err := r.dockerClient.ContainerStart(execCtx, containerID, container.StartOptions{}); err != nil {
		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusError
			r.Error = fmt.Sprintf("Failed to start container: %v", err)
			r.FinishedAt = time.Now()
		})
		return r.getResult(execID), nil
	}

	startTime := time.Now()

	// Stream output in a goroutine
	var stdout, stderr string
	var outputWaitGroup sync.WaitGroup

	outputWaitGroup.Add(1)
	go func() {
		defer outputWaitGroup.Done()
		stdout, stderr = r.streamOutput(hijackedResp.Reader, execID)
	}()

	// Wait for the container to finish or timeout
	statusCh, errCh := r.dockerClient.ContainerWait(execCtx, containerID, container.WaitConditionNotRunning)

	var exitCode int64
	select {
	case waitResp := <-statusCh:
		exitCode = waitResp.StatusCode
	case err := <-errCh:
		r.logger.Printf("Execution %s: container wait error: %v", execID, err)
		exitCode = -1
	case <-execCtx.Done():
		// Timeout reached - kill the container
		r.logger.Printf("Execution %s: timeout after %ds, killing container", execID, timeout)
		r.killContainer(context.Background(), containerID) // Use separate context for kill

		outputWaitGroup.Wait()

		r.updateResult(execID, func(r *ExecutionResult) {
			r.Status = StatusTimeout
			r.Output = stdout
			r.Error = stderr + fmt.Sprintf("\nExecution timed out after %d seconds", timeout)
			r.ExitCode = -1
			r.ExecutionTime = time.Since(startTime).Milliseconds()
			r.FinishedAt = time.Now()
		})

		r.broadcastOutput(execID, OutputChunk{
			Type: "stderr",
			Data: fmt.Sprintf("\n[TIMEOUT] Execution timed out after %d seconds\n", timeout),
		})
		r.closeOutputChannels(execID)

		return r.getResult(execID), nil
	}

	// Wait for output streaming to complete
	outputWaitGroup.Wait()

	executionTime := time.Since(startTime).Milliseconds()

	// Determine final status
	status := StatusCompleted
	if exitCode != 0 {
		status = StatusError
	}

	r.updateResult(execID, func(r *ExecutionResult) {
		r.Status = status
		r.Output = stdout
		r.Error = stderr
		r.ExitCode = int(exitCode)
		r.ExecutionTime = executionTime
		r.FinishedAt = time.Now()
	})

	r.closeOutputChannels(execID)

	r.logger.Printf("Execution %s: completed with exit code %d in %dms", execID, exitCode, executionTime)

	return r.getResult(execID), nil
}

// GetResult returns the execution result for the given ID.
// Returns nil if the execution ID does not exist.
func (r *Runner) GetResult(id string) *ExecutionResult {
	return r.getResult(id)
}

// Subscribe creates a channel that receives output chunks for the given execution ID.
// The caller must read from the channel to prevent blocking.
// Call Unsubscribe when done to prevent resource leaks.
func (r *Runner) Subscribe(execID string) chan OutputChunk {
	ch := make(chan OutputChunk, 64)

	r.outputMutex.Lock()
	r.outputChannels[execID] = append(r.outputChannels[execID], ch)
	r.outputMutex.Unlock()

	return ch
}

// Unsubscribe removes a subscriber channel for the given execution ID.
// This must be called to prevent resource leaks when a client disconnects.
func (r *Runner) Unsubscribe(execID string, ch chan OutputChunk) {
	r.outputMutex.Lock()
	defer r.outputMutex.Unlock()

	channels := r.outputChannels[execID]
	for i, c := range channels {
		if c == ch {
			r.outputChannels[execID] = append(channels[:i], channels[i+1:]...)
			close(ch)
			break
		}
	}
}

// streamOutput reads from the container's combined output stream and broadcasts
// chunks to subscribers. It also accumulates the full stdout and stderr output.
//
// Docker multiplexes stdout and stderr in the hijacked response using an 8-byte
// header for each frame: [stream_type (1 byte)][padding (3 bytes)][size (4 bytes big-endian)]
func (r *Runner) streamOutput(reader io.Reader, execID string) (string, string) {
	var stdout, stderr string

	// Use Docker's multiplexed stream reader
	br := bufio.NewReader(reader)

	for {
		// Read the 8-byte header
		header := make([]byte, 8)
		_, err := io.ReadFull(br, header)
		if err != nil {
			if err != io.EOF && err != io.ErrUnexpectedEOF {
				r.logger.Printf("Execution %s: error reading stream header: %v", execID, err)
			}
			break
		}

		// Parse header
		// header[0] = stream type: 1=stdout, 2=stderr
		// header[4:8] = payload size (big-endian uint32)
		streamType := header[0]
		size := uint32(header[4])<<24 | uint32(header[5])<<16 | uint32(header[6])<<8 | uint32(header[7])

		if size == 0 {
			continue
		}

		// Read the payload
		payload := make([]byte, size)
		_, err = io.ReadFull(br, payload)
		if err != nil {
			r.logger.Printf("Execution %s: error reading stream payload: %v", execID, err)
			break
		}

		data := string(payload)
		chunkType := "stdout"
		if streamType == 2 {
			chunkType = "stderr"
			stderr += data
		} else {
			stdout += data
		}

		// Broadcast to SSE subscribers
		r.broadcastOutput(execID, OutputChunk{
			Type: chunkType,
			Data: data,
		})
	}

	return stdout, stderr
}

// buildCommand constructs the container command based on the language configuration
// and whether stdin input is provided.
func (r *Runner) buildCommand(langConfig LanguageConfig, stdin string) []string {
	if langConfig.NeedsCompile {
		// For compiled languages, combine compile and run commands
		return []string{langConfig.CompileCmd + " && " + langConfig.RunCmd}
	}
	return []string{langConfig.RunCmd}
}

// ensureImage pulls the Docker image if it's not available locally.
// This ensures that the first execution of each language doesn't fail
// due to a missing image.
func (r *Runner) ensureImage(ctx context.Context, image string) error {
	_, _, err := r.dockerClient.ImageInspectWithRaw(ctx, image)
	if err == nil {
		// Image already exists locally
		return nil
	}

	r.logger.Printf("Pulling Docker image: %s", image)
	reader, err := r.dockerClient.ImagePull(ctx, image, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w", image, err)
	}
	defer reader.Close()

	// Wait for pull to complete by reading all output
	_, err = io.ReadAll(reader)
	if err != nil {
		return fmt.Errorf("error reading pull output for %s: %w", image, err)
	}

	r.logger.Printf("Successfully pulled image: %s", image)
	return nil
}

// killContainer forcefully stops and removes a container.
// Uses a separate context (not the execution context) to ensure the kill
// completes even if the execution context has timed out.
func (r *Runner) killContainer(ctx context.Context, containerID string) {
	timeout := 5 * time.Second
	err := r.dockerClient.ContainerStop(ctx, containerID, &timeout)
	if err != nil {
		r.logger.Printf("Failed to stop container %s: %v", containerID[:12], err)
	}
}

// cleanupContainer removes a Docker container and its associated resources.
// This is called after execution completes (via defer) to prevent resource leaks.
func (r *Runner) cleanupContainer(containerID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	removeOpts := container.RemoveOptions{
		RemoveVolumes: true,
		Force:         true,
	}

	if err := r.dockerClient.ContainerRemove(ctx, containerID, removeOpts); err != nil {
		r.logger.Printf("Failed to remove container %s: %v", containerID[:12], err)
	}
}

// storeResult stores an execution result in the results map.
func (r *Runner) storeResult(result *ExecutionResult) {
	r.resultsMutex.Lock()
	r.results[result.ID] = result
	r.resultsMutex.Unlock()
}

// getResult retrieves an execution result by ID.
func (r *Runner) getResult(id string) *ExecutionResult {
	r.resultsMutex.RLock()
	defer r.resultsMutex.RUnlock()
	return r.results[id]
}

// updateResult atomically updates an execution result using the provided function.
// The function is called while holding the write lock on the results map.
func (r *Runner) updateResult(id string, update func(*ExecutionResult)) {
	r.resultsMutex.Lock()
	defer r.resultsMutex.Unlock()
	if result, ok := r.results[id]; ok {
		update(result)
	}
}

// broadcastOutput sends an output chunk to all subscribers for an execution.
// Non-blocking sends are used to prevent slow subscribers from blocking the
// output stream. If a subscriber's buffer is full, the chunk is dropped.
func (r *Runner) broadcastOutput(execID string, chunk OutputChunk) {
	r.outputMutex.RLock()
	channels := r.outputChannels[execID]
	r.outputMutex.RUnlock()

	for _, ch := range channels {
		select {
		case ch <- chunk:
		default:
			// Drop chunk if subscriber is too slow
			r.logger.Printf("Execution %s: dropping output chunk for slow subscriber", execID)
		}
	}
}

// closeOutputChannels closes and removes all subscriber channels for an execution.
// This should be called when the execution completes to signal to SSE handlers
// that no more output will be produced.
func (r *Runner) closeOutputChannels(execID string) {
	r.outputMutex.Lock()
	defer r.outputMutex.Unlock()

	for _, ch := range r.outputChannels[execID] {
		close(ch)
	}
	delete(r.outputChannels, execID)
}
