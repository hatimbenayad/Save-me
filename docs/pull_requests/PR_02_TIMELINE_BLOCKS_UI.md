# PR #2: Implement "Line of Blocks" Interactive Timeline Component

## Description
Delivers the frontend visual centerpiece: an interactive "Line of Blocks" timeline component supporting snapshot display, auto-diff titles, inline renaming, slot filtering, and one-click safe restore triggers.

- **Closes**: Issue #2 (`docs/issues/02_EPIC_TIMELINE_BLOCKS_UI.md`)
- **Branch**: `feat/02-timeline-blocks-ui`

---

## Changes Included
- **Timeline Engine**: Horizontal and vertical card sequence connecting progression points.
- **Auto-Diff Block Header**: Calculates human-friendly titles (`"Slot 0 changed (+12 KB)"`).
- **Inline Editing**: Double-click or pen icon triggers editable title input without page reload.
- **Pin & Retention Controls**: Visual pin indicator exempting snapshots from pruning.
- **Safe Restore Trigger**: Opens modal confirming pre-restore rollback snapshot before execution.
- **Slot Tabs**: Instant filtering by `All`, `Slot 0`, `Slot 1`, `Slot 2`.
