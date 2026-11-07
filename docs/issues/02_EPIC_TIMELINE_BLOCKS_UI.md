# Issue #2: [EPIC] "Line of Blocks" Timeline Visual Component

**Type**: Technical Epic  
**Labels**: `ui`, `frontend`, `p0`  
**Target Branch**: `feat/02-timeline-blocks-ui`

## Description
Develop the core "Line of Blocks" timeline UI component. Each snapshot is rendered as an interactive block along a progression timeline displaying timestamp, auto-diff title, slot indicator, and actions.

## Key Acceptance Criteria
- [ ] Renders horizontal/vertical timeline of discrete snapshot blocks.
- [ ] Each block displays:
  - Active Slot ID tag (e.g. `Slot 0`)
  - Timestamp (relative & absolute)
  - Auto-generated title (e.g. `Slot 0 changed (+12 KB)`)
  - Inline title renaming on click
  - Pin toggle button (locks snapshot from retention cleanup)
  - Restore action button
- [ ] Slot filter tabs allow switching between `All Slots`, `Slot 0`, `Slot 1`.
- [ ] Search input filters snapshots by title, slot, and pin status.
- [ ] Dark mode game-adjacent design matching modern RPG aesthetic.

## References
- `docs/SDD.md#36-the-line-of-blocks-presentation-model`
- `docs/wiki/The-Line-of-Blocks-UI.md`
