//! HTTP API route handlers for the VS Code Search Service.
//!
//! This module defines all Axum route handlers and request/response types
//! for the search service's REST API.

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

use crate::indexer::{FileIndexer, IndexStats};
use crate::searcher::{
    FileMatch, SearchEngine, SearchQuery, SearchResult, SearchResults,
};

/// Shared application state passed to all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub indexer: Arc<FileIndexer>,
    pub searcher: Arc<SearchEngine>,
}

/// Error type for API responses.
#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(serde_json::json!({
                "error": self.message,
                "status": self.status.as_u16(),
            })),
        )
            .into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: err.to_string(),
        }
    }
}

// ── Request / Response Types ────────────────────────────────────────

/// Response for the health check endpoint.
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_seconds: u64,
}

/// Query parameters for the suggest endpoint.
#[derive(Debug, Deserialize)]
pub struct SuggestQuery {
    /// The prefix to autocomplete
    pub q: String,
}

/// Request body for triggering a reindex.
#[derive(Debug, Serialize, Deserialize)]
pub struct ReindexRequest {
    /// Optional specific path to reindex (if empty, full reindex)
    #[serde(default)]
    pub path: Option<String>,
}

/// Response for the reindex endpoint.
#[derive(Debug, Serialize, Deserialize)]
pub struct ReindexResponse {
    pub success: bool,
    pub files_indexed: usize,
    pub time_ms: u64,
    pub message: String,
}

/// Response for filename search.
#[derive(Debug, Serialize, Deserialize)]
pub struct FilenameSearchResponse {
    pub results: Vec<FileMatch>,
    pub total: usize,
    pub time_ms: u64,
}

// ── Route Handlers ──────────────────────────────────────────────────

/// `GET /health` — Health check endpoint.
///
/// Returns the service status and uptime.
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: 0, // Would be tracked with a start time
    })
}

/// `POST /api/search` — Full-text search endpoint.
///
/// Accepts a `SearchQuery` in the request body and returns matching
/// results from the indexed files.
///
/// # Request Body
/// ```json
/// {
///   "query": "function",
///   "match_case": false,
///   "whole_word": false,
///   "use_regex": false,
///   "file_types": ["ts", "js"],
///   "max_results": 100
/// }
/// ```
pub async fn search(
    State(state): State<AppState>,
    Json(query): Json<SearchQuery>,
) -> Result<Json<SearchResults>, ApiError> {
    debug!("Search request: {:?}", query);

    if query.query.is_empty() {
        return Err(ApiError {
            status: StatusCode::BAD_REQUEST,
            message: "Query cannot be empty".to_string(),
        });
    }

    if query.use_regex {
        // Validate regex pattern
        if let Err(e) = regex::Regex::new(&query.query) {
            return Err(ApiError {
                status: StatusCode::BAD_REQUEST,
                message: format!("Invalid regex pattern: {}", e),
            });
        }
    }

    let results = state.searcher.search(&query);
    Ok(Json(results))
}

/// `POST /api/search/filenames` — Filename search endpoint.
///
/// Searches for files by name. The query is matched against
/// filenames using prefix and substring matching.
///
/// # Request Body
/// ```json
/// {
///   "query": "button"
/// }
/// ```
pub async fn search_filenames(
    State(state): State<AppState>,
    Json(body): Json<SearchQuery>,
) -> Result<Json<FilenameSearchResponse>, ApiError> {
    debug!("Filename search request: {}", body.query);

    if body.query.is_empty() {
        return Err(ApiError {
            status: StatusCode::BAD_REQUEST,
            message: "Query cannot be empty".to_string(),
        });
    }

    let start = std::time::Instant::now();
    let results = state.searcher.search_filenames(&body.query);
    let total = results.len();

    Ok(Json(FilenameSearchResponse {
        results,
        total,
        time_ms: start.elapsed().as_millis() as u64,
    }))
}

/// `GET /api/search/suggest?q=prefix` — Autocomplete suggestions.
///
/// Returns filename suggestions based on the given prefix.
/// Uses the trie data structure for fast prefix lookups.
pub async fn suggest(
    State(state): State<AppState>,
    Query(params): Query<SuggestQuery>,
) -> Result<Json<Vec<String>>, ApiError> {
    debug!("Suggest request: {}", params.q);

    if params.q.is_empty() {
        return Ok(Json(Vec::new()));
    }

    let suggestions = state.searcher.suggest(&params.q);
    Ok(Json(suggestions))
}

/// `POST /api/index` — Trigger reindexing.
///
/// If a `path` is specified in the request body, only that file
/// is reindexed. Otherwise, a full reindex of the workspace is performed.
///
/// # Request Body
/// ```json
/// {
///   "path": "src/main.rs"  // optional, for single file reindex
/// }
/// ```
pub async fn trigger_reindex(
    State(state): State<AppState>,
    Json(body): Json<ReindexRequest>,
) -> Result<Json<ReindexResponse>, ApiError> {
    info!("Reindex request: {:?}", body);

    let start = std::time::Instant::now();

    let files_indexed = match body.path {
        Some(path) => {
            state.indexer.index_file(&path);
            1
        }
        None => {
            // Full reindex — run in a blocking task to not block the async runtime
            let indexer = state.indexer.clone();
            tokio::task::spawn_blocking(move || indexer.index_all())
                .await
                .map_err(|e| ApiError {
                    status: StatusCode::INTERNAL_SERVER_ERROR,
                    message: format!("Reindex task failed: {}", e),
                })?
        }
    };

    let elapsed = start.elapsed();

    Ok(Json(ReindexResponse {
        success: true,
        files_indexed,
        time_ms: elapsed.as_millis() as u64,
        message: if body.path.is_some() {
            format!("Reindexed file: {}", body.path.unwrap())
        } else {
            "Full reindex completed".to_string()
        },
    }))
}

/// `GET /api/index/stats` — Index statistics.
///
/// Returns statistics about the current state of the search index,
/// including file count, token count, memory usage, and language distribution.
pub async fn index_stats(
    State(state): State<AppState>,
) -> Json<IndexStats> {
    let stats = state.indexer.get_stats();
    Json(stats)
}

/// Fallback handler for unmatched routes.
pub async fn not_found() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({
            "error": "Not found",
            "status": 404,
        })),
    )
}
