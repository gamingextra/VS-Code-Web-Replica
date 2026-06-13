//! VS Code Search Service — Main entry point.
//!
//! This is the main binary for the high-performance file indexing and search
//! service. It initializes the indexer, starts the file watcher for incremental
//! reindexing, and launches the HTTP server.
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────┐    ┌──────────────┐    ┌───────────────┐
//! │  File Watcher│───▶│  File Indexer │◀───│  HTTP Server   │
//! │  (notify)    │    │  (inverted idx│    │  (Axum)       │
//! └─────────────┘    │   + trie)     │    │  :3003        │
//!                     └──────┬───────┘    └───────┬───────┘
//!                            │                     │
//!                     ┌──────▼───────┐    ┌───────▼───────┐
//!                     │ Search Engine │◀───│  API Handlers  │
//!                     │ (regex/fuzzy)│    │  (api.rs)     │
//!                     └──────────────┘    └───────────────┘
//! ```
//!
//! # Environment Variables
//!
//! - `WORKSPACE_PATH`: The directory to index (default: current directory)
//! - `PORT`: HTTP server port (default: 3003)
//! - `RUST_LOG`: Log level (default: "info")

mod api;
mod indexer;
mod searcher;
mod trie;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::routing::{get, post};
use axum::Router;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

use api::AppState;
use indexer::FileIndexer;
use searcher::SearchEngine;

/// Default server port.
const DEFAULT_PORT: u16 = 3003;

/// Debounce interval for file watcher events (ms).
const WATCH_DEBOUNCE_MS: u64 = 500;

#[tokio::main]
async fn main() {
    // Initialize tracing/logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(true)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .json()
        .init();

    info!(
        "Starting VS Code Search Service v{}",
        env!("CARGO_PKG_VERSION")
    );

    // Read configuration from environment
    let workspace_path = std::env::var("WORKSPACE_PATH")
        .unwrap_or_else(|_| ".".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    info!("Workspace path: {}", workspace_path);
    info!("Server port: {}", port);

    // Initialize the file indexer and perform initial indexing
    let indexer = Arc::new(FileIndexer::new(&workspace_path));

    info!("Performing initial workspace index...");
    let file_count = indexer.index_all();
    info!("Initial index complete: {} files indexed", file_count);

    // Initialize the search engine
    let searcher = Arc::new(SearchEngine::new(indexer.clone()));

    // Create shared application state
    let state = AppState {
        indexer: indexer.clone(),
        searcher: searcher.clone(),
    };

    // Build the Axum router with all API routes
    let app = Router::new()
        // Health check
        .route("/health", get(api::health_check))
        // Search endpoints
        .route("/api/search", post(api::search))
        .route("/api/search/filenames", post(api::search_filenames))
        .route("/api/search/suggest", get(api::suggest))
        // Index management endpoints
        .route("/api/index", post(api::trigger_reindex))
        .route("/api/index/stats", get(api::index_stats))
        // Fallback for unknown routes
        .fallback(api::not_found)
        // Middleware layers
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Start the file watcher for incremental reindexing
    let watcher_indexer = indexer.clone();
    let watcher_handle = tokio::spawn(async move {
        start_file_watcher(watcher_indexer);
    });

    // Bind the server to the address
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server listening on {}", addr);

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("Failed to bind to {}: {}", addr, e);
            std::process::exit(1);
        }
    };

    // Start the server with graceful shutdown
    info!("Search service is ready to accept connections");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap_or_else(|e| {
            error!("Server error: {}", e);
            std::process::exit(1);
        });

    // Clean up the file watcher
    watcher_handle.abort();
    info!("VS Code Search Service shut down gracefully");
}

/// Starts a file watcher for the workspace directory.
///
/// The watcher monitors for file changes (create, modify, delete) and
/// triggers incremental reindexing. Events are debounced to avoid
/// excessive reindexing during bulk operations (e.g., git checkout).
///
/// Uses the `notify` crate which leverages OS-native file watching
/// (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows).
fn start_file_watcher(indexer: Arc<FileIndexer>) {
    let root_path = indexer.get_root_path().to_path_buf();

    // Create the debounced watcher
    let indexer_clone = indexer.clone();
    let root_clone = root_path.clone();

    let mut watcher: RecommendedWatcher = match Watcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            match res {
                Ok(event) => {
                    // Determine what kind of change occurred
                    let kind = event.kind;
                    let paths = &event.paths;

                    for path in paths {
                        // Only process file events (not directory events)
                        if path.is_dir() {
                            continue;
                        }

                        // Get the relative path from the workspace root
                        let relative = path
                            .strip_prefix(&root_clone)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .to_string();

                        if relative.is_empty() {
                            continue;
                        }

                        if kind.is_create() || kind.is_modify() {
                            info!("File changed (reindexing): {}", relative);
                            indexer_clone.index_file(&relative);
                        } else if kind.is_remove() {
                            info!("File removed (deindexing): {}", relative);
                            indexer_clone.remove_file(&relative);
                        } else if kind.is_other() {
                            // Handle rename, etc. as a modify
                            info!("File event (reindexing): {}", relative);
                            indexer_clone.index_file(&relative);
                        }
                    }
                }
                Err(e) => {
                    warn!("File watcher error: {}", e);
                }
            }
        },
        notify::Config::default().with_poll_interval(Duration::from_millis(WATCH_DEBOUNCE_MS)),
    ) {
        Ok(w) => w,
        Err(e) => {
            error!("Failed to create file watcher: {}", e);
            return;
        }
    };

    // Start watching the workspace directory recursively
    if let Err(e) = watcher.watch(&root_path, RecursiveMode::Recursive) {
        error!("Failed to start watching {:?}: {}", root_path, e);
        return;
    }

    info!("File watcher started for {:?}", root_path);

    // Keep the watcher alive by parking this thread.
    // The watcher will be cleaned up when the handle is aborted on shutdown.
    std::thread::park();
}

/// Waits for a shutdown signal (Ctrl+C or SIGTERM).
///
/// Used by Axum's graceful shutdown to know when to stop accepting
/// new connections and finish serving in-flight requests.
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C, shutting down...");
        },
        _ = terminate => {
            info!("Received SIGTERM, shutting down...");
        },
    }
}
