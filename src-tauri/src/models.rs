use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameProfile {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub watch_path: String,
    pub process_name: String,
    pub slot_pattern: String,
    pub is_detected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: String,
    pub game_id: String,
    pub slot_id: u32,
    pub title: String,
    pub notes: Option<String>,
    pub size_bytes: u64,
    pub delta_bytes: i64,
    pub is_pinned: bool,
    pub is_safety_rollback: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotFile {
    pub snapshot_id: String,
    pub relative_path: String,
    pub blob_hash: String,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlobRecord {
    pub hash: String,
    pub size_bytes: u64,
    pub compressed_size: u64,
    pub ref_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreResult {
    pub success: bool,
    pub error: Option<String>,
    pub restored_snapshot_id: Option<String>,
    pub safety_snapshot_id: Option<String>,
    pub cloud_advisory: Option<String>,
}

