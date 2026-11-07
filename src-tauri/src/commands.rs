use crate::db;
use crate::models::{RestoreResult, Snapshot};
use crate::restore::SafeRestoreManager;
use crate::storage::StorageEngine;
use rusqlite::Connection;
use std::env;
use std::fs;
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

    // 1. Check Microsoft Store Packages
    let packages = PathBuf::from(&local_app_data).join("Packages");
    if packages.exists() {
        if let Ok(entries) = fs::read_dir(&packages) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.contains("ProjectPlague") || name.contains("505GAMES") {
                    let candidate = entry.path().join("LocalState").join("Saved");
                    if candidate.exists() {
                        if let Ok(users) = fs::read_dir(&candidate) {
                            for u in users.flatten() {
                                let slots = u.path().join("GameSlots");
                                if slots.exists() {
                                    return Some(slots.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Check Standard Steam / LocalAppData
    let candidate_steam = PathBuf::from(&local_app_data)
        .join("Project_Plague")
        .join("Saved")
        .join("GameSlots");

    if candidate_steam.exists() {
        Some(candidate_steam.to_string_lossy().to_string())
    } else {
        None
    }
}

#[tauri::command]
pub fn quick_mark(
    state: State<'_, AppState>,
    label: String,
    target_dir: Option<String>,
) -> Result<Snapshot, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let path = target_dir.unwrap_or_else(|| {
        detect_wuchang_path().unwrap_or_else(|| "./test_gameslots/maingame0".into())
    });

    let target_path = PathBuf::from(&path);
    let mut files = Vec::new();
    if target_path.exists() {
        if let Ok(entries) = fs::read_dir(&target_path) {
            for e in entries.flatten() {
                let p = e.path();
                if p.is_file() {
                    files.push((e.file_name().to_string_lossy().to_string(), p));
                }
            }
        }
    }

    let note = format!("Quick Mark: {}", label);
    state.storage.capture_snapshot(
        &conn,
        "wuchang",
        0,
        &files,
        true, // Always pin quick marks!
        false,
        Some(note),
    )
}

#[tauri::command]
pub fn simulate_save_write(target_dir: Option<String>, delta_kb: Option<u32>) -> Result<String, String> {
    let dir = target_dir.unwrap_or_else(|| "./test_gameslots/maingame0".into());
    let path = PathBuf::from(&dir);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;

    let save_file = path.join("save_data.sav");
    let kb = delta_kb.unwrap_or(12);
    let dummy_data = vec![0xAB; (kb * 1024) as usize];
    fs::write(&save_file, dummy_data).map_err(|e| e.to_string())?;

    Ok(format!("Simulated save write of {} KB to {:?}", kb, save_file))
}
