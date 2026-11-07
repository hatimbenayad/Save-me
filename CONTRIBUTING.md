# Contributing to Save Rewind (Save-me)

Thank you for your interest in contributing to Save Rewind! We hold our codebase to high engineering standards to ensure zero player progress loss.

---

## 📜 Development Workflow (AI DLC)

We adhere strictly to the **AI Software Development Life Cycle (AI DLC)**. Before submitting code:

1. **Pick an Open Issue**: Browse our [GitHub Issues](https://github.com/hatimbenayad/Save-me/issues) or review `docs/issues/`.
2. **Branch from `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/<issue-id>-<short-description>
   ```
3. **Verify Safety Invariants**:
   - `INV-01`: Never open write handles to the active game save directory during capture.
   - `INV-02`: Always create an automatic `[Pre-Restore Safety Rollback]` before replacing live save files.
   - `INV-03`: Always verify write quiescence before reading.
4. **Run Verification**:
   ```bash
   npm test
   node scripts/synthetic_save_emitter.js
   ```
5. **Submit a Pull Request**: Use the provided PR template and check all invariant compliance boxes.

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat`: New feature or user capability
- `fix`: Bug fix
- `docs`: Documentation updates
- `test`: Adding or modifying tests
- `refactor`: Code restructuring without functional changes

Example:
`feat(timeline): add inline title editing and pin toggle to snapshot blocks`
