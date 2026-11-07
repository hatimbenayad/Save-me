# Welcome to the Save Rewind (Save-me) Wiki

**Save Rewind** is an open-source, non-invasive Windows desktop utility designed for RPG, story-driven, and Souls-like games where a single dialogue choice or branch can lock you out of an ending.

---

## 🧭 Navigation & Core Documentation

| Wiki Page | Description |
| :--- | :--- |
| **[Architecture & Design](Architecture-and-Design.md)** | Full technical breakdown, C4 model, and component contracts. |
| **[The "Line of Blocks" UI](The-Line-of-Blocks-UI.md)** | Visual design, card anatomy, and timeline interaction mechanics. |
| **[Save Watcher & CAS Engine](Save-Watcher-and-CAS-Engine.md)** | File-system watching, write settling, and BLAKE3 deduplication. |
| **[Safe Restore Protocol](Safe-Restore-Protocol.md)** | Pre-restore safety rollbacks, process guards, and cloud conflict mitigation. |
| **[Wuchang: Fallen Feathers Profile](Supported-Games-and-Wuchang-Guide.md)** | Deep dive into the default game profile and Microsoft Store save paths. |
| **[Developer Onboarding & AI DLC](Developer-Onboarding-and-AI-DLC.md)** | Guide to pair-programming and contributing using the AI DLC methodology. |

---

## ⚡ Core Value Proposition: The "Line of Blocks"

Unlike traditional backup managers that operate on rigid hourly schedules or utilitarian tables, **Save Rewind** represents your journey as a living progression timeline of blocks:
- **Zero Configuration**: Watches your game's `GameSlots` folder silently in the background.
- **Auto-Diff Titles**: Generates immediate contextual block names such as `"Slot 0 changed (+12 KB)"`.
- **Inline Customization**: Click any block title to rename it (e.g. `"Before talking to Fox Spirit"`).
- **One-Click Safe Rewind**: Restore any past save in under 10 seconds without risk of losing your active state.
