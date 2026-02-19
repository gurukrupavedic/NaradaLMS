# NaradaLMS Hardening & Cleanup Strategy

> **Purpose**: Clean up, harden, and prepare the codebase for its first deployment.
> **Status**: Pre-production. Not deployed anywhere. No external users.
> **Preceding Work**: Stage 0 (Foundation) and Stage 1 (Structural Split) are complete.
> **Next Milestone**: First testable deployment, then Stage 2 (Chameleonization).

---

## Branching and Tagging Strategy (Mandatory)

**No hardening code may be merged into `main` until all phases (0–6) are complete and verified.** All work happens on branches. `main` stays untouched and tagged as the pre-hardening baseline.

### Rules

1. **`main` is protected**
   - No direct commits to `main` during hardening.
   - No merge from any hardening or phase branch into `main` until the **Hardening Complete Gate** (below) is satisfied.
   - Prefer GitHub/GitLab branch protection: require pull requests, no force-push, optional status checks.

2. **Baseline tag on `main` (before any work)**
   - From a clean, working `main`:  
     `git tag baseline-pre-hardening`  
   - Push the tag if using a remote:  
     `git push origin baseline-pre-hardening`  
   - This tag is the rollback point. Do not move or overwrite it.

3. **Single long-lived hardening branch**
   - Create once from `main`:  
     `git checkout main && git pull && git checkout -b hardening`  
   - All phase work is done on `hardening` or on phase branches that merge **only** into `hardening`.

4. **Per-phase sub-branches**
   - For each phase N, create a branch from `hardening`:  
     `git checkout hardening && git pull && git checkout -b hardening-phase-N`  
   - Do all work for that phase on `hardening-phase-N`. Commit and verify there.
   - When the phase is complete and verified, merge **into `hardening` only**:  
     `git checkout hardening && git merge hardening-phase-N --no-ff -m "Merge hardening-phase-N: <phase name>"`  
   - Optionally tag the phase on `hardening`:  
     `git tag hardening-phase-N-complete`  
   - Do **not** merge `hardening` or any phase branch into `main` at this stage.

5. **Merge to `main` only at the end (Hardening Complete Gate)**
   - Only after **all** phases 0–6 are complete, verified, and merged into `hardening`.
   - Run the full verification suite and manual checks one final time on `hardening`.
   - When you have full confidence, follow the steps in **[Phase 6: Hardening Complete Gate](phase-6-deployment-readiness.md#hardening-complete-gate-only-time-to-merge-into-main)** — that is the only place merge-to-`main` is described.
   - Then tag the new baseline on `main` (e.g. `baseline-post-hardening` or `v0.2.0-pre-deploy`) and push `main` and the tag.

### Branch structure

```
main (protected, tagged baseline-pre-hardening)
  └── hardening
        ├── hardening-phase-0   → merge to hardening when Phase 0 done
        ├── hardening-phase-1   → merge to hardening when Phase 1 done
        ├── hardening-phase-2   → merge to hardening when Phase 2 done
        ├── hardening-phase-3   → merge to hardening when Phase 3 done
        ├── hardening-phase-4   → merge to hardening when Phase 4 done
        ├── hardening-phase-5   → merge to hardening when Phase 5 done
        └── hardening-phase-6   → merge to hardening when Phase 6 done
                                    ↓
                        Only when ALL phases verified:
                        merge hardening → main
                        tag main: baseline-post-hardening
```

### Before you start (one-time setup)

- [ ] `main` is clean, up to date, and the app runs (`npm run dev`, both portals work).
- [ ] Baseline tag created on `main`:  
  `git tag baseline-pre-hardening`  
  (and `git push origin baseline-pre-hardening` if using a remote).
- [ ] Hardening branch created:  
  `git checkout main && git checkout -b hardening`  
  (and `git push -u origin hardening` if using a remote).
- [ ] Branch protection enabled on `main` (no direct push, require PR if your host supports it).
- [ ] All work from this point happens on `hardening` or `hardening-phase-*` branches only.

### For AI agents

- **Never** commit or merge anything to `main`. All commits go to `hardening` or a `hardening-phase-N` branch.
- At the **start** of each phase document, follow the "Branch" steps to create/checkout the phase branch.
- At the **end** of each phase document, follow the "Merge" steps to merge the phase branch into `hardening` only.
- The **only** merge into `main` is described in Phase 6 (Hardening Complete Gate) and must be done only after all phases are complete and verified.

---

## Context

NaradaLMS is a Vedic education platform split into:
- **Server** (`server/`): Express API with 6 domain modules (identity-access, content-publishing, media-pipeline, batch-cohort, learning-delivery, system-admin)
- **Student Portal** (`apps/student-portal/`): Next.js 15 app for students (port 3000)
- **Ops Portal** (`apps/ops-portal/`): Next.js 15 app for admins/instructors/content managers (port 3001)
- **Shared Packages** (`packages/`): ui, types, api-client, configs
- **Legacy Monolith Frontend** (`client/`): Vite+React SPA (281+ files) — **to be removed**
- **Legacy Shared** (`shared/`): Types/schema duplicated in `packages/types/` — **to be consolidated**

The monolith frontend (`client/`) was kept as reference during Stage 1. Both portals are now functional. The codebase needs cleanup before first deployment.

---

## Phase Overview

| Phase | Name | Purpose | Risk | Estimated Effort |
|-------|------|---------|------|-----------------|
| **0** | Safety Net | Establish verification scripts before changing anything | None | Small |
| **1** | Monolith Removal & Type Unification | Remove `client/`, consolidate `shared/` into `@narada/types` | Medium | Medium |
| **2** | Critical Bug Fixes | Fix SSR crashes, broken API calls, auth bugs | Low | Small |
| **3** | Server Hardening | Fix security gaps, auth middleware, error handling, events | Medium | Large |
| **4** | Portal Refactoring | Deduplicate components, fix hooks, consolidate layouts | Low | Medium |
| **5** | Performance & Code Quality | Fix N+1 queries, add DB pagination, remove dead code | Low | Medium |
| **6** | Deployment Readiness | Environment config, Docker setup, build verification | Low | Medium |

---

## Dependency Graph

```
Phase 0 (Safety Net)
  └─→ Phase 1 (Monolith Removal)
       └─→ Phase 2 (Critical Bug Fixes)
            ├─→ Phase 3 (Server Hardening)     ← can run in parallel with Phase 4
            └─→ Phase 4 (Portal Refactoring)   ← can run in parallel with Phase 3
                 └─→ Phase 5 (Performance & Code Quality)
                      └─→ Phase 6 (Deployment Readiness)
```

- **Phase 0 must be first**: Everything depends on having verification scripts.
- **Phase 1 must precede Phase 2**: Type unification changes import paths that Phase 2 touches.
- **Phases 3 and 4 can run in parallel**: Server changes and portal changes are independent.
- **Phase 5 after 3+4**: Performance work builds on clean code.
- **Phase 6 is last**: Deployment config assumes all code is clean.

---

## How to Execute Each Phase

Each phase document contains:
1. **Objective** — What this phase achieves
2. **Prerequisites** — What must be done before starting
3. **Tasks** — Numbered, ordered steps with exact file paths and code changes
4. **Verification** — How to confirm the phase succeeded
5. **Rollback** — How to undo if something goes wrong

### For AI Agents Executing These Plans

- **Execute one task at a time.** Complete it, verify it, then move to the next.
- **Never combine tasks.** Each task is designed to leave the codebase in a working state.
- **Run verification after every task.** If verification fails, stop and diagnose.
- **Do not skip verification steps.** They exist to catch regressions.
- **Read the target file before editing.** Confirm the "before" state matches what the document describes.
- **If the file doesn't match the "before" state**, the codebase may have changed. Stop and reassess.

---

## Document Index

| Document | Phase | Description |
|----------|-------|-------------|
| [phase-0-safety-net.md](./phase-0-safety-net.md) | 0 | Establish smoke tests and verification scripts |
| [phase-1-monolith-removal.md](./phase-1-monolith-removal.md) | 1 | Remove legacy frontend, unify type system |
| [phase-2-critical-fixes.md](./phase-2-critical-fixes.md) | 2 | Fix SSR crashes, broken API calls, auth issues |
| [phase-3-server-hardening.md](./phase-3-server-hardening.md) | 3 | Security, auth middleware, error handling, events |
| [phase-4-portal-refactoring.md](./phase-4-portal-refactoring.md) | 4 | Deduplicate components, consolidate layouts, fix hooks |
| [phase-5-performance.md](./phase-5-performance.md) | 5 | Fix queries, add pagination, remove dead code |
| [phase-6-deployment-readiness.md](./phase-6-deployment-readiness.md) | 6 | Environment config, Docker, build verification |

---

## Key Principles

1. **`main` is off-limits until hardening is complete.** All work and merges happen on `hardening` and `hardening-phase-*` branches. See [Branching and Tagging Strategy](#branching-and-tagging-strategy-mandatory) above.
2. **Zero logic changes during structural refactoring.** When moving code or changing imports, do NOT change behavior simultaneously. Move first, fix second.
3. **Every change is independently verifiable.** No change should require another change to be valid.
4. **Preserve all existing functionality.** The portals should work identically after each phase.
5. **Commit after each completed task.** Small, atomic commits on the phase branch make regressions easy to find.
6. **Test against the running application.** After each phase, start the server and both portals, and verify the core flows manually.

---

## Core Verification Flows (Manual)

After each phase, verify these flows still work:

### Student Portal (http://localhost:3000)
1. Login page loads
2. Can login with valid credentials
3. Dashboard shows student details and track progress
4. Can navigate to a chapter and see content
5. Audio player loads and plays

### Ops Portal (http://localhost:3001)
1. Login page loads
2. Can login with admin credentials
3. Admin dashboard loads with navigation
4. Can view batch list
5. Can view batch details with proficiency matrix
6. Content studio loads with track list
7. Can navigate to instructor section

### API Server (http://localhost:5000)
1. `GET /api/auth/me` returns 401 when not logged in
2. `POST /api/auth/login` works with valid credentials
3. `GET /api/batches` returns batch list
4. `GET /api/content/tracks` returns track list
5. `GET /api/learning/my-progress` works for authenticated students
