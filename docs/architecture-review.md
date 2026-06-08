# Architecture Review — Outstanding Items

**Date:** 2026-05-28
**Audience:** A coding agent picking up this document cold. Every item is meant to be actionable without further context.

**Status:** The previous passes have been almost entirely worked through. Both cross-batch leaks (read and write side), audio idempotency, audio delete ordering, the dead auth branch, exam-route auth ordering, the `CREATE EXTENSION` placement, R2 signed-download enforcement, per-request URL caching, the duplicated response mappers/types/enums, validation helpers, rate limiting, explicit CORS methods, Node pinning, the logger type, duplicate failed-request logging, documented merge-param routers, BetterAuth CLI/version pinning, school context via `X-School-Slug`, school creation as an admin script, school provisioning cleanup/reconciliation, UUIDv7 domain IDs/cursor tie-breaks, cascade delete strategy, bulk content reordering, enrollment status removal, chapter code uniqueness, the decision to keep BetterAuth `organization.metadata`, the revised exam/evaluation model, and service modules as named free functions are all resolved. This document keeps **only the items that still need attention**, grouped by whether they're objective or opinion.

**How to read:** §1 is ops. §2 is architectural shape (opinion — confirm scope first). §3 is small cleanups. §4 is the short forward-looking list.

**User preferences to respect** (from memory):

- Prefers simple, readable code over abstractions.
- Dislikes middleware that injects values onto `req`/`res.locals` without compile-time guarantees.
- Prefers utility functions over middleware for auth checks.
- Comfortable with TypeScript type-level programming; `satisfies` over explicit annotations when both inference and validation are needed.
- Asks exploratory questions before committing; surface tradeoffs and wait for approval.

**Verify before acting:** re-read the cited file (line numbers drift), and if a finding no longer matches the code, note it here rather than silently skipping.

---

## 1. Operational / cross-cutting

### 1.1 Test coverage is one file

**File:** [packages/auth/src/permissions/batch.test.ts](../packages/auth/src/permissions/batch.test.ts) (the only test; vitest is wired in `@narada/auth` only)

`hasBatchPermission` is covered — good start. The next-highest-value pure-logic targets, all cheap to test in isolation:

- `validateNoOverlaps` (segment + audio mapping)
- the null-tail page-stitching in `findEvaluationsByBatch` / `findBatches` (complex, untested, easy to break)
- `paginateResponse` + `compoundCursor` round-trips
- response mappers (`chapterResponse` / `audioAssetResponse`) with a mocked `urlFor`

Then an integration suite (vitest + Postgres-via-docker) for the cross-batch authorization paths and `createSchool` rollback. Add a root `test` script (currently only `@narada/auth` has one) so `pnpm -r test` works.

### 1.2 Security hardening: CSRF and CSP remain

Rate limiting landed on `/auth/*`. Still open before exposing to real users:

- **CSRF:** BetterAuth session cookie should be `sameSite=strict` if there's no cross-site context; otherwise a double-submit token on state-changing routes.
- **CSP:** configure helmet's `contentSecurityPolicy` once the frontend origin is known.

---

## 2. Architectural shape (opinion — confirm scope first)

These reduce the cost of the next ten features rather than fixing a bug.

### 2.1 The remaining `db as SchoolDatabase` cast

**File:** [apps/api/src/middlewares/school.ts:38-44](../apps/api/src/middlewares/school.ts)

The dead `batch` branch that abused this is gone — good. The one remaining cast lives in `schoolDb()`, which is safe (it checks `res.locals.school` first) but unexplained. Add a one-line comment noting the cast is sound because `resolveDb` sets `school` and the scoped `db` together. Optional: have `resolveDb` track the branded type instead of relying on the cast — probably more machinery than it's worth.

### 2.2 No transaction primitive at the service boundary

Each service opens its own `db.transaction(...)`. Symptom-free today because no operation spans services. The frontend will introduce composites ("create batch + enroll the creator as instructor"; "create exam + chapter list"). When it does, you'll either thread `db | tx` through service signatures or write transaction-orchestrator functions outside services. Decide the shape before the first composite lands.

### 2.3 The auth helper triplet

`authorize` / `requireBatchAccess` / `requireBatchListAccess` ([apps/api/src/utils/auth.ts](../apps/api/src/utils/auth.ts)) share a vocabulary but have different parameter shapes, so routes must know which to call. The `BatchAccess` discriminated union is the right direction. Worth experimenting with collapsing into a single `authorize(req, db, claim): Promise<Access>` that returns a discriminated `Access` (`super` | `schoolWide` | `singleBatch` | `enrolled` | `self`) and letting routes branch on `.kind`. Try it on one claim-heavy route (e.g. `GET /v1/batches`) before propagating.

### 2.4 Staged-upload session (when the second upload flow lands)

Today: presign → client uploads → POST registers, with the DB blind between presign and POST (the janitor cleans crashes after the safety window). A richer shape — `stage()` writes a `pending` row and returns a `commitToken`; `commit()` flips it `active` after a HEAD — gives idempotency-by-design, a TTL on pending uploads, and a cleaner split for the janitor. Not needed now; revisit when the script-upload or any second file flow arrives.

---

## 3. Smaller cleanups

### 3.1 `routes/index.ts` middleware chaining is hard to skim

**File:** [apps/api/src/routes/index.ts:24-37](../apps/api/src/routes/index.ts)

`router.use(requireSchool).use('/tracks', ...)...` applies `requireSchool` to every subsequent mount, but the indentation doesn't make that obvious, and it's invisible to anyone Ctrl-F'ing a route by path. Two comments — "everything below requires the school header" and "`/schools` is mounted above this line so super-admins can create a school without a slug" — would orient readers.

### 3.2 Repeated inline param schemas

`parseParams(z.object({ chapterId: z.uuid() }), req)` (and the batch/exam/track equivalents) is re-declared in ~15 handlers. Hoist one canonical schema per resource and import it.

### 3.3 `Database` union could be tightened at call sites

`Database = PublicDatabase | SchoolDatabase` is exported and used correctly in most places. A grep for `: Database` in service signatures will surface a few that actually require `SchoolDatabase` and could say so — turning a class of misuse into a compile error.

---

## 4. Forward-looking: before the frontend lands

The API is in good shape. Two decisions shape every later one and are cheaper to make now than after a UI depends on them:

1. **Settle the transaction primitive (§2.2).** The first cross-service composite operation should not have to invent the convention under deadline pressure.
2. **Decide the staged-upload shape (§2.4).** A second upload flow should not copy the current presign/register contract blindly.

Everything else here is incrementally cleanable alongside other work in the same files.
