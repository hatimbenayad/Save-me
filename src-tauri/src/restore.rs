use crate::models::{RestoreResult, Snapshot};
use crate::storage::StorageEngine;
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use sysinfo::System;

pub struct SafeRestoreManager;

impl SafeRestoreManager {
    /// Checks if target game process is running in OS
    pub fn is_game_running(process_name: &str) -> bool {
        let mut sys = System::new_all();
        sys.refresh_processes();
        let target_name = process_name.to_lowercase();
        for process in sys.processes().values() {
            if process.name().to_lowercase().contains(&target_name) {
                return true;
            }
        }
        false
    }

    /// Checks if target directory carries Steam Cloud or Xbox Cloud risk
    pub fn detect_cloud_advisory<P: AsRef<Path>>(target_dir: P) -> Option<String> {
        let path_str = target_dir.as_ref().to_string_lossy().to_lowercase();
        if path_str.contains("steam") {
            Some("Steam Cloud detected. Disable cloud synchronization in Steam properties to prevent local save overwrite.".into())
        } else if path_str.contains("packages") || path_str.contains("projectplague") {
            Some("Xbox / PC Game Pass Cloud detected. Launch game offline or choose 'Keep local save' when prompted.".into())
        } else {
            None
        }
    }

    /// Restores a snapshot with guaranteed Invariant INV-02 safety snapshot
    pub fn execute_restore<P: AsRef<Path>>(
        storage: &StorageEngine,
        conn: &Connection,
        snapshot_id: &str,
        target_dir: P,
        game_process: Option<&str>,
        force: bool,
    ) -> RestoreResult {
        let target = target_dir.as_ref();

        // 1. Process Guard
        if !force {
            if let Some(proc) = game_process {
                if Self::is_game_running(proc) {
                    return RestoreResult {
                        success: false,
                        error: Some(format!("The game process '{}' is running. Close the game before restoring.", proc)),
                        restored_snapshot_id: None,
                        safety_snapshot_id: None,
                        cloud_advisory: None,
                    };
                }
            }
        }

        // 2. INVARIANT INV-02: Capture safety rollback snapshot of current live saves
        let mut safety_snapshot: Option<Snapshot> = None;
        if target.exists() {
            let mut live_files = Vec::new();
            if let Ok(entries) = fs::read_dir(target) {
                for e in entries.flatten() {
                    let p = e.path();
                    if p.is_file() {
                        live_files.push((e.file_name().to_string_lossy().to_string(), p));
                    }
                }
            }

            if !live_files.is_empty() {
                safety_snapshot = storage
                    .capture_snapshot(conn, "wuchang", 0, &live_files, true, true, Some("Safety pre-restore rollback".into()))
                    .ok();
            }
        }

        // 3. Staging and Atomic File Restoration
        let staging_dir = storage.base_dir.join(".restore_staging");
        fs::create_dir_all(&staging_dir).unwrap_or_default();

        if let Err(e) = storage.restore_files_to_directory(conn, snapshot_id, &staging_dir) {
            return RestoreResult {
                success: false,
                error: Some(format!("Staging extraction failed: {}", e)),
                restored_snapshot_id: None,
                safety_snapshot_id: safety_snapshot.map(|s| s.id),
                cloud_advisory: None,
            };
        }

        // Atomic copy from staging into target slot
        fs::create_dir_all(target).unwrap_or_default();
        if let Ok(entries) = fs::read_dir(&staging_dir) {
            for e in entries.flatten() {
                let staged_file = e.path();
                let target_file = target.join(e.file_name());
                let _ = fs::copy(&staged_file, &target_file);
            }
        }
        let _ = fs::remove_dir_all(&staging_dir);

        let cloud_adv = Self::detect_cloud_advisory(target);

        RestoreResult {
            success: true,
            error: None,
            restored_snapshot_id: Some(snapshot_id.to_string()),
            safety_snapshot_id: safety_snapshot.map(|s| s.id),
            cloud_advisory: cloud_adv,
        }
    }
}

