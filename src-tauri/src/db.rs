use crate::models::{GameProfile, Snapshot, SnapshotFile};
use rusqlite::{params, Connection, Result};

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            watch_path TEXT NOT NULL,
            process_name TEXT NOT NULL,
            slot_pattern TEXT DEFAULT 'maingame*',
            is_detected INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS snapshots (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            slot_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            notes TEXT,
            size_bytes INTEGER NOT NULL,
            delta_bytes INTEGER DEFAULT 0,
            is_pinned INTEGER DEFAULT 0,
            is_safety_rollback INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS blobs (
            hash TEXT PRIMARY KEY,
            size_bytes INTEGER NOT NULL,
            compressed_size INTEGER NOT NULL,
            ref_count INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS snapshot_files (
            snapshot_id TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            blob_hash TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            PRIMARY KEY (snapshot_id, relative_path),
            FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE,
            FOREIGN KEY(blob_hash) REFERENCES blobs(hash)
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_lookup 
        ON snapshots(game_id, slot_id, created_at DESC);
        ",
    )?;
    Ok(())
}

pub fn insert_game(conn: &Connection, profile: &GameProfile) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO games (id, name, slug, watch_path, process_name, slot_pattern, is_detected)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            profile.id,
            profile.name,
            profile.slug,
            profile.watch_path,
            profile.process_name,
            profile.slot_pattern,
            if profile.is_detected { 1 } else { 0 }
        ],
    )?;
    Ok(())
}

pub fn insert_snapshot(conn: &Connection, snapshot: &Snapshot) -> Result<()> {
    conn.execute(
        "INSERT INTO snapshots (id, game_id, slot_id, title, notes, size_bytes, delta_bytes, is_pinned, is_safety_rollback, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            snapshot.id,
            snapshot.game_id,
            snapshot.slot_id,
            snapshot.title,
            snapshot.notes,
            snapshot.size_bytes,
            snapshot.delta_bytes,
            if snapshot.is_pinned { 1 } else { 0 },
            if snapshot.is_safety_rollback { 1 } else { 0 },
            snapshot.created_at
        ],
    )?;
    Ok(())
}

pub fn insert_snapshot_file(conn: &Connection, file: &SnapshotFile) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO snapshot_files (snapshot_id, relative_path, blob_hash, file_size)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            file.snapshot_id,
            file.relative_path,
            file.blob_hash,
            file.file_size
        ],
    )?;
    Ok(())
}

pub fn get_snapshots(conn: &Connection, game_id: &str, slot_id: Option<u32>) -> Result<Vec<Snapshot>> {
    let mut stmt = if let Some(_slot) = slot_id {
        conn.prepare(
            "SELECT id, game_id, slot_id, title, notes, size_bytes, delta_bytes, is_pinned, is_safety_rollback, created_at
             FROM snapshots WHERE game_id = ?1 AND slot_id = ?2 ORDER BY created_at DESC",
        )?
    } else {
        conn.prepare(
            "SELECT id, game_id, slot_id, title, notes, size_bytes, delta_bytes, is_pinned, is_safety_rollback, created_at
             FROM snapshots WHERE game_id = ?1 ORDER BY created_at DESC",
        )?
    };

    let rows = if let Some(slot) = slot_id {
        stmt.query_map(params![game_id, slot], parse_snapshot_row)?
    } else {
        stmt.query_map(params![game_id], parse_snapshot_row)?
    };

    let mut snapshots = Vec::new();
    for row in rows {
        snapshots.push(row?);
    }
    Ok(snapshots)
}

fn parse_snapshot_row(row: &rusqlite::Row) -> rusqlite::Result<Snapshot> {
    Ok(Snapshot {
        id: row.get(0)?,
        game_id: row.get(1)?,
        slot_id: row.get(2)?,
        title: row.get(3)?,
        notes: row.get(4)?,
        size_bytes: row.get(5)?,
        delta_bytes: row.get(6)?,
        is_pinned: row.get::<_, i32>(7)? == 1,
        is_safety_rollback: row.get::<_, i32>(8)? == 1,
        created_at: row.get(9)?,
    })
}

pub fn update_snapshot_title(conn: &Connection, snapshot_id: &str, title: &str) -> Result<()> {
    conn.execute(
        "UPDATE snapshots SET title = ?1 WHERE id = ?2",
        params![title, snapshot_id],
    )?;
    Ok(())
}

pub fn toggle_pin(conn: &Connection, snapshot_id: &str) -> Result<bool> {
    conn.execute(
        "UPDATE snapshots SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        params![snapshot_id],
    )?;
    let is_pinned: i32 = conn.query_row(
        "SELECT is_pinned FROM snapshots WHERE id = ?1",
        params![snapshot_id],
        |r| r.get(0),
    )?;
    Ok(is_pinned == 1)
}

pub fn get_snapshot_files(conn: &Connection, snapshot_id: &str) -> Result<Vec<SnapshotFile>> {
    let mut stmt = conn.prepare(
        "SELECT snapshot_id, relative_path, blob_hash, file_size FROM snapshot_files WHERE snapshot_id = ?1",
    )?;
    let rows = stmt.query_map(params![snapshot_id], |r| {
        Ok(SnapshotFile {
            snapshot_id: r.get(0)?,
            relative_path: r.get(1)?,
            blob_hash: r.get(2)?,
            file_size: r.get(3)?,
        })
    })?;

    let mut files = Vec::new();
    for row in rows {
        files.push(row?);
    }
    Ok(files)
}

pub fn prune_retention(conn: &Connection, game_id: &str, slot_id: u32, keep_limit: usize) -> Result<usize> {
    let unpinned_ids: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT id FROM snapshots 
             WHERE game_id = ?1 AND slot_id = ?2 AND is_pinned = 0 AND is_safety_rollback = 0
             ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![game_id, slot_id], |r| r.get(0))?;
        let mut ids = Vec::new();
        for r in rows {
            ids.push(r?);
        }
        ids
    };

    if unpinned_ids.len() <= keep_limit {
        return Ok(0);
    }

    let to_delete = &unpinned_ids[keep_limit..];
    for id in to_delete {
        conn.execute("DELETE FROM snapshots WHERE id = ?1", params![id])?;
    }

    Ok(to_delete.len())
}

