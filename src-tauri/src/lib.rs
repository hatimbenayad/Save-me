pub mod commands;
pub mod db;
pub mod models;
pub mod restore;
pub mod storage;
pub mod watcher;

#[cfg(test)]
mod tests;

use commands::AppState;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use storage::StorageEngine;

pub fn run() {
    let app_dir = directories::ProjectDirs::from("com", "saverewind", "SaveMe")
        .map(|d| d.data_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("./.save-me"));

    fs::create_dir_all(&app_dir).unwrap_or_default();

    let db_path = app_dir.join("meta.db");
    let conn = Connection::open(&db_path).expect("Failed to open SQLite meta.db");
    db::init_db(&conn).expect("Failed to initialize SQLite tables");

    let storage = StorageEngine::new(app_dir.join("storage"));

    let state = AppState {
        db: Mutex::new(conn),
        storage,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_snapshots,
            commands::update_title,
            commands::toggle_pin,
            commands::restore_snapshot,
            commands::detect_wuchang_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

