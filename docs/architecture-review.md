# Architecture Review — Outstanding Items

**Date:** 2026-05-28
**Audience:** A coding agent picking up this document cold. Every item is meant to be actionable without further context.

**Status:** The previous passes have been almost entirely worked through. Both cross-batch leaks (read and write side), audio idempotency, audio delete ordering, the dead auth branch, exam-route auth ordering, the `CREATE EXTENSION` placement, R2 signed-download enforcement, per-request URL caching, the duplicated response mappers/types/enums, validation helpers, rate limiting, explicit CORS methods, Node pinning, the logger type, duplicate failed-request logging, documented merge-param routers, BetterAuth CLI/version pinning, school context via `X-School-Slug`, school creation as an admin script, school provisioning cleanup/reconciliation, UUIDv7 domain IDs/cursor tie-breaks, cascade delete strategy, bulk content reordering, enrollment status removal, chapter code uniqueness, the decision to keep BetterAuth `organization.metadata`, the revised exam/evaluation model, service modules as named free functions, `SchoolDbExecutor` for transaction-compatible service calls, access-query auth helpers, and deferring staged-upload sessions until the upload workflow needs them are all resolved. This document keeps **only the items that still need attention**, grouped by whether they're objective or opinion.

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

## 4. Deferred decisions

### 4.1 Staged-upload sessions

Keep the current presign → client upload → register/apply flow while uploads only need object existence checks and janitor cleanup. Add a DB-backed staged-upload session only when uploads need resumability, user-visible pending state, multi-step commit, or a second upload workflow that should not copy the current contract blindly.

Everything else here is incrementally cleanable alongside other work in the same files.
