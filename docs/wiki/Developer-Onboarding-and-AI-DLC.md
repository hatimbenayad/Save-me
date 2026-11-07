# Developer Onboarding & AI DLC Playbook

Welcome to Save Rewind development! This repository uses the **AI Software Development Life Cycle (AI DLC)**, combining AI agents with strict engineering standards.

---

## 🛠️ Prerequisites

- **Node.js** v20+ / v22+
- **Git** v2.40+
- **Python** 3.11+ (for synthetic save generator test harness)

---

## 🚀 Quickstart

```powershell
# 1. Clone the repository
git clone https://github.com/hatimbenayad/Save-me.git
cd Save-me

# 2. Checkout integration branch
git checkout develop

# 3. Install dependencies
npm install

# 4. Start local development UI
npm run dev
```

---

## 🤖 AI DLC Pair Programming Rules

When working with an AI coding assistant (like Gemini / Antigravity) on this project:

1. **Reference Core Documents**: Always provide `docs/SDD.md` and `docs/AI_DLC.md` as context.
2. **Work by Feature Branch**: Never commit directly to `main` or `develop`. Create branches formatted as:
   `feat/<issue-id>-<short-description>`.
3. **Run the Save Emitter Harness**: Test real-time debouncing before opening PRs:
   `node scripts/synthetic_save_emitter.js`
4. **Adhere to Invariants**:
   - `INV-01`: No write streams opened on live game files during capture.
   - `INV-02`: Pre-restore safety rollback snapshot must always run first.
   - `INV-03`: Quiescence settle verification before reading.
