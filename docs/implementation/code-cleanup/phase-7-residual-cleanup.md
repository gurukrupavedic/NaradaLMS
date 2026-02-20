# Phase 7: Residual Cleanup (Scripts, Logs, Orphan Files)

**Branch:** `cleanup-phase-7` from `cleanup`
**Risk:** None — removing unused scripts and ensuring generated files are ignored
**Estimated effort:** 15–20 minutes
**Prerequisites:** Phases 0 through 6 complete and merged into `cleanup`

**Scope:** This phase does **not** modify any files under `docs/`. Documentation updates (e.g. JWT vs session in `docs/essentials/`) will be handled separately.

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features or new scripts.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-7): <what was done>`
6. **Verify after each task.** Run the verification command specified.
7. **Do NOT touch** any file under `docs/` or any file not explicitly listed in this document.

## Verification Commands (Run After Every Task)

```bash
npx tsc --noEmit
npx turbo run build
```

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-7
```

---

## Task 7.1: Update `.gitignore` for Logs and Cache

Ensure generated logs and cache directories are not committed.

**File:** `.gitignore` (repo root)

**Add these lines** (if not already present). Place them in a logical section (e.g. after "Development logs" or in a new "IDE and tooling" section):

```
# Cursor IDE debug logs
.cursor/*.log

# Turbo cache and task logs
.turbo/
```

- If `.cursor/*.log` or `.turbo/` already exist in `.gitignore`, do not duplicate them.
- If only `.turbo` exists without the trailing slash, adding `.turbo/` is still valid (directory ignore).

**Verify:** `npx tsc --noEmit` passes (`.gitignore` changes do not affect build).

**Commit:** `cleanup(phase-7): add .cursor and .turbo to gitignore`

---

## Task 7.2: Delete Redundant Patch File

**File to delete:** `openapi_security_schemes_patch.txt` (repo root)

**Reason:** Its content (JWT `securitySchemes` snippet) is already present in `openapi.yaml` (lines 1848–1853). The file is redundant.

**Verify:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-7): remove redundant openapi_security_schemes_patch.txt`

---

## Task 7.3: Delete Unused Verification Script

**File to delete:** `scripts/verify-monorepo-readiness.ts`

**Reason:** One-off monorepo verification script; not referenced in `package.json` or elsewhere. No longer needed after cleanup is complete.

**Verify:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-7): remove unused verify-monorepo-readiness script`

---

## Task 7.4: Delete Unused Smoke Test Scripts

These smoke scripts are not wired to any npm script and are not run routinely. They will be replaced by new test scripts after deploy/go-live.

**Files to delete:**

1. `scripts/test/admin-batches-create-smoke.ts`
2. `scripts/test/admin-batches-update-coinstructors-smoke.ts`
3. `scripts/test/chapter-content-page-smoke.ts`

**Do NOT delete** these (they are used by `package.json` or documented for use):

- `scripts/test/admin-batches-smoke.ts` — used by `npm run smoke:batches`
- `scripts/test/auth-test.ts` — used by `npm run auth:test`
- `scripts/test/api-smoke-test.ts` — used by `npm run test:smoke`
- `scripts/test/content-smoke.ts` — used by `npm run test:content`
- `scripts/test/format-date.test.ts` — used by `npm run test:format-date`
- `scripts/test/build-check.ps1` — used by `npm run test:build`
- `scripts/test/verify.ps1` — used by `npm run verify`
- `scripts/test/db-reset.ps1` — used by `npm run db:reset`

**Verify:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-7): remove unused smoke test scripts (create, update-coinstructors, chapter-content-page)`

---

## Phase 7 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-7 --no-ff -m "Merge cleanup-phase-7: residual cleanup (scripts, gitignore, orphan file)"
git tag cleanup-phase-7-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Confirm that all npm scripts that should still work do work (e.g. `npm run smoke:batches`, `npm run auth:test`, `npm run test:smoke`, `npm run test:content`, `npm run test:format-date`, `npm run verify`, `npm run db:reset`).

### Summary of Changes

- `.gitignore` updated to ignore `.cursor/*.log` and `.turbo/`
- 1 redundant root file removed (`openapi_security_schemes_patch.txt`)
- 1 unused verification script removed (`scripts/verify-monorepo-readiness.ts`)
- 3 unused smoke test scripts removed (admin-batches-create, admin-batches-update-coinstructors, chapter-content-page)
- No changes under `docs/`
- No behavior changes to the application
