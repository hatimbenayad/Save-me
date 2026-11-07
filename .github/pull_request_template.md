## Pull Request Summary

### Description
Provide a concise overview of the changes in this pull request and link corresponding issues.
- Closes #[issue-number]
- Related SDD section: `docs/SDD.md#...`

---

### Type of Change
- [ ] `feat`: New feature or user capability
- [ ] `fix`: Bug fix
- [ ] `refactor`: Code refactoring without behavior change
- [ ] `test`: Added or updated unit/integration tests
- [ ] `docs`: Documentation, SDD, AI DLC, or Wiki updates

---

### Invariant & Safety Checklist
- [ ] **INV-01 (Zero Live Modification)**: Code does NOT modify, lock, or write to active game save folders during live capture.
- [ ] **INV-02 (Pre-Restore Safety Rollback)**: Restore flows always capture a safety snapshot before replacing live slot files.
- [ ] **INV-03 (Quiescence Verification)**: File watcher debouncing verifies file stability and absence of exclusive locks before copying.
- [ ] **Memory & Performance**: Idle memory verified $\le 30\text{ MB}$, no CPU spin during idle watching.

---

### Verification & Testing Done
- [ ] Synthetic save file emitter test executed successfully.
- [ ] Unit tests pass: `npm test` or `cargo test`.
- [ ] Manual smoke testing performed against test save directory.
- [ ] Attached screenshot or recording (for UI changes).

---

### Documentation Update
- [ ] `docs/SDD.md` updated (if architecture/schema modified).
- [ ] `docs/wiki/` updated (if user or developer flow changed).
- [ ] `README.md` updated (if user-facing features changed).
