# Architecture Overview

This document provides a quick technical reference for the Save Rewind system architecture. For the in-depth specification, consult [`docs/SDD.md`](docs/SDD.md).

---

## High-Level Architecture

```
[ Game Engine ] ──(Writes Save)──> [ GameSlots Folder ]
                                            │
                                  (Read-Only Notify Event)
                                            │
                                            ▼
                                   [ Quiescence Debouncer ]
                                            │
                                     (Settled Event)
                                            │
                                            ▼
                                   [ Storage Engine (CAS) ]
                                            │
                                  (BLAKE3 Deduplication)
                                            │
                                            ▼
                                   [ SQLite Index (meta.db) ]
                                            │
                                      (IPC Notification)
                                            │
                                            ▼
                               [ UI: "Line of Blocks" Timeline ]
```

---

## Directory Organization

```text
save-me/
├── .github/
│   ├── ISSUE_TEMPLATE/     # Structured GitHub Issue templates
│   ├── workflows/          # GitHub Actions CI workflow
│   └── pull_request_template.md
├── docs/
│   ├── AI_DLC.md           # AI Development Life Cycle Playbook
│   ├── SDD.md              # Complete Software Design Document
│   ├── wiki/               # Full GitHub Wiki documentation suite
│   ├── issues/             # Pre-formulated roadmap issues
│   └── pull_requests/      # PR documentation templates
├── src/                    # Frontend UI (Line of Blocks component & state)
├── scripts/                # Synthetic save emitter test harness
├── package.json
└── README.md
```
