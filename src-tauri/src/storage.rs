use crate::db;
use crate::models::{Snapshot, SnapshotFile};
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

pub struct StorageEngine {
    pub base_dir: PathBuf,
    pub blobs_dir: PathBuf,
}

impl StorageEngine {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> Self {
        let base = base_dir.as_ref().to_path_buf();
        let blobs = base.join("blobs");
        fs::create_dir_all(&blobs).unwrap_or_default();
        Self {
            base_dir: base,
            blobs_dir: blobs,
        }
    }

    /// Hashes a file with BLAKE3 and stores the deduplicated blob
    pub fn store_blob<P: AsRef<Path>>(&self, file_path: P) -> Result<(String, u64), String> {
        let path = file_path.as_ref();
        let bytes = fs::read(path).map_err(|e| format!("Failed to read file for hashing: {}", e))?;
        let hash = blake3::hash(&bytes).to_hex().to_string();

        let prefix = &hash[..2];
        let blob_subdir = self.blobs_dir.join(prefix);
        let blob_file = blob_subdir.join(&hash);

        fs::create_dir_all(&blob_subdir).map_err(|e| e.to_string())?;

        if !blob_file.exists() {
            fs::write(&blob_file, &bytes).map_err(|e| format!("Failed to write blob: {}", e))?;
        }

        Ok((hash, bytes.len() as u64))
    }

    /// Captures a snapshot for a given game slot and updates SQLite
    pub fn capture_snapshot(
        &self,
        conn: &Connection,
        game_id: &str,
        slot_id: u32,
        files: &[(String, PathBuf)], // (relative_path, absolute_path)
        is_pinned: bool,
        is_safety: bool,
        notes: Option<String>,
    ) -> Result<Snapshot, String> {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let snapshot_id = format!("snap_{}_slot{}", chrono::Local::now().timestamp_millis(), slot_id);

        let mut total_bytes = 0u64;
        let mut manifest_files = Vec::new();

        for (rel_path, abs_path) in files {
            let (hash, size) = self.store_blob(abs_path)?;
            total_bytes += size;
            manifest_files.push(SnapshotFile {
                snapshot_id: snapshot_id.clone(),
                relative_path: rel_path.clone(),
                blob_hash: hash,
                file_size: size,
            });
        }

        // Calculate delta from previous snapshot in this slot
        let existing = db::get_snapshots(conn, game_id, Some(slot_id)).unwrap_or_default();
        let prev_size = existing.first().map(|s| s.size_bytes).unwrap_or(0);

        let delta_bytes = if existing.is_empty() {
            0i64
        } else {
            total_bytes as i64 - prev_size as i64
        };

        let auto_title = if is_safety {
            format!("[Pre-Restore Safety Rollback] Before rewinding Slot {}", slot_id)
        } else if existing.is_empty() {
            format!("Slot {} Initialized ({:.1} KB)", slot_id, total_bytes as f64 / 1024.0)
        } else if delta_bytes >= 0 {
            format!("Slot {} changed (+{:.1} KB)", slot_id, delta_bytes as f64 / 1024.0)
        } else {
            format!("Slot {} changed ({:.1} KB)", slot_id, delta_bytes as f64 / 1024.0)
        };

        let snapshot = Snapshot {
            id: snapshot_id.clone(),
            game_id: game_id.to_string(),
            slot_id,
            title: auto_title,
            notes,
            size_bytes: total_bytes,
            delta_bytes,
            is_pinned: is_pinned || is_safety,
            is_safety_rollback: is_safety,
            created_at: timestamp,
        };

        db::insert_snapshot(conn, &snapshot).map_err(|e| format!("DB snapshot insert error: {}", e))?;

        for f in manifest_files {
            db::insert_snapshot_file(conn, &f).map_err(|e| format!("DB file insert error: {}", e))?;
        }

        Ok(snapshot)
    }

    /// Reconstructs files from CAS blobs into a target directory
    pub fn restore_files_to_directory<P: AsRef<Path>>(
        &self,
        conn: &Connection,
        snapshot_id: &str,
        dest_dir: P,
    ) -> Result<(), String> {
        let dest = dest_dir.as_ref();
        let files = db::get_snapshot_files(conn, snapshot_id)
            .map_err(|e| format!("Failed to read snapshot manifest: {}", e))?;

        for f in files {
            let prefix = &f.blob_hash[..2];
            let blob_path = self.blobs_dir.join(prefix).join(&f.blob_hash);

            if !blob_path.exists() {
                return Err(format!("Missing blob payload: {}", f.blob_hash));
            }

            let target_file = dest.join(&f.relative_path);
            if let Some(parent) = target_file.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            fs::copy(&blob_path, &target_file)
                .map_err(|e| format!("Failed copying file {}: {}", f.relative_path, e))?;
        }

        Ok(())
    }
}

