// Package runner provides the code execution engine for the sandbox service.
// This file defines language-specific configurations including Docker images,
// file extensions, compilation commands, and runtime commands.
package runner

// LanguageConfig holds the configuration for a supported programming language.
// Each language defines how code is compiled (if needed) and executed within
// a Docker container.
type LanguageConfig struct {
	// Name is the display name of the language (e.g., "JavaScript", "Python").
	Name string

	// Image is the Docker image used to run code in this language.
	// Should include the tag (e.g., "node:20-alpine").
	Image string

	// Extension is the file extension used for the source file
	// (e.g., ".js", ".py"). Must include the leading dot.
	Extension string

	// CompileCmd is the command used to compile the source code before running.
	// This is optional and only needed for compiled languages like Go and Rust.
	// The placeholder {file} will be replaced with the actual filename.
	// If empty, no compilation step is performed.
	CompileCmd string

	// RunCmd is the command used to execute the source code.
	// The placeholder {file} will be replaced with the actual filename.
	// For compiled languages, this should run the compiled binary.
	RunCmd string

	// Entrypoint overrides the container's default ENTRYPOINT.
	// If empty, the default entrypoint of the Docker image is used.
	// This is useful for languages that need a specific shell invocation.
	Entrypoint []string

	// NeedsCompile indicates whether the language requires a compilation step
	// before execution (e.g., Go, Rust). When true, CompileCmd must be set.
	NeedsCompile bool

	// MaxTimeoutSeconds is the maximum allowed timeout for this language in seconds.
	// Compiled languages typically need more time for the compilation step.
	MaxTimeoutSeconds int

	// DefaultTimeoutSeconds is the default timeout for this language in seconds.
	// This is used when the client does not specify a timeout.
	DefaultTimeoutSeconds int
}

// SupportedLanguages maps language identifiers (lowercase) to their configurations.
// The keys are normalized to lowercase to allow case-insensitive language matching.
var SupportedLanguages = map[string]LanguageConfig{
	"javascript": {
		Name:                  "JavaScript",
		Image:                 "node:20-alpine",
		Extension:             ".js",
		CompileCmd:            "",
		RunCmd:                "node /sandbox/main.js",
		Entrypoint:            []string{},
		NeedsCompile:          false,
		MaxTimeoutSeconds:     30,
		DefaultTimeoutSeconds: 10,
	},
	"typescript": {
		Name:                  "TypeScript",
		Image:                 "node:20-alpine",
		Extension:             ".ts",
		CompileCmd:            "",
		RunCmd:                "npx tsx /sandbox/main.ts",
		Entrypoint:            []string{"/bin/sh", "-c"},
		NeedsCompile:          false,
		MaxTimeoutSeconds:     30,
		DefaultTimeoutSeconds: 10,
	},
	"python": {
		Name:                  "Python",
		Image:                 "python:3.12-slim",
		Extension:             ".py",
		CompileCmd:            "",
		RunCmd:                "python3 /sandbox/main.py",
		Entrypoint:            []string{},
		NeedsCompile:          false,
		MaxTimeoutSeconds:     30,
		DefaultTimeoutSeconds: 10,
	},
	"go": {
		Name:                  "Go",
		Image:                 "golang:1.22-alpine",
		Extension:             ".go",
		CompileCmd:            "cd /sandbox && go build -o main main.go",
		RunCmd:                "/sandbox/main",
		Entrypoint:            []string{"/bin/sh", "-c"},
		NeedsCompile:          true,
		MaxTimeoutSeconds:     60,
		DefaultTimeoutSeconds: 15,
	},
	"rust": {
		Name:                  "Rust",
		Image:                 "rust:1.75-slim",
		Extension:             ".rs",
		CompileCmd:            "cd /sandbox && rustc -o main main.rs",
		RunCmd:                "/sandbox/main",
		Entrypoint:            []string{"/bin/sh", "-c"},
		NeedsCompile:          true,
		MaxTimeoutSeconds:     120,
		DefaultTimeoutSeconds: 30,
	},
}

// GetLanguageConfig returns the LanguageConfig for the given language name.
// The lookup is case-insensitive. Returns the config and true if found,
// or an empty config and false if the language is not supported.
func GetLanguageConfig(language string) (LanguageConfig, bool) {
	config, ok := SupportedLanguages[lowercase(language)]
	return config, ok
}

// GetSupportedLanguageNames returns a sorted list of all supported language names
// (in their original casing as defined in the config).
func GetSupportedLanguageNames() []string {
	names := make([]string, 0, len(SupportedLanguages))
	for _, config := range SupportedLanguages {
		names = append(names, config.Name)
	}
	return names
}

// GetSupportedLanguageIDs returns a list of all supported language identifiers
// (lowercase keys used in the SupportedLanguages map).
func GetSupportedLanguageIDs() []string {
	ids := make([]string, 0, len(SupportedLanguages))
	for id := range SupportedLanguages {
		ids = append(ids, id)
	}
	return ids
}

// lowercase returns the lowercase version of the input string.
// This is a simple ASCII-only lowercase conversion suitable for language identifiers.
func lowercase(s string) string {
	result := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		result = append(result, c)
	}
	return string(result)
}
