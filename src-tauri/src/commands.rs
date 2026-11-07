use crate::db;
use crate::models::{RestoreResult, Snapshot};
use crate::restore::SafeRestoreManager;
use crate::storage::StorageEngine;
use rusqlite::Connection;
use std::env;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub storage: StorageEngine,
}

#[tauri::command]
pub fn get_snapshots(
    state: State<'_, AppState>,
    game_id: String,
    slot_id: Option<u32>,
) -> Result<Vec<Snapshot>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_snapshots(&conn, &game_id, slot_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_title(
    state: State<'_, AppState>,
    snapshot_id: String,
    new_title: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::update_snapshot_title(&conn, &snapshot_id, &new_title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_pin(state: State<'_, AppState>, snapshot_id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::toggle_pin(&conn, &snapshot_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_snapshot(
    state: State<'_, AppState>,
    snapshot_id: String,
    target_dir: String,
    process_name: Option<String>,
) -> Result<RestoreResult, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let res = SafeRestoreManager::execute_restore(
        &state.storage,
        &conn,
        &snapshot_id,
        &target_dir,
        process_name.as_deref(),
        false,
    );
    Ok(res)
}

#[tauri::command]
pub fn detect_wuchang_path() -> Option<String> {
    let local_app_data = env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".into());
    let candidate = PathBuf::from(&local_app_data)
        .join("Project_Plague")
        .join("Saved")
        .join("GameSlots");

    if candidate.exists() {
        Some(candidate.to_string_lossy().to_string())
    } else {
        None
    }
}

