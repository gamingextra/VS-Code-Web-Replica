// Package runner provides the code execution engine for the sandbox service.
// This file defines security sandbox configurations for Docker containers,
// including resource constraints, filesystem restrictions, and network isolation.
package runner

import (
	"fmt"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
)

// ResourceConstraints defines the resource limits applied to sandbox containers.
// These limits prevent malicious or buggy code from consuming excessive resources.
type ResourceConstraints struct {
	// MemoryLimitMB is the maximum memory in megabytes a container can use.
	// Exceeding this limit will cause the OOM killer to terminate the container.
	MemoryLimitMB int64

	// CPUPeriod is the CPU CFS scheduler period in microseconds.
	// Used together with CPUQuota to limit CPU usage.
	CPUPeriod int64

	// CPUQuota is the CPU CFS scheduler quota in microseconds.
	// Setting this to CPUPeriod limits the container to 1 CPU core.
	// Setting this to half of CPUPeriod limits to 0.5 cores, etc.
	CPUQuota int64

	// PidsLimit is the maximum number of PIDs a container can create.
	// This prevents fork bombs and excessive process creation.
	PidsLimit int64

	// DefaultTimeoutSeconds is the default execution timeout in seconds.
	// Containers running longer than this will be forcefully terminated.
	DefaultTimeoutSeconds int

	// MaxTimeoutSeconds is the maximum timeout a client can request.
	// Requests for timeouts beyond this limit will be clamped.
	MaxTimeoutSeconds int
}

// DefaultResourceConstraints returns the default resource constraints for sandbox containers.
// These are conservative limits suitable for code execution in a shared environment:
//   - 512MB RAM
//   - 1 CPU core
//   - 100 max PIDs
//   - 10s default timeout
//   - 120s max timeout
func DefaultResourceConstraints() ResourceConstraints {
	return ResourceConstraints{
		MemoryLimitMB:         512,
		CPUPeriod:             100000,  // 100ms in microseconds (standard CFS period)
		CPUQuota:              100000,  // 100ms quota = 1 CPU core
		PidsLimit:             100,
		DefaultTimeoutSeconds: 10,
		MaxTimeoutSeconds:     120,
	}
}

// SandboxConfig holds all security-related configuration for a sandbox container.
// It combines resource constraints with Docker-specific security options.
type SandboxConfig struct {
	// Constraints are the resource limits for the container.
	Constraints ResourceConstraints

	// NetworkDisabled indicates whether the container should have network access.
	// When true, the container runs with no network stack (--network=none).
	NetworkDisabled bool

	// ReadOnlyFilesystem indicates whether the container's root filesystem is read-only.
	// When true, the container cannot write to its root filesystem (--read-only).
	// A tmpfs is mounted at /tmp and /sandbox for temporary writes.
	ReadOnlyFilesystem bool

	// NoNewPrivileges indicates whether the container should have the
	// no-new-privileges security option set. This prevents the container
	// processes from gaining additional privileges via setuid/setgid.
	NoNewPrivileges bool

	// DropAllCapabilities indicates whether all Linux capabilities should be
	// dropped from the container. This severely limits what the container can do.
	DropAllCapabilities bool
}

// DefaultSandboxConfig returns the default sandbox security configuration.
// By default:
//   - Network is disabled (no internet access)
//   - Filesystem is read-only (with tmpfs for /tmp and /sandbox)
//   - No new privileges are allowed
//   - All Linux capabilities are dropped
func DefaultSandboxConfig() SandboxConfig {
	return SandboxConfig{
		Constraints:        DefaultResourceConstraints(),
		NetworkDisabled:    true,
		ReadOnlyFilesystem: true,
		NoNewPrivileges:    true,
		DropAllCapabilities: true,
	}
}

// ToHostConfig converts the SandboxConfig into a Docker container.HostConfig.
// This method maps the sandbox configuration to the appropriate Docker API
// structures for container creation.
//
// Parameters:
//   - sandboxDir: the host path that will be mounted as /sandbox in the container
//
// Returns:
//   - *container.HostConfig: the Docker host configuration
func (sc SandboxConfig) ToHostConfig(sandboxDir string) *container.HostConfig {
	hostConfig := &container.HostConfig{
		// Resource constraints
		Resources: container.Resources{
			Memory:     sc.Constraints.MemoryLimitMB * 1024 * 1024, // Convert MB to bytes
			MemorySwap: sc.Constraints.MemoryLimitMB * 1024 * 1024, // Same as memory (no swap)
			CPUPeriod:  sc.Constraints.CPUPeriod,
			CPUQuota:   sc.Constraints.CPUQuota,
			PidsLimit:  &sc.Constraints.PidsLimit,
		},
		// Bind mount the sandbox directory as read-write
		Binds: []string{
			fmt.Sprintf("%s:/sandbox:rw", sandboxDir),
		},
		// Security options
		SecurityOpt: []string{},
		CapDrop:     []string{},
		// Log configuration - limited size to prevent disk exhaustion
		LogConfig: container.LogConfig{
			Type: "json-file",
			Config: map[string]string{
				"max-size": "1m",
				"max-file": "1",
			},
		},
		// Auto-remove the container when it exits
		AutoRemove: false, // We handle removal explicitly for cleanup control
	}

	// Network isolation
	if sc.NetworkDisabled {
		hostConfig.NetworkMode = "none"
	}

	// Read-only filesystem with tmpfs mounts
	if sc.ReadOnlyFilesystem {
		hostConfig.ReadonlyRootfs = true
		hostConfig.Tmpfs = map[string]string{
			"/tmp":     "rw,noexec,nosuid,size=64m",
			"/sandbox": "rw,noexec,nosuid,size=128m",
		}
		// Note: /sandbox tmpfs is overridden by the bind mount above,
		// but we include it as a fallback if the bind mount fails.
	}

	// No new privileges security option
	if sc.NoNewPrivileges {
		hostConfig.SecurityOpt = append(hostConfig.SecurityOpt, "no-new-privileges")
	}

	// Drop all Linux capabilities
	if sc.DropAllCapabilities {
		hostConfig.CapDrop = append(hostConfig.CapDrop, "ALL")
	}

	return hostConfig
}

// ToContainerConfig creates a Docker container.Config from the sandbox configuration
// and language-specific settings.
//
// Parameters:
//   - languageConfig: the language-specific configuration
//   - code: the source code to execute
//
// Returns:
//   - *container.Config: the Docker container configuration
func (sc SandboxConfig) ToContainerConfig(languageConfig LanguageConfig) *container.Config {
	config := &container.Config{
		Image: languageConfig.Image,
		// Open stdin if the language needs shell-based execution
		OpenStdin: true,
		StdinOnce: true,
		Tty:       false,
	}

	// Set the entrypoint if specified for the language
	if len(languageConfig.Entrypoint) > 0 {
		config.Entrypoint = languageConfig.Entrypoint
	}

	// Exposed ports - none (network is disabled)
	config.ExposedPorts = nat.PortSet{}

	return config
}

// ValidateSandboxConfig checks that the sandbox configuration is valid and
// returns an error if any constraints are invalid.
func ValidateSandboxConfig(config SandboxConfig) error {
	if config.Constraints.MemoryLimitMB <= 0 {
		return fmt.Errorf("memory limit must be positive, got %dMB", config.Constraints.MemoryLimitMB)
	}
	if config.Constraints.CPUPeriod <= 0 {
		return fmt.Errorf("CPU period must be positive, got %d", config.Constraints.CPUPeriod)
	}
	if config.Constraints.CPUQuota <= 0 {
		return fmt.Errorf("CPU quota must be positive, got %d", config.Constraints.CPUQuota)
	}
	if config.Constraints.PidsLimit <= 0 {
		return fmt.Errorf("PIDs limit must be positive, got %d", config.Constraints.PidsLimit)
	}
	if config.Constraints.DefaultTimeoutSeconds <= 0 {
		return fmt.Errorf("default timeout must be positive, got %ds", config.Constraints.DefaultTimeoutSeconds)
	}
	if config.Constraints.MaxTimeoutSeconds < config.Constraints.DefaultTimeoutSeconds {
		return fmt.Errorf("max timeout (%ds) must be >= default timeout (%ds)",
			config.Constraints.MaxTimeoutSeconds, config.Constraints.DefaultTimeoutSeconds)
	}
	return nil
}
