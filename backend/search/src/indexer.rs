//! File indexer for the VS Code Search Service.
//!
//! This module handles parallel file walking, content indexing, and
//! maintenance of an in-memory inverted index for fast full-text search.
//! It respects .gitignore patterns via the `ignore` crate and uses
//! `rayon` for parallel processing.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use dashmap::DashMap;
use parking_lot::RwLock;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::trie::Trie;

/// Maximum file size to index (1 MB). Larger files are skipped to conserve memory.
const MAX_FILE_SIZE: u64 = 1_024_768;

/// Maximum number of lines to index per file. Prevents runaway indexing on huge files.
const MAX_LINES_PER_FILE: usize = 50_000;

/// Binary detection threshold: if a file contains NUL bytes in the first 8KB, skip it.
const BINARY_CHECK_BYTES: usize = 8192;

/// Metadata for a single indexed file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    /// Full path relative to workspace root
    pub path: String,
    /// Filename (last component of the path)
    pub name: String,
    /// Detected programming language based on extension
    pub language: String,
    /// File size in bytes
    pub size: u64,
    /// Last modified timestamp as Unix epoch
    pub last_modified: Option<u64>,
    /// Number of lines in the file
    pub line_count: usize,
}

/// A single match within the inverted index, pointing to a specific line.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    /// Full path relative to workspace root
    pub path: String,
    /// Line number (1-based)
    pub line: usize,
    /// Full content of the line
    pub content: String,
}

/// Statistics about the current index state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    /// Total number of indexed files
    pub file_count: usize,
    /// Total number of unique tokens in the inverted index
    pub token_count: usize,
    /// Total number of lines indexed across all files
    pub total_lines: usize,
    /// Estimated memory usage in bytes
    pub estimated_size_bytes: usize,
    /// Total size of indexed files on disk
    pub total_file_size: u64,
    /// Language distribution: language -> file count
    pub languages: HashMap<String, usize>,
    /// Time taken for the last full index (ms)
    pub last_index_time_ms: Option<u64>,
}

/// The core file indexer that builds and maintains the search index.
///
/// The indexer maintains:
/// - An **inverted index** mapping tokens → list of (path, line, content)
/// - A **file metadata map** mapping path → FileMetadata
/// - A **filename trie** for autocomplete suggestions
///
/// Thread safety is provided via `DashMap` for the inverted index
/// (concurrent reads and writes) and `RwLock` for the metadata and trie.
pub struct FileIndexer {
    /// Root directory of the workspace to index
    root_path: PathBuf,

    /// Inverted index: token → list of search matches.
    /// Using DashMap for lock-free concurrent access during indexing.
    inverted_index: DashMap<String, Vec<SearchMatch>>,

    /// File metadata: path → metadata.
    file_metadata: RwLock<HashMap<String, FileMetadata>>,

    /// Filename trie for autocomplete.
    filename_trie: RwLock<Trie>,

    /// Statistics about the last index operation.
    stats: RwLock<IndexStats>,
}

impl FileIndexer {
    /// Creates a new FileIndexer for the given workspace root.
    ///
    /// # Arguments
    /// * `root_path` - The absolute or relative path to the workspace directory
    pub fn new(root_path: &str) -> Self {
        Self {
            root_path: PathBuf::from(root_path),
            inverted_index: DashMap::new(),
            file_metadata: RwLock::new(HashMap::new()),
            filename_trie: RwLock::new(Trie::new()),
            stats: RwLock::new(IndexStats {
                file_count: 0,
                token_count: 0,
                total_lines: 0,
                estimated_size_bytes: 0,
                total_file_size: 0,
                languages: HashMap::new(),
                last_index_time_ms: None,
            }),
        }
    }

    /// Performs a full index of the workspace by walking the directory tree.
    ///
    /// This method:
    /// 1. Clears the existing index
    /// 2. Walks the directory tree respecting .gitignore
    /// 3. Reads and indexes each file in parallel using rayon
    /// 4. Updates the filename trie
    /// 5. Records statistics
    ///
    /// # Returns
    /// The number of files successfully indexed.
    pub fn index_all(&self) -> usize {
        let start = Instant::now();
        info!("Starting full index of {:?}", self.root_path);

        // Clear existing index
        self.inverted_index.clear();
        self.file_metadata.write().clear();
        self.filename_trie.write().clear();

        // Collect all files to index (respecting .gitignore)
        let files: Vec<PathBuf> = self.collect_files();

        info!("Found {} files to index", files.len());

        // Index files in parallel using rayon
        let results: Vec<(FileMetadata, Vec<(String, SearchMatch)>)> = files
            .par_iter()
            .filter_map(|path| self.index_file_internal(path))
            .collect();

        // Merge parallel results into the shared index
        let mut total_lines = 0usize;
        let mut total_size = 0u64;
        let mut languages: HashMap<String, usize> = HashMap::new();
        let mut file_count = 0usize;

        for (metadata, tokens) in &results {
            // Insert into file metadata
            self.file_metadata
                .write()
                .insert(metadata.path.clone(), metadata.clone());

            // Insert into filename trie
            self.filename_trie
                .write()
                .insert(&metadata.path, &metadata.name);

            total_lines += metadata.line_count;
            total_size += metadata.size;
            *languages.entry(metadata.language.clone()).or_insert(0) += 1;
            file_count += 1;

            // Insert tokens into inverted index
            for (token, search_match) in tokens {
                self.inverted_index
                    .entry(token)
                    .or_insert_with(Vec::new)
                    .push(search_match.clone());
            }
        }

        // Sort matches in each inverted index entry by path then line
        for mut entry in self.inverted_index.iter_mut() {
            entry.value_mut().sort_by(|a, b| {
                a.path
                    .cmp(&b.path)
                    .then_with(|| a.line.cmp(&b.line))
            });
        }

        let elapsed = start.elapsed();
        let token_count = self.inverted_index.len();

        // Update stats
        {
            let mut stats = self.stats.write();
            stats.file_count = file_count;
            stats.token_count = token_count;
            stats.total_lines = total_lines;
            stats.estimated_size_bytes = self.estimate_memory_usage();
            stats.total_file_size = total_size;
            stats.languages = languages;
            stats.last_index_time_ms = Some(elapsed.as_millis() as u64);
        }

        info!(
            "Indexing complete: {} files, {} tokens, {} lines in {}ms",
            file_count,
            token_count,
            total_lines,
            elapsed.as_millis()
        );

        file_count
    }

    /// Indexes a single file and adds it to the index.
    ///
    /// This is used for incremental updates when a file changes.
    /// It removes the old index entries for the file first, then
    /// re-indexes the current content.
    ///
    /// # Arguments
    /// * `path` - The file path relative to the workspace root
    pub fn index_file(&self, path: &str) {
        let full_path = self.root_path.join(path);

        if !full_path.exists() {
            warn!("File does not exist: {:?}", full_path);
            return;
        }

        // Remove old entries first
        self.remove_file(path);

        // Index the file
        if let Some((metadata, tokens)) = self.index_file_internal(&full_path) {
            // Insert into metadata
            self.file_metadata
                .write()
                .insert(metadata.path.clone(), metadata.clone());

            // Insert into trie
            self.filename_trie
                .write()
                .insert(&metadata.path, &metadata.name);

            // Insert tokens
            for (token, search_match) in tokens {
                self.inverted_index
                    .entry(token)
                    .or_insert_with(Vec::new)
                    .push(search_match);
            }

            // Sort the affected entries
            for mut entry in self.inverted_index.iter_mut() {
                entry.value_mut().sort_by(|a, b| {
                    a.path.cmp(&b.path).then_with(|| a.line.cmp(&b.line))
                });
            }

            // Update stats
            let mut stats = self.stats.write();
            stats.file_count = self.file_metadata.read().len();
            stats.token_count = self.inverted_index.len();
            stats.estimated_size_bytes = self.estimate_memory_usage();

            debug!("Re-indexed file: {}", path);
        }
    }

    /// Removes a file from the index.
    ///
    /// This removes the file's metadata, trie entry, and all inverted
    /// index entries that reference this file.
    ///
    /// # Arguments
    /// * `path` - The file path relative to the workspace root
    pub fn remove_file(&self, path: &str) {
        // Remove from metadata
        if let Some(metadata) = self.file_metadata.write().remove(path) {
            // Remove from trie
            self.filename_trie.write().remove(path, &metadata.name);
        }

        // Remove from inverted index: filter out entries matching this path
        let mut tokens_to_remove = Vec::new();

        for mut entry in self.inverted_index.iter_mut() {
            let before_len = entry.value().len();
            entry.value_mut().retain(|m| m.path != path);
            if entry.value().is_empty() {
                tokens_to_remove.push(entry.key().clone());
            }
        }

        // Remove empty token entries
        for token in tokens_to_remove {
            self.inverted_index.remove(&token);
        }

        // Update stats
        let mut stats = self.stats.write();
        stats.file_count = self.file_metadata.read().len();
        stats.token_count = self.inverted_index.len();
        stats.estimated_size_bytes = self.estimate_memory_usage();

        debug!("Removed file from index: {}", path);
    }

    /// Returns the current index statistics.
    pub fn get_stats(&self) -> IndexStats {
        let mut stats = self.stats.read().clone();
        stats.file_count = self.file_metadata.read().len();
        stats.token_count = self.inverted_index.len();
        stats.estimated_size_bytes = self.estimate_memory_usage();
        stats
    }

    /// Returns a reference to the inverted index for search operations.
    pub fn get_inverted_index(&self) -> &DashMap<String, Vec<SearchMatch>> {
        &self.inverted_index
    }

    /// Returns a read-guard for the file metadata map.
    pub fn get_file_metadata(&self) -> parking_lot::RwLockReadGuard<'_, HashMap<String, FileMetadata>> {
        self.file_metadata.read()
    }

    /// Returns a read-guard for the filename trie.
    pub fn get_filename_trie(&self) -> parking_lot::RwLockReadGuard<'_, Trie> {
        self.filename_trie.read()
    }

    /// Returns the workspace root path.
    pub fn get_root_path(&self) -> &Path {
        &self.root_path
    }

    // ── Private helpers ──────────────────────────────────────────────

    /// Collects all files in the workspace, respecting .gitignore patterns.
    fn collect_files(&self) -> Vec<PathBuf> {
        let mut files = Vec::new();

        // Use the `ignore` crate's WalkBuilder for .gitignore support
        let walker = ignore::WalkBuilder::new(&self.root_path)
            .hidden(true)           // Skip hidden files/dirs
            .git_ignore(true)       // Respect .gitignore
            .git_global(true)       // Respect global gitignore
            .git_exclude(true)      // Respect .git/info/exclude
            .ignore(true)           // Respect .ignore files
            .follow_links(false)    // Don't follow symlinks (avoid cycles)
            .max_depth(Some(20))    // Limit depth to avoid runaway traversal
            .build();

        for result in walker {
            match result {
                Ok(entry) => {
                    if entry.file_type().map_or(false, |ft| ft.is_file()) {
                        let path = entry.path().to_path_buf();

                        // Skip files that are too large
                        if let Ok(metadata) = std::fs::metadata(&path) {
                            if metadata.len() > MAX_FILE_SIZE {
                                debug!("Skipping large file: {:?}", path);
                                continue;
                            }
                        }

                        files.push(path);
                    }
                }
                Err(err) => {
                    warn!("Walk error: {}", err);
                }
            }
        }

        files
    }

    /// Indexes a single file and returns its metadata and tokens.
    ///
    /// Returns None if the file cannot be read, is binary, or exceeds limits.
    fn index_file_internal(
        &self,
        path: &Path,
    ) -> Option<(FileMetadata, Vec<(String, SearchMatch)>)> {
        // Read file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                debug!("Cannot read file {:?}: {}", path, e);
                return None;
            }
        };

        // Skip binary files
        if Self::is_binary(&content) {
            debug!("Skipping binary file: {:?}", path);
            return None;
        }

        // Compute relative path
        let relative_path = path
            .strip_prefix(&self.root_path)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        // Extract filename
        let filename = path
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| relative_path.clone());

        // Detect language
        let language = Self::detect_language(&filename);

        // Get file metadata
        let fs_metadata = std::fs::metadata(path).ok();
        let size = fs_metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let last_modified = fs_metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        // Parse lines and build inverted index entries
        let lines: Vec<&str> = content.lines().take(MAX_LINES_PER_FILE).collect();
        let line_count = lines.len();

        let mut tokens: Vec<(String, SearchMatch)> = Vec::new();

        for (line_idx, line) in lines.iter().enumerate() {
            let line_num = line_idx + 1; // 1-based line numbers

            // Tokenize the line
            for token in Self::tokenize(line) {
                let search_match = SearchMatch {
                    path: relative_path.clone(),
                    line: line_num,
                    content: line.to_string(),
                };
                tokens.push((token, search_match));
            }
        }

        let metadata = FileMetadata {
            path: relative_path,
            name: filename,
            language,
            size,
            last_modified,
            line_count,
        };

        Some((metadata, tokens))
    }

    /// Tokenizes a line of text into searchable tokens.
    ///
    /// Tokens are produced by splitting on word boundaries. Both the
    /// original token and its lowercase form are indexed for case-insensitive
    /// search. Additionally, for identifiers like `camelCaseWord`, sub-tokens
    /// are generated for each component.
    fn tokenize(line: &str) -> Vec<String> {
        let mut tokens = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for word in line.split(|c: char| !c.is_alphanumeric() && c != '_' && c != '-') {
            if word.is_empty() || word.len() < 2 {
                continue;
            }

            // Add lowercase version for case-insensitive search
            let lower = word.to_lowercase();
            if seen.insert(lower.clone()) {
                tokens.push(lower);
            }

            // Add the original case version for case-sensitive search
            if seen.insert(word.to_string()) {
                tokens.push(word.to_string());
            }

            // Split camelCase / PascalCase identifiers into sub-tokens
            let sub_tokens = Self::split_camel_case(word);
            for sub in sub_tokens {
                let sub_lower = sub.to_lowercase();
                if sub_lower.len() >= 2 && seen.insert(sub_lower.clone()) {
                    tokens.push(sub_lower);
                }
            }

            // Add prefix tokens for autocomplete-like matching
            // e.g., "ButtonComponent" → "but", "butt", "butto", ...
            let lower_chars: Vec<char> = lower.chars().collect();
            for len in 3..lower_chars.len().min(8) {
                let prefix: String = lower_chars[..len].iter().collect();
                if seen.insert(prefix.clone()) {
                    tokens.push(prefix);
                }
            }
        }

        tokens
    }

    /// Splits a camelCase or PascalCase identifier into its components.
    ///
    /// # Examples
    /// - `"camelCaseWord"` → `["camel", "Case", "Word"]`
    /// - `"HTMLParser"` → `["HTML", "Parser"]`
    /// - `"my_variable"` → `["my", "variable"]`
    fn split_camel_case(word: &str) -> Vec<&str> {
        let mut result = Vec::new();
        let mut start = 0;

        for (i, ch) in word.char_indices().skip(1) {
            // Split on transition from lowercase to uppercase
            if ch.is_uppercase() {
                if start < i {
                    result.push(&word[start..i]);
                }
                start = i;
            }
            // Split on underscore boundaries
            else if ch == '_' || ch == '-' {
                if start < i {
                    result.push(&word[start..i]);
                }
                start = i + ch.len_utf8();
            }
        }

        if start < word.len() {
            result.push(&word[start..]);
        }

        result
    }

    /// Detects if file content is binary by checking for NUL bytes.
    fn is_binary(content: &str) -> bool {
        let check_len = content.len().min(BINARY_CHECK_BYTES);
        content.as_bytes()[..check_len].contains(&0)
    }

    /// Detects the programming language from a filename extension.
    fn detect_language(filename: &str) -> String {
        let ext = Path::new(filename)
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        match ext.as_str() {
            "rs" => "Rust",
            "ts" | "tsx" => "TypeScript",
            "js" | "jsx" | "mjs" | "cjs" => "JavaScript",
            "py" | "pyi" => "Python",
            "go" => "Go",
            "java" => "Java",
            "kt" | "kts" => "Kotlin",
            "c" | "h" => "C",
            "cpp" | "cc" | "cxx" | "hpp" | "hxx" => "C++",
            "cs" => "C#",
            "rb" => "Ruby",
            "php" => "PHP",
            "swift" => "Swift",
            "scala" => "Scala",
            "r" => "R",
            "lua" => "Lua",
            "dart" => "Dart",
            "el" | "clj" | "cljs" => "Lisp/Clojure",
            "hs" => "Haskell",
            "zig" => "Zig",
            "vue" => "Vue",
            "svelte" => "Svelte",
            "html" | "htm" => "HTML",
            "css" | "scss" | "sass" | "less" => "CSS",
            "json" => "JSON",
            "yaml" | "yml" => "YAML",
            "toml" => "TOML",
            "xml" => "XML",
            "md" | "mdx" => "Markdown",
            "sql" => "SQL",
            "sh" | "bash" | "zsh" => "Shell",
            "ps1" => "PowerShell",
            "dockerfile" => "Dockerfile",
            "graphql" | "gql" => "GraphQL",
            "proto" => "Protocol Buffers",
            "tf" => "Terraform",
            "cmake" => "CMake",
            "makefile" => "Makefile",
            "lock" => "Lockfile",
            "txt" => "Plain Text",
            "csv" => "CSV",
            "wasm" => "WebAssembly",
            _ => "Unknown",
        }
        .to_string()
    }

    /// Estimates the memory usage of the index in bytes.
    fn estimate_memory_usage(&self) -> usize {
        let mut size = 0usize;

        // Rough estimate: each DashMap entry has key + value overhead
        for entry in self.inverted_index.iter() {
            // Key: approximately len * 2 bytes (UTF-16 estimate) + overhead
            size += entry.key().len() * 2 + 48; // HashMap overhead

            // Value: Vec of SearchMatch
            for m in entry.value() {
                size += m.path.len() * 2;
                size += m.content.len() * 2;
                size += 32; // Struct overhead (path, line, content)
            }
            size += 24; // Vec overhead
        }

        // File metadata
        for entry in self.file_metadata.read().iter() {
            size += entry.0.len() * 2;
            size += entry.1.path.len() * 2;
            size += entry.1.name.len() * 2;
            size += entry.1.language.len() * 2;
            size += 128; // Struct overhead
        }

        size
    }
}
