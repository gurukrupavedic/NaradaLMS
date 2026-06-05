# Architecture Review — Outstanding Items

**Date:** 2026-05-28
**Audience:** A coding agent picking up this document cold. Every item is meant to be actionable without further context.

**Status:** The previous passes have been almost entirely worked through. Both cross-batch leaks (read and write side), audio idempotency, audio delete ordering, the dead auth branch, exam-route auth ordering, the `CREATE EXTENSION` placement, R2 signed-download enforcement, per-request URL caching, the duplicated response mappers/types/enums, validation helpers, rate limiting, Node pinning, the logger type, BetterAuth CLI/version pinning, school creation as an admin script, school provisioning cleanup/reconciliation, UUIDv7 domain IDs, cascade delete strategy, bulk content reordering, and the revised exam/evaluation model are all resolved. This document keeps **only the items that still need attention**, grouped by whether they're objective or opinion.

**How to read:** §1–§2 are objective (bugs, schema). §3 is ops. §4 is architectural shape (opinion — confirm scope first). §5 is small cleanups. §6 is the short forward-looking list.

**User preferences to respect** (from memory):

- Prefers simple, readable code over abstractions.
- Dislikes middleware that injects values onto `req`/`res.locals` without compile-time guarantees.
- Prefers utility functions over middleware for auth checks.
- Comfortable with TypeScript type-level programming; `satisfies` over explicit annotations when both inference and validation are needed.
- Asks exploratory questions before committing; surface tradeoffs and wait for approval.

**Verify before acting:** re-read the cited file (line numbers drift), and if a finding no longer matches the code, note it here rather than silently skipping.

---

## 1. Correctness / data-integrity

### 1.1 UUID tie-break in cursor pagination is arbitrary

**Files:** [apps/api/src/services/evaluation.ts:43-49](../apps/api/src/services/evaluation.ts), [apps/api/src/services/exam.ts](../apps/api/src/services/exam.ts), [apps/api/src/services/batch.ts](../apps/api/src/services/batch.ts)

Within an equal sort key (`evaluatedAt`, `scheduledAt`, `startDate`), the cursor advances by `lt/gt` on the row's UUID `id`. UUIDs sort lexicographically — pagination stays *consistent* (no lost/duplicated rows), but the order within a tie is meaningless. Either accept it (one-line comment) or add a monotonic secondary key (a `createdAt`/serial column) to make tie order stable and intuitive.

---

## 2. Schema / database

These are the standing schema decisions that still need a product or API choice.

### 2.1 `enrollment.status` is write-only

**File:** [packages/db/src/schema/school.ts:132-149](../packages/db/src/schema/school.ts)

The column exists but nothing ever transitions it off `'active'`. Either add the transitions (batch completion, withdrawal) or drop the column until needed. If transitions are added, historical evaluations and exams should remain visible even when current enrollment state changes.

### 2.2 `chapter.code` / `batch.code` uniqueness scope

**File:** [packages/db/src/schema/school.ts:57, 122](../packages/db/src/schema/school.ts)

Both are `.unique()`, i.e. unique per *school* (the schema is per-school). For `chapter.code`, intuition suggests per-track (`unique(trackId, code)` — allows `INTRO-01` in every track). Confirm intent; `batch.code` is probably fine school-wide.

### 2.3 `organization.metadata` is unused free-form text

**File:** [packages/db/src/schema/auth.ts:85](../packages/db/src/schema/auth.ts)

Either claim it (Zod schema + helpers — school config like default language, theme, feature flags) or drop the column. Left unstructured, two callers will eventually use it for conflicting purposes.

---

## 3. Operational / cross-cutting

### 3.1 Failed requests log twice

**File:** [apps/api/src/server.ts:62-118](../apps/api/src/server.ts)

`handleErrors` logs the error (warn for 4xx, error for 5xx), then `logRequest`'s `res.on('finish')` logs the same request again at the same level. Every failed request emits two lines. They share a `requestId`, so it's correlatable — but it's noise. Either consolidate (stash the error and let `logRequest` emit the single line) or consciously accept the duplication and document why.

### 3.2 Test coverage is one file

**File:** [packages/auth/src/permissions/batch.test.ts](../packages/auth/src/permissions/batch.test.ts) (the only test; vitest is wired in `@narada/auth` only)

`hasBatchPermission` is covered — good start. The next-highest-value pure-logic targets, all cheap to test in isolation:

- `validateNoOverlaps` (segment + audio mapping)
- the null-tail page-stitching in `EvaluationService.findByBatch` / `BatchService.findAll` (complex, untested, easy to break)
- `paginateResponse` + `compoundCursor` round-trips
- response mappers (`chapterResponse` / `audioAssetResponse`) with a mocked `urlFor`

Then an integration suite (vitest + Postgres-via-docker) for the cross-batch authorization paths and `SchoolService.create` rollback. Add a root `test` script (currently only `@narada/auth` has one) so `pnpm -r test` works.

### 3.3 Security hardening: CSRF and CORS/CSP remain

Rate limiting landed on `/auth/*`. Still open before exposing to real users:

- **CSRF:** BetterAuth session cookie should be `sameSite=strict` if there's no cross-site context; otherwise a double-submit token on state-changing routes.
- **CORS/CSP:** `cors({ origin: env.TRUSTED_ORIGINS, credentials: true })` is fine, but add an explicit methods allowlist and configure helmet's `contentSecurityPolicy` once the frontend origin is known. Consider extending the rate limiter beyond `/auth` to the mutating resource routes.

---

## 4. Architectural shape (opinion — confirm scope first)

These reduce the cost of the next ten features rather than fixing a bug.

### 4.1 Service classes are namespaces in disguise

11 services are classes with only static methods; `objectLifecycle` is a const object; `ChapterReader` is a default-exported class. No encapsulation, no state — just import ceremony. Pick one shape and apply it everywhere:

1. **Free functions** — `export async function createChapter(db, data)`. Best tree-shaking, matches the "utility functions" preference. Recommended.
2. **Object literals** — `export const chapterService = { create, update }`.
3. **Status quo**, documented so new code doesn't drift.

The grep cost is one-time; the readability win compounds. Worth settling before the frontend doubles the call sites.

### 4.2 The remaining `db as SchoolDatabase` cast

**File:** [apps/api/src/middlewares/school.ts:38-44](../apps/api/src/middlewares/school.ts)

The dead `batch` branch that abused this is gone — good. The one remaining cast lives in `schoolDb()`, which is safe (it checks `res.locals.school` first) but unexplained. Add a one-line comment noting the cast is sound because `resolveDb` sets `school` and the scoped `db` together. Optional: have `resolveDb` track the branded type instead of relying on the cast — probably more machinery than it's worth.

### 4.3 No transaction primitive at the service boundary

Each service opens its own `db.transaction(...)`. Symptom-free today because no operation spans services. The frontend will introduce composites ("create batch + enroll the creator as instructor"; "create exam + chapter list"). When it does, you'll either thread `db | tx` through service signatures or write transaction-orchestrator functions outside services. Decide the shape before the first composite lands.

### 4.4 The auth helper triplet

`authorize` / `requireBatchAccess` / `requireBatchListAccess` ([apps/api/src/utils/auth.ts](../apps/api/src/utils/auth.ts)) share a vocabulary but have different parameter shapes, so routes must know which to call. The `BatchAccess` discriminated union is the right direction. Worth experimenting with collapsing into a single `authorize(req, db, claim): Promise<Access>` that returns a discriminated `Access` (`super` | `schoolWide` | `singleBatch` | `enrolled` | `self`) and letting routes branch on `.kind`. Try it on one claim-heavy route (e.g. `GET /v1/batches`) before propagating.

### 4.5 School-context contract: header vs session

`X-School-Slug` is resolved on every request ([middlewares/school.ts](../apps/api/src/middlewares/school.ts)); BetterAuth's `session.activeOrganizationId` is populated but unused. The header is debuggable but stateless (re-resolves each request); the session is one fewer place for drift. Before the frontend's API client ships, pick one so it doesn't implement both. (Header keeps super-admin "switch school" simple; session is a cleaner contract.) Document the choice either way.

### 4.6 Staged-upload session (when the second upload flow lands)

Today: presign → client uploads → POST registers, with the DB blind between presign and POST (the janitor cleans crashes after the safety window). A richer shape — `stage()` writes a `pending` row and returns a `commitToken`; `commit()` flips it `active` after a HEAD — gives idempotency-by-design, a TTL on pending uploads, and a cleaner split for the janitor. Not needed now; revisit when the script-upload or any second file flow arrives.

---

## 5. Smaller cleanups

### 5.1 `Router({ mergeParams: true })` use is undocumented

Set on routers that read parent params, absent on those that don't — correct, but invisible. One comment per router (`// mergeParams: parent path provides :batchId`) saves future readers a lookup.

### 5.2 `routes/index.ts` middleware chaining is hard to skim

**File:** [apps/api/src/routes/index.ts:24-37](../apps/api/src/routes/index.ts)

`router.use(requireSchool).use('/tracks', ...)...` applies `requireSchool` to every subsequent mount, but the indentation doesn't make that obvious, and it's invisible to anyone Ctrl-F'ing a route by path. Two comments — "everything below requires the school header" and "`/schools` is mounted above this line so super-admins can create a school without a slug" — would orient readers.

### 5.3 Repeated inline param schemas

`parseParams(z.object({ chapterId: z.uuid() }), req)` (and the batch/exam/track equivalents) is re-declared in ~15 handlers. Hoist one canonical schema per resource and import it.

### 5.4 `Database` union could be tightened at call sites

`Database = PublicDatabase | SchoolDatabase` is exported and used correctly in most places. A grep for `: Database` in service signatures will surface a few that actually require `SchoolDatabase` and could say so — turning a class of misuse into a compile error.

---

## 6. Forward-looking: before the frontend lands

The API is in good shape. Two decisions shape every later one and are cheaper to make now than after a UI depends on them:

1. **Pick a service shape (§4.1).** The first cross-service composite operation (§4.3) shouldn't have to fight the conventions.
2. **Decide the school-context contract (§4.5).** The API client should implement header *or* session, not both.

Everything else here is incrementally cleanable alongside other work in the same files.
