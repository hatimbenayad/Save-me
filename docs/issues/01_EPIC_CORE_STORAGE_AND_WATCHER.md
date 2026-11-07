# Issue #1: [EPIC] Core Save Watcher & Debouncing Engine

**Type**: Technical Epic  
**Labels**: `architecture`, `engine`, `p0`  
**Target Branch**: `feat/01-core-watcher-debouncer`

## Description
Implement the Windows file watcher and debouncing engine that listens to `GameSlots` folder writes, ensures write quiescence without holding locks, and triggers read-only snapshots.

## Key Acceptance Criteria
- [ ] Listens recursively to target game directory using Windows file system events.
- [ ] Implements 800ms debounce timer with reset on consecutive writes.
- [ ] Quiescence poll verifies file size stability and `FILE_SHARE_READ` availability before firing callback.
- [ ] Strictly enforces `INV-01`: zero write access or modifications to original save files during capture.
- [ ] Unit tests verify handling of locked files, temporary files, and bursts of rapid writes.

## References
- `docs/SDD.md#31-save-watcher--debouncing-engine`
- `docs/AI_DLC.md#stage-4-harness-first-test-driven-development-tdd`
