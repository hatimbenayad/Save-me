# Save Watcher & Content-Addressed Storage (CAS)

The Save Watcher and CAS engine operate as the non-invasive data backbone of Save Rewind.

---

## 🔍 The File Watcher & Settle Protocol

Modern games do not write save files in a single atomic burst; they often write in multi-part streams or write to temporary scratch files (`.tmp`) before renaming.

To avoid corrupted snapshots, Save Rewind uses the **Quiescence Settle Protocol**:

```
[File Write Detected]
        |
        v
[Start 800ms Debounce Timer] <--- (Reset if new write event arrives)
        |
        v
[Debounce Timer Expires]
        |
        v
[Quiescence Verification Poll]
   1. Attempt open with FILE_SHARE_READ
   2. Read file size
   3. Wait 150ms
   4. Re-verify file size is identical
        |
     +--+--+
     |     |
  (Pass) (Fail / Locked)
     |     |
     |     +--> [Re-arm timer for 500ms]
     v
[Trigger Read-Only Snapshot Copy]
```

---

## 📦 Content-Addressed Storage (CAS)

To prevent ballooning disk storage across hundreds of auto-saves, files are chunked and deduplicated by their **BLAKE3 hash**:

```
%APPDATA%\SaveMe\storage\
   ├── blobs\
   │    ├── a4\
   │    │    └── a4f8e9102cba34... (Compressed blob)
   │    └── 7b\
   │         └── 7b019df3e48102... (Compressed blob)
   └── meta.db (SQLite database mapping manifests to hashes)
```

- If 5 snapshots in a row only modify 12 KB out of 30 MB, Save Rewind only stores that 12 KB delta blob, referencing existing hashes for the remaining 29.98 MB.
