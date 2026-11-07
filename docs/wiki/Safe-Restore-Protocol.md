# Safe Restore & Cloud Conflict Protocol

Restoring game progress is a high-stakes operation. Save Rewind implements a multi-tier safety protocol to eliminate the risk of accidental data loss.

---

## 🛡️ Step-by-Step Restore Workflow

### 1. Process Guard Inspection
Before modifying any files on disk, Save Rewind checks the Windows process tree for the game executable (e.g. `Project_Plague.exe` for Wuchang: Fallen Feathers).
- **If Running**: The app displays an alert:
  > *"Please exit or pause the game before restoring. Overwriting save files while the game is running may cause memory desynchronization."*

### 2. Pre-Restore Safety Rollback
Once the game is closed, the system automatically takes a snapshot of the current state of the target save slot and marks it with `is_safety_rollback = 1`.
- If the player accidentally restored snapshot #10 instead of #12, they can immediately rewind back to the pre-restore point.

### 3. Atomic Replacement
The files from the chosen snapshot are written to a temporary staging folder on the same physical volume and swapped into the game save directory, ensuring no partial writes occur.

### 4. Cloud Synchronization Guidance
Steam Cloud and Xbox Cloud Sync can silently overwrite restored local saves with their cloud version if timestamps conflict.
- Save Rewind provides game-specific guidance:
  - **Steam**: Right-click game in Steam Library -> Properties -> General -> Disable "Keep game saves in the Steam Cloud".
  - **Xbox / PC Game Pass**: Launch game offline or wait for prompt to choose "Use local save".
