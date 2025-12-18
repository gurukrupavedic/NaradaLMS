# TODO - Backend

## Overview
Backend tasks organized by work type, criticality, and risk. Each item includes effort estimate, dependencies, and blockers.

---

## Active Backlog (Prioritized)

### CLEANUP & REFACTORING

**2. Error handling: standardize API error envelope and remove rethrow in global handler**
   - **Type:** Cleanup / Refactoring
   - **Criticality:** Medium (improves DX, prevents crashes)
   - **Risk:** Low (isolated to error handling paths; easy to test)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** Duplicated `createErrorResponse()` in 3+ route files; global handler rethrows after response.
   - **What needs fixing:** (a) Extract to `server/utils/error.ts`; (b) Remove `throw err;` from global handler; (c) Ensure consistent shape.
   - **Why it matters:** Cleaner logs, no duplicate utilities, prevents unhandled rejection warnings.
   - **Priority order:** 2nd (after hardening items 4, 5)

**12. Monitoring: wire up `DatabaseMonitor` or remove unused exports**
   - **Type:** Cleanup / Refactoring
   - **Criticality:** Low (code quality only)
   - **Risk:** Low (isolated module)
   - **Estimated effort:** 30 mins
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** `DatabaseMonitor` class exists; unclear if wired into storage or used.
   - **What needs fixing:** Either integrate into `storage` for event logging OR remove from exports.
   - **Why it matters:** Clean API, avoid dead code confusion.
   - **Priority order:** 4th (after hardening)

**14. Cleanup deprecated helpers: remove obsolete text-segmentation utilities**
   - **Type:** Cleanup
   - **Criticality:** Low (code quality only)
   - **Risk:** Low (audit codebase carefully)
   - **Estimated effort:** 1 hour
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** Need to audit `shared/` and `server/` for legacy utilities.
   - **What needs fixing:** Identify and remove pre-schema utilities that are no longer used.
   - **Why it matters:** Reduces confusion, cleaner codebase.
   - **Priority order:** 5th (last)

---

### HARDENING & DATA INTEGRITY (Critical Path)

**4. Published safety: block deletes/updates on published chapters**
   - **Type:** Hardening / Safety Guard
   - **Criticality:** High (prevents data loss; instructor trust)
   - **Risk:** Low (straightforward guard logic)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** No protection exists; need to verify product intent.
   - **What needs fixing:** Add guard in storage + routes: `if (chapter.status === 'published') { reject DELETE/PATCH content }`.
   - **Why it matters:** Prevents accidental loss of published educational content; safety guardrail for instructors.
   - **Priority order:** 1st (address immediately)

**5. Validation & invariants: enforce `SCRIPTS`, validate segment bounds, ensure ordering is transactional**
   - **Type:** Hardening / Validation
   - **Criticality:** High (data integrity)
   - **Risk:** Medium (impacts multiple endpoints; thorough testing needed)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** Item 6 (ordering transactions)
   - **Blockers:** Need to know current validation coverage
   - **Current State:** Need to check if `SCRIPTS` validation, bounds checking, and transactional reorders exist.
   - **What needs fixing:** (a) Enforce segment `script ∈ ['te','hi','en']`; (b) Validate start/end vs content length; (c) Wrap reorders in transactions.
   - **Why it matters:** Data integrity; prevents invalid segment state from corrupting learning experience.
   - **Priority order:** 1st (address immediately)

**6. Ordering: wrap reorder ops in transactions; prevent duplicate/invalid orders**
   - **Type:** Hardening / Consistency
   - **Criticality:** High (data consistency)
   - **Risk:** Medium (touches reorder endpoints; complex transactions)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** Drizzle transaction support
   - **Blockers:** None
   - **Current State:** Need to verify if reorder endpoints use `BEGIN/COMMIT` or Drizzle transactions.
   - **What needs fixing:** Wrap all track/chapter/segment reorders in transactions; add uniqueness + continuity checks.
   - **Why it matters:** Prevents half-applied reorders (e.g., duplicate order numbers); DB consistency.
   - **Priority order:** 1st (address immediately; blocks item 5 validation)

**13. Schema/constraints: add DB-level uniqueness and published guards**
   - **Type:** Hardening / Schema Design
   - **Criticality:** High (data integrity at DB level)
   - **Risk:** Medium (schema changes require migration; impacts future upserts)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** Items 4, 5, 6 (safety/ordering logic)
   - **Blockers:** None
   - **Current State:** Need to check Drizzle schema for existing constraints.
   - **What needs fixing:** Add constraints: (a) segment order unique per (chapter, script); (b) media segment unique per (startTime, endTime, audioFileId); (c) optionally, published guard.
   - **Why it matters:** DB-level safety; prevents invalid states even if app code has bugs.
   - **Priority order:** 2nd (after core hardening 4, 5, 6; before refactoring)

---

### ENHANCEMENTS & FEATURES

**7. Media & uploads: validate mimetypes/extensions, store duration/mime, delete files on DB delete**
   - **Type:** Enhancement / Hardening
   - **Criticality:** Medium (prevents orphaned files; improves robustness)
   - **Risk:** Low (isolated to upload/delete handlers)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** Multer validates MIME; duration stored; file deletion on DB delete may not be implemented.
   - **What needs fixing:** (a) Verify MIME + extension alignment; (b) Add file cleanup handler in delete route.
   - **Why it matters:** Prevents orphaned files in `uploads/`; security against fake uploads.
   - **Priority order:** 3rd (after hardening, before perf)

**8. Mappings: avoid duplicate media segments, enforce uniqueness, atomic deletes**
   - **Type:** Enhancement / Hardening
   - **Criticality:** Medium (improves mapping state)
   - **Risk:** Low (isolated to mapping operations)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** Item 13 (schema constraints)
   - **Blockers:** None
   - **Current State:** Need to check if DB constraints exist; orphaned segments possible on delete.
   - **What needs fixing:** (a) Add uniqueness constraint per (textSegment, audioFile); (b) Atomic delete handler.
   - **Why it matters:** Prevents duplicate/orphaned segments; cleaner state.
   - **Priority order:** 3rd (after hardening, with item 7)

**9. N+1/perf: aggregate counts; cache ensureInitialized()**
   - **Type:** Enhancement / Performance
   - **Criticality:** Low (quality-of-life improvement; no user-facing impact yet)
   - **Risk:** Medium (refactor queries; need load testing)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Blockers:** Known N+1 bottlenecks must be identified first
   - **Current State:** Need to audit routes for per-row count queries and repeated initialization.
   - **What needs fixing:** (a) Use SQL aggregates for list endpoints; (b) Cache `ensureInitialized()` result.
   - **Why it matters:** Faster endpoints; reduced DB round-trips.
   - **Priority order:** 4th (after hardening + cleanup; only if perf becomes a blocker)

**10. User upsert: update conflict set (roles/status/names); enforce allowed-role list**
   - **Type:** Enhancement / Hardening
   - **Criticality:** Medium (improves user sync reliability)
   - **Risk:** Low (isolated to auth upsert logic)
   - **Estimated effort:** 1 hour
   - **Dependencies:** None
   - **Blockers:** None
   - **Current State:** Need to check user upsert logic in auth routes.
   - **What needs fixing:** (a) Include roles/status/names in conflict resolution; (b) Add role validation.
   - **Why it matters:** Keeps user profile in sync; prevents invalid roles.
   - **Priority order:** 3rd (with items 7, 8)

**11. Student progress: implement real queries or return 501**
   - **Type:** Enhancement / Feature
   - **Criticality:** Low (deferred during development)
   - **Risk:** Low (isolated to progress endpoints)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** Progress data model finalization
   - **Blockers:** Product decision: is real progress tracking needed now?
   - **Current State:** Endpoints return stubbed `0` values.
   - **What needs fixing:** Either implement real aggregation or return HTTP 501 (Not Implemented).
   - **Why it matters:** Honest API state; prevents relying on fake data.
   - **Priority order:** 5th (defer until progress feature is prioritized)

---

## Priority Matrix

| Priority | Items | Target | Notes |
|----------|-------|--------|-------|
| **1 (ASAP)** | 4, 5, 6 | 1 week | Critical hardening; data integrity risk |
| **2** | 2, 13 | 2 weeks | Schema finalization + error consistency |
| **3** | 7, 8, 10 | 3 weeks | Robustness enhancements |
| **4** | 9, 12, 14 | 4+ weeks | Quality-of-life + cleanup (non-blocking) |
| **5** | 11 | TBD | Defer pending product decision |

---

## Notes
- Dependencies form a DAG: 6 → 5; 4,5,6 → 13; 13 → 8.
- All hardening items (4, 5, 6, 13) should be treated as critical path.
- Cleanup items (2, 12, 14) can be done in parallel with hardening or deferred if time-constrained.
- Item 11 is a feature decision; defer until student progress is a business priority.

---

## Completed Items

~~1. Auth wiring: integrate Replit OIDC and replace `createdBy: "system"` with authenticated user IDs.~~ ✅ DONE

~~3. Seeding: fix `init-database` reference, reuse `seed-vedic-curriculum` without `process.exit`, align connection config.~~ ✅ DONE
