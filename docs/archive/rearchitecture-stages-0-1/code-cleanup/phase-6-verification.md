# Phase 6: Final Verification and Documentation

**Branch:** `cleanup-phase-6` from `cleanup`
**Risk:** None — verification and documentation only
**Estimated effort:** 1 hour
**Prerequisites:** ALL phases 0–5 complete and merged into `cleanup`

---

## Agent Guardrails

1. **This phase is primarily verification.** The only edits are to documentation files (`openapi.yaml`).
2. **Do NOT modify any source code** (TypeScript, JavaScript, CSS) in this phase unless a verification step reveals a regression that must be fixed.
3. **If a verification step fails**, investigate and determine which prior phase introduced the issue. Fix it with a targeted commit.
4. **Commit message format:** `cleanup(phase-6): <what was done>`

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-6
```

---

## Task 6.1: Update `openapi.yaml` Auth Description

Read `openapi.yaml` at the repo root. Find any references to session-based authentication and update them to describe JWT Bearer authentication.

### What to Change

Look for text like:
- "Session-based auth with Passport.js (PostgreSQL-backed sessions)"
- References to `express-session` or `connect-pg-simple`
- `session` in security scheme definitions

Update to describe the current JWT-based authentication:
- Authentication uses JWT Bearer tokens
- Tokens are obtained via `POST /api/auth/login`
- Protected endpoints require `Authorization: Bearer <token>` header

### What NOT to Change

- Do NOT change any route definitions, request/response schemas, or endpoint paths
- Only update the authentication description sections

**Commit:** `cleanup(phase-6): update openapi.yaml auth description to JWT`

---

## Task 6.2: Full Build Verification

Run a clean, forced build of the entire monorepo:

```bash
# Clean turbo cache
npx turbo run build --force

# Full type check
npx tsc --noEmit

# Lint
npm run lint
```

All three commands must pass. If any fails:
1. Read the error output carefully
2. Identify which file and line caused the failure
3. Determine which phase introduced the issue
4. Fix with a targeted commit: `cleanup(phase-6): fix <description>`

---

## Task 6.3: Manual Flow Verification

Start all 3 services in separate terminals:

```bash
# Terminal 1: API server
npm run dev

# Terminal 2: Student portal
cd apps/student-portal && npm run dev

# Terminal 3: Admin portal
cd apps/admin-portal && npm run dev
```

### Student Portal (http://localhost:3000)

- [ ] Login page loads without errors
- [ ] Can login with valid student credentials
- [ ] Dashboard shows student details and track progress
- [ ] Can navigate to a chapter and see content
- [ ] Audio player loads and plays audio
- [ ] Text segmentation panel displays correctly
- [ ] No console errors in browser DevTools

### Admin Portal (http://localhost:3001)

- [ ] Login page loads without errors
- [ ] Can login with admin credentials
- [ ] Admin dashboard loads with navigation sidebar
- [ ] Can view batch list
- [ ] Can view batch details with proficiency matrix
- [ ] Content studio loads with track list
- [ ] Can navigate to a chapter in content studio
- [ ] Can navigate to instructor section
- [ ] No console errors in browser DevTools

### API Server (http://localhost:5000)

Test these endpoints (use curl, httpie, or Postman):

- [ ] `GET /api/auth/me` — returns 401 without token
- [ ] `POST /api/auth/login` — returns token with valid credentials
- [ ] `GET /api/batches` — returns batch list (with auth)
- [ ] `GET /api/content/tracks` — returns track list (with auth)
- [ ] `GET /api/content/chapters/:id/audio` — returns audio files (with auth)
- [ ] `GET /api/content/chapters/:id/mappings` — returns mappings (with auth)
- [ ] `GET /api/learning/my-progress` — returns progress (with student auth)

---

## Task 6.4: Grep for Remaining Issues

Run these searches. Each should return zero results:

```bash
# No references to deleted shared/ directory
rg "@shared/" apps/ packages/

# No session-based auth remnants in server
rg "express-session" server/
rg "connect-pg-simple" server/

# No references to removed content_manager role in code (docs/JSON are OK)
rg "content_manager" apps/ packages/ server/ --glob "!*.md" --glob "!*.json"

# No stale csurf references (should be csrf-csrf now)
rg "require.*csurf\|from.*csurf" server/
```

If any search returns results, investigate and fix.

---

## Task 6.5: Verify npm Scripts

Run each script that should still work:

```bash
# Build check
npm run test:build

# Format date test
npm run test:format-date

# Verify script
npm run verify
```

If any script fails due to changes made in Phases 0–5, fix the script or update it.

---

## Phase 6 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-6 --no-ff -m "Merge cleanup-phase-6: final verification and documentation"
git tag cleanup-phase-6-complete
```

---

## Cleanup Complete Gate (User Merges to Main)

**When ALL of the following are true, the cleanup branch is ready for the final merge:**

- [ ] Phase 0 complete and tagged (`cleanup-phase-0-complete`)
- [ ] Phase 1 complete and tagged (`cleanup-phase-1-complete`)
- [ ] Phase 2 complete and tagged (`cleanup-phase-2-complete`)
- [ ] Phase 3 complete and tagged (`cleanup-phase-3-complete`)
- [ ] Phase 4 complete and tagged (`cleanup-phase-4-complete`)
- [ ] Phase 5 complete and tagged (`cleanup-phase-5-complete`)
- [ ] Phase 6 complete and tagged (`cleanup-phase-6-complete`)
- [ ] Phase 7 complete and tagged (`cleanup-phase-7-complete`) if run
- [ ] `npx tsc --noEmit` passes on `cleanup` branch
- [ ] `npx turbo run build --force` passes on `cleanup` branch
- [ ] All manual flow checks pass
- [ ] All grep checks return zero results

**Agents must NOT merge `cleanup` into `main`.** The user performs the final merge manually when ready, for example:

```bash
git checkout main
git merge cleanup --no-ff -m "Merge cleanup: pre-stage-2 repository audit and cleanup"
git tag baseline-pre-stage-2
git push origin main --tags
```

After merging, verify `main` builds and run a quick smoke test, then proceed to Stage 2: Chameleonization.

---

## Summary of All Changes Across Phases 0–6

| Category | Count |
|----------|-------|
| Dead files deleted | ~18 |
| Component pairs deduplicated | 6 |
| Hook pairs deduplicated | ~12 |
| Duplicate route handlers removed | 6–7 |
| `console.error` → Logger | ~21 |
| Commented-out code blocks cleaned | 12 |
| Unused npm dependencies removed | 4–6 |
| Deprecated packages replaced | 1 (`csurf` → `csrf-csrf`) |
| Legacy directories eliminated | 1 (`shared/`) |
| Files renamed to convention | 7 |
| Deprecated types migrated | 1 (`AudioMapping` → `SimplifiedMapping`) |
| Documentation updated | 1 (`openapi.yaml`) |

**Result:** A clean, cohesive, production-grade monorepo baseline with zero dead code, consistent patterns, and proper package boundaries — ready for Stage 2 Chameleonization.
