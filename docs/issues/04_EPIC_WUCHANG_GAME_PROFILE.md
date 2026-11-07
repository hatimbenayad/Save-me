# Issue #4: [EPIC] Built-in Wuchang: Fallen Feathers Profile & Custom Game Manager

**Type**: Technical Epic  
**Labels**: `game-profile`, `enhancement`  
**Target Branch**: `feat/04-game-profiles-wuchang`

## Description
Provide default auto-detection and built-in profiles for *Wuchang: Fallen Feathers* (Microsoft Store / PC Game Pass and Steam) and a UI modal to add custom game directories.

## Key Acceptance Criteria
- [ ] Auto-resolves `%LOCALAPPDATA%\Packages\...` and `%LOCALAPPDATA%\Project_Plague\...` paths for Wuchang.
- [ ] Maps `GameSlots/maingame0`, `maingame1`, `maingame2` to visual slot labels.
- [ ] Custom profile dialog supports folder picker, game name input, and executable association.
- [ ] Profile switching persists in SQLite `games` table.

## References
- `docs/wiki/Supported-Games-and-Wuchang-Guide.md`
