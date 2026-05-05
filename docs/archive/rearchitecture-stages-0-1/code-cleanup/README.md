# Pre-Stage-2 Code Cleanup

> **Purpose**: Eliminate dead code, consolidate duplicates, fix quality issues, and establish a clean, production-grade baseline before Stage 2 (Chameleonization).
> **Status**: Pre-Stage-2. All previous stages (0, 1, hardening, reshuffle) are complete.
> **Next Milestone**: Stage 2 — Chameleonization (multi-branding).

---

## Branching and Tagging Strategy (Mandatory)

All work happens on branches. `main` stays untouched until every phase is complete.

### Rules

1. **`main` is protected.** No direct commits during cleanup.
2. **Baseline tag on `main` before any work:**
   ```bash
   git tag baseline-pre-cleanup
   git push origin baseline-pre-cleanup
   ```
3. **Single long-lived cleanup branch:**
   ```bash
   git checkout main && git pull && git checkout -b cleanup
   ```
4. **Per-phase sub-branches from `cleanup`:**
   ```bash
   git checkout cleanup && git checkout -b cleanup-phase-N
   ```
5. **Merge into `cleanup` only when the phase is complete and verified:**
   ```bash
   git checkout cleanup && git merge cleanup-phase-N --no-ff -m "Merge cleanup-phase-N: <phase name>"
   git tag cleanup-phase-N-complete
   ```
6. **Merge `cleanup` into `main` is done manually by the user** after all phases are complete. Agents must **never** merge into `main` or push to `main`.

### Branch Structure

```
main (protected, tagged baseline-pre-cleanup)
  └── cleanup
        ├── cleanup-phase-0   (safe deletes)
        ├── cleanup-phase-1   (shared/ migration)
        ├── cleanup-phase-2   (dedup components/hooks)
        ├── cleanup-phase-3   (server quality)
        ├── cleanup-phase-4   (config/deps)
        ├── cleanup-phase-5   (naming)
        ├── cleanup-phase-6   (verification)
        └── cleanup-phase-7   (residual: scripts, gitignore, orphan file)
                                  ↓
                      When ALL phases verified:
                      User merges cleanup → main manually
                      User tags main: baseline-pre-stage-2
```

---

## Agent Guardrails (Mandatory — Repeated in Each Phase Doc)

1. **Read before edit.** Always read the target file before modifying. If the content does not match what the plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-N): <what was done>`
6. **Verify after each task.** Run the verification command specified. If it fails, fix the issue before proceeding.
7. **Do NOT touch** any file not explicitly listed in the phase document.
8. **Do NOT modify** `packages/types/src/schema.ts`, database migrations, or any database-related code.
9. **Do NOT merge `cleanup` into `main`** or push to `main`. The user performs the final merge to `main` manually.

---

## Verification Commands

### After Every Task

```bash
# 1. Type check (must pass)
npx tsc --noEmit

# 2. Build check (must pass)
npx turbo run build

# 3. Quick lint (should pass, non-blocking)
npm run lint
```

### After Every Phase (Full Verification)

```bash
# Start API server
npm run dev

# Start student portal (separate terminal)
cd apps/student-portal && npm run dev

# Start admin portal (separate terminal)
cd apps/admin-portal && npm run dev
```

Manual checks:
- Student portal login page loads at http://localhost:3000
- Admin portal login page loads at http://localhost:3001
- API returns 401 for `GET http://localhost:5000/api/auth/me`

---

## Phase Overview

| Phase | Name | Purpose | Risk | Estimated Effort |
|-------|------|---------|------|-----------------|
| **0** | Safe Deletes | Remove 18 dead files, clean 12 commented-out code blocks | None | 30 minutes |
| **1** | Shared Migration | Migrate 3 active `shared/` files to packages, remove `shared/` directory | Low | 1 hour |
| **2** | Dedup Components & Hooks | Consolidate 6 duplicate component pairs and 8+ duplicate hook pairs | Medium | 3-4 hours |
| **3** | Server Quality | Remove duplicate routes, standardize error handling, replace console.error with Logger | Medium | 2-3 hours |
| **4** | Config & Deps | Fix env file, remove unused deps, replace deprecated csurf, fix broken scripts | Low | 1-2 hours |
| **5** | Naming Conventions | Rename files to PascalCase, standardize types, migrate deprecated AudioMapping | Low | 1 hour |
| **6** | Final Verification | Full build, manual flow testing, documentation updates | None | 1 hour |
| **7** | Residual Cleanup | Unused scripts, gitignore for logs/cache, redundant patch file | None | 15–20 min |

## Dependency Graph

```
Phase 0 (Safe Deletes)
  └─→ Phase 1 (Shared Migration)
       └─→ Phase 2 (Dedup Components & Hooks)
            ├─→ Phase 3 (Server Quality)
            └─→ Phase 4 (Config & Deps)
                 └─→ Phase 5 (Naming Conventions)
                      └─→ Phase 6 (Final Verification)
                           └─→ Phase 7 (Residual Cleanup)
```

- Phase 0 must be first: later phases assume dead files are gone.
- Phase 1 depends on Phase 0: Phase 0 deletes unused `shared/` files; Phase 1 migrates the remaining active ones.
- Phase 2 depends on Phase 1: components in Phase 2 may import from `@narada/types` (set up in Phase 1).
- Phases 3 and 4 can run in parallel (server vs config changes are independent) but both depend on Phase 2.
- Phase 5 after 3+4: naming changes are safest after all code moves are done.
- Phase 6 is last verification phase; Phase 7 is optional residual cleanup (scripts, gitignore, orphan file).
- **Merge to `main`:** Done manually by the user when all phases are complete. Agents do not merge to `main`.

---

## Document Index

| Document | Phase | Description |
|----------|-------|-------------|
| [phase-0-safe-deletes.md](./phase-0-safe-deletes.md) | 0 | Remove dead files and commented-out code |
| [phase-1-shared-migration.md](./phase-1-shared-migration.md) | 1 | Migrate `shared/` to packages, eliminate legacy directory |
| [phase-2-dedup-components-hooks.md](./phase-2-dedup-components-hooks.md) | 2 | Consolidate duplicate components and hooks into packages/ui |
| [phase-3-server-quality.md](./phase-3-server-quality.md) | 3 | Remove duplicate routes, standardize error handling, use Logger |
| [phase-4-config-deps.md](./phase-4-config-deps.md) | 4 | Fix env, remove unused deps, replace csurf, fix scripts |
| [phase-5-naming-conventions.md](./phase-5-naming-conventions.md) | 5 | Rename files, standardize types, migrate deprecated types |
| [phase-6-verification.md](./phase-6-verification.md) | 6 | Full build verification, manual testing, documentation |
| [phase-7-residual-cleanup.md](./phase-7-residual-cleanup.md) | 7 | Unused scripts, gitignore for logs/cache, redundant patch file (no docs/ changes) |

---

## For AI Agents

- **Execute one phase document per chat session.** Each document is self-contained.
- **Start each session** by reading the phase document AND checking the current branch state (`git status`, `git branch`).
- At the **start** of each phase, create the phase branch from `cleanup`.
- At the **end** of each phase, follow the completion steps to merge into `cleanup` only. Do **not** merge `cleanup` into `main`; the user does that merge manually.

---

## Summary of Impact (After All Phases)

- ~18 files deleted (dead code)
- ~6 component pairs deduplicated (~2,400 lines saved)
- ~12 hook pairs deduplicated (~1,200 lines saved)
- 6 duplicate route handlers removed
- ~21 console.error calls replaced with Logger
- ~12 commented-out code blocks cleaned
- ~5 unused npm dependencies removed
- 1 deprecated package replaced (`csurf` → `csrf-csrf`)
- 1 legacy directory eliminated (`shared/`)
- 6 files renamed to consistent convention
