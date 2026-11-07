# The "Line of Blocks" Timeline UI

The **Line of Blocks** is the primary visual centerpiece of Save Rewind. It translates abstract file system events into an intuitive, tactile narrative timeline.

---

## 🧱 Anatomy of a Snapshot Block

Each block in the timeline represents a discrete save snapshot:

```text
+-------------------------------------------------------------+
| [ Slot 0 ]                             (PIN: ON) [ 14:22:05 ]|
|                                                             |
|   Slot 0 updated (+12.4 KB)               [✎ Click to Edit] |
|   "Right before entering Fox Spirit chamber"                |
|                                                             |
|   Delta: +12.4 KB  |  Time since last: 4m 12s  |  3 Files   |
|                                                             |
|   [ ⤺ Restore Save ]                [ ℹ Preview Files ]    |
+-------------------------------------------------------------+
```

### Component Details
1. **Slot Badge**: Indicates the active game save slot (e.g., `Slot 0`, `Slot 1`, `Slot 2`).
2. **Auto-Diff Title**: Automatically calculated based on file size and delta changes:
   - Example: `"Slot 0 changed (+12.4 KB)"`
   - Example: `"Slot 1 initialized (420 KB)"`
3. **Inline Renaming**: Clicking the title opens an inline text box, allowing the player to enter custom notes without leaving the timeline.
4. **Pinning (Retention Lock)**: Clicking the pushpin icon marks the snapshot as permanent. Pinned snapshots are exempt from automated cleanup retention policies.
5. **Safety Badges**: Pre-restore rollback checkpoints feature an amber safety badge: `[Pre-Restore Safety Rollback]`.

---

## ⌨️ Quick Mark Global Hotkey

- **Shortcut**: `Ctrl + Shift + S` (Customizable)
- **Behavior**: When pressed while in-game, Save Rewind immediately captures the current save state and opens a quick overlay allowing the player to type a label (e.g. `"Before Boss Fight"`) in under 2 seconds.
