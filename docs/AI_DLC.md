# AI Software Development Life Cycle (AI DLC) Framework
## Save Rewind (Save-me) Project Methodology

---

## 1. Executive Overview & AI DLC Philosophy

The **AI Software Development Life Cycle (AI DLC)** is an agile, agentic engineering methodology designed to develop high-reliability system software—such as **Save Rewind**—using collaborative human-AI pair programming and autonomous AI agent workflows.

Because Save Rewind interacts directly with active game save directories where data loss is intolerable, the AI DLC replaces unstructured "vibes-based" coding with **Spec-Driven Engineering**, **Deterministic Verification Gates**, and **Isolated Branch Progression**.

```
                   THE AI DLC FEEDBACK LOOP
+-------------------------------------------------------------+
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   | 1. Context & Specs    | --> | 2. System Design      |   |
|   |    (PRD, Invariants)  |     |    (SDD, Contracts)   |   |
|   +-----------------------+     +-----------------------+   |
|               |                             |               |
|               v                             v               |
|   +-----------------------+     +-----------------------+   |
|   | 3. Issue Decomposition| --> | 4. Harness-First TDD  |   |
|   |    (Atomic Epics)     |     |    (Simulated Saves)  |   |
|   +-----------------------+     +-----------------------+   |
|               |                             |               |
|               v                             v               |
|   +-----------------------+     +-----------------------+   |
|   | 5. Review & GitOps    | --> | 6. Wiki & CI Sync     |   |
|   |    (PR Gates, Diff)   |     |    (Continuous Docs)  |   |
|   +-----------------------+     +-----------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

---

## 2. Core Project Invariants (Non-Negotiable)

Any code produced by human or AI within this repository must adhere to these four core invariants:

1. **Zero Active-Save Mutation During Capture (`INV-01`)**:
   - The capture engine operates in **read-only** mode on the game directory. It never opens write streams, locks, renames, or touches original save files while the game is running.
2. **Deterministic Pre-Restore Safety Snapshot (`INV-02`)**:
   - Before any past save state is restored to the live game directory, the engine *must* automatically capture a full snapshot of the active state labeled `[Pre-Restore Safety Rollback]`. A restore operation can never result in unrecoverable data loss.
3. **Write-Settling Quiescence Verification (`INV-03`)**:
   - When the file watcher detects a write event, it must debounce and verify that file size has stabilized and file locks are released across consecutive polling cycles before copying begins.
4. **Binary Opacity Principle (`INV-04`)**:
   - Save files are treated as opaque binary blobs. For v1/MVP, semantic decisions (NPC choices, quest flags) are inferred purely from file system metadata (Slot ID, timestamp, byte size delta). Reverse engineering proprietary binary headers is deferred to post-MVP.

---

## 3. The 6-Stage AI DLC Workflow

### Stage 1: Context Ingestion & Invariant Framing
- **Goal**: Establish the boundary conditions and domain constraints before writing code.
- **Inputs**: `prd.md`, user constraints, Windows file system semantics, Microsoft Store package sandbox boundaries.
- **AI Agent Directive**: Act as a Principal Systems Architect. Challenge ambiguities regarding file locks, debounce timeouts, and cloud synchronization conflicts.
- **Exit Gate**: Validated PRD and signed-off invariant list.

### Stage 2: System Design & Formal Contracts (SDD)
- **Goal**: Formulate modular software contracts, storage schemas, and IPC definitions.
- **Artifacts**: `docs/SDD.md`, SQLite DDL schema, TypeScript interfaces, and Tauri IPC event contracts.
- **AI Agent Directive**: Produce complete, unambiguous type definitions and state-machine transitions. Avoid placeholder types or "magic" global variables.
- **Exit Gate**: SDD approved with Mermaid sequence diagrams detailing the capture and restore workflows.

### Stage 3: Atomic Issue Decomposition & Sprint Planning
- **Goal**: Break large features into small, testable GitHub issues manageable in single AI agent iterations (context-window-friendly tasks).
- **Format**: GitHub Issue templates stored in `.github/ISSUE_TEMPLATE/`.
- **Granularity**: Each issue must define:
  1. Target Branch (`feat/<feature-name>`)
  2. Acceptance Criteria (Given / When / Then)
  3. Failure Modes to Guard Against
  4. Unit / Integration Test Requirements
- **Exit Gate**: Issues published and prioritized on GitHub project board.

### Stage 4: Harness-First Test-Driven Development (TDD)
- **Goal**: Eliminate hallucinations and guarantee runtime correctness by building test harnesses *before* core business logic.
- **Methodology**:
  1. Build a synthetic `SaveGameEmitter` test script that writes dummy binary save slots simulating actual gameplay bursts.
  2. Write unit tests asserting debounce settling, BLAKE3 deduplication, SQLite index queries, and atomic file restoration.
  3. AI implements the subsystem until all automated assertions pass without error.
- **Exit Gate**: 100% green test suite across mock game directory writes.

### Stage 5: Verification, Human-AI Code Review & GitOps
- **Goal**: Enforce quality control before merging into `develop` and `main`.
- **Process**:
  1. Code is staged and committed using Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
  2. A Pull Request is opened with a populated PR template detailing architectural impact and test results.
  3. AI performs automated diff analysis checking for memory leaks, unhandled errors, and invariant violations.
  4. Human code review approves and executes squash-and-merge or rebase.
- **Exit Gate**: PR merged cleanly; CI status green.

### Stage 6: Continuous Documentation & Wiki Synchronization
- **Goal**: Keep documentation, wiki pages, and architecture schemas perfectly synchronized with the codebase.
- **Action**: When a PR introduces schema changes or UI patterns, the corresponding pages in `docs/wiki/` are updated in the same pull request.
- **Exit Gate**: README, SDD, and Wiki are 100% up to date.

---

## 4. Branching Strategy & Git Protocol

We follow a structured **Trunk-Based / Feature-Branch Workflow**:

```
main (Production Releases)
 ^
 | [Release PR with changelog]
develop (Integration & Verification)
 ^
 |---> feat/core-storage-cas
 |---> feat/file-watcher-debouncer
 |---> feat/timeline-blocks-ui
 |---> feat/safe-restore-system
```

### Branch Naming Conventions
- `feat/<issue-id>-<slug>`: New user-facing capability or subsystem (e.g., `feat/03-timeline-blocks-ui`).
- `fix/<issue-id>-<slug>`: Bug fixes and edge-case patches (e.g., `fix/12-file-lock-retry`).
- `docs/<slug>`: Architecture, SDD, AI DLC, or Wiki updates.
- `refactor/<slug>`: Performance optimization or structural cleanup without behavior changes.

### Commit Message Standard (Conventional Commits)
```text
<type>(<scope>): <short description in present tense>

[optional body explaining context, why this change was made, and invariants maintained]

[optional footer referencing issue: Closes #12]
```
- Example:
  `feat(watcher): implement two-tier debounce settling for binary save files`

---

## 5. Standard Operating Procedures (SOPs) for AI Agents

When prompting or utilizing AI agents in this repository, follow these standard guidelines:

### SOP-01: Micro-Task Execution
Do not ask an AI agent to "build the entire app". Instead, prompt within the bounds of a single GitHub Issue:
> *"Implement the `DiffEngine` defined in Issue #3 and `docs/SDD.md`. Ensure all tests in `tests/diff_engine.test.ts` pass, and adhere to `INV-04`."*

### SOP-02: Defensive System Calls
Always instruct the AI to handle:
- File system locks (`EBUSY`, `EPERM`, `ERROR_SHARING_VIOLATION` on Windows).
- Paths containing spaces, non-ASCII characters, and Windows package paths (`%LOCALAPPDATA%\Packages`).
- Graceful degradation when game executables are abruptly terminated.

### SOP-03: Artifact & Wiki Updates
Every feature completion prompt must include a step to update `docs/wiki/` and `README.md` to reflect the newly added capabilities.
