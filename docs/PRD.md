# Save Rewind — Product Requirements Document

## 1. Summary
Save Rewind is a lightweight Windows desktop app that watches a game's save folder, automatically snapshots every meaningful save, and lets the player rewind to any earlier moment with one click. Think of it as version control for game progress, with a timeline UI designed for story-driven and Souls-like games where one wrong dialogue choice can lock you out of an ending.

## 2. Problem
Players make irreversible story choices (NPC dialogue, quest branches, ending-locking decisions) and often realise too late. Many games offer no manual backup, only overwrite a single autosave, or sync saves to the cloud, which overwrites any manual copy. Existing save managers (GameSave Manager, Game Backup Monitor, per-game tools) work but are utilitarian, clunky, and back up per session rather than per decision.

**Origin story**: playing *Wuchang: Fallen Feathers* via the Microsoft Store on PC, picked the wrong option for an NPC, lost the intended ending, and had no backup to return to.

## 3. Target Users
- Story-focused and Souls-like players who care about endings and branching choices
- Completionists and achievement hunters
- Players on Microsoft Store / Game Pass PC versions where saves are harder to find
- Content creators who want to replay or demo different branches

## 4. Goals
1. **Never lose progress to a wrong choice**: any past save state is restorable in under 10 seconds.
2. **Zero-effort**: after setup, snapshots happen automatically with no player action.
3. **Tiny footprint**: idle RAM under 30 MB, negligible CPU and disk impact during play.
4. **A beautiful, readable timeline** that makes rewinding feel obvious and safe.

## 5. Non-Goals (v1)
- Cloud storage of snapshots
- Console or macOS/Linux support
- Editing save file contents
- Cheating or save-modification features
- Anti-cheat-protected multiplayer games

## 6. Core Features (MVP)
### 6.1 Game profiles
- A profile defines a game name, its save folder path(s), and which files to include or ignore.
- Ships with a built-in profile for **Wuchang: Fallen Feathers** pointing at the local app data folder `Project_Plague`, `Saved`, then the numbered ID folder, then `GameSlots` (one folder per slot, e.g. `maingame0`).
- Add custom games by picking a folder; the app auto-detects common save locations.

### 6.2 Automatic snapshots
- File-system watcher detects save writes and debounces them (wait until writes settle) before capturing.
- Snapshots are deduplicated: unchanged files are not stored twice (content hashing).
- Configurable retention: keep the last N snapshots plus all pinned ones.

### 6.3 Timeline UI ("Line of Blocks")
- Vertical or horizontal timeline per game and per save slot, showing time, playtime-since-last, and size delta.
- Click any point to preview its details, then Restore.
- Search and filter by slot, date, label, or pinned status.

### 6.4 Labels and pins
- Add a label to any snapshot (e.g. "Before talking to NPC") and pin it so it is never auto-deleted.
- Quick Mark hotkey: a global shortcut (`Ctrl+Shift+S`) that instantly takes a labelled snapshot right before a risky decision.

### 6.5 Safe restore
- Restoring first captures the current state as a safety snapshot, so a restore is never destructive.
- Warns if the game is running and offers to wait until it closes.
- Handles file locks gracefully.

### 6.6 Cloud-sync awareness
- Detects when a game uses Xbox/Steam cloud sync and explains the risk that cloud sync may overwrite a restored save.
- Provides clear guidance for turning cloud sync off for that game before restoring.

## 7. Technical Approach
- **Core Engine**: Non-invasive file watcher with debounced quiescence settling.
- **Storage**: Content-addressed store (files hashed with BLAKE3/SHA-256, stored once, referenced by snapshot manifests); SQLite for snapshot index and labels.
- **Compression**: Zstandard to keep snapshots small.
- **Hotkeys & Tray**: Global shortcut and system tray icon.
- **Frontend UI**: Responsive dark-mode timeline ("Line of Blocks") component.

## 8. Invariants
- `INV-01`: Zero active-save mutation during capture (read-only monitoring).
- `INV-02`: Deterministic pre-restore safety rollback snapshot before any file modification.
- `INV-03`: Quiescence verification (file size stability + shared read access check before copy).
- `INV-04`: Binary opacity (metadata diffs for v1).
