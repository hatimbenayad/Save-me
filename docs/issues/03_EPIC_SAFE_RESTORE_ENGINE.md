# Issue #3: [EPIC] Safe Restore & Rollback Subsystem

**Type**: Technical Epic  
**Labels**: `safety`, `engine`, `p0`  
**Target Branch**: `feat/03-safe-restore-system`

## Description
Implement the guaranteed non-destructive restore engine with game process detection and automatic safety rollback creation.

## Key Acceptance Criteria
- [ ] Process Guard checks whether target game executable is running before restoring.
- [ ] Invariant `INV-02`: Captures an automatic `[Pre-Restore Safety Rollback]` snapshot before touching active save files.
- [ ] Restores files atomically via staging folder to prevent partial file write corruption.
- [ ] Displays Cloud Sync Advisory if Steam/Xbox Cloud is detected on the save directory.
- [ ] Test harness validates that restore never leads to unrecoverable data loss.

## References
- `docs/SDD.md#35-safe-restore--cloud-conflict-protocol`
- `docs/wiki/Safe-Restore-Protocol.md`
