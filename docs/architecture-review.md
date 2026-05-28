# Architecture Review

**Date:** 2026-05-26
**Audience:** A coding agent picking up this document cold. Every item is meant to be actionable without further context.

**Status:** The API surface (`apps/api`) implements most of the routes in [docs/api.md](api.md). Service layer is shallow CRUD. Zero tests. This document is the second-pass review after the first round of cleanup landed.

---

## How to use this document

1. **Read §1 (Repository map) first** to orient.
2. **§2–§4 are objective:** correctness bugs, security/data-integrity bugs, schema-level issues. Safe to act on directly.
3. **§5–§6 are opinion:** architectural deepening candidates and consistency cleanup. Confirm scope before large refactors.
4. **Re-read the cited files before acting** — the user actively rewrites code and line numbers shift.

**User preferences to respect** (from memory):

- Prefers simple, readable code over abstractions.
- Dislikes middleware that injects values onto `req`/`res.locals` without compile-time guarantees.
- Prefers utility functions over middleware for auth checks.
- Comfortable with TypeScript type-level programming; `satisfies` over explicit annotations when both inference and validation are needed.
- Asks exploratory questions before committing; surface tradeoffs and wait for approval.

---

## 1. Repository map

Monorepo, pnpm workspaces. Node + Express 5 backend; no frontend in this repo yet.

```
narada/
├── apps/
│   └── api/                          # Express 5 server
│       ├── src/
│       │   ├── index.ts              # entry point
│       │   ├── server.ts             # createServer, runServer, error handler
│       │   ├── logger.ts             # pino setup
│       │   ├── error.ts              # AppError + factories
│       │   ├── types/express.d.ts    # res.locals typing
│       │   ├── middlewares/school.ts # resolveDb + requireSchool
│       │   ├── utils/
│       │   │   ├── auth.ts           # getSession, authorize, requireBatchAccess
│       │   │   ├── chapterView.ts    # authorizeContentReadView helper
│       │   │   ├── cursor.ts         # asCursor, compoundCursor, paginateResponse
│       │   │   ├── validate.ts       # parseBody/Params/Query
│       │   │   └── objectLifecycle.ts # R2 + DB coordination
│       │   ├── scripts/releaseObjectOrphans.ts
│       │   ├── routes/               # all wired in routes/index.ts
│       │   └── services/             # one per major entity
│       └── package.json
├── packages/
│   ├── auth/                         # BetterAuth + ACL
│   │   ├── src/index.ts
│   │   ├── src/client.ts
│   │   └── src/permissions/{school,batch,types,index}.ts
│   ├── db/                           # Drizzle ORM
│   │   ├── src/index.ts              # publicDb, getScopedDatabase, LRU pool cache
│   │   ├── src/provision.ts          # provisionSchool, renameSchool
│   │   └── src/schema/{auth,school,relations,index}.ts
│   ├── storage/                      # R2/S3 wrapper
│   └── env/                          # Zod-validated env vars
├── docs/{api,data-model,architecture-review}.md
├── TODO.md
└── package.json
```

**Top-level concepts:**

- **School** = BetterAuth organization. Multi-tenancy via schema-per-school (`school_<slug>` Postgres schemas).
- **Batch** = cohort within a school. Backed by per-school `batch` table; BetterAuth's team plugin was removed.
- **Track** = ordered curriculum (sequence of chapters) within a school.
- **Chapter** = single learnable unit. Holds `script` + `textObjectKey`; API responses expose resolved `textUrl`.
- **Segment** = byte range within a chapter's text.
- **AudioAsset** = R2-stored audio file attached to a chapter.
- **AudioMapping** = (segment, audioAsset, audioStart, audioEnd).
- **Enrollment** = (userId, batchId, role, status, phone, city). Profile data merged in.
- **Evaluation** = append-only proficiency record (studentId, chapterId, level, evaluatorId).
- **Exam** = scheduled assessment for a student in a batch; `examResult` links an exam to evaluations per chapter.

**Authorization model (two levels):**

- **School-level** via BetterAuth AC: `owner` > `admin` > `member`. Resources: `school`, `content`, `batch`, `member`, `invitation`, `enrollment`, `evaluation`.
- **Batch-level** via custom ACL in [packages/auth/src/permissions/batch.ts](../packages/auth/src/permissions/batch.ts): `instructor` / `ta` / `student`. Resources: `evaluation`, `exam`, `enrollment`.
- **Super admin** = `user.isSuperAdmin` flag, bypasses all checks.

---

## 2. Correctness bugs

Objective defects in the code. Independent fixes.

### 2.1 `handleErrors` calls `next()` after sending the response

**File:** [apps/api/src/server.ts:46-65](../apps/api/src/server.ts)

After `res.status(...).json(...)` the handler falls through to `next()` (no error argument). The response is already on the wire; the trailing `next()` either no-ops or advances to a phantom matcher. Drop it:

```ts
if (error instanceof AppError) {
  res.status(error.statusCode).json({ ok: false, error: { code: error.code, message: error.message } })
  return
}
if (!res.headersSent) {
  res.status(500).json({ ok: false, error: { code: ErrorCode.INTERNAL_ERROR, message: '...' } })
}
// nothing after — response is sent
```

### 2.2 Graceful shutdown ignores errors and leaks PG connections

**File:** [apps/api/src/server.ts:67-77](../apps/api/src/server.ts)

- `server.close(err => { ... process.exit(0) })` exits 0 even when `err` is set. Should exit 1 on error so orchestrators retry properly.
- No timeout. If a request hangs, the process never exits and the platform hard-kills it.
- The LRU pool cache in [packages/db/src/index.ts:11](../packages/db/src/index.ts) is not drained, so all Postgres pools leak on shutdown. Expose a `shutdownPools()` from `@narada/db` and call it on SIGTERM.

### 2.3 `SchoolService.create` / `update` are not atomic

**File:** [apps/api/src/services/school.ts:56-97](../apps/api/src/services/school.ts)

- **Create:** `provisionSchool(slug)` runs *before* the `organization` insert. If the insert fails (slug uniqueness race, connection drop), the Postgres `school_<slug>` schema is orphaned with no row referencing it. The next attempt with a different slug succeeds, but the orphan is unreachable.
- **Update:** `renameSchool` and `clearSchoolDbCache` run *before* the org-row update. Order of events:
  1. Rename Postgres schema (`school_<old>` → `school_<new>`).
  2. Clear LRU cache entry for the old slug.
  3. Update the `organization` row.

  Between (1) and (3), any in-flight request that already pulled the old slug's pool holds a pool with `search_path=school_<old>`, which no longer exists. New requests with the new slug haven't been pooled yet because the row update hasn't committed.

**Fix:** Wrap the row mutation in a transaction; do `renameSchool` inside the transaction (DDL is transactional in Postgres) or use a compensating action; invalidate the cache after commit. For create: insert the row first, provision the schema after, delete the row on provisioning failure.

### 2.4 Cross-batch evaluation leak when batches share a track

**Files:** [apps/api/src/routes/evaluations.ts](../apps/api/src/routes/evaluations.ts), [apps/api/src/services/evaluation.ts:73-132](../apps/api/src/services/evaluation.ts)

`findByBatch` and `findByStudent` filter results by `chapterId IN (chapters of batch.trackId)`. The schema has no unique constraint on `batch.trackId` — two batches can share a track. A TA in batch A who has read permission on evaluations can list evaluations from batch B, because both batches' chapter sets are identical.

**Fix:** Join on `enrollment.batchId = :batchId` and filter by `evaluation.studentId IN (enrolled userIds)`, or `INNER JOIN enrollment ON enrollment.userId = evaluation.studentId AND enrollment.batchId = :batchId`.

### 2.5 `findByStudent` doesn't enforce that `studentId` is enrolled in the batch

**File:** [apps/api/src/routes/evaluations.ts:26-49](../apps/api/src/routes/evaluations.ts)

Same root as 2.4. The route accepts any `studentId` path parameter. There is no check that the student is enrolled in the batch — only that the requester has access. Returns whatever evaluations match the chapter-set filter.

### 2.6 `ChapterReadView` with `learning` kind and undefined `studentId` bypasses the access check

**File:** [apps/api/src/services/chapterReader.ts:20-23](../apps/api/src/services/chapterReader.ts)

```ts
export type ChapterReadView =
  | { kind: 'authoring' }
  | { kind: 'learning'; studentId?: string }
```

`findById` only runs `studentCanReadTrack` and the currentLevel lookup when `view.kind === 'learning' && view.studentId`. If a future caller passes `{ kind: 'learning' }` without a student id, the function returns the chapter (drafts excluded) with no enrollment check — silently elevating to an admin-shaped read.

**Fix:** Split into three explicit variants:
```ts
type ChapterReadView =
  | { kind: 'authoring' }
  | { kind: 'learnerPreview' }      // admin viewing as learner; no enrollment check
  | { kind: 'student'; studentId: string }
```

### 2.7 `recordResults` always marks the exam complete

**File:** [apps/api/src/services/exam.ts:191-198](../apps/api/src/services/exam.ts)

The transaction sets `exam.status = 'completed'` unconditionally. There is no relation linking an exam to the chapters it was *expected* to cover, so partial results still flip the status. Either:

- Model the expected chapter list (`examChapter` table) and only complete when count matches.
- Make completion an explicit caller action (PATCH the status separately).

### 2.8 `audio` POST accepts arbitrary object keys, with path-traversal-flavored input

**File:** [apps/api/src/services/audio.ts:46-49](../apps/api/src/services/audio.ts)

The route validates `data.objectKey.startsWith('schools/{schoolId}/chapters/{chapterId}/audio/')`. A client can send `schools/X/chapters/X/audio/../../../other-school/foo.mp3`. R2 treats keys as opaque strings (no `..` interpretation), so this isn't a true traversal — but the contract is wrong. The client shouldn't be allowed to dictate the path at all.

**Fix:** Have the presign step return only the UUID; reconstruct the full key server-side from `(schoolId, chapterId, uuid, ext)` on POST.

### 2.9 `audio` POST has no idempotency

**File:** [apps/api/src/services/audio.ts:51-63](../apps/api/src/services/audio.ts)

A client that retries after a network blip creates two `audioAsset` rows pointing at the same object key. Add a unique index on `(chapterId, objectKey)`, or pre-register the row at presign time and upgrade it on POST.

### 2.10 `audio` POST doesn't verify the object exists on R2

A client can call POST with any matching-prefix key and create a row pointing at a 404. Either `HEAD` the object before insert, or insert as `status='pending'` and have a janitor reconcile.

### 2.11 `applyScript` reuses a fixed object key — concurrent uploads race silently

**Files:** [apps/api/src/utils/objectLifecycle.ts:51-58](../apps/api/src/utils/objectLifecycle.ts), [apps/api/src/services/chapter.ts:48-73](../apps/api/src/services/chapter.ts)

`stageChapterTextUpload` returns `schools/{schoolId}/chapters/{chapterId}/text.txt` every time. Two concurrent presign+upload cycles for the same chapter clobber each other, and the DB transaction in `applyScript` doesn't notice because it just updates a pointer to the same key. The existing comment acknowledges a smaller R2/DB disagreement window, but the race is worse than that.

**Fix:** Make the key versioned (UUID-suffixed). Atomically swap `chapter.textObjectKey` to the new key. Let the janitor reap old keys.

### 2.12 `releaseObjectOrphans` has a read-then-delete race

**File:** [apps/api/src/utils/objectLifecycle.ts:68-94](../apps/api/src/utils/objectLifecycle.ts)

`listObjectKeys` runs first, then `referencedObjectKeys`. If a new asset is uploaded to R2 and then recorded in the DB between those two reads, the new R2 key appears in `storedKeys` but not in `referencedKeys` → deleted.

**Fix:** Read DB references first, then list R2. Treat objects only as orphans if their `LastModified` is older than some safety window (e.g. 1 hour) so in-flight uploads aren't reaped.

### 2.13 Audio POST and DELETE go through different code paths to find an asset

**Files:** [apps/api/src/routes/audioMappings.ts:17](../apps/api/src/routes/audioMappings.ts), [apps/api/src/services/audio.ts:66](../apps/api/src/services/audio.ts)

`audioMappings.ts` queries `db.query.audioAsset.findFirst` inline; `AudioService.remove` does the same via the service. Pull the asset lookup into `AudioService.findById` and use it from both places.

### 2.14 `Database` type is the same for `publicDb` and `getScopedDatabase`

**File:** [packages/db/src/index.ts:45](../packages/db/src/index.ts)

```ts
export type Database = ReturnType<typeof getScopedDatabase>
```

`publicDb` and a scoped DB instance have identical TypeScript types, but their runtime `search_path` differs. A service that expects school-scoped tables but is handed `publicDb` will silently read from the `public` schema and return nothing. This is a footgun.

**Fix:** Brand the two:
```ts
declare const dbBrand: unique symbol
export type PublicDatabase = DrizzleDb & { [dbBrand]: 'public' }
export type SchoolDatabase = DrizzleDb & { [dbBrand]: 'school' }
```

Then `EnrollmentService.findOne(db: SchoolDatabase, ...)` won't compile when handed `publicDb`.

### 2.15 Cursor pagination re-includes null-row candidates on every page

**Files:** [apps/api/src/services/evaluation.ts:39-51](../apps/api/src/services/evaluation.ts), [apps/api/src/services/batch.ts:84-94](../apps/api/src/services/batch.ts)

When `cursor.evaluatedAt` is non-null, the WHERE includes `isNull(evaluation.evaluatedAt)` in the OR. Because the ORDER BY uses `DESC NULLS LAST`, null rows still sort *after* the remaining non-null rows — so pagination is correct — but every paged query refetches and ranks all null candidates until it actually advances past them. With many null rows this is wasted work.

**Fix:** Only include `isNull(...)` when `cursor.evaluatedAt === null` (the cursor has crossed into the null tail).

### 2.16 `evaluation.evaluation_id` tie-break uses `lt` on a UUID

**Files:** [apps/api/src/services/evaluation.ts:43-48](../apps/api/src/services/evaluation.ts), [apps/api/src/services/batch.ts:89-91](../apps/api/src/services/batch.ts)

Within an `evaluatedAt` tie, the cursor advances by `lt(evaluation.id, cursor.id)`. UUIDs sort lexicographically — there's no semantic order. Pagination is consistent (won't lose rows) but the order within a tie is arbitrary. Either accept this or use a monotonic secondary key (created-at, or a serial column).

### 2.17 `exams.ts` PATCH/results loads the row before authorizing

**File:** [apps/api/src/routes/exams.ts:39-71](../apps/api/src/routes/exams.ts)

The order is `ExamService.findById` then `requireBatchAccess(...)`. Combined with school-scoped `search_path`, cross-school enumeration is already prevented. But within a school, the existence-via-timing channel is mildly leaky. Move the auth check to fire before the load if possible (requires either pre-knowing the batchId or doing a cheap existence query first).

### 2.18 `parseBody`/`parseParams`/`parseQuery` discard Zod issues

**File:** [apps/api/src/utils/validate.ts:6-13](../apps/api/src/utils/validate.ts)

`throw validationError()` produces `{ ok: false, error: { code: 'VALIDATION_FAILED', message: 'VALIDATION_FAILED' } }` with no field information. Clients have to guess what's wrong.

**Fix:** Extend `AppError` with a `details?: unknown` field. Pass `result.error.issues` through:

```ts
class AppError extends Error {
  constructor(public statusCode: number, public code: ErrorCode, message?: string, public details?: unknown) {
    super(message ?? code)
  }
}
```

Error envelope becomes `{ ok: false, error: { code, message, details } }`.

---

## 3. Schema and database concerns

### 3.1 Foreign-key cascade strategy is inconsistent

**File:** [packages/db/src/schema/school.ts](../packages/db/src/schema/school.ts)

- `segment.chapterId` → cascades on delete.
- `audioAsset.chapterId` → does *not* cascade. Deleting a chapter raises FK violations and leaves audio mappings dangling.
- `chapter.trackId`, `batch.trackId`, `exam.batchId`, `examResult.examId`, `evaluation.chapterId` → no cascade. Deleting a track is effectively impossible without manual sweeps.
- `audioMapping` → cascades on both sides correctly.

Pick one direction. Either cascade downward consistently (track → chapter → segment/audio), or commit to explicit cleanup in services (and make sure they actually do the cleanup).

### 3.2 Postgres-level invariants are enforced only in application code

The current model checks segment overlap and audio-mapping overlap in JS validators ([services/segment.ts:19](../apps/api/src/services/segment.ts), [services/audioMapping.ts:22](../apps/api/src/services/audioMapping.ts)). Two concurrent `PUT` calls can pass both validators and produce overlapping rows. The DB has no exclusion constraint.

**Fix:** Add Postgres exclusion constraints:

```sql
ALTER TABLE segment
  ADD CONSTRAINT segment_no_overlap
  EXCLUDE USING gist (chapter_id WITH =, int4range(start, "end") WITH &&);

ALTER TABLE audio_mapping
  ADD CONSTRAINT audio_mapping_no_overlap
  EXCLUDE USING gist (audio_asset_id WITH =, numrange(audio_start, audio_end) WITH &&);
```

Keep the JS validators for nice error messages, but lean on Postgres for correctness.

### 3.3 Sequences `track_order_seq` and `chapter_order_seq` may be global rather than per-school

**File:** [packages/db/src/schema/school.ts:16-17](../packages/db/src/schema/school.ts)

`pgSequence('track_order_seq')` is created wherever the migration runs. If the migrations folder for per-school schemas (`drizzle/school/`) creates the sequence inside `school_<slug>`, schools have independent counters and the `order` values don't visibly collide. If the migration creates them in `public`, all schools share one counter and `order` values appear sparse and non-monotonic.

**Action:** Verify the generated migration places these in the per-school schema. If it doesn't, fix it before going to prod.

### 3.4 No drizzle migration files

[packages/db/drizzle/school/](../packages/db/drizzle/school/) and [public/](../packages/db/drizzle/public/) only contain meta + a snapshot. The schema has never been migrated via files — `db:push` has been driving everything. Generate an initial migration before any production deployment.

### 3.5 `chapter.code` and `batch.code` uniqueness is per-school (by construction), not per-track

`code` columns have `.unique()` in the per-school schema. That makes them unique within the school (because the schema is per-school). For chapters specifically, intuition suggests "unique within a track" — currently a chapter can't share a code with a chapter in a *different* track within the same school. Confirm intent.

### 3.6 `organization.metadata` is unused free-form text

[packages/db/src/schema/auth.ts:85](../packages/db/src/schema/auth.ts) declares `text('metadata')`. Nothing in this codebase reads or writes it. Either claim it (Zod schema for the JSON, helper to read/write) or leave a one-line comment that BetterAuth owns it.

### 3.7 BetterAuth schema definitions are hand-mirrored

[packages/db/src/schema/auth.ts](../packages/db/src/schema/auth.ts) hand-writes the tables BetterAuth manages (`user`, `session`, `account`, `organization`, `member`, `invitation`, `verification`). If BetterAuth's expected schema drifts in a future release, you'll silently break. Either pin the BetterAuth version exactly, or run their schema generator and commit the result.

---

## 4. Operational / cross-cutting concerns

### 4.1 No request-scoped logging

`pino` is set up but never wired into Express. There's no `pino-http`, no per-request log child, no request ID. The error handler logs `error` with no context — for a 500 you can't tell which request, which user, which path.

**Fix:** Add `pino-http`. At minimum:

```ts
app.use(pinoHttp({
  logger,
  genReqId: req => req.headers['x-request-id'] ?? crypto.randomUUID(),
}))
```

Then `req.log` is available, with `reqId` baked into every line. Pass `req.log` into services that need it.

### 4.2 Error handler logs every error at `error` level

[apps/api/src/server.ts:47](../apps/api/src/server.ts) — `logger.error(error, '...')` fires for 401s and 404s too. Split:

- 4xx → `logger.warn` (with method, path, status, userId if known)
- 5xx → `logger.error` (with full stack)

### 4.3 Health check doesn't verify dependencies

[apps/api/src/routes/health.ts](../apps/api/src/routes/health.ts) returns `{ status: 'up' }` always. K8s readiness probes will report healthy with a dead database. Add a `SELECT 1` against `publicDb` and surface DB connectivity in the response.

### 4.4 No rate limiting or CSRF protection

- BetterAuth uses cookies; CORS allows credentials. The only barrier is `TRUSTED_ORIGINS`. Add a CSRF strategy (sameSite=strict cookies for the session, or a double-submit token).
- No `express-rate-limit` on auth endpoints — credential stuffing target.

### 4.5 `helmet` and `cors` use defaults

[apps/api/src/server.ts:20-21](../apps/api/src/server.ts) — fine for dev. Before prod: explicit CSP, restrict CORS methods, set HSTS appropriately.

### 4.6 No `engines.node` or `.nvmrc`

The Drizzle + BetterAuth + Express 5 stack has Node version sensitivities. Pin to a specific Node major in `package.json#engines` and commit a `.nvmrc`.

### 4.7 No `tsc --noEmit` in CI

Root scripts run `pnpm -r lint` but not type-check. Type regressions slip through. Add a `typecheck` script per package and wire it to CI.

### 4.8 `releaseObjectOrphans` script doesn't close pools

[apps/api/src/scripts/releaseObjectOrphans.ts](../apps/api/src/scripts/releaseObjectOrphans.ts) opens `publicDb` and a scoped DB and exits without `pool.end()`. The process exits anyway, but cron logs fill with connection warnings.

### 4.9 No tests anywhere

`pnpm-workspace.yaml` has no test runner. The pure-logic surfaces — `hasBatchPermission`, segment/mapping overlap validators, cursor encoding — are cheap to test and the highest-value place to start. Suggested stack: vitest + supertest against `createServer()` + real Postgres via Docker.

---

## 5. Architectural deepening candidates

Listed in payoff order. Each uses the deletion test: would removing the proposed module concentrate complexity (good — earns its keep) or just move it around (shallow)?

### 5.A Routing topology: split presign vs resource creation across `upload.ts` and resource routes

**Files:** [apps/api/src/routes/upload.ts](../apps/api/src/routes/upload.ts), [apps/api/src/routes/audio.ts](../apps/api/src/routes/audio.ts), [apps/api/src/routes/chapters.ts](../apps/api/src/routes/chapters.ts)

Currently:
- `POST /upload/chapters/:chapterId/audio` → presign URL
- `POST /chapters/:chapterId/audio` → register asset
- `POST /upload/chapters/:chapterId/script` → presign URL for text
- `POST /chapters/:chapterId/script` → apply text

The `/upload/*` prefix is structural but makes the API harder to read. Co-locate presign endpoints with their resource:

- `POST /chapters/:chapterId/audio/upload-url` (in `audio.ts`)
- `POST /chapters/:chapterId/script/upload-url` (in `chapters.ts`)

Delete `upload.ts`. The route name communicates intent.

### 5.B `chapterResponse` triggers N+1 S3 signings on list endpoints

**Files:** [apps/api/src/services/chapterReader.ts:71-82](../apps/api/src/services/chapterReader.ts), called from `tracks.ts`, `chapters.ts`, `student.ts`

Every `chapterResponse` call invokes `objectLifecycle.urlFor`, which calls `getSignedUrl` (or returns a `R2_PUBLIC_URL` string). Listing 50 chapters triggers 50 signings. The signer is local (no HTTP) but the work is non-trivial.

**Fix:** Cache the signed URL keyed by `(objectKey, 5-minute bucket)` for the lifetime of the request. Or pre-compute once per `urlFor` call cluster. Or use `R2_PUBLIC_URL` mode in dev.

### 5.C Three auth helpers with three different return shapes

**File:** [apps/api/src/utils/auth.ts](../apps/api/src/utils/auth.ts)

`authorize()`, `requireBatchAccess()`, and `requireBatchListAccess()` each return a different shape. Routes have to know which helper to call and what the return type implies.

**Deepening:** Unify the access *result* into a single `BatchAccess` value with methods:

```ts
class BatchAccess {
  canSeeAllInBatch(): boolean
  userId(): string
  enrollment(): Enrollment | null
}
```

Or fold all three helpers into one `authorize` that returns a discriminated union and let routes match on `kind`. Either way: one mental model, one return shape.

### 5.D Service classes are namespaces in disguise

Every service (`ChapterService`, `BatchService`, `EvaluationService`, `ExamService`, `EnrollmentService`, `AudioService`, `SegmentService`, `AudioMappingService`, `ProfileService`, `SchoolService`, `TrackService`) is a class with only static methods, no state, no DI.

`objectLifecycle` is an object literal. `ChapterReader` is a class. Inconsistent.

**Options:**

1. Plain object exports everywhere: `export const ChapterService = { create, update, ... }`.
2. Free functions: `export async function createChapter(db, data) { ... }`. Best tree-shaking. Aligns with the user-preference note about "utility functions over middleware."

Either is fine. Pick one.

### 5.E `chapterResponse` and `audioAssetResponse` live in two places with different shapes

**Files:** [apps/api/src/services/audio.ts:24-29](../apps/api/src/services/audio.ts), [apps/api/src/services/chapterReader.ts:84-95](../apps/api/src/services/chapterReader.ts)

`audioAssetResponse` exists in both `audio.ts` (returns `AudioAsset` with `url`) and `chapterReader.ts` (returns `AudioAsset` with `url` and `audioMappings[]`). Two functions, same name, different shapes.

Same story for `AudioAsset` the type — defined twice with subtly different `Omit`s.

**Fix:** Move both response mappers and the canonical `AudioAsset` / `Chapter` types into one place (e.g. `services/chapter/types.ts` or `services/responses.ts`).

### 5.F No transaction primitive at the service boundary

Services accept `Database` and either operate without a transaction or open their own with `db.transaction(...)`. When two services need to compose inside one transaction (e.g. "create enrollment + audit log"), there's no way to do it.

**Deepening:** Services accept `DatabaseOrTx`:

```ts
type DatabaseOrTx = Database | DrizzlePgTransaction
async function createEvaluation(db: DatabaseOrTx, ...) { ... }
```

Callers either pass the top-level `db` (each service opens its own transaction) or pass an active `tx` (compose under one transaction).

### 5.G `authorizeContentReadView` is a thin wrapper over `authorize` + `hasPermission`

**File:** [apps/api/src/utils/chapterView.ts](../apps/api/src/utils/chapterView.ts)

The helper exists to express "if you have content:read, you see published; if you also have content:update, you see drafts." This is the only place in the codebase that uses "permission as a side-channel to widen visibility." It works, but the meaning of the view is split across the helper, the route, and the service.

**Deepening:** Once `ChapterReadView` is split into the three explicit variants (see 2.6), the helper becomes:

```ts
async function chapterViewFor(req, db): Promise<ChapterReadView> {
  await authorize(req, db, { scope: 'school', permissions: { content: ['read'] } })
  const canAuthor = await hasPermission(req, db, { scope: 'school', permissions: { content: ['update'] } })
  return canAuthor ? { kind: 'authoring' } : { kind: 'learnerPreview' }
}
```

Routes call this. The "student" view variant is constructed only from the student-facing route at [routes/student.ts](../apps/api/src/routes/student.ts).

### 5.H Object lifecycle module is good — but consider folding it into a richer per-upload session

[apps/api/src/utils/objectLifecycle.ts](../apps/api/src/utils/objectLifecycle.ts) covers the read/write API. What's missing: a *staged-then-committed* upload flow, where the presign step records a pending row in the DB and the commit step flips it to active.

```ts
ObjectLifecycle.stageUpload({ scope: 'audio', schoolId, chapterId, contentType })
  → { uploadUrl, objectKey, commitToken }
ObjectLifecycle.commit(commitToken) → AudioAsset    // flips DB row to active
// orphans = staged but never committed
```

Solves 2.9 (idempotency) and 2.10 (verify exists) simultaneously: the pending row gives you an idempotency anchor, and `commit` can `HEAD` the object before flipping it active.

---

## 6. Smaller cleanups

### 6.1 `proficiencyLevel` enum is defined three times

[packages/db/src/schema/school.ts:24-32](../packages/db/src/schema/school.ts), [apps/api/src/services/evaluation.ts:11-19](../apps/api/src/services/evaluation.ts), [apps/api/src/services/exam.ts:13-21](../apps/api/src/services/exam.ts).

Export the Zod schema once (e.g. from `services/evaluation.ts`) and reuse.

### 6.2 `requireNonEmpty` helper for update schemas

`.refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })` appears in `batch`, `chapter`, `track`, `exam`, `profile`, `school` update schemas. Extract:

```ts
export function requireNonEmpty<T extends z.ZodObject<any>>(schema: T) {
  return schema.refine(d => Object.keys(d).length > 0, { message: 'No fields to update' })
}
```

### 6.3 `School` type defined in two places

[apps/api/src/middlewares/school.ts:6](../apps/api/src/middlewares/school.ts) (`type School = typeof organization.$inferSelect`) and [apps/api/src/services/school.ts:32](../apps/api/src/services/school.ts) (`type School = Pick<organization.$inferSelect, 'id' | 'name' | 'slug' | 'createdAt'>`).

One is the request-context shape, one is the API shape. Rename the middleware type to `SchoolContext`.

### 6.4 `userId` validation is `z.string().min(1)` everywhere

Centralize as `userIdSchema = z.string().min(1)` in `@narada/auth` (or wherever BetterAuth's ID scheme is owned). Tighten the regex if possible.

### 6.5 `Router({ mergeParams: true })` use is inconsistent

Set in `enrollment.ts`, `evaluations.ts`, `segments.ts`, `audio.ts`, `exams.ts`. Not set in `audioMappings.ts` (which doesn't use parent params, so it's fine). Comment why for each router so future routers don't forget.

### 6.6 Response shape on PUT/DELETE is inconsistent

- `DELETE /batches/:batchId/members/:userId` returns `200 { ok: true }`
- `DELETE /chapters/:chapterId/audio/:audioId` returns `204`

Pick one. `204 No Content` is the standard.

### 6.7 `PATCH /profile` takes `batchId` in the body

[apps/api/src/routes/profile.ts:18](../apps/api/src/routes/profile.ts) — `PATCH /profile` with `batchId` in the body is awkward; it's actually addressing a different resource. `PATCH /batches/:batchId/enrollment/me` or `PATCH /enrollments/:batchId/me` reads better.

### 6.8 `rows.at(0)!` vs `if (!row) throw internalError()` vs `assert(row !== undefined, '...')`

Three different ways of handling "Drizzle returning array should have one element":

- [services/audio.ts:61](../apps/api/src/services/audio.ts): `rows.at(0)!`
- [services/chapter.ts:33](../apps/api/src/services/chapter.ts): `if (!row) throw internalError()`
- [services/enrollment.ts:38](../apps/api/src/services/enrollment.ts), [services/exam.ts:118](../apps/api/src/services/exam.ts): `assert(row !== undefined, '...')`

Pick one. `internalError()` produces the cleanest client experience; `assert` produces a generic 500 with weird messages; `!` throws `TypeError` that bypasses `AppError`.

### 6.9 `session.activeOrganizationId` is unused

BetterAuth populates it; the code uses an `X-School-Slug` header instead. Once auth carries the active school, you could drop the header for authenticated routes. Trade-off: header is stateless and easy to debug; session-based is fewer round-trips. User decision.

### 6.10 `logger.ts` returns `pino.LoggerOptions<never, boolean>`

That's an oddly specific type to write. Just `pino.LoggerOptions`.

### 6.11 `dotenv-cli` wraps every root script

[package.json](../package.json) — every script is `dotenv -e .env -- pnpm --filter ...`. Cleaner: load `.env` once inside `@narada/env` (using `dotenv` directly), or use pnpm's built-in `--env-file`.

### 6.12 `routes/index.ts` mixes nested and flat mounts

[apps/api/src/routes/index.ts:31-41](../apps/api/src/routes/index.ts) mounts some routes nested under params (`/batches/:batchId/evaluations`) and some flat (`/exams`, `/audio`). Both are correct; mixing them in one file is harder to scan. Either group nested mounts together with comments, or use parent router composition (`batchesRouter.use('/:batchId/evaluations', evalRouter)`).

### 6.13 `auth.ts` imports from `'better-auth/minimal'`

[packages/auth/src/index.ts:1](../packages/auth/src/index.ts) — worth verifying the `minimal` entry point includes everything the `organization` plugin needs at runtime. Exercise the full auth flow once end-to-end before relying on this in prod.

### 6.14 `audioMapping.replace` doesn't sort its return value; `segment.replace` does

[services/audioMapping.ts:60-62](../apps/api/src/services/audioMapping.ts) returns rows in Drizzle's insertion order; [services/segment.ts:46](../apps/api/src/services/segment.ts) sorts by `start`. Pick one convention.

### 6.15 `Subset<T>` allows duplicates and any ordering

[packages/auth/src/permissions/types.ts:1](../packages/auth/src/permissions/types.ts) — `Subset<['read','update']>` resolves to `('read'|'update')[]`. A caller can write `['read','read','read']`. Mild concern; tighten with a uniqueness brand if it bothers you.

---

## 7. Suggested execution order

If acting on this document with no other guidance:

1. **§2 correctness bugs** in this rough order:
   - 2.1 (response after send) — one-line fix.
   - 2.2 (shutdown exit code, pool leak) — small.
   - 2.18 (Zod issues into AppError) — improves every other debugging task.
   - 2.4, 2.5 (cross-batch leaks) — security-relevant.
   - 2.6 (ChapterReadView splitting) — latent privilege bug.
   - 2.7 (recordResults completion) — needs a product decision.
   - 2.3 (SchoolService atomicity) — needs care.
   - 2.8–2.12 (R2 lifecycle hardening) — pair with §5.H.
   - 2.13–2.17 — opportunistic.

2. **§3 schema concerns:**
   - 3.4 (generate initial migrations) — blocker for prod.
   - 3.2 (exclusion constraints) — closes data-integrity holes.
   - 3.1 (cascade strategy) — needs an explicit decision before more cascades sprawl.

3. **§4 ops/cross-cutting:**
   - 4.1, 4.2 (request logging) — pays for itself immediately.
   - 4.3 (real health check).
   - 4.7 (typecheck in CI).
   - 4.4, 4.5 (security review before prod).

4. **§5 deepening** — confirm scope with the user first. 5.A (routing) and 5.E (response-type unification) are mechanical. 5.C, 5.D, 5.F are larger.

5. **§6 nits** — opportunistic, alongside other touches in the same file.

6. **Tests** — start with the pure-logic surfaces (overlap validators, cursor encoding, `hasBatchPermission`). Defer integration tests until §5 has stabilized the shape.

---

## Appendix: how to verify findings

1. Re-read the cited file. Line numbers shift.
2. `git log --since='2026-05-26' -p <file>` for recent changes.
3. If a finding no longer matches the code, update this document with a note rather than silently skipping.
4. If a finding seems wrong, it might be. Push back on individual items rather than acting on bad analysis.
