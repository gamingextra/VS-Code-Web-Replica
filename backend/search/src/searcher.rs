//! Search engine for the VS Code Search Service.
//!
//! This module provides the search interface over the file index,
//! supporting multiple search modes: full-text, filename, regex,
//! case-sensitive, whole-word, and fuzzy matching.

use std::sync::Arc;
use std::time::Instant;

use regex::Regex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

use crate::indexer::{FileIndexer, FileMetadata};

/// A search query with various options.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    /// The search query string
    pub query: String,
    /// Whether to match case exactly (default: false = case-insensitive)
    #[serde(default)]
    pub match_case: bool,
    /// Whether to match whole words only
    #[serde(default)]
    pub whole_word: bool,
    /// Whether the query is a regular expression
    #[serde(default)]
    pub use_regex: bool,
    /// Optional file type filter (e.g., ["ts", "tsx", "js"])
    #[serde(default)]
    pub file_types: Vec<String>,
    /// Maximum number of results to return (default: 100)
    #[serde(default = "default_max_results")]
    pub max_results: usize,
}

fn default_max_results() -> usize {
    100
}

/// A single search result with highlighted match information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// File path relative to workspace root
    pub path: String,
    /// Filename
    pub name: String,
    /// Line number (1-based)
    pub line: usize,
    /// Content of the matching line
    pub content: String,
    /// Start position of the match within the line (0-based byte offset)
    pub match_start: usize,
    /// End position of the match within the line (0-based byte offset)
    pub match_end: usize,
    /// Detected programming language
    pub language: String,
}

/// Aggregated search results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResults {
    /// The list of search results
    pub results: Vec<SearchResult>,
    /// Total number of matches (may exceed results.length if max_results was hit)
    pub total: usize,
    /// Time taken for the search in milliseconds
    pub time_ms: u64,
    /// Number of files in the index at search time
    pub indexed_files: usize,
}

/// A filename search match.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    /// File path relative to workspace root
    pub path: String,
    /// Filename
    pub name: String,
    /// Detected programming language
    pub language: String,
    /// File size in bytes
    pub size: u64,
    /// Match score (higher = better match)
    pub score: f64,
}

/// The search engine that operates over the file index.
///
/// Provides multiple search strategies optimized for different use cases:
/// - **Inverted index lookup** for fast token-based full-text search
/// - **Regex engine** for pattern-based search
/// - **Trie traversal** for filename autocomplete
/// - **Fuzzy matching** for approximate string matching
pub struct SearchEngine {
    /// Reference to the shared file indexer
    indexer: Arc<FileIndexer>,
}

impl SearchEngine {
    /// Creates a new SearchEngine backed by the given indexer.
    pub fn new(indexer: Arc<FileIndexer>) -> Self {
        Self { indexer }
    }

    /// Performs a full-text search based on the query options.
    ///
    /// The search strategy is determined by the query parameters:
    /// - If `use_regex` is true, uses regex search
    /// - If `match_case` is true, uses case-sensitive inverted index lookup
    /// - Otherwise, uses fast case-insensitive inverted index lookup
    ///
    /// Results are optionally filtered by file type and deduplicated.
    pub fn search(&self, query: &SearchQuery) -> SearchResults {
        let start = Instant::now();
        let indexed_files = self.indexer.get_file_metadata().len();

        if query.query.is_empty() {
            return SearchResults {
                results: Vec::new(),
                total: 0,
                time_ms: start.elapsed().as_millis() as u64,
                indexed_files,
            };
        }

        let results = if query.use_regex {
            self.search_regex_internal(&query.query, query)
        } else if query.match_case {
            self.search_case_sensitive(&query.query, query)
        } else if query.whole_word {
            self.search_whole_word(&query.query, query)
        } else {
            self.search_case_insensitive(&query.query, query)
        };

        let elapsed = start.elapsed();
        info!(
            "Search '{}' returned {} results in {}ms",
            query.query,
            results.len(),
            elapsed.as_millis()
        );

        let total = results.len();
        let limited: Vec<SearchResult> = results.into_iter().take(query.max_results).collect();

        SearchResults {
            results: limited,
            total,
            time_ms: elapsed.as_millis() as u64,
            indexed_files,
        }
    }

    /// Searches for filenames matching the given query.
    ///
    /// Uses the trie for prefix matching and also performs
    /// substring matching for fuzzy results.
    pub fn search_filenames(&self, query: &str) -> Vec<FileMatch> {
        if query.is_empty() {
            return Vec::new();
        }

        let trie = self.indexer.get_filename_trie();
        let metadata = self.indexer.get_file_metadata();
        let query_lower = query.to_lowercase();

        // Get prefix matches from the trie
        let prefix_matches = trie.starts_with(query);

        let mut results: Vec<FileMatch> = Vec::new();
        let mut seen_paths = std::collections::HashSet::new();

        // Add prefix matches (highest score)
        for path in &prefix_matches {
            if seen_paths.contains(path) {
                continue;
            }
            seen_paths.insert(path.clone());

            if let Some(meta) = metadata.get(path) {
                results.push(FileMatch {
                    path: meta.path.clone(),
                    name: meta.name.clone(),
                    language: meta.language.clone(),
                    size: meta.size,
                    score: 1.0, // Perfect prefix match
                });
            }
        }

        // Also search for substring matches in filenames
        for (_, meta) in metadata.iter() {
            if seen_paths.contains(&meta.path) {
                continue;
            }

            let name_lower = meta.name.to_lowercase();
            if name_lower.contains(&query_lower) {
                seen_paths.insert(meta.path.clone());

                // Score based on match position (earlier = better)
                let pos = name_lower.find(&query_lower).unwrap_or(0) as f64;
                let score = 1.0 / (1.0 + pos * 0.1);

                results.push(FileMatch {
                    path: meta.path.clone(),
                    name: meta.name.clone(),
                    language: meta.language.clone(),
                    size: meta.size,
                    score,
                });
            }
        }

        // Sort by score descending
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        results.truncate(50);
        results
    }

    /// Performs a regex-based search across all indexed files.
    ///
    /// The regex is applied to each line in the inverted index.
    /// Invalid regex patterns return an empty result set.
    pub fn search_regex(&self, pattern: &str, query: &SearchQuery) -> SearchResults {
        let start = Instant::now();
        let indexed_files = self.indexer.get_file_metadata().len();

        let results = self.search_regex_internal(pattern, query);
        let total = results.len();
        let limited: Vec<SearchResult> = results.into_iter().take(query.max_results).collect();

        SearchResults {
            results: limited,
            total,
            time_ms: start.elapsed().as_millis() as u64,
            indexed_files,
        }
    }

    /// Returns autocomplete suggestions for the given prefix.
    ///
    /// Uses the filename trie for fast prefix-based lookups.
    pub fn suggest(&self, prefix: &str) -> Vec<String> {
        if prefix.is_empty() {
            return Vec::new();
        }

        let trie = self.indexer.get_filename_trie();
        trie.collect_suggestions(prefix, 20)
    }

    // ── Private search implementations ──────────────────────────────

    /// Case-insensitive search using the inverted index.
    ///
    /// This is the fastest search mode: it looks up the lowercase
    /// query in the inverted index and returns all matches.
    fn search_case_insensitive(
        &self,
        query: &str,
        options: &SearchQuery,
    ) -> Vec<SearchResult> {
        let query_lower = query.to_lowercase();
        let index = self.indexer.get_inverted_index();

        // Try exact token lookup first
        let mut matches: Vec<SearchResult> = Vec::new();

        if let Some(entries) = index.get(&query_lower) {
            for m in entries.iter() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                // Find the actual match position in the content
                let content_lower = m.content.to_lowercase();
                if let Some(pos) = content_lower.find(&query_lower) {
                    matches.push(SearchResult {
                        path: m.path.clone(),
                        name: self.extract_filename(&m.path),
                        line: m.line,
                        content: m.content.clone(),
                        match_start: pos,
                        match_end: pos + query.len(),
                        language: self.get_language(&m.path),
                    });
                }
            }
        }

        // If no exact match, try substring search across all entries
        if matches.is_empty() {
            // Fall back to scanning file content
            matches = self.fallback_substring_search(query, false, options);
        }

        matches
    }

    /// Case-sensitive search using the inverted index.
    fn search_case_sensitive(
        &self,
        query: &str,
        options: &SearchQuery,
    ) -> Vec<SearchResult> {
        let index = self.indexer.get_inverted_index();

        // Try case-sensitive token lookup
        let mut matches: Vec<SearchResult> = Vec::new();

        if let Some(entries) = index.get(query) {
            for m in entries.iter() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                if let Some(pos) = m.content.find(query) {
                    matches.push(SearchResult {
                        path: m.path.clone(),
                        name: self.extract_filename(&m.path),
                        line: m.line,
                        content: m.content.clone(),
                        match_start: pos,
                        match_end: pos + query.len(),
                        language: self.get_language(&m.path),
                    });
                }
            }
        }

        // Also try lowercase lookup and filter by case
        let query_lower = query.to_lowercase();
        if let Some(entries) = index.get(&query_lower) {
            for m in entries.iter() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                if let Some(pos) = m.content.find(query) {
                    // Check if this match is already in the results
                    if !matches.iter().any(|r| r.path == m.path && r.line == m.line) {
                        matches.push(SearchResult {
                            path: m.path.clone(),
                            name: self.extract_filename(&m.path),
                            line: m.line,
                            content: m.content.clone(),
                            match_start: pos,
                            match_end: pos + query.len(),
                            language: self.get_language(&m.path),
                        });
                    }
                }
            }
        }

        matches
    }

    /// Whole-word search: matches the query only when it appears as
    /// a complete word (delimited by non-alphanumeric characters).
    fn search_whole_word(
        &self,
        query: &str,
        options: &SearchQuery,
    ) -> Vec<SearchResult> {
        let query_lower = query.to_lowercase();
        let index = self.indexer.get_inverted_index();
        let mut matches: Vec<SearchResult> = Vec::new();

        if let Some(entries) = index.get(&query_lower) {
            for m in entries.iter() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                // Find all occurrences and check word boundaries
                let content_lower = m.content.to_lowercase();
                for (pos, _) in content_lower.match_indices(&query_lower) {
                    if Self::is_whole_word(&m.content, pos, query.len()) {
                        matches.push(SearchResult {
                            path: m.path.clone(),
                            name: self.extract_filename(&m.path),
                            line: m.line,
                            content: m.content.clone(),
                            match_start: pos,
                            match_end: pos + query.len(),
                            language: self.get_language(&m.path),
                        });
                        break; // One match per line is enough
                    }
                }
            }
        }

        matches
    }

    /// Regex search: applies a regex pattern to each line in the index.
    fn search_regex_internal(
        &self,
        pattern: &str,
        options: &SearchQuery,
    ) -> Vec<SearchResult> {
        let re = match Regex::new(pattern) {
            Ok(re) => re,
            Err(e) => {
                debug!("Invalid regex pattern '{}': {}", pattern, e);
                return Vec::new();
            }
        };

        let index = self.indexer.get_inverted_index();
        let mut matches: Vec<SearchResult> = Vec::new();
        let mut seen = std::collections::HashSet::new();

        // Scan all inverted index entries
        for entry in index.iter() {
            for m in entry.value() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                // Deduplicate by (path, line)
                let key = (m.path.clone(), m.line);
                if seen.contains(&key) {
                    continue;
                }

                if let Some(mat) = re.find(&m.content) {
                    seen.insert(key);
                    matches.push(SearchResult {
                        path: m.path.clone(),
                        name: self.extract_filename(&m.path),
                        line: m.line,
                        content: m.content.clone(),
                        match_start: mat.start(),
                        match_end: mat.end(),
                        language: self.get_language(&m.path),
                    });
                }
            }
        }

        matches
    }

    /// Fallback substring search when the inverted index doesn't have
    /// a direct token match. Scans all file content linearly.
    fn fallback_substring_search(
        &self,
        query: &str,
        case_sensitive: bool,
        options: &SearchQuery,
    ) -> Vec<SearchResult> {
        let index = self.indexer.get_inverted_index();
        let mut matches: Vec<SearchResult> = Vec::new();
        let mut seen = std::collections::HashSet::new();

        let query_lower = query.to_lowercase();

        // Scan through all entries looking for substring matches
        for entry in index.iter() {
            // Only scan entries whose key could contain the query
            let key_lower = entry.key().to_lowercase();
            if !key_lower.contains(&query_lower) && !query_lower.contains(&key_lower) {
                // Skip if there's no overlap at all between the key and query
                continue;
            }

            for m in entry.value() {
                if !self.passes_file_type_filter(&m.path, &options.file_types) {
                    continue;
                }

                let key = (m.path.clone(), m.line);
                if seen.contains(&key) {
                    continue;
                }

                let pos = if case_sensitive {
                    m.content.find(query)
                } else {
                    m.content.to_lowercase().find(&query_lower)
                };

                if let Some(pos) = pos {
                    seen.insert(key);
                    matches.push(SearchResult {
                        path: m.path.clone(),
                        name: self.extract_filename(&m.path),
                        line: m.line,
                        content: m.content.clone(),
                        match_start: pos,
                        match_end: pos + query.len(),
                        language: self.get_language(&m.path),
                    });
                }
            }
        }

        matches
    }

    /// Checks whether a match at the given position is a whole word.
    fn is_whole_word(content: &str, start: usize, len: usize) -> bool {
        let bytes = content.as_bytes();

        // Check character before the match
        if start > 0 {
            let before = bytes[start - 1];
            if before.is_ascii_alphanumeric() || before == b'_' {
                return false;
            }
        }

        // Check character after the match
        let end = start + len;
        if end < bytes.len() {
            let after = bytes[end];
            if after.is_ascii_alphanumeric() || after == b'_' {
                return false;
            }
        }

        true
    }

    /// Checks if a file path passes the file type filter.
    fn passes_file_type_filter(&self, path: &str, file_types: &[String]) -> bool {
        if file_types.is_empty() {
            return true;
        }

        let ext = std::path::Path::new(path)
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        file_types.iter().any(|ft| ft.to_lowercase() == ext)
    }

    /// Extracts the filename from a path.
    fn extract_filename(&self, path: &str) -> String {
        std::path::Path::new(path)
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string())
    }

    /// Gets the language for a file path from the metadata.
    fn get_language(&self, path: &str) -> String {
        self.indexer
            .get_file_metadata()
            .get(path)
            .map(|m| m.language.clone())
            .unwrap_or_else(|| "Unknown".to_string())
    }
}
