# Architecture Review & Refactoring Backlog

**Audience:** A coding agent picking up this document cold. Every item below is meant to be actionable without further context from the author. File paths, line numbers, and code excerpts are inlined where relevant.

**Status as of writing:** The API surface (`apps/api`) implements ~all routes in [docs/api.md](api.md) with a few exceptions noted in §3. There are zero tests. The service layer is shallow CRUD with a few exceptions. This document captures what to fix, in what order, and why.

---

## How to use this document

1. **Read §1 (Repository map) and §2 (Glossary) first** so the rest of the document's references make sense.
2. **Pick one section at a time.** Each section is roughly independent.
3. **Verify before acting.** This review reflects code as of 2026-05-25. Re-read the cited files; the user actively rewrites generated code and may have moved on.
4. **User preferences to respect** (from `~/.claude` memory):
   - Prefers simple, readable code over abstractions; will reject convoluted patterns.
   - Dislikes middleware that injects classes onto `req`/`res.locals` without compile-time guarantees (e.g. casting `req as AuthenticatedRequest`).
   - Prefers utility functions over middleware for auth checks.
   - Comfortable with TypeScript type-level programming; expects proper inference, not string types.
   - Prefers `satisfies` over explicit annotations when both inference and validation are needed.
   - Asks exploratory questions before committing; when in doubt, surface tradeoffs and wait for approval.
5. **Confirm scope with the user before large refactors.** The deepening candidates in §5 are opinion, not law. The bugs in §3 and spec drift in §4 are objective and safe to act on.

---

## 1. Repository map

Monorepo, pnpm workspaces. Node + Express 5 backend; no frontend in this repo yet.

```
narada/
├── apps/
│   └── api/                          # Express 5 server, ~1900 LOC TS
│       ├── src/
│       │   ├── index.ts              # entry point (5 lines)
│       │   ├── server.ts             # createServer, runServer, error handler
│       │   ├── logger.ts             # pino setup
│       │   ├── error.ts              # AppError + factories (unauthorized, notFound, etc.)
│       │   ├── types/express.d.ts    # res.locals typing
│       │   ├── middlewares/
│       │   │   ├── school.ts         # resolveDb + requireSchool
│       │   │   └── auth.ts           # resolveAuth (constructs AuthClient)
│       │   ├── utils/
│       │   │   ├── auth.ts           # AuthClient class
│       │   │   ├── cursor.ts         # asCursor, encodeCursor, paginateResponse
│       │   │   └── validate.ts       # parseBody/Params/Query
│       │   ├── routes/               # 15 route files, all wired in routes/index.ts
│       │   └── services/             # 11 service classes, one per major entity
│       └── package.json
├── packages/
│   ├── auth/                         # BetterAuth setup + ACL definitions
│   │   ├── src/index.ts              # betterAuth() instance, organization plugin
│   │   ├── src/client.ts             # createAuthClient for React (currently unused)
│   │   └── src/permissions/
│   │       ├── school.ts             # createAccessControl + owner/admin/member roles
│   │       ├── batch.ts              # custom ACL + hasBatchPermission()
│   │       └── index.ts              # barrel
│   ├── db/                           # Drizzle ORM + schema
│   │   ├── src/index.ts              # publicDb, getScopedDatabase, dbCache
│   │   ├── src/provision.ts          # provisionSchool, renameSchool
│   │   └── src/schema/
│   │       ├── auth.ts               # BetterAuth tables (user, session, org, member, etc.)
│   │       ├── school.ts             # per-school domain tables
│   │       ├── relations.ts          # Drizzle relations()
│   │       └── index.ts              # barrel
│   ├── storage/                      # R2/S3 wrapper
│   │   ├── src/client.ts             # S3Client instance
│   │   └── src/index.ts              # getUploadUrl, getDownloadUrl, putObject, deleteObject
│   └── env/                          # Zod-validated env vars
│       └── src/index.ts
├── docs/
│   ├── api.md                        # HTTP API spec (PARTIALLY OUTDATED — see §4)
│   ├── data-model.md                 # Schema + roles (PARTIALLY OUTDATED — see §4)
│   └── architecture-review.md        # this document
├── TODO.md                           # progress checklist; most items checked
├── pnpm-workspace.yaml
└── package.json                      # root scripts wrap pnpm with dotenv-cli
```

**Top-level concepts:**

- **School** = BetterAuth organization. Multi-tenancy via schema-per-school (`school_<slug>` Postgres schemas).
- **Batch** = cohort within a school. Backed by per-school `batch` table; BetterAuth's team plugin was removed.
- **Track** = ordered curriculum (sequence of chapters) within a school.
- **Chapter** = single learnable unit. Holds `script` + `textObjectKey`; API responses expose a resolved `textUrl`.
- **Segment** = byte range within a chapter's text.
- **AudioAsset** = R2-stored audio file attached to a chapter.
- **AudioMapping** = (segment, audioAsset, audioStart, audioEnd).
- **Enrollment** = (userId, batchId, role, status, phone, city). Profile data merged in.
- **Evaluation** = append-only proficiency record (studentId, chapterId, level, evaluatorId).
- **Exam** = scheduled assessment for a student in a batch; `exam_result` rows link an exam to evaluations per chapter.

**Authorization model (two levels):**

- **School-level** via BetterAuth AC: `owner` > `admin` > `member`. Resources: `school`, `content`, `batch`, `member`, `invitation`, `enrollment`, `evaluation`, `draft`.
- **Batch-level** via custom ACL in [packages/auth/src/permissions/batch.ts](../packages/auth/src/permissions/batch.ts): `instructor` / `ta` / `student`. Resources: `evaluation`, `exam`, `enrollment`.
- **Super admin** = `user.isSuperAdmin` flag, bypasses all checks.

---

## 2. Glossary (architecture terms)

Used consistently throughout this document.

- **Module** — anything with an interface + implementation (function, class, package).
- **Interface** — everything a caller must know: types, invariants, error modes, ordering, config.
- **Depth** — leverage at the interface. Deep = lots of behavior, small interface.
- **Shallow** — interface nearly as complex as the implementation (the smell most services in this codebase exhibit).
- **Seam** — where an interface lives; a place behavior can be altered without editing in place.
- **Deletion test** — imagine deleting the module. If complexity vanishes, it was a pass-through. If it reappears across N callers, it was earning its keep.
- **Locality** — what maintainers get from depth: change/bugs/knowledge concentrated in one place.

---

## 3. Critical bugs (fix first)

These are objective defects, not opinions. Each can be fixed independently.

### 3.1 Presigned upload URL persisted as `audioAsset.url`

**Status:** Resolved on 2026-05-26. The `audioAsset.url` column was removed; the DB stores only `objectKey`, and API responses resolve fresh URLs from that key.

**File:** [apps/api/src/services/audio.ts:55-87](../apps/api/src/services/audio.ts)

**Code:**

```ts
const url = await getDownloadUrl(data.objectKey) // ← 1-hour presigned URL
const rows = await db
  .insert(audioAsset)
  .values({
    chapterId,
    url,
    objectKey: data.objectKey,
    label,
    duration,
  })
  .returning()
```

`getDownloadUrl` returns a presigned URL with a 1-hour expiry unless `R2_PUBLIC_URL` is set. That string is persisted into `audioAsset.url`. After 1 hour the column points to a dead URL.

**Fix:** Either

- Always require `R2_PUBLIC_URL` and store a stable public URL, OR
- Stop storing `url` in the DB; compute it on read by calling `getDownloadUrl(objectKey)` per request.

The second option is more robust and matches how `chapter.textUrl` _should_ work too (currently it stores whatever `getDownloadUrl` returned at script-upload time — same bug, see §3.2).

**Acceptance:** `audioAsset.url` either contains a permanently-valid URL, or the column is removed and reads compute the URL from `objectKey`.

---

### 3.2 `chapter.textUrl` is also a stored presigned URL

**Status:** Resolved on 2026-05-26. The DB column is now `chapter.textObjectKey`, and API responses resolve it to `textUrl`.

**File:** [apps/api/src/services/chapter.ts:164-194](../apps/api/src/services/chapter.ts) (`applyScript`)

Same bug as 3.1. `getDownloadUrl(objectKey)` is called and persisted into `chapter.textUrl`. Stale after 1 hour without `R2_PUBLIC_URL`.

**Fix:** Same approach as 3.1. Store the object key only; resolve URL on read.

---

### 3.3 `ProfileService.update` mass-writes across all active enrollments

**Status:** Resolved before 2026-05-26. `PATCH /profile` now requires `batchId` and updates only `(userId, batchId)`.

**File:** [apps/api/src/services/profile.ts:48-58](../apps/api/src/services/profile.ts)

**Code:**

```ts
const rows = await db
  .update(enrollment)
  .set(data)
  .where(and(eq(enrollment.userId, userId), eq(enrollment.status, 'active')))
  .returning()
```

A user can be enrolled in multiple batches within one school. This `UPDATE` writes the same `phone`/`city` to every active enrollment. Likely unintended — there is no notion of "the active batch enrollment" in the schema.

**Decision needed first.** Ask the user: should `PATCH /profile` update _all_ the user's enrollments in this school (then drop the `status='active'` filter), or _one specific_ enrollment (then add an "active batch" concept or require `batchId` in the request)?

**Acceptance:** Behavior is intentional and documented in [docs/api.md](api.md).

---

### 3.4 `SchoolService.create` has no rollback on provisioning failure

**Status:** Resolved before 2026-05-26. `provisionSchool(data.slug)` now runs before the `organization` insert.

**File:** [apps/api/src/services/school.ts:63-84](../apps/api/src/services/school.ts)

**Code:**

```ts
const rows = await publicDb.insert(organization).values({...}).returning()
// ... assertion ...
await provisionSchool(data.slug)   // ← if this throws, org row exists with no schema
return mapSchool(row)
```

If `provisionSchool` (which runs CREATE SCHEMA + Drizzle migrations) fails partway, the `organization` row is committed but no `school_<slug>` schema exists. Subsequent `getScopedDatabase(slug)` calls fail with raw Postgres errors.

**Fix:**

- Provision the schema _first_, then insert the org row (so a half-provisioned schema is the worst case — and schemas are idempotent via `CREATE SCHEMA IF NOT EXISTS`), OR
- Wrap in a try/catch and best-effort delete the org on provisioning failure, OR
- Use a transaction that includes the DDL (Postgres supports DDL in transactions, but BetterAuth's insert path isn't in our transaction context).

Option 1 is simplest. The slug uniqueness check up top still prevents collisions.

**Acceptance:** Failed `provisionSchool` leaves no `organization` row referencing a missing schema.

---

### 3.5 `AudioService.remove` is not atomic across DB + R2

**Status:** Short-term fix applied on 2026-05-26. R2 deletion now runs before DB deletion, with a TODO pointing to §5.E for the principled lifecycle module.

**File:** [apps/api/src/services/audio.ts:89-102](../apps/api/src/services/audio.ts)

DB delete happens before R2 delete. If R2 fails, the asset row is gone but the object lingers. There is no scan/janitor.

**Short-term fix:** Reverse the order — delete from R2 first, then DB. If R2 delete fails, the DB row still references a now-missing object (worse for reads). The principled answer is in §5.E (object lifecycle module) — leave a `// TODO: see architecture-review §5.E` comment and pick the lesser evil for now (the user should choose).

---

### 3.6 `ChapterService.applyScript` orphans previous text in R2

**Status:** Accepted/documented on 2026-05-26. The code now comments the small R2/DB disagreement window caused by direct-to-R2 upload before DB mutation.

**File:** [apps/api/src/services/chapter.ts:164-194](../apps/api/src/services/chapter.ts)

Each call uploads a new `text.txt` to a stable object key (`schools/{schoolId}/chapters/{chapterId}/text.txt`) via [apps/api/src/routes/upload.ts:25](../apps/api/src/routes/upload.ts), so the _object_ is overwritten — no actual orphan on re-upload of the same script. BUT: previous segments are dropped from the DB inside the transaction; the previous text is overwritten in R2 _outside_ the transaction (in `upload.ts` before this endpoint is called). If `applyScript` fails after the R2 upload, the new text is in place but the old chapter state remains and inconsistent. Worth a comment + acceptance that this is a small window.

If you eventually move to per-revision object keys as new feature work, this becomes a real orphan problem and §5.E becomes load-bearing.

---

### 3.7 `exam.findByBatch` does not validate the batch exists

**Status:** Resolved before 2026-05-26. `findByBatch` now fetches the batch and throws `notFound()` if it is missing.

**File:** [apps/api/src/services/exam.ts:88-108](../apps/api/src/services/exam.ts)

Returns `{items: [], nextCursor: null}` for a nonexistent `batchId`. Compare to [apps/api/src/services/evaluation.ts:67-87](../apps/api/src/services/evaluation.ts) which throws `notFound()`.

**Fix:** Decide on a consistent contract. Recommendation: throw 404 for nonexistent parent resources in nested list endpoints; route handlers already pre-fetch the parent in some cases (`enrollment.ts`, `batches.ts:patch`) — make it uniform.

---

### 3.8 `recordResults` accepts chapter IDs unrelated to the exam's track

**Status:** Resolved before 2026-05-26. `recordResults` now validates every result chapter against the exam batch's track and throws `unprocessable()` on mismatch.

**File:** [apps/api/src/services/exam.ts:151-205](../apps/api/src/services/exam.ts)

`recordResults` writes `evaluation` rows for arbitrary `chapterId` values from the request body. There is no check that the chapter belongs to the batch's track. You can record an exam result for a chapter in an unrelated track.

**Fix:** Inside `recordResults`, fetch `batch.trackId` and validate each `item.chapterId` belongs to that track. Return 422 (`unprocessable`) on mismatch.

---

### 3.9 Draft chapter access returns 404 when it should return 403

**Status:** Resolved before 2026-05-26. `ChapterService.findById` now throws `forbidden()` when a draft exists but the caller lacks draft access.

**Files:** [apps/api/src/services/chapter.ts:129-131](../apps/api/src/services/chapter.ts), [apps/api/src/routes/chapters.ts:17-19](../apps/api/src/routes/chapters.ts)

```ts
if (!row || (!includeDrafts && row.status === 'draft')) {
  return undefined // ← route turns this into notFound()
}
```

A draft chapter requested by a non-admin returns 404. Either status is fine philosophically, but it's confusing to debug. Recommend 403 with code `PERMISSION_DENIED` — the resource exists, the caller can't see it.

Low priority. Note in [docs/api.md](api.md) whichever direction you pick.

---

### 3.10 `getUploadUrl` returns `{uploadUrl, key}` but `key` is ignored

**Status:** Resolved before 2026-05-26. `getUploadUrl` now returns only `{ uploadUrl }`.

**File:** [packages/storage/src/index.ts:12-20](../packages/storage/src/index.ts), consumer at [apps/api/src/services/audio.ts:50-53](../apps/api/src/services/audio.ts)

`storage.getUploadUrl(key, ...)` returns the same `key` passed in. The audio service destructures only `{uploadUrl}` and re-uses its own `objectKey` variable. The returned `key` field is dead.

**Fix:** Return only `{ uploadUrl }`. Trivial cleanup.

---

### 3.11 `res.locals.school` typed optional but asserted non-null after `requireSchool`

**Status:** Resolved for the cited routes on 2026-05-26. Upload and audio route handlers now use `Response<unknown, SchoolScopedLocals>`, where `school` is required.

**Files:** [apps/api/src/types/express.d.ts](../apps/api/src/types/express.d.ts), [apps/api/src/routes/upload.ts:16,25](../apps/api/src/routes/upload.ts), [apps/api/src/routes/audio.ts:11-18](../apps/api/src/routes/audio.ts)

`school?: School` is optional in `Locals`. Routes nested under `requireSchool` are guaranteed to have `school` at runtime, but the type doesn't reflect that. `upload.ts` uses `school!.id` (non-null assertion); `audio.ts` defensively re-checks `if (!school) throw badRequest()`. Inconsistent and against user preference (no compile-time guarantee from the middleware).

**Fix:** Define a `SchoolScopedRequest` / `SchoolScopedLocals` type that narrows `school: School` (required). Have `requireSchool` typed to assert this narrowing — TypeScript supports this via overloads or by using a typed handler wrapper. Routes registered under the school-scoped sub-router use the narrowed type.

This is a stepping stone to §5.B (collapsing `AuthClient` + middleware).

---

### 3.12 `dbCache` is unbounded and not invalidated on rename races

**Status:** Resolved on 2026-05-26. The cache is capped, entries are refreshed on access to behave as an LRU, pools are closed on eviction, and the rename race is documented as acceptable.

**File:** [packages/db/src/index.ts:7-34](../packages/db/src/index.ts), interaction in [apps/api/src/services/school.ts:99-101](../apps/api/src/services/school.ts)

`getScopedDatabase` caches Drizzle instances by slug indefinitely. No LRU, no eviction. With long uptime + many schools, pool count grows without bound.

`renameSchool` invalidates via `clearSchoolDbCache(oldSlug)`, but a request in flight at rename time holds the _old_ `Database` reference with `search_path=school_<old>` — its connection is now invalid.

**Fix (small):**

- Cap the cache with an LRU (e.g. `lru-cache` package) — say 100 entries — and `.end()` the pool on eviction.
- Document the rename race as known-acceptable (rename is rare; in-flight requests will error out and the client retries).

---

## 4. Spec ↔ Code drift

**Status:** Resolved on 2026-05-26 by rewriting [docs/api.md](api.md) and [docs/data-model.md](data-model.md) to match the current code.

What changed:

- Removed undocumented-in-code endpoints from the API spec: `GET /v1/student/dashboard` and `GET /v1/batches/:batchId/matrix`.
- Removed the chapter revision API/model from the docs. The current code stores `script` and `textObjectKey` directly on `chapter`, and `segment` rows are scoped to `chapterId`.
- Updated evaluations docs to use the nested routes in [apps/api/src/routes/evaluations.ts](../apps/api/src/routes/evaluations.ts): `/batches/:batchId/evaluations` and `/batches/:batchId/evaluations/:studentId`.
- Updated upload docs to match [apps/api/src/routes/upload.ts](../apps/api/src/routes/upload.ts): `/upload/chapters/:chapterId/audio` and `/upload/chapters/:chapterId/script`.
- Updated profile docs so `GET /profile` returns the membership list, while `PATCH /profile` updates one batch enrollment by `batchId`.
- Removed BetterAuth `team` / `team_member`, `chapter_revision`, and `batch.team_id` references from [docs/data-model.md](data-model.md).

Remaining product/design questions should be tracked as new feature work rather than spec drift:

- Whether to add a student dashboard aggregate endpoint.
- Whether to add a batch matrix endpoint.
- Whether to reintroduce a real chapter revision model later.

---

## 5. Architectural deepening candidates

Each candidate uses the deletion test: would removing the proposed module cause complexity to _concentrate_ (good — earns its keep) or just _move_ (shallow)? Listed in **payoff order**, highest first.

### 5.A The "batch-or-school" authorization pattern is open-coded in every nested route

**Files (all manifest the same pattern):**

- [apps/api/src/routes/batches.ts:31-43](../apps/api/src/routes/batches.ts) — `GET /batches/:batchId`
- [apps/api/src/routes/batches.ts:15-29](../apps/api/src/routes/batches.ts) — `GET /batches` with `showAll` flag
- [apps/api/src/routes/enrollment.ts:16-19,37-40](../apps/api/src/routes/enrollment.ts)
- [apps/api/src/routes/evaluations.ts:13-16,29-34](../apps/api/src/routes/evaluations.ts)
- [apps/api/src/routes/exams.ts:22](../apps/api/src/routes/exams.ts)

**Problem:** Five routes implement variants of: _"if the user has a school-wide permission, allow broad action; otherwise require they're enrolled in this batch with a batch-level permission."_ The shapes differ slightly each time. To understand the authorization model you have to read all five.

The `showAll: boolean` and `userId: string` options threaded into `BatchService.findAll` and `ExamService.findByBatch` exist solely to support this scoping.

**Deepening:** A single `authorize.inBatch(req, db, batchId, claim)` that returns a discriminator:

```ts
type BatchScope =
  | { kind: 'allBatches' } // user has school-wide permission
  | { kind: 'thisBatch'; enrollment: Enrollment } // batch-scoped
// throws on denied

await authorize.inBatch(req, db, batchId, {
  schoolPermission: { batch: ['update'] },
  batchPermission: { exam: ['read'] },
})
```

Services accept `BatchScope` and shape the query accordingly — list queries filter to enrolled batches when scope is `thisBatch`. Routes no longer need `showAll`.

**Deletion test:** Removing this module would force 5 routes to re-derive the same pattern. Complexity _concentrates_ — earns its keep.

**Benefits:**

- One place to read the authorization model.
- Routes shrink from ~15 lines of ceremony to one `authorize` call.
- Compile-time guarantee that `batchId` is provided (user preference).
- Test surface: one function, parameterized.

**Dependencies:** Best done after §5.B (collapse AuthClient) so the new `authorize` doesn't have to live alongside the old class.

---

### 5.B Collapse `AuthClient` + `resolveAuth` middleware into functions

**Files:** [apps/api/src/utils/auth.ts](../apps/api/src/utils/auth.ts) (86 lines), [apps/api/src/middlewares/auth.ts](../apps/api/src/middlewares/auth.ts) (9 lines).

**Problem:**

- `AuthClient` has four public methods (`hasSchoolPermissions`, `ensureSchoolPermissions`, `hasBatchPermissions`, `ensureBatchPermissions`) that each repeat the _exact same_ `getSession() → if (isSuperAdmin) return; ... check` block.
- `resolveAuth` middleware does nothing except `new AuthClient(req, db)`. Deletion test: route handlers could `new AuthClient(req, res.locals.db)` themselves; nothing breaks.
- Violates user preference against middleware-injected classes without compile-time guarantees.
- `res.locals.authClient: AuthClient` is typed non-optional, but its presence is only guaranteed because `resolveAuth` runs unconditionally — implicit coupling.

**Memory says:** The user has already designed this as `authorize(req, user, { scope: 'school' | 'batch', permissions, batchId? })` with a discriminated union, currently commented out in `apps/api/src/utils/auth.ts`. Find that commented block and resurrect it.

**Deepening:** Two free functions:

```ts
// memoized per-request via WeakMap<Request, Session>
export async function getSession(req: Request): Promise<Session>

// discriminated union ensures batchId is required when scope='batch'
export async function authorize(
  req: Request,
  db: Database,
  claim:
    | { scope: 'super' }
    | { scope: 'school'; permissions: SchoolPermissions }
    | { scope: 'batch'; batchId: string; permissions: BatchPermissions },
): Promise<Session>
```

Super-admin escape hatch lives once, inside `authorize`. Delete `middlewares/auth.ts`. Remove `authClient` from `Locals` typing.

**Deletion test:** Removing `authorize` would force every route to re-implement the super-admin check + session fetch + permission check. Concentrates.

**Benefits:**

- 86 lines → ~40 lines.
- Test surface: two functions, no class state.
- Type signature enforces `batchId` presence at compile time.
- Aligns with user preference for utility functions over middleware.

**Acceptance:** All routes call `authorize(req, db, {...})` directly; `AuthClient` is deleted; `res.locals.authClient` typing is removed.

---

### 5.C Service mappers are 1:1 with DB rows — delete them

**Files:** every service. Mapper functions: `mapBatch`, `mapChapter`, `mapEvaluation`, `mapExam`, `mapTrack`, `mapAudioAsset`, `mapAudioMapping`, `mapSegment`, `mapEnrollment`, `mapSchool`. Each paired with a hand-written Zod schema (e.g. `batchSchema`, `chapterSchema`).

**Problem:** The mappers are theoretical: "protect the API shape from the DB shape." In practice they copy every field unchanged. Adding a column requires editing three places (DB schema, Zod schema, mapper). The Zod schemas duplicate types Drizzle already infers.

**Deletion test:** If `mapBatch` is deleted and routes use `typeof batch.$inferSelect` directly, no complexity appears anywhere — because the mapper has no behavior.

**Two viable end states:**

1. **Delete the mappers.** Use Drizzle inferred types as the response shape. Add a mapper _only when_ the shape actually diverges (e.g. computed `memberCount`, omitted `objectKey`). This is the recommended approach per user preferences ("prefer simple readable code over abstractions"). Removes ~300 LOC.

2. **Move mappers into a `repository` layer** that earns its keep — formatting dates as ISO strings, omitting sensitive columns (e.g. `audioAsset.objectKey` shouldn't be in API responses), computing derived fields.

Either way: the current state is the worst of both.

**Acceptance criteria for option 1:**

- No `mapXxx` functions in `services/`.
- No `xxxSchema = z.object({...})` for entities that are 1:1 with DB rows.
- Services return Drizzle inferred types.
- Where the API shape differs from the DB row (e.g. `BatchDetail` adds `members`), use plain TS interfaces or `satisfies`.

**Dependencies:** None — can do independently of A/B.

---

### 5.D Consolidate chapter-reading: `ChapterReader`

**Files:** [apps/api/src/services/student.ts:34-103](../apps/api/src/services/student.ts), [apps/api/src/services/chapter.ts:115-138](../apps/api/src/services/chapter.ts), [apps/api/src/services/segment.ts:36-48](../apps/api/src/services/segment.ts).

**Problem:** Three different code paths load chapter+segments+audioAssets in slightly different ways:

- `ChapterService.findById` — full chapter with `includeDrafts` filter.
- `StudentService.getChapter` — same query shape + enrollment-access check + currentLevel.
- `SegmentService.findByChapter` — segments only, no chapter check.

Plus the potential future `GET /batches/:batchId/matrix` and `GET /v1/student/dashboard` feature work noted in §4 would need similar queries.

**Deepening:** A `ChapterReader` module keyed by a `ChapterView` discriminator:

```ts
type ChapterView =
  | { kind: 'authoring'; includeDrafts: boolean }
  | { kind: 'learning'; studentId: string }

ChapterReader.findById(db, chapterId, view) → ChapterDetail | undefined
```

Single source of truth for the chapter-content query (relations, ordering, projection). View dictates: extra filters, extra joins (currentLevel for learning), access checks.

**Deletion test:** Removing this module forces query duplication across 4+ call sites. Concentrates.

**Benefits:**

- One place to change when chapter content shape changes, especially if revisions are reintroduced later.
- Deletes `StudentService.getChapter` entirely; `StudentService.StudentChapter` type goes away.
- Test surface: one function with a sum-type input.

**Dependencies:** Best after §5.C (so the result type is Drizzle-inferred, not Zod-duplicated).

---

### 5.E Object lifecycle module — coordinate R2 and DB

**Files affected:** [apps/api/src/services/audio.ts](../apps/api/src/services/audio.ts), [apps/api/src/services/chapter.ts](../apps/api/src/services/chapter.ts), [apps/api/src/services/school.ts](../apps/api/src/services/school.ts), [packages/storage/src/index.ts](../packages/storage/src/index.ts).

**Problem:** Every service that touches R2 holds raw `getUploadUrl` / `getDownloadUrl` / `deleteObject` calls and improvises the failure model. No transaction discipline, no GC for orphans, no "commit-after-upload" model. Bugs 3.1, 3.2, 3.5, 3.6 are all symptoms.

**Deepening:** An `objectLifecycle` module owning R2-DB coupling:

```ts
// Upload session: stage an upload, commit when DB write succeeds, abort otherwise
ObjectLifecycle.stageUpload({ scope: 'audio', schoolId, chapterId, contentType })
  → { uploadUrl, objectKey, commitToken }
ObjectLifecycle.commit(commitToken) → void   // marks the object as referenced
ObjectLifecycle.releaseOrphans()             // janitor, run periodically

// Reads: always compute fresh URLs, never store presigned URLs
ObjectLifecycle.urlFor(objectKey) → string

// Cascading deletes
ObjectLifecycle.deleteForChapter(schoolId, chapterId)
ObjectLifecycle.deleteForSchool(schoolId)
```

This is a bigger lift, but **necessary before the admin authoring flow becomes real** because that flow uploads many objects per chapter and the orphan problem will become operationally visible.

**Deletion test:** Removing this module forces every consumer to re-derive the R2-DB consistency strategy. Concentrates.

**Benefits:**

- Fixes 3.1, 3.2, 3.5, 3.6 in one place.
- Routes/services stop importing from `@narada/storage` directly.
- Single decision point: "what's our R2 consistency model?"
- Test seam: mock `ObjectLifecycle` instead of real R2 calls.

**Acceptance:**

- No `audioAsset.url` / `chapter.textUrl` stored as presigned URLs.
- Schema removal triggers cascading R2 cleanup.
- A janitor (cron or manual command) can list and remove orphans.

---

### 5.F The `draft` BetterAuth permission is a clever side-channel

**Files:** [packages/auth/src/permissions/school.ts:18,30,40](../packages/auth/src/permissions/school.ts), consumers in [apps/api/src/routes/tracks.ts:13-15](../apps/api/src/routes/tracks.ts), [apps/api/src/routes/chapters.ts:15](../apps/api/src/routes/chapters.ts), [apps/api/src/routes/segments.ts:16](../apps/api/src/routes/segments.ts).

**Problem:** Visibility of draft content is encoded as a BetterAuth `draft: ['read']` permission. The pattern is:

```ts
await authClient.ensureSchoolPermissions({ content: ['read'] })
const includeDrafts = await authClient.hasSchoolPermissions({ draft: ['read'] })
const result = await Service.findX(db, ..., includeDrafts)
```

The _meaning_ — "can this caller see in-progress content?" — is split across:

1. ACL config in `permissions/school.ts` (declares the permission).
2. Route handler (probes the permission, threads as `includeDrafts: boolean`).
3. Service (uses `includeDrafts` to add/skip a `WHERE status = 'published'` clause).

A reader must touch all three to understand who sees drafts.

**Deepening:** If you adopt §5.D, the `ChapterView` discriminator subsumes this. `{kind: 'learning'}` implies "published only"; `{kind: 'authoring'}` allows drafts. The ACL still gates _who_ gets the authoring view (e.g. determined by role), but the route doesn't probe a special permission — it picks the view based on the user's role/scope.

Otherwise, at minimum rename the ACL key to express intent: `content.viewDrafts` or `content.read.unpublished`.

---

### 5.G Cursor pagination orders by random UUID

**Files:** [apps/api/src/services/batch.ts:110,114](../apps/api/src/services/batch.ts), [apps/api/src/services/exam.ts:99,103](../apps/api/src/services/exam.ts), [apps/api/src/utils/cursor.ts](../apps/api/src/utils/cursor.ts).

**Problem:**

- `batch.findAll` orders by `asc(batch.id)` — UUID v4 order, meaningless to humans.
- `exam.findByBatch` same issue.
- `evaluation.findByBatch` orders by `desc(evaluatedAt)` but **has no cursor support** — returns all rows. With 5000 evaluations in a batch this is unbounded.
- `asCursor` only supports `{id: string}` shape — no compound cursors.

**Deepening:** Expand `paginateResponse` into a small helper that:

- accepts `orderBy: { column, direction }[]` and emits the correct compound `where` predicate;
- requires `limit + 1` as input (currently implicit, easy to miss);
- works for `(evaluatedAt DESC, id DESC)` compound cursors so time-ordered lists paginate correctly.

Apply uniformly. Pick natural ordering for each list:

- `batches`: `(startDate DESC NULLS LAST, id)`.
- `exams`: `(scheduledAt, id)`.
- `evaluations`: `(evaluatedAt DESC, id DESC)`.

---

### 5.H Auth permission ACLs duplicate the `Subset` helper

**Files:** [packages/auth/src/permissions/school.ts:3-8](../packages/auth/src/permissions/school.ts), [packages/auth/src/permissions/batch.ts:1-7](../packages/auth/src/permissions/batch.ts).

Both define the same `type Subset<T>`, both define near-identical `XxxPermissions` mapped types. School uses BetterAuth's `createAccessControl`; batch hand-rolls equivalent shapes.

**Small fix:** Extract `Subset` + the `Permissions<Acl>` mapped type into a shared file (e.g. `permissions/types.ts`).

**Bigger question:** Should the batch ACL also use BetterAuth's `createAccessControl` builder, even though it's not connected to BetterAuth's permission check? Pro: same mental model. Con: dragging BetterAuth's runtime into a check that just reads from `enrollment` table. Likely not worth it — but document the deliberate divergence.

---

## 6. Smaller quality issues

Trivial-to-medium cleanups. None blocking, all reduce reader friction.

### 6.1 `proficiencyLevel` enum is defined three times

**Files:** [packages/db/src/schema/school.ts:24-32](../packages/db/src/schema/school.ts), [apps/api/src/services/evaluation.ts:7-15](../apps/api/src/services/evaluation.ts), [apps/api/src/services/exam.ts:11-19](../apps/api/src/services/exam.ts).

Identical literal array each time. Export the Zod schema from one place (probably `services/evaluation.ts`) and import in `exam.ts`.

### 6.2 `requireNonEmpty` helper for update schemas

The pattern `.refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })` appears in `batch`, `chapter`, `track`, `exam`, `profile`, `school` update schemas. Extract:

```ts
export function requireNonEmpty<T extends z.ZodObject<any>>(schema: T) {
  return schema.refine(d => Object.keys(d).length > 0, { message: 'No fields to update' })
}
```

### 6.3 `School` type defined twice

[apps/api/src/middlewares/school.ts:6](../apps/api/src/middlewares/school.ts) (`type School = typeof organization.$inferSelect`) and [apps/api/src/services/school.ts:39](../apps/api/src/services/school.ts) (`type School = z.infer<typeof schoolSchema>`). One is the request-context shape, one is the API shape. Either share or rename — `SchoolContext` for the middleware type.

### 6.4 `parseBody`/`parseParams`/`parseQuery` discard Zod issues

**File:** [apps/api/src/utils/validate.ts:6-13](../apps/api/src/utils/validate.ts)

```ts
if (!result.success) {
  throw validationError() // no message
}
```

Lose all field-level detail. At minimum: `throw validationError(JSON.stringify(result.error.format()))`. Better: pass `result.error.issues` into the `AppError` as a structured `details` field and surface in the JSON envelope.

### 6.5 Error handler logs every error at `error` level

**File:** [apps/api/src/server.ts:46-65](../apps/api/src/server.ts)

`logger.error(error, '...')` fires for 404s and 401s, making the log noisy. Split:

- 4xx → `logger.warn`
- 5xx → `logger.error`
- attach `req.method`, `req.url`, `statusCode`, `userId` (if available).

Add `pino-http` for per-request access logs while you're in there.

### 6.6 No request-scoped logger

`pino-http` gives you `req.log` with a per-request `reqId`. Threading this through services would help debugging. Lower priority until you have traffic.

### 6.7 `auth.ts` imports `'better-auth/minimal'`

**File:** [packages/auth/src/index.ts:1](../packages/auth/src/index.ts)

Worth verifying the `minimal` entry point includes everything the `organization` plugin needs at runtime. If something silently no-ops in production, this will be very hard to debug. Test by running the auth flow end-to-end.

### 6.8 `organization.metadata` is text JSON, never parsed

[packages/db/src/schema/auth.ts:85](../packages/db/src/schema/auth.ts) — declared as `text('metadata')` (BetterAuth-managed). No reader/writer in this codebase touches it. Either start using it (with a Zod schema for the JSON), or leave a comment.

### 6.9 `Router({ mergeParams: true })` used inconsistently

Used in `enrollment.ts`, `evaluations.ts`, `segments.ts`, `audio.ts`, `exams.ts` (batchExamsRouter). The routes nested under `/batches/:batchId/...` need it; standalone routers don't. Currently correct, but worth a code comment so future routers don't break.

### 6.10 `helmet`, `cors` use defaults

[apps/api/src/server.ts:20-21](../apps/api/src/server.ts). Fine for dev; flag for prod review (CSP, allowed methods).

### 6.11 No `engines.node` or `.nvmrc`

Pin the Node version. The Drizzle + BetterAuth + Express 5 stack has Node version sensitivities; surprising deploy issues will arise.

### 6.12 No `tsc --noEmit` in CI

Root `package.json` `scripts` runs `pnpm -r lint` but not `tsc --noEmit`. Type errors don't fail builds. Add a `typecheck` script and wire to CI.

### 6.13 `dotenv-cli` wraps every root script

[package.json:7-15](../package.json) — every script is `dotenv -e .env -- pnpm --filter ...`. Cleaner alternatives: load `.env` once in `@narada/env` (using `dotenv` directly), or use `pnpm`'s `--env-file` feature.

### 6.14 Two routing styles in `routes/index.ts`

[apps/api/src/routes/index.ts:31-41](../apps/api/src/routes/index.ts) mounts some routes nested under params (`/batches/:batchId/evaluations`) and some flat (`/exams`, `/audio`). Both are correct; mixing them in one file is confusing. Either group nested mounts together, or use a parent router pattern (`batchesRouter.use('/:batchId/evaluations', evalRouter)`).

### 6.15 `session.activeOrganizationId` is unused

BetterAuth populates this on the session; the code uses an `X-School-Slug` header instead. Once a user signs in and picks a school, the session knows it. You could drop the header for authenticated routes by reading `session.activeOrganizationId` and resolving the slug from the org table.

Trade-off: header is stateless and easier to debug; session-based is fewer round-trips and feels more correct. User decision.

### 6.16 `apps/api/src/types/express.d.ts` types `db: Database` non-optionally

But [middlewares/school.ts](../apps/api/src/middlewares/school.ts) assigns `publicDb` when no school header is set — these are the _same_ TS type (`Database` is just `ReturnType<typeof getScopedDatabase>`), but the runtime instance differs (different `search_path`). A service that expects school-scoped tables but receives `publicDb` will quietly read from `public` schema and return nothing.

Fix as part of §3.11 — define separate types for school-scoped vs public-scoped `db`.

### 6.17 No drizzle migration files

[packages/db/drizzle/school/](../packages/db/drizzle/school/) exists but only with `meta/_journal.json` and a snapshot. `TODO.md` flags this. The schema has never been migrated — you've been running `db:push` directly. Generate an initial migration before going to prod.

### 6.18 `segments` returned from `replace` are re-sorted but `audioMapping.replace` doesn't sort

Cosmetic. [services/segment.ts:74](../apps/api/src/services/segment.ts) sorts; [services/audioMapping.ts:69-74](../apps/api/src/services/audioMapping.ts) doesn't. Pick one convention.

### 6.19 `chapter.code` and `batch.code` are globally unique via DB `.unique()`

But "code" feels like it should be unique _within a track_ (for chapters) and _within a school_ (for batches). Currently the per-school schema means batch.code is per-school by construction. Chapter.code being globally unique within a school may or may not be intended — confirm with user.

---

## 7. Test infrastructure (deferred to the end)

**Zero tests exist, and the user has deliberately chosen to add them last** — after the bugs in §3, the doc reconciliation in §4, and the deepening refactors in §5 have all landed. Do **not** set up testing as a prerequisite for any other section. The shallow services are fine as-is because there's nothing to break; refactors should be verified by reading the diff and exercising the app manually until the shape of the code has stabilized.

This section exists so that when the time comes, the receiving agent doesn't have to redesign the test setup from scratch. Treat it as a plan, not a task to start.

### 7.1 Why last, not first

- The architecture is still settling. Tests written now would lock in shapes (mappers, `AuthClient`, the `showAll` flag, the `includeDrafts` parameter, etc.) that §5 will delete. Each refactor would then require rewriting the test it just broke — no signal, all cost.
- The user actively rewrites generated code. Tests against intermediate shapes get thrown away with the code.
- Once §3, §4, and §5 are done, the surface area is stable and small. A test suite written against the _final_ shape is cheap and durable.

### 7.2 Suggested stack (for when it's time)

- **Test runner:** `vitest` (works well with TS, fast, watch mode).
- **HTTP testing:** `supertest` against the Express app from `createServer()`.
- **DB:** real Postgres via Docker, fresh schema per test suite. Use `provisionSchool` to create test schemas.
- **R2:** mock `@narada/storage` exports. After §5.E this becomes mocking `ObjectLifecycle`.
- **BetterAuth:** real auth flow against a test Postgres — sessions are cookies, manageable with supertest.

### 7.3 Coverage targets (for when it's time)

- **One integration test per route** that exercises the happy path. Doesn't need to be exhaustive — just needs to fire if a future change breaks the wire format.
- **Unit tests for authorization** (after §5.A/B): every combination of (super admin, school admin, batch instructor, batch student, unrelated user) × (school-scoped op, batch-scoped op).
- **Unit tests for `cursor.ts`** — encoding/decoding round-trips, pagination boundary conditions.

### 7.4 Docker Compose dev environment

`TODO.md` §13 flags this. Needed so tests are reproducible when you do add them. Minimal `docker-compose.yml` with Postgres 16 + (optional) MinIO for R2. Can be set up earlier than tests themselves if helpful for dev workflow.

---

## 8. Suggested execution order

If acting on this document with no other guidance:

1. **Critical bugs** (§3) — most are 5–20 line fixes. Do 3.10, 3.7, 3.11, 3.12 first (mechanical). Then 3.3, 3.4 (need user input). Defer 3.1, 3.2, 3.5, 3.6 to be solved by §5.E.
2. **§5.C** — delete mappers. Fast, big LOC win, no design risk.
3. **§5.B** — collapse `AuthClient`. Touches every route but mechanically.
4. **§5.A** — `authorize.inBatch`. Builds on B; replaces the open-coded scoping in 5 routes.
5. **§5.D** — `ChapterReader`. Also sets up clean future dashboard and matrix endpoint work.
6. **§5.E** — `ObjectLifecycle`. Fixes the cluster of R2 bugs. Required before admin authoring flow.
7. **§5.F, G, H** + §6 — opportunistic.
8. **Tests** (§7) — last, after the architecture has stabilized. See §7.1 for why.

Before any §5 item, confirm scope with the user. The bugs in §3 and spec drift in §4 are safe to act on without explicit approval (but still announce what you're doing).

Verification during steps 1–8 is by reading the diff and exercising the app manually, not by automated tests. This is deliberate (see §7.1).

---

## Appendix: how to verify findings

Each section cites file paths and line numbers. Before acting:

1. Re-read the cited file — the user actively rewrites code; line numbers may have shifted.
2. Run `git log --since='2026-05-25' -p <file>` to see recent changes.
3. If the cited behavior no longer matches the code, update this document with a note rather than silently skipping.

If a finding seems wrong: it might be. The reviewer (a Claude session, on 2026-05-25) explored the codebase in a single pass and may have misread. Push back on individual items rather than acting on bad analysis.
