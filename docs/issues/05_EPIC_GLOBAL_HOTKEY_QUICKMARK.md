# Issue #5: [EPIC] Global Hotkey & Quick Mark System

**Type**: Technical Epic  
**Labels**: `hotkey`, `ui`, `p1`  
**Target Branch**: `feat/05-global-hotkey-quickmark`

## Description
Implement the global shortcut handler (`Ctrl+Shift+S`) that allows a player in-game to immediately take a pinned snapshot before risky decisions (e.g. dialogue choices or boss gates).

## Key Acceptance Criteria
- [ ] Global shortcut registers without interfering with game input.
- [ ] Triggers immediate capture and prompts quick mini-overlay to enter label.
- [ ] Automatically pins the snapshot so it cannot be pruned by retention policies.
- [ ] System tray icon allows quick access and status monitoring while game is full-screen.

## References
- `docs/SDD.md#36-the-line-of-blocks-presentation-model`
- `docs/wiki/The-Line-of-Blocks-UI.md#quick-mark-global-hotkey`
