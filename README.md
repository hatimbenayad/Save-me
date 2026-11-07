# Save Rewind (Save-me) ⏳🎮

> **The Time Machine for Your Game Saves.**  
> Automatically snapshots your progress every time your game saves. Rewind to any dialogue choice or boss checkpoint in one click.

[![CI Status](https://img.shields.io/badge/CI-Passing-10b981?style=flat-square&logo=github-actions)](https://github.com/hatimbenayad/Save-me/actions)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows)](https://github.com/hatimbenayad/Save-me)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-SDD%20Blueprint-8b5cf6?style=flat-square)](docs/SDD.md)
[![Methodology](https://img.shields.io/badge/Methodology-AI%20DLC-f59e0b?style=flat-square)](docs/AI_DLC.md)

---

## 💡 The Problem & Origin

Have you ever spent 40 hours in a story-driven RPG or Souls-like game only to pick one dialogue option that abruptly locks you out of the true ending?

Many modern PC games—especially on **PC Game Pass / Microsoft Store** (like *Wuchang: Fallen Feathers*) or **Steam**—auto-save continuously over a single slot. Once a choice is made, it's baked into your save file forever.

**Save Rewind** runs quietly in your system tray, watches your game's save folder, and automatically snapshots your progress. When disaster strikes, rewind to any moment in seconds.

---

## 🧱 The Core Metaphor: The "Line of Blocks"

Save Rewind represents your playthrough as an interactive **Line of Blocks**:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                               SAVE TIMELINE                               │
└───────────────────────────────────────────────────────────────────────────┘
       │
       ▼
 [ 14:10:02 ] ─── [Slot 0 Initialized] (450 KB)
       │
       ▼
 [ 14:18:45 ] ─── [Slot 0 changed, +12 KB] ──── 📌 PINNED
       │          "Right before talking to Fox Spirit" (Custom Note)
       ▼
 [ 14:24:10 ] ─── [Slot 0 changed, +4 KB]
       │
       ▼
 [ 14:29:55 ] ─── ⚠️ [Pre-Restore Safety Rollback]
       │
       ▼
 [ 14:32:10 ] ─── [Slot 0 changed, +18 KB] ──── CURRENT PROGRESS
```

- **Automatic Diff Titles**: Save files are binary, so the app analyzes metadata deltas to create immediate intuitive names like `Slot 0 changed, +12 KB`.
- **Inline Customization**: Click any block's title to type your own note (`"Before entering boss fog gate"`).
- **Pin Checkpoints**: Pin key narrative forks so retention policies never clean them up.
- **One-Click Safe Rewind**: Restore any past save block in under 10 seconds.

---

## 🛡️ Non-Negotiable Safety Principles

1. **Zero Interference with Live Game Saves**: The engine operates strictly in **read-only** mode while you play. Original saves are never modified, held open, or written to during capture.
2. **Debounced Quiescence (Settle-Before-Copy)**: The app waits for write activity to settle completely and verifies that file sizes are stable before copying.
3. **Guaranteed Safety Rollback**: Every restore operation is preceded by an automatic snapshot of your current state (`[Pre-Restore Safety Rollback]`). You can never lose progress by making a mistake during a rewind.
4. **Cloud-Sync Awareness**: Protects against Steam Cloud / Xbox Cloud conflicts by warning if cloud sync might overwrite your restored local save.

---

## 🏛️ System Architecture & Specifications

See the complete [Software Design Document (docs/SDD.md)](docs/SDD.md) for full technical contracts:
- **Core Engine**: Non-invasive file watcher with 800ms debounce and quiescence verification.
- **Storage Layer**: Content-Addressed Storage (CAS) with BLAKE3 / SHA-256 deduplication and SQLite metadata indexing.
- **Resource Budget**: $\le 30\text{ MB}$ idle RAM, negligible CPU impact ($< 0.1\%$).
- **Default Profile**: Built-in auto-detection for **Wuchang: Fallen Feathers** (`GameSlots/maingame0`, etc.) plus custom game support.

---

## 🤖 Developed with AI DLC Methodology

This repository is built using the **AI Software Development Life Cycle (AI DLC)**—a rigorous, spec-driven development methodology tailored for AI agent pair-programming:

| Stage | Activity | Key Document |
| :--- | :--- | :--- |
| **Stage 1: Specifications** | Invariant framing & PRD validation | [PRD.md](prd.md) |
| **Stage 2: Architecture** | Component contracts & C4 design | [docs/SDD.md](docs/SDD.md) |
| **Stage 3: Task Decomposition** | Atomic GitHub Issues & Epics | [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE/) |
| **Stage 4: Test Harness First** | Synthetic save write emitter & quiescence tests | `scripts/synthetic_save_emitter.js` |
| **Stage 5: Review & GitOps** | Invariant checklists & PR templates | [.github/pull_request_template.md](.github/pull_request_template.md) |
| **Stage 6: Wiki & Sync** | Continuous documentation mirror | [docs/wiki/](docs/wiki/) |

Read the complete methodology in [docs/AI_DLC.md](docs/AI_DLC.md).

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js v20+ or v22+
- Git

### Installation

```powershell
# 1. Clone the repository
git clone https://github.com/hatimbenayad/Save-me.git
cd Save-me

# 2. Install dependencies
npm install

# 3. Launch the interactive Timeline preview
npm run dev
```

### Running the Save Emitter Test Harness

Simulate a game writing binary saves in real time to verify debouncing and automatic block creation:

```powershell
node scripts/synthetic_save_emitter.js
```

---

## 🗺️ Roadmap & Milestones

- [x] **Milestone 1**: PRD, AI DLC Methodology, and Software Design Document (SDD).
- [x] **Milestone 2**: GitHub Issue templates, PR templates, and Wiki suite.
- [x] **Milestone 3**: Interactive "Line of Blocks" timeline UI prototype with auto-diff naming.
- [ ] **Milestone 4**: Native Windows file watcher service & SQLite CAS storage integration.
- [ ] **Milestone 5**: Safe Restore engine with game process detection and cloud sync advisory.
- [ ] **Milestone 6**: System tray integration and `Ctrl+Shift+S` Quick Mark hotkey.

---

## 🤝 Contributing

We welcome contributions! Please review [CONTRIBUTING.md](CONTRIBUTING.md) and check out our open [GitHub Issues](https://github.com/hatimbenayad/Save-me/issues) before opening a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
