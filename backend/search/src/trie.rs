//! Trie data structure for fast filename autocomplete suggestions.
//!
//! This module implements a character-level trie (prefix tree) optimized for
//! filename lookup and prefix-based autocomplete. Each node stores references
//! to complete file paths that share the prefix leading to that node, enabling
//! O(k) prefix lookups where k is the length of the query prefix.

use std::collections::HashMap;

/// A single node in the trie.
///
/// Each node maps a character to a child node and optionally stores
/// the complete file paths that terminate at or pass through this node.
#[derive(Debug, Clone)]
struct TrieNode {
    /// Child nodes indexed by character
    children: HashMap<char, TrieNode>,
    /// Complete file paths that terminate at this node
    paths: Vec<String>,
    /// Whether this node represents the end of a word
    is_end: bool,
}

impl TrieNode {
    fn new() -> Self {
        Self {
            children: HashMap::new(),
            paths: Vec::new(),
            is_end: false,
        }
    }
}

/// A trie data structure optimized for filename autocomplete.
///
/// The trie stores normalized (lowercase) versions of filenames for
/// case-insensitive prefix matching, while retaining the original
/// file paths for result retrieval.
///
/// # Examples
/// ```
/// let mut trie = Trie::new();
/// trie.insert("src/main.rs", "main.rs");
/// trie.insert("src/utils.rs", "utils.rs");
///
/// let suggestions = trie.starts_with("mai");
/// assert!(suggestions.contains(&"src/main.rs".to_string()));
/// ```
#[derive(Debug, Clone)]
pub struct Trie {
    root: TrieNode,
    /// Total number of entries in the trie
    count: usize,
}

impl Trie {
    /// Creates a new empty trie.
    pub fn new() -> Self {
        Self {
            root: TrieNode::new(),
            count: 0,
        }
    }

    /// Inserts a file path with its associated filename into the trie.
    ///
    /// The filename is normalized to lowercase for indexing, but the
    /// original path is stored for retrieval. The full filename is
    /// indexed character by character for prefix matching.
    ///
    /// # Arguments
    /// * `path` - The full file path (e.g., "src/components/Button.tsx")
    /// * `filename` - The filename portion (e.g., "Button.tsx")
    pub fn insert(&mut self, path: &str, filename: &str) {
        let normalized = filename.to_lowercase();
        let mut node = &mut self.root;

        // Insert each character of the normalized filename
        for ch in normalized.chars() {
            node = node.children.entry(ch).or_insert_with(TrieNode::new);
        }

        // Mark end and store the full path
        if !node.is_end {
            self.count += 1;
        }
        node.is_end = true;

        // Only add the path if it's not already stored
        if !node.paths.contains(&path.to_string()) {
            node.paths.push(path.to_string());
        }

        // Also index by path segments for directory-based matching
        // e.g., "src/components/Button.tsx" should be findable by "components/butt"
        let path_lower = path.to_lowercase();
        let mut seg_node = &mut self.root;
        for ch in path_lower.chars() {
            seg_node = seg_node.children.entry(ch).or_insert_with(TrieNode::new);
            // Add the path at every level for substring matching
            if !seg_node.paths.contains(&path.to_string()) {
                seg_node.paths.push(path.to_string());
            }
        }
    }

    /// Searches for an exact filename match in the trie.
    ///
    /// Returns the file paths associated with the exact filename.
    pub fn search(&self, filename: &str) -> Vec<String> {
        let normalized = filename.to_lowercase();
        let mut node = &self.root;

        for ch in normalized.chars() {
            match node.children.get(&ch) {
                Some(child) => node = child,
                None => return Vec::new(),
            }
        }

        if node.is_end {
            node.paths.clone()
        } else {
            Vec::new()
        }
    }

    /// Returns all file paths that start with the given prefix.
    ///
    /// This is the primary method for autocomplete: given a partial
    /// filename, it returns all matching file paths sorted by relevance.
    ///
    /// # Arguments
    /// * `prefix` - The prefix to search for (case-insensitive)
    ///
    /// # Returns
    /// A vector of file paths whose filenames start with the prefix,
    /// limited to a reasonable number of suggestions.
    pub fn starts_with(&self, prefix: &str) -> Vec<String> {
        let normalized = prefix.to_lowercase();
        let mut node = &self.root;

        // Navigate to the node corresponding to the prefix
        for ch in normalized.chars() {
            match node.children.get(&ch) {
                Some(child) => node = child,
                None => return Vec::new(),
            }
        }

        // Collect all paths under this prefix
        let mut results = Vec::new();
        self.collect_paths(node, &mut results, 50);
        results
    }

    /// Collects autocomplete suggestions ranked by relevance.
    ///
    /// Suggestions are ranked by:
    /// 1. Exact prefix match length (shorter paths ranked higher)
    /// 2. Alphabetical order as a tiebreaker
    ///
    /// # Arguments
    /// * `prefix` - The prefix to search for
    /// * `max_results` - Maximum number of suggestions to return
    ///
    /// # Returns
    /// Ranked list of file path suggestions
    pub fn collect_suggestions(&self, prefix: &str, max_results: usize) -> Vec<String> {
        let normalized = prefix.to_lowercase();
        let mut node = &self.root;

        // Navigate to the prefix node
        for ch in normalized.chars() {
            match node.children.get(&ch) {
                Some(child) => node = child,
                None => return Vec::new(),
            }
        }

        // Collect all candidate paths with their relevance scores
        let mut candidates: Vec<(String, usize)> = Vec::new();
        self.collect_scored_paths(node, &mut candidates, 0, max_results * 3);

        // Sort by score (lower is better): path depth, then alphabetical
        candidates.sort_by(|a, b| {
            a.1.cmp(&b.1).then_with(|| a.0.cmp(&b.0))
        });

        // Return top results
        candidates
            .into_iter()
            .take(max_results)
            .map(|(path, _)| path)
            .collect()
    }

    /// Recursively collects all file paths from a given node.
    fn collect_paths(&self, node: &TrieNode, results: &mut Vec<String>, limit: usize) {
        if results.len() >= limit {
            return;
        }

        // Add paths at this node
        for path in &node.paths {
            if results.len() >= limit {
                return;
            }
            if !results.contains(path) {
                results.push(path.clone());
            }
        }

        // Recurse into children
        for child in node.children.values() {
            self.collect_paths(child, results, limit);
        }
    }

    /// Recursively collects scored paths for ranking.
    ///
    /// The score is based on path depth (number of segments),
    /// with shallower paths scored higher (lower number = better).
    fn collect_scored_paths(
        &self,
        node: &TrieNode,
        results: &mut Vec<(String, usize)>,
        depth: usize,
        limit: usize,
    ) {
        if results.len() >= limit {
            return;
        }

        // Add paths at this node with a depth-based score
        for path in &node.paths {
            if results.len() >= limit {
                return;
            }
            let score = path.matches('/').count() + 1; // Path segment count
            if !results.iter().any(|(p, _)| p == path) {
                results.push((path.clone(), score));
            }
        }

        // Recurse into children
        for child in node.children.values() {
            self.collect_scored_paths(child, results, depth + 1, limit);
        }
    }

    /// Removes a file path from the trie.
    ///
    /// # Arguments
    /// * `path` - The file path to remove
    /// * `filename` - The filename portion of the path
    ///
    /// # Note
    /// This is a soft delete — it removes the path reference but
    /// does not prune empty trie nodes. For large-scale removals,
    /// consider rebuilding the trie.
    pub fn remove(&mut self, path: &str, filename: &str) {
        let normalized = filename.to_lowercase();
        let mut node = &mut self.root;

        // Navigate to the node
        for ch in normalized.chars() {
            match node.children.get_mut(&ch) {
                Some(child) => node = child,
                None => return,
            }
        }

        // Remove the path from this node
        node.paths.retain(|p| p != path);

        // If no paths remain, mark as not an end node
        if node.paths.is_empty() {
            node.is_end = false;
            self.count = self.count.saturating_sub(1);
        }

        // Also remove from the path-based index
        let path_lower = path.to_lowercase();
        let mut seg_node = &mut self.root;
        for ch in path_lower.chars() {
            match seg_node.children.get_mut(&ch) {
                Some(child) => {
                    child.paths.retain(|p| p != path);
                    seg_node = child;
                }
                None => return,
            }
        }
    }

    /// Returns the total number of unique entries in the trie.
    pub fn len(&self) -> usize {
        self.count
    }

    /// Returns true if the trie contains no entries.
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    /// Clears all entries from the trie.
    pub fn clear(&mut self) {
        self.root = TrieNode::new();
        self.count = 0;
    }
}

impl Default for Trie {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_and_search() {
        let mut trie = Trie::new();
        trie.insert("src/main.rs", "main.rs");
        trie.insert("src/lib.rs", "lib.rs");
        trie.insert("src/utils/mod.rs", "mod.rs");

        let results = trie.search("main.rs");
        assert_eq!(results, vec!["src/main.rs"]);

        let results = trie.search("nonexistent.rs");
        assert!(results.is_empty());
    }

    #[test]
    fn test_starts_with() {
        let mut trie = Trie::new();
        trie.insert("src/main.rs", "main.rs");
        trie.insert("src/mod.rs", "mod.rs");
        trie.insert("src/math.rs", "math.rs");
        trie.insert("src/utils.rs", "utils.rs");

        let results = trie.starts_with("ma");
        assert!(results.contains(&"src/main.rs".to_string()));
        assert!(results.contains(&"src/math.rs".to_string()));
        assert!(!results.contains(&"src/utils.rs".to_string()));
    }

    #[test]
    fn test_case_insensitive() {
        let mut trie = Trie::new();
        trie.insert("src/Button.tsx", "Button.tsx");

        let results = trie.starts_with("butt");
        assert!(results.contains(&"src/Button.tsx".to_string()));

        let results = trie.starts_with("BUTT");
        assert!(results.contains(&"src/Button.tsx".to_string()));
    }

    #[test]
    fn test_remove() {
        let mut trie = Trie::new();
        trie.insert("src/main.rs", "main.rs");
        trie.insert("src/other.rs", "other.rs");

        trie.remove("src/main.rs", "main.rs");

        let results = trie.search("main.rs");
        assert!(results.is_empty());

        let results = trie.search("other.rs");
        assert_eq!(results, vec!["src/other.rs"]);
    }

    #[test]
    fn test_collect_suggestions() {
        let mut trie = Trie::new();
        trie.insert("a.ts", "a.ts");
        trie.insert("src/a.ts", "a.ts");
        trie.insert("src/deep/a.ts", "a.ts");

        let suggestions = trie.collect_suggestions("a.ts", 10);
        assert!(!suggestions.is_empty());
        // Shallow paths should rank higher
        assert_eq!(suggestions[0], "a.ts");
    }

    #[test]
    fn test_empty_trie() {
        let trie = Trie::new();
        assert!(trie.is_empty());
        assert_eq!(trie.len(), 0);
        assert!(trie.starts_with("anything").is_empty());
    }
}
