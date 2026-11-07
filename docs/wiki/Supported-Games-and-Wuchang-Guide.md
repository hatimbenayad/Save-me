# Supported Games & Wuchang: Fallen Feathers Profile

Save Rewind includes first-class support for **Wuchang: Fallen Feathers** (including Microsoft Store / PC Game Pass and Steam editions) and allows custom profile creation for any game.

---

## 🎮 Wuchang: Fallen Feathers Save Structure

### Save Directory Locations
- **Microsoft Store / PC Game Pass**:
  ```text
  %LOCALAPPDATA%\Packages\505GAMESS.P.A.ProjectPlague_...\LocalState\Saved\<UserID>\GameSlots\
  ```
  *(Or within `%LOCALAPPDATA%\Project_Plague\Saved\<UserID>\GameSlots\`)*
- **Steam Version**:
  ```text
  %LOCALAPPDATA%\Project_Plague\Saved\SaveGames\<SteamID>\GameSlots\
  ```

### Slot Organization
Inside `GameSlots`, each slot is contained in a dedicated folder:
- `maingame0/`: Save Slot 1
- `maingame1/`: Save Slot 2
- `maingame2/`: Save Slot 3

Each slot directory contains binary state files (`.sav` / `.dat`) storing player inventory, quest stage flags, and world checkpoints.

---

## ➕ Adding Custom Game Profiles

To track any other PC game:
1. Open Save Rewind and click **"Add Game Profile"**.
2. Select the game executable (e.g. `eldenring.exe`).
3. Point Save Rewind to the save directory (e.g. `%APPDATA%\EldenRing\<SteamID>\`).
4. Configure the file include filter (default: `*` or `*.sl2, *.sav`).
5. Click **"Start Watching"**.
