# Architecture & System Design

Save Rewind uses a decoupled event-driven architecture designed to balance low resource consumption ($\le 30\text{ MB}$ idle RAM) with rock-solid file system safety.

---

## 🏛️ System Architecture Diagram

```
+-------------------------------------------------------------+
|                     ELECTRON / TAURI UI                     |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   | "Line of Blocks"      |     | Slot Tabs & Filters   |   |
|   | Timeline View         |     | (Slot 0, Slot 1, etc) |   |
|   +-----------------------+     +-----------------------+   |
|               ^                             ^               |
|               |                             |               |
|   +-----------------------+     +-----------------------+   |
|   | Inline Rename / Notes |     | Safe Restore Dialog   |   |
|   +-----------------------+     +-----------------------+   |
+-------------------------------------------------------------+
                               ^
                               | IPC Event Bus
                               v
+-------------------------------------------------------------+
|                      BACKEND ENGINE                         |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   | File Watcher          |     | Diff Title Engine     |   |
|   | (ReadDirectoryChanges)|     | (Heuristic Diffs)     |   |
|   +-----------------------+     +-----------------------+   |
|               |                             |               |
|               v                             v               |
|   +-----------------------+     +-----------------------+   |
|   | Quiescence Debouncer  |     | SQLite Index Store    |   |
|   | (Settle Verification) |     | (meta.db)             |   |
|   +-----------------------+     +-----------------------+   |
|               |                             |               |
|               v                             v               |
|   +-----------------------+     +-----------------------+   |
|   | Content-Addressed     |     | Safe Restore Manager  |   |
|   | Storage (CAS Engine)  |     | & Process Guard       |   |
|   +-----------------------+     +-----------------------+   |
+-------------------------------------------------------------+
```

---

## 🔄 Core Data Invariants

1. **Non-Invasive Observation**: Active save files are accessed strictly through shared-read file streams (`FILE_SHARE_READ`).
2. **Deterministic Deduplication**: Save files with matching BLAKE3/SHA-256 hashes are stored exactly once, reducing disk usage by up to 90% across long playthroughs.
3. **Atomic Safety Net**: Every restore operation generates an immutable `[Pre-Restore Safety Rollback]` snapshot before modifying active files.
