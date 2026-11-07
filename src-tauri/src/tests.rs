#[cfg(test)]
mod tests {
    use crate::db;
    use crate::models::{GameProfile, Snapshot};
    use crate::storage::StorageEngine;
    use rusqlite::Connection;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_sqlite_init_and_snapshot_operations() {
        let conn = Connection::open_in_memory().expect("Failed to open in-memory SQLite");
        db::init_db(&conn).expect("Failed to initialize SQLite schema");

        let profile = GameProfile {
            id: "test-game".into(),
            name: "Test Game".into(),
            slug: "test-game".into(),
            watch_path: "C:\\Saves\\Test".into(),
            process_name: "test.exe".into(),
            slot_pattern: "slot*".into(),
            is_detected: true,
        };

        db::insert_game(&conn, &profile).expect("Failed to insert game");

        let snap1 = Snapshot {
            id: "snap-1".into(),
            game_id: "test-game".into(),
            slot_id: 0,
            title: "Slot 0 Initialized (450.0 KB)".into(),
            notes: Some("Shrine save".into()),
            size_bytes: 450 * 1024,
            delta_bytes: 0,
            is_pinned: false,
            is_safety_rollback: false,
            created_at: "2026-11-07 14:00:00".into(),
        };

        db::insert_snapshot(&conn, &snap1).expect("Failed to insert snapshot 1");

        let snapshots = db::get_snapshots(&conn, "test-game", Some(0)).expect("Query snapshots");
        assert_eq!(snapshots.len(), 1);
        assert_eq!(snapshots[0].title, "Slot 0 Initialized (450.0 KB)");
        assert!(!snapshots[0].is_pinned);

        // Test pin toggle
        let is_pinned = db::toggle_pin(&conn, "snap-1").expect("Toggle pin");
        assert!(is_pinned);

        let snapshots_updated = db::get_snapshots(&conn, "test-game", Some(0)).expect("Query updated");
        assert!(snapshots_updated[0].is_pinned);
    }

    #[test]
    fn test_cas_blake3_deduplication() {
        let temp = tempdir().expect("tempdir");
        let storage = StorageEngine::new(temp.path().join("storage"));

        let file1 = temp.path().join("slot0_save.dat");
        fs::write(&file1, b"BINARY_SAVE_STATE_DATA_CHUNK_AAA").expect("write file1");

        let (hash1, size1) = storage.store_blob(&file1).expect("store blob 1");
        assert_eq!(size1, 32);

        // Store same content again; should deduplicate
        let file2 = temp.path().join("slot1_save.dat");
        fs::write(&file2, b"BINARY_SAVE_STATE_DATA_CHUNK_AAA").expect("write file2");

        let (hash2, size2) = storage.store_blob(&file2).expect("store blob 2");
        assert_eq!(hash1, hash2);
        assert_eq!(size2, 32);

        // Verify blob exists on disk once under prefix
        let prefix = &hash1[..2];
        let blob_path = storage.blobs_dir.join(prefix).join(&hash1);
        assert!(blob_path.exists());
    }
}
