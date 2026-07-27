# Plan — True parity for `apps/api-next`

**Audit date:** 2026-07-17  
**Reference implementation:** `apps/api/src` at the current working tree  
**Target:** `apps/api-next/src`  
**Audience:** an engineer or coding agent picking this up without prior context

Before changing the draft, read [`AGENTS.md`](./AGENTS.md) in full.

For correctness, security, data-lifecycle, and operational improvements that are intentionally
outside replacement parity, also read [`HARDENING_PLAN.md`](./HARDENING_PLAN.md). The hardening
plan is a separate execution track: appearing there does not approve a behavior change under
§1.2 and does not add work to the parity definition of done unless an approved decision is
explicitly incorporated here.

The governing rule is:

- `apps/api/src` defines the behavior that must continue to work: routes, request inputs,
  response shapes, authorization decisions, tenant boundaries, ordering, pagination, errors,
  and side effects.
- It does **not** define the architecture to copy. New code must use the patterns already being
  established in `apps/api-next`—domain modules, transport schemas, `AccessPolicy`,
  explicit read scopes, cursor helpers, database-error translation, and transactional services.
- Where the draft has no precedent, prefer the underlying library's idioms (Express 5, Drizzle,
  Zod, BetterAuth) and small typed abstractions over porting helpers from the old backend.

This document supersedes the 2026-07-12 parity plan. That plan identified the largest missing
domains, but it did not cover all current routes or contract differences. In particular, it
missed `GET /profiles/:profileId/batches`, the recurring-class schedule endpoint, the
phone-number OTP limiter, response-envelope differences, optional-profile administrator flows,
request logging, and a number of already-present draft behaviors that are not actually at parity.

---

## 1. What “true parity” means

Parity is reached only when the draft can replace `apps/api/src` without an **unapproved**
behavior change. An approved design may intentionally change callers, contracts, or boundaries,
but its migration, tests, rollout, and rollback then become part of the parity work.

### 1.1 Compatibility baseline

The following are the default requirements when no separately approved design change exists:

1. The same public URL and HTTP method.
2. The same required headers and authentication requirement.
3. The same request-field names, accepted enum values, nullability, and validation limits.
4. The same success status and success-body shape.
5. The same resource visibility for super administrators, school owners/admins, ordinary school
   members, instructors, TAs, and students.
6. The same school-schema isolation selected by `X-School-Slug`.
7. The same deterministic ordering and opaque cursor semantics.
8. The same write side effects, including transaction boundaries.
9. The same meaningful 400/401/403/404/409/422 distinctions.
10. The same runtime behavior for authentication mounting, CORS, rate limiting, request IDs,
    logging, graceful shutdown, and readiness.

These requirements are a **baseline, not a ceiling**. Any one of them may be improved—including
URLs/methods, headers, transport schemas, status codes, visibility rules, ordering/cursors, write
side effects, transaction boundaries, or runtime behavior—but only through the approval process
in §1.2. Until that process is complete, implementation must preserve the current behavior.

“The web app happens not to use that field today” is not a reason to omit it. Conversely,
`docs/api.md` and `TODO.md` contain aspirational or stale endpoints that are not implemented
by the current backend; they are **not** parity requirements. The executable reference is the
current code.

### 1.2 Approval-gated design changes

An implementation agent may identify and recommend an improvement to any compatibility-baseline
item. It may research the problem, document existing behavior, and prepare alternatives. It must
**not implement the behavior change until a human has manually approved the specific design**.

Manual approval means an affirmative human decision tied to a concrete proposal. Approval must
not be inferred from:

- this parity plan listing an idea;
- the general instruction to improve the draft;
- silence or lack of objection;
- approval of a different proposal or adjacent slice;
- a code review that did not explicitly approve the design change;
- an agent deciding that a bug fix is “obvious.”

Each proposed deviation needs a design note containing:

1. **Decision ID and status:** `proposed`, `approved`, `rejected`, or `deferred`.
2. **Current behavior:** executable evidence from `apps/api/src`, including edge cases.
3. **Problem/opportunity:** correctness, security, usability, consistency, performance, or
   maintainability issue being addressed.
4. **Proposed behavior:** exact URL/method, input/output, authorization, ordering, errors, side
   effects, transaction/concurrency semantics, and runtime behavior that would change.
5. **Alternatives:** at least the current-compatible option and materially different reasonable
   designs, with tradeoffs.
6. **Impact analysis:** affected web clients, API consumers, database data, migrations, tenant
   boundaries, permissions, observability, operations, and documentation.
7. **Compatibility/rollout plan:** versioning, aliases or deprecation if needed, backfill,
   deployment ordering, feature flags if appropriate, and rollback.
8. **Acceptance criteria:** tests and observable outcomes proving the approved design.
9. **Manual approval record:** approver, date, chosen alternative, and any conditions or scope
   limits.

Rules for implementation:

- Keep proposals narrowly scoped; do not bundle unrelated behavior changes into one approval.
- Pause only the affected behavior. Continue compatible work that does not prejudge the design.
- A `proposed` or `deferred` item remains blocked from implementation.
- If a proposal is rejected, implement the compatibility baseline.
- If no proposal is made, implement the compatibility baseline.
- After approval, update this plan's route matrix, detailed slice, tests, affected clients, and
  rollout steps before writing the behavior-changing code.
- Implement only the approved alternative and conditions. Any material expansion requires a new
  approval.

### 1.3 Internal patterns and candidate behavior improvements

The following internal patterns may be implemented without a behavior-change approval **only if
they preserve every externally observable compatibility-baseline item**:

- Keep typed domain folders: `route.ts`, `schema.ts`, `service.ts`, `repository.ts`, `index.ts`.
- Keep a centralized `AccessPolicy`; do not recreate scattered
  `authorize/getBatchAccess/requireAccess` orchestration in every route.
- Keep explicit repository read scopes so authorization determines the query scope instead of
  fetching all rows and filtering in application code.
- Use typed schemas, explicit service/repository boundaries, dependency injection, and request-scoped
  caching where those choices do not alter behavior.

The following are **candidate** improvements discovered during this audit. They are not approved
merely because they appear in this plan. Each has a full design note under
[`decisions/`](./decisions/) using the §1.2 template; this table is a summary index only —
update the design note first, then reflect its status here.

| Decision ID                     | Candidate improvement                                                                                                                          | Compatibility baseline if not approved                                                                | Status   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| [DD-001](./decisions/DD-001.md) | Use `translateDbError` as a final race-safe mapping for PostgreSQL unique and foreign-key failures.                                            | Preserve each current endpoint's observed database-error behavior.                                    | approved |
| [DD-002](./decisions/DD-002.md) | Keep the draft exam transition state machine, optimistic status guard, transactional single-result winner, and terminal-result checks.         | Preserve the current exam transition/update/result side effects.                                      | proposed |
| [DD-003](./decisions/DD-003.md) | Require an exam target to be enrolled with role exactly `student`.                                                                             | Preserve the current “enrolled under any role” assignment behavior.                                   | proposed |
| [DD-004](./decisions/DD-004.md) | Add and retain `GET /exams/:examId`.                                                                                                           | Do not expose a new detail endpoint.                                                                  | proposed |
| [DD-005](./decisions/DD-005.md) | Fix exam-list cross-product authorization with a correlated educator/student/chapter relationship.                                             | Preserve the current visible-exam query, while documenting its risk.                                  | proposed |
| [DD-006](./decisions/DD-006.md) | Evaluate school permissions from the school resolved by `X-School-Slug` and persisted membership instead of BetterAuth `activeOrganizationId`. | Preserve current BetterAuth permission resolution and active-organization dependency.                 | proposed |
| [DD-007](./decisions/DD-007.md) | Let public routes ignore an unrelated invalid `X-School-Slug`.                                                                                 | Preserve current global school-resolution behavior.                                                   | proposed |
| [DD-008](./decisions/DD-008.md) | Add `PUT` to CORS methods for the schedule route.                                                                                              | Preserve the current CORS method list.                                                                | proposed |
| [DD-009](./decisions/DD-009.md) | Return structured JSON 400 for malformed JSON and JSON 404 for unmatched API routes.                                                           | Preserve current Express/error-middleware behavior.                                                   | proposed |
| [DD-010](./decisions/DD-010.md) | Fail closed on unknown school roles rather than normalizing them to `member`.                                                                  | Preserve the current backend's BetterAuth role handling; do not introduce new normalization behavior. | proposed |

Later sections describe the audit's recommended target behavior. Whenever that recommendation
differs from the compatibility baseline, it is conditional on the corresponding decision above
being manually approved. If approval is rejected or absent, implement and test the baseline
instead. Every approved deviation needs regression and rollout coverage; no behavior change may
be smuggled in as “cleanup,” “refactoring,” or “parity.”

### 1.4 Definition of done

The rewrite is complete only when:

- every row in the route matrix in §2 is implemented or replaced by an approved design with its
  migration path completed;
- every existing rewrite divergence in §3 is resolved;
- the access matrix in §5 is covered by tests;
- list cursors have multi-page tests with ties and nullable sort fields;
- cross-school isolation tests pass;
- server/auth/OTP/rate-limit behavior is represented in tests;
- every compatibility deviation has an approved decision note and manual approval record;
- no `proposed` or `deferred` design has been implemented;
- both the current backend and the rewrite package typecheck during the migration;
- the rewrite package passes lint and its complete unit/integration suite;
- the web server-side API clients run against the approved target contract, including any
  approved caller migration or temporary compatibility layer;
- the production entrypoint and Docker image actually run the promoted rewrite rather than the
  current backend.

---

## 2. Audited route matrix

Legend:

- **Present / parity work** — a draft route exists, but at least one contract or ACL differs.
- **Missing** — no draft route exists.
- **Present / extension** — draft-only behavior that may remain.

The matrix records the compatibility baseline and the audit's recommended work. A manually
approved design may replace a method/path or any other cell detail; when that happens, update the
row to link its decision ID and describe the migration rather than silently deleting the current
contract.

| Current endpoint                               | Draft state                   | Required work                                                                                                      |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /health`                                  | Present                       | Domain behavior matches; retain rate-limit bypass and verify server envelope exception.                            |
| `GET /health/ready`                            | Present                       | Domain behavior matches; verify it always checks the public database and bypasses school resolution/rate limiting. |
| `POST /auth/phone-number/send-otp`             | Present only through wildcard | Add parsed-body mounting plus both the general auth limiter and the phone-number keyed 3-per-10-minute limiter.    |
| `ALL /auth/*splat`                             | Present                       | Preserve raw-body ordering, BetterAuth base path, and general 100-per-15-minute limiter.                           |
| `GET /schools`                                 | Missing                       | Add public-db service, super-admin policy, response projection, and route.                                         |
| `PATCH /schools/:schoolId`                     | Missing                       | Add validation, super-admin policy, existence/conflict behavior, and response projection.                          |
| `GET /profile`                                 | Missing                       | Add authenticated public bootstrap response with super-admin flag and organization memberships.                    |
| `GET /profiles`                                | Present / parity work         | Add `ok: true`; verify school/session semantics and exact response fields.                                         |
| `POST /profiles`                               | Present / parity work         | Align input nullability, membership authorization, response envelope, and errors.                                  |
| `GET /profiles/:profileId/batches`             | Missing                       | Add target lookup, own/admin/shared-instructor scope, batch pagination, and route.                                 |
| `PATCH /profiles/:profileId`                   | Present / parity work         | Align input schema, ownership semantics, response envelope, and error distinctions.                                |
| `DELETE /profiles/:profileId`                  | Present / parity work         | Align ownership semantics and 204 behavior.                                                                        |
| `GET /tracks`                                  | Missing                       | Add content-read policy, ordered tracks, ordered/visibility-filtered chapters.                                     |
| `GET /tracks/:trackId`                         | Missing                       | Add the same content view plus 404 behavior.                                                                       |
| `GET /chapters/:chapterId`                     | Missing                       | Add content view, draft hiding, and 404 behavior.                                                                  |
| `GET /batches`                                 | Present / parity work         | Restore optional-profile admin flow, compound ordering/cursor, envelope, and exact filter schema.                  |
| `GET /batches/:batchId`                        | Present / parity work         | Return roster and class slots, not a bare batch; restore optional-profile admin flow.                              |
| `POST /batches`                                | Present / parity work         | Do not require an active profile; align schema and envelope.                                                       |
| `PATCH /batches/:batchId`                      | Present / parity work         | Remove draft-only `trackId` update, align schema/profile semantics/envelope.                                       |
| `PUT /batches/:batchId/schedule`               | Missing                       | Add atomic replace-set service, schema, admin ACL, route, and CORS support.                                        |
| `POST /batches/:batchId/members`               | Missing                       | Add instructor/school enrollment ACL, validation, conflict handling, and route.                                    |
| `DELETE /batches/:batchId/members/:profileId`  | Missing                       | Add instructor/school removal ACL, 204/404 behavior, and route.                                                    |
| `GET /batches/:batchId/evaluations`            | Missing                       | Add admin/instructor/TA batch history with compound cursor.                                                        |
| `GET /batches/:batchId/evaluations/:studentId` | Missing                       | Add own-student read vs educator/admin read policy and pagination.                                                 |
| `POST /batches/:batchId/evaluations`           | Missing                       | Add evaluator policy, student-role and chapter-track invariants, append-only insert.                               |
| `GET /exams`                                   | Present / parity work         | Add educator visibility, optional-profile administrator flow, and correlated visibility semantics.                 |
| `POST /exams`                                  | Present / parity work         | Add instructor/TA ACL while retaining stricter draft assignment validation.                                        |
| `PATCH /exams/:examId`                         | Present / parity work         | Add instructor/TA ACL and keep transition/concurrency hardening.                                                   |
| `POST /exams/:examId/results`                  | Present / parity work         | Add instructor/TA ACL and keep single-result transaction hardening.                                                |
| `GET /exams/:examId`                           | Present / extension           | Retain only with list-equivalent object visibility and contract tests.                                             |

There are 27 current non-auth application endpoints, plus BetterAuth's mounted handler surface.
Only health is behaviorally close to complete. “Batches, exams, profiles are present” must not be
treated as meaning those domains are at parity.

---

## 3. Current draft divergences that must be fixed

### 3.1 Global HTTP contract

The current backend returns:

- normal success: `{ ok: true, data: ... }`;
- application error: `{ ok: false, error: { code, message, details? } }`;
- health: `{ status: ... }` without the normal envelope;
- deletion: an empty 204 response.

The draft currently omits `ok` from both success and error responses. Fix this centrally or in a
small response helper and use it everywhere. Do not change BetterAuth responses.

Add transport-level tests for:

- data response;
- paginated data response;
- empty 204;
- each `AppError` status;
- validation details;
- translated database error;
- unknown non-`AppError`;
- headers-already-sent behavior.

### 3.2 Route wrappers and profile optionality

The draft routes every batch and exam operation through `profileRoute`. That incorrectly makes
`X-Profile-Id` mandatory for school-wide administrators on:

- batch list/detail/create/update;
- exam list;
- any other route whose school-level permission is sufficient.

Build wrappers around capability requirements, not around domain names:

1. `publicRoute`: public database, no school lookup, no implicit session.
2. `schoolRoute`: required valid school, no implicit session.
3. `userRoute`: required school plus authenticated user.
4. `optionalProfileRoute`: required school/user, resolves a supplied profile if present and
   rejects a profile owned by another user.
5. `profileRoute`: same, but requires a valid active profile.
6. A policy-bearing variant may load `AccessPolicy` for either optional or required profiles;
   avoid duplicating wrapper combinations if a single typed option can express this cleanly.

Required semantics:

- Missing school header on a school route: 400
  `X-School-Slug header is required`.
- Unknown school slug: 404, not the draft's current 400.
- Missing session where required: 401.
- Missing required profile header: 400
  `X-Profile-Id header is required`.
- Supplied nonexistent or foreign-owned profile: 403.
- No school lookup on `/health`, `/profile`, `/schools`, or BetterAuth routes.

Resolve school, session, profile, membership, and policy at most once per request. Retain the
draft's session cache and integrate it with a request context rather than layering multiple
unrelated WeakMaps.

### 3.3 Response and input schemas

Input schemas must describe HTTP inputs, not be derived mechanically from database response
schemas when the contracts differ.

Known draft mismatches:

- Profile create/update currently inherit nullable `phone` and `city`; the current API accepts
  optional strings, not explicit `null`.
- Draft `requireNonEmpty` rejects `''`, while the current helper only rejects an object with no
  recognized update keys. Empty phone/city strings are currently accepted.
- Batch create/update use coercing date schemas and nullable fields; current inputs require ISO
  datetime strings when present and transform them to `Date`.
- Draft batch update permits `trackId`; current update does not.
- Draft cursor helpers make cursor optional internally, while call sites also model optionality.
  Pick one convention and use it consistently.
- Unknown object keys should continue to be stripped by Zod; after stripping, an update with no
  known fields must fail validation.

Define separate schemas/types for:

- persisted row/response;
- create body;
- update body;
- path parameters;
- list query;
- decoded cursor;
- enriched detail response.

### 3.4 Batch ordering and pagination

The draft lists batches by UUID only. The current contract orders:

1. non-null `startDate` descending;
2. null `startDate` last;
3. UUID ascending as the stable tie-breaker.

The cursor is `{ startDate: Date | null, id: UUID }`. Reproduce both cursor phases:

- while in non-null dates, continue by descending date then ascending ID;
- when a page has room, append null-date rows ordered by ID;
- once the cursor has `startDate: null`, query only null-date rows after the ID.

Test:

- more than one page of non-null dates;
- equal start dates;
- transition from non-null to null within a page;
- a cursor positioned in the null partition;
- status filtering in all phases;
- enrolled-only scope in all phases;
- limit 1, default 20, maximum 100, zero/negative/over-max rejection;
- malformed Base64, malformed JSON, wrong cursor fields, invalid dates, invalid UUID.

### 3.5 Existing exam behavior

The draft's service hardening is good, but its authorization and visibility are incomplete:

- non-admin educators currently see only their own student exams;
- create/update/results are school-admin-only;
- school admins cannot list without a profile because the route wrapper requires one;
- read visibility has only `all` and `own`, with no educator scope;
- the route and service redundantly load an exam before mutations.

Replace the TODO with a complete policy and a single ownership model described in §10.

### 3.6 Server/runtime behavior

The draft is missing:

- request IDs and `x-request-id` response header;
- request-scoped child logger and request cache;
- structured request completion logs with method/path/status/duration;
- severity selection for 2xx/3xx, 4xx, and 5xx;
- the phone-number keyed OTP limiter;
- the special body-parser ordering for `send-otp`;
- `SIGUSR1`/`SIGUSR2` handling currently present in the backend;
- a guard that prevents graceful shutdown from starting twice;
- clearing the shutdown timeout after a successful close;
- `ok: false` in error envelopes.

Retain draft database-error translation and merge it into the structured logger/error path.

---

## 4. Target architecture

### 4.1 Domain layout

Every domain should use:

```text
src/<domain>/
  index.ts       public router export
  route.ts       HTTP parsing and status/response only
  schema.ts      transport schemas and transport-facing types
  service.ts     authorization, transaction, and domain orchestration
  repository.ts  scoped database reads and writes
```

Expected domains after parity:

- `health`
- `profile` (singular auth bootstrap)
- `profiles`
- `schools`
- `tracks`
- `chapters`
- `batches`
- `enrollment`
- `evaluations`
- `exams`

Shared infrastructure remains at `src/` and `src/utils/`.

### 4.2 Route responsibilities

A route must:

1. parse params/query/body;
2. obtain the correct route context;
3. call one service function;
4. write the documented status and response envelope.

A route must not:

- issue ad hoc Drizzle queries;
- call a repository mutation directly;
- duplicate enrollment/chapter/batch invariants;
- interpret raw school roles itself;
- catch database exceptions already handled centrally;
- fetch a record solely to authorize it and then make the service fetch it again.

### 4.3 Service and repository responsibilities

A service must:

- receive a typed actor/request context and root database client explicitly;
- accept already-parsed inputs;
- ask `AccessPolicy` for authorization or a scoped capability;
- enforce invariants that remain required regardless of caller;
- use transactions for multi-row mutations;
- return transport-safe domain values;
- throw typed domain errors;
- never depend on Express `Request`/`Response`;
- never decide actor authorization from headers.

A repository must:

- accept the narrow `SchoolDb` or `PublicDb` capability as its first argument;
- contain named, domain-specific Drizzle reads and writes;
- apply read scopes in SQL;
- never open its own transaction;
- never call `AccessPolicy`, inspect HTTP context, or import a global database singleton.

The database vocabulary and call conventions in [`HARDENING_PLAN.md`](./HARDENING_PLAN.md) §2.4
are the intended target. `SchoolDbExecutor`, database-last signatures, and transaction-owning
repository functions are transitional patterns, not precedent for new draft modules.

### 4.4 AccessPolicy responsibilities

`AccessPolicy` is the single authorization vocabulary. Expand it rather than creating route
helpers that duplicate policy.

It needs:

- authenticated user identity and super-admin status;
- school membership role, if any;
- optional active profile identity;
- lazy/cached access to profile enrollment roles;
- typed school and batch permission checks;
- methods that return read scopes for list queries;
- exam-manage resolution that correlates actor batch, student batch, and chapter track.

Do not hard-code “admin means everything” in each domain. Implement typed checks against the
shared permission statements. If `@narada/auth` does not expose a runtime-independent school
permission evaluator equivalent to `hasBatchPermission`, add one beside the shared school ACL
and consume it from the draft. Do not re-declare a second untyped permission matrix in the API.

Unknown role strings deny access. A missing membership denies access except for super admins.
Use a `Map<batchId, role>` or a lazy single-batch lookup instead of repeatedly scanning an array.

### 4.5 Query-scoped authorization

Use explicit scope types:

- batch list: `all | enrolled(profileId)`;
- batch item: `schoolWide | enrolled(profileId, role)`;
- evaluation list: batch-wide educator/admin vs own-student;
- exam list: `all | own(profileId) | manageable(profileId)`;
- content view: `authoring | learnerPreview`.

The query must implement the scope. A scope is not merely a boolean authorization result.

### 4.6 Request context and dependency boundaries

Introduce a rewrite-native request context that contains:

- request ID;
- request-scoped logger;
- promise cache;
- optionally resolved school;
- optionally resolved session/user/profile/policy.

Keep server construction testable. `createServer` should accept optional dependencies
(auth handler, public DB/school DB resolver, logger, clock, rate-limit store) with production
defaults. This permits route integration tests without monkey-patching global imports.

---

## 5. Authorization model and acceptance matrix

The policy must distinguish:

- unauthenticated caller;
- super administrator;
- school owner;
- school administrator;
- ordinary school member with no active profile;
- instructor profile;
- TA profile;
- student profile.

### 5.1 School permissions

The current shared ACL grants:

- owner: school update/delete, content create/read/update, batch create/read/update, member and
  invitation management, enrollment create/remove, evaluation read;
- admin: the same except school delete;
- member: content read and batch read;
- super admin: bypass.

Do not reduce this to an `isSchoolAdmin()` check for content or list reads. Ask for the actual
resource/action.

### 5.2 Batch-role permissions

The current shared batch ACL grants:

| Role       | Evaluations  | Exams                | Enrollment           |
| ---------- | ------------ | -------------------- | -------------------- |
| instructor | create, read | create, read, update | create, read, remove |
| ta         | create, read | create, read, update | read                 |
| student    | read         | read                 | read                 |

Important correction to the prior plan: a TA may **not** enroll or remove members. Only an
instructor with the relevant batch membership, or a caller with school-level enrollment
permission, may do so.

### 5.3 Endpoint-level rules

- Batch list: super/owner/admin see all; a valid profile sees enrolled batches; an ordinary
  member without a profile does not receive an unscoped list merely because members have school
  `batch:read` in the ACL—the current route's all-list claim is `batch:update`.
- Batch detail: super/owner/admin, or a profile with batch `enrollment:read`.
- Batch create/update/schedule: school `batch:create/update`; profile not required.
- Enrollment create/remove: school `enrollment:create/remove`, or actor batch permission.
  Instructors can create/remove; TAs and students cannot.
- Evaluation batch list: school `evaluation:read`, or actor batch `evaluation:create`.
  This deliberately gives educators the whole batch history but not students.
- Evaluation student list: school `evaluation:read`; actor reading self needs batch
  `evaluation:read`; actor reading another student needs batch `evaluation:create`.
- Evaluation create: required active evaluator profile with batch `evaluation:create`.
- Exam list: super admin sees all; a school-wide administrator **without** a supplied profile may
  see all if school `evaluation:read`; when a profile is supplied, the current contract uses
  profile-scoped visibility (own plus educator-manageable exams), even for a school admin.
- Exam create/update/result: preserve the current required active-profile header for all actors,
  including super admins. Non-super actors must have exam create/update permission in a batch
  that correlates the target student and chapter track. Recording a result also structurally
  needs that profile because the evaluation row requires `evaluatorId`.
- Content reads: require school `content:read`; callers with `content:update` get authoring
  view, everyone else gets learner preview.
- Profile create: authenticated school member or super admin.
- Profile update/delete: authenticated owner of that profile. Preserve current 404 for missing
  and 403 for an existing profile owned by another user.
- Profile batch history: school-wide batch-update permission, self, or an instructor/TA profile
  that passes the shared-enrollment rule.
- Schools list/update: super admin only.

### 5.4 Shared-history rule

The current helper name/comment says “ever shared a batch,” but the data model has no enrollment
history table. Deleting an enrollment removes the evidence. Also, the current query does not
require the target to have role `student`.

For parity, implement the observable persisted-data rule:

- actor has `instructor` or `ta` role in at least one batch;
- target has any persisted enrollment in at least one of those batch IDs.

Do not claim this survives unenrollment. If the product requires true historical access, that is
a separate schema migration with an enrollment audit/history table. Add a focused test so a
future change is explicit rather than accidental.

---

## 6. Foundation work

Complete this before adding more feature routes; otherwise every new module will need rework.

### 6.1 Contract helpers

- Add a success response helper or typed response convention that always emits
  `{ ok: true, data }`.
- Update centralized error handling to emit `{ ok: false, error }`.
- Preserve health and 204 exceptions.
- Keep `ErrorCode` values stable.
- Translate malformed JSON/body-parser syntax errors to `INVALID_REQUEST` 400.
- Add a final JSON 404 under the API version router.
- Do not expose raw database errors or stack traces.

### 6.2 Validation helpers

- Make `parse` synchronous unless an endpoint actually uses asynchronous Zod refinements.
- If async parsing remains, use it consistently and document why.
- Restore the current non-empty-update meaning: at least one recognized key remains after
  parsing. Do not reject a valid empty string solely because it is falsy.
- Add reusable UUID param schemas and compound cursor field helpers without creating a generic
  abstraction more complex than the call sites.
- Keep cursor payloads opaque to clients and Base64URL encoded.

### 6.3 Session and tenant resolution

- Cache the BetterAuth session promise per request, including rejection cleanup if retries in the
  same request should be possible.
- Resolve a school by exact slug in the public schema.
- Return 404 for an unknown slug.
- Obtain a school-scoped database only after resolving the organization ID.
- Never accept a profile from a different scoped schema.
- Resolve an optional profile only when the header exists.
- Verify `profile.userId === session.user.id`.
- Cache profile and policy resolution.

### 6.4 AccessPolicy expansion

Add typed capabilities for:

- `requireSuperAdmin()`;
- `requireSchoolMember()`;
- `has/requireSchoolPermission(permission)`;
- `getBatchListScope()`;
- `requireCanReadBatch(batchId)`;
- `requireCanCreateBatch()`;
- `requireCanUpdateBatch(batchId)`;
- `requireCanManageEnrollment(batchId, action)`;
- `requireCanReadBatchEvaluations(batchId)`;
- `requireCanReadStudentEvaluations(batchId, studentId)`;
- `requireCanCreateEvaluation(batchId)`;
- `getProfileBatchListScope(targetProfileId)`;
- `getExamReadScope()`;
- `requireCanReadExam(exam)`;
- `requireCanCreateExam(input)`;
- `requireCanUpdateExam(exam)`;
- `requireCanRecordExamResult(exam)`;
- `getContentReadView()`.

Names may differ, but the capabilities and typed return scopes must exist. Methods that only
inspect already-loaded state should not be marked `async`.

### 6.5 Baseline tests

Before feature implementation, create table-driven tests for:

- school role/resource/action combinations;
- batch role/resource/action combinations;
- missing/foreign profile;
- super-admin bypass;
- unknown-role fail-closed behavior;
- optional-profile routes;
- request resolution/cache behavior;
- success/error envelopes.

---

## 7. Profiles and auth bootstrap

### 7.1 Existing `profiles` module alignment

#### `GET /profiles`

- Context: valid school and authenticated user; no active profile required.
- Query only rows in that school schema with `userId === session.user.id`.
- Return 200 `{ ok: true, data: Profile[] }`.
- Do not require organization membership beyond what the current route requires.

#### `POST /profiles`

- Body: `name: non-empty string`, optional string `phone`, optional string `city`.
- Context: valid school and authenticated user.
- Access: super admin or persisted organization membership for that school.
- Insert with the authenticated user's ID; never accept `userId` from the body.
- Return 201 with the inserted profile.
- Let missing optional database values become null in the response.
- Translate uniqueness/foreign-key races centrally.

#### `PATCH /profiles/:profileId`

- Param: UUID.
- Body: a non-empty recognized subset of `name`, `phone`, `city`; `name`, when supplied,
  must be non-empty.
- Load target in the scoped database.
- Missing target: 404.
- Existing target owned by another user: 403.
- Update and return 200 with the row.
- Do not broaden this into an admin edit endpoint.

#### `DELETE /profiles/:profileId`

- Apply the same existence and ownership rules.
- Delete and return an empty 204.
- Confirm database cascades for enrollment/exam/evaluation references produce the current
  behavior; do not add soft deletion during parity work.

### 7.2 `GET /profiles/:profileId/batches`

Add `findById` to the profile service if needed and implement:

1. Parse target profile UUID and batch list query.
2. Resolve actor profile optionally.
3. Load the target; missing target is 404 before returning data.
4. Ask policy for:
   - all batches for super/owner/admin;
   - target's enrolled batches when actor equals target;
   - target's enrolled batches when shared-history rule passes;
   - otherwise 403.
5. Reuse the exact batch list service and compound cursor from §9.1.
6. Return 200 paginated envelope.

Tests must cover self, unrelated student, shared instructor, shared TA, shared student,
administrator without profile, super admin, missing target, different school, and cursor pages.

### 7.3 Singular `profile` bootstrap module

Add `apps/api-next/src/profile/`.

#### `GET /profile`

- Public database route; no school header required.
- Authenticated session required.
- Query all BetterAuth organization memberships for the user with organization relation.
- Return:

```ts
{
  isSuperAdmin: boolean
  memberships: Array<{
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: string
  }>
}
```

- Project fields explicitly; do not return organization metadata, logo, membership IDs, or user
  details.
- Return 200 normal envelope.
- Test zero, one, and multiple memberships and super-admin true/false.

---

## 8. Schools

Add `apps/api-next/src/schools/` backed only by `PublicDatabase`.

### 8.1 School response projection

Expose only:

- `id`;
- `name`;
- `slug`;
- `createdAt`.

Do not leak `logo` or `metadata`.

### 8.2 `GET /schools`

- No school header required.
- Authenticated super admin only.
- Return all projected organizations with 200.
- Preserve current database order unless a new deterministic order is intentionally introduced
  and tested; do not silently create cursor pagination that the current endpoint lacks.

### 8.3 `PATCH /schools/:schoolId`

- ID is a non-empty string, not a UUID.
- Body is a non-empty subset of:
  - `name`: non-empty string;
  - `slug`: non-empty lowercase alphanumeric/hyphen string matching
    `^[a-z0-9-]+$`.
- Super admin only.
- Missing school: 404.
- A changed slug already owned by another school: 409.
- Keep both a friendly precheck and the global unique-violation fallback so concurrent updates
  still become 409.
- Return the projected updated school with 200.

---

## 9. Batches, schedules, and enrollment

### 9.1 Batch list

#### `GET /batches`

- Query:
  - optional status: `upcoming | active | completed`;
  - optional compound cursor `{ startDate: Date | null, id: UUID }`;
  - limit: coerced positive integer, default 20, maximum 100.
- Actor profile is optional.
- Scope:
  - super/owner/admin: all school batches;
  - valid profile: only batches with an enrollment for that profile;
  - otherwise 403.
- Ordering/cursor must match §3.4 exactly.
- Return `{ items, nextCursor }` in the normal envelope.

### 9.2 Batch detail and roster

#### `GET /batches/:batchId`

- UUID param.
- Authorize school-wide or batch `enrollment:read`.
- Load in one relational query where practical:
  - batch row;
  - enrollments and related profiles;
  - class slots.
- Missing batch after authorization: 404.
- Return:
  - all batch fields;
  - `members` with `profileId, name, phone, city, role, joinedAt`;
  - `classSlots` with `dayOfWeek, time, durationMinutes`.
- Do not leak each enrollment's nested raw profile, profile `userId`, or class-slot IDs.
- Choose deterministic member and class-slot ordering. To remain safe for existing consumers,
  preserve current values while explicitly ordering class slots by day/time and members by a
  documented stable key; add tests so database plan order is not the contract.

### 9.3 Batch create

#### `POST /batches`

- Body:
  - required `trackId: UUID`;
  - required non-empty `code`;
  - optional ISO datetime `startDate`;
  - optional valid URL `meetingUrl`.
- Do not accept explicit null unless the current API is intentionally changed first.
- School `batch:create`; no profile required.
- Return 201 inserted row.
- Unknown track: 422 via foreign-key translation.
- Duplicate code: 409 via unique translation.

### 9.4 Batch update

#### `PATCH /batches/:batchId`

- Body non-empty subset of `code, status, startDate, meetingUrl`.
- Do **not** accept `trackId`; the draft currently does, the current API does not.
- School `batch:update`; no profile required.
- Missing batch: 404.
- Duplicate code race: 409.
- Return 200 updated row.

If clearing nullable `startDate` or `meetingUrl` is desired, add that capability to the current
contract first or record it as an explicit compatibility exception. Do not accidentally expose
it merely because the response schema is nullable.

### 9.5 Recurring class schedule

#### `PUT /batches/:batchId/schedule`

- Add `PUT` to server CORS methods.
- Param: batch UUID.
- Body: `{ slots: ClassSlot[] }`.
- Each slot:
  - `dayOfWeek`: integer 0–6;
  - `time`: strict 24-hour `HH:MM`;
  - `durationMinutes`: positive integer.
- Maximum seven slots.
- At most one slot per day.
- School `batch:update`; no profile required.
- Missing batch: 404.
- Replace the complete child set in one transaction:
  1. delete existing slots for batch;
  2. if new set empty, return `[]`;
  3. insert all new slots;
  4. return projected slots.
- A failed insert must roll back the delete.
- Return 200 normal envelope.

Tests: empty set, one, seven, duplicate day, invalid day/time/duration, eight slots, missing batch,
rollback on insert failure, replacement rather than append, CORS preflight.

### 9.6 Enrollment module

Add `apps/api-next/src/enrollment/` with a merged-params router mounted at
`/batches/:batchId/members`.

#### Shared repository operations

- `findEnrollment(db, profileId, batchId)`;
- `enrollProfile(db, batchId, data)`;
- `unenrollProfile(db, batchId, profileId)`;
- `hasSharedInstructorEnrollment(db, actorProfileId, targetProfileId)`.

#### `POST /batches/:batchId/members`

- Params: batch UUID.
- Body: `profileId: UUID`, `role: instructor | ta | student`.
- Resolve actor profile optionally because school admins need no profile.
- Access: school `enrollment:create` or actor batch `enrollment:create`.
- Confirm batch exists: 404.
- Confirm target profile exists in this school schema: 404.
- Existing enrollment: 409.
- Insert and return 201.
- Handle check/insert races through unique-violation translation.

#### `DELETE /batches/:batchId/members/:profileId`

- UUID params.
- Access: school `enrollment:remove` or actor batch `enrollment:remove`.
- Delete only the composite key.
- Missing enrollment: 404.
- Return empty 204.

Tests must specifically prove:

- instructor can add/remove in own batch;
- instructor cannot manage another batch;
- TA cannot add/remove;
- student cannot add/remove;
- school owner/admin and super admin can manage without profile;
- duplicate enrollment is conflict;
- target from another school is not found;
- deleting a nonexistent composite key is not found.

---

## 10. Evaluations

Add `apps/api-next/src/evaluations/`. Evaluations remain append-only; do not invent
update/delete endpoints.

### 10.1 Schemas

- Create body:
  - `studentId: UUID`;
  - `chapterId: UUID`;
  - `level`: value from the shared database `proficiencyLevel` enum;
  - optional `notes: string`.
- List query:
  - optional compound cursor `{ evaluatedAt: Date | null, id: UUID }`;
  - limit default 20, max 100.
- Response is the persisted evaluation row:
  `id, studentId, chapterId, level, notes, evaluatorId, evaluatedAt`.

### 10.2 Pagination semantics

Order newest first:

1. non-null `evaluatedAt` descending;
2. null `evaluatedAt` last;
3. ID descending.

Implement and test the non-null/null cursor split just as carefully as batch pagination, with the
correct reversed ID comparator.

### 10.3 `GET /batches/:batchId/evaluations`

- Resolve optional actor profile.
- Access: school `evaluation:read` or actor batch `evaluation:create`.
- Missing batch: 404 for an authorized caller.
- Resolve the batch track.
- Select evaluations whose:
  - student currently has any enrollment in this batch; and
  - chapter belongs to the batch track.
- Return paginated 200 response.

This indirect association is current behavior: evaluation has no `batchId`. Therefore an
evaluation for a student enrolled in two batches on the same track can appear in both, and a past
evaluation disappears from the batch view after unenrollment. Do not silently change this during
parity. Record a separate future migration if evaluation provenance must be permanently
batch-specific.

### 10.4 `GET /batches/:batchId/evaluations/:studentId`

- Required actor profile for every caller, matching the current `profileRoute` contract.
- If target equals actor, require batch `evaluation:read`.
- Otherwise require school `evaluation:read` or batch `evaluation:create`.
- Reuse the same batch/track/current-enrollment filters and pagination.
- Return an empty page when the batch has no chapters/evaluations.
- Do not leak another student's evaluations to a student.

### 10.5 `POST /batches/:batchId/evaluations`

- Required evaluator profile.
- Require actor batch `evaluation:create`; current behavior does not use a school-level fallback
  on this route, apart from super-admin handling through the policy.
- Validate target has role exactly `student` in this batch; otherwise 422
  `student is not enrolled in this batch`.
- Validate chapter exists; missing chapter is 404 in the current route.
- Validate batch exists and chapter `trackId === batch.trackId`; mismatch is 422
  `chapter does not belong to this batch track`.
- Insert a new row with evaluator ID from the active profile.
- Return 201.

Put assignment validation in one shared service invariant backed by named repository queries so
exam-result creation and direct evaluation creation cannot drift. Preserve the externally
meaningful error distinctions with route/service tests, including the current validation
ordering for nonexistent batches.

### 10.6 Evaluation tests

Cover:

- each proficiency level;
- notes absent/present;
- instructor and TA create;
- student create denied;
- educator in wrong batch denied;
- target not enrolled;
- target enrolled as instructor/TA rather than student;
- missing chapter;
- chapter from another track;
- batch-wide educator/admin list;
- self-only student list;
- cross-student denial;
- admin without profile list;
- nullable timestamps and multi-page cursors;
- two same-track batches and unenrollment behavior.

---

## 11. Exams

The draft already has the best starting service in the rewrite. Finish its ACL and read scopes
without discarding state/concurrency protections.

### 11.1 Shared assignment resolver

Create one service-level resolver for a tuple:

`(studentId, chapterId) -> qualifying student batch IDs / track`.

A qualifying batch:

- has `batch.trackId === chapter.trackId`;
- contains `studentId` with role exactly `student`.

Exam management by an educator additionally requires that the actor:

- is enrolled in the **same qualifying batch**; and
- has the requested exam permission for that role.

Use a correlated join or `exists` query. Do not independently build a set of visible students
and a set of visible chapters and take their cross-product; the current list implementation can
over-authorize when an educator manages multiple batches.

### 11.2 Exam list

#### `GET /exams`

- Query:
  - optional status `scheduled | inProgress | completed | cancelled`;
  - cursor `{ scheduledAt: Date, id: UUID }`;
  - limit default 20, max 100.
- Order by `scheduledAt` ascending, ID ascending.
- Visibility:
  - super admin: all;
  - if no profile is supplied, a school-wide admin with `evaluation:read`: all;
  - if a valid profile is supplied, use profile visibility even when the user is a school admin;
  - student profile: own exams;
  - instructor/TA profile: own exams plus exams for students they can manage through a
    qualifying shared batch.
- Return paginated 200 response.

Test educators with multiple tracks/batches specifically to prevent the cross-product leak.

### 11.3 Exam detail extension

#### `GET /exams/:examId`

- This is draft-only and may stay.
- Missing exam: 404.
- Visibility must be the item equivalent of list visibility: all, self, or manageable.
- A record hidden in list must not become readable by guessing its ID.
- Return 200 normal envelope.

### 11.4 Exam create

#### `POST /exams`

- Body: `studentId, chapterId, scheduledAt` with UUIDs and ISO datetime.
- Required active profile for every caller, including super admins, matching the current route.
- Validate chapter exists and student assignment qualifies.
- Preserve draft's 422 messages for invalid assignment.
- Access:
  - super admin may create after invariant validation, using the required profile only as actor
    context;
  - instructor/TA needs batch `exam:create` in a qualifying batch;
  - student denied.
- Return 201.

### 11.5 Exam update

#### `PATCH /exams/:examId`

- Body non-empty subset:
  - `scheduledAt`;
  - status limited to `scheduled | inProgress | cancelled`.
- Missing exam: 404.
- Access: super admin or educator with `exam:update` for the resolved assignment.
- Keep allowed transitions:
  - `scheduled -> inProgress`;
  - `scheduled -> cancelled`;
  - `inProgress -> cancelled`;
  - no transitions out of completed/cancelled;
  - no same-state pseudo-transition.
- Keep optimistic `WHERE id = ? AND status = previouslyReadStatus`.
- If no row updates, distinguish missing row from concurrent status change; return 404 vs 409.
- For parity, a `scheduledAt`-only update remains allowed in any status; the transition guard
  applies when `status` is supplied. Treat terminal reschedule immutability as separate future
  behavior if the product wants it.
- Return 200.

### 11.6 Record result

#### `POST /exams/:examId/results`

- Body: proficiency `level`, optional notes.
- Missing exam: 404.
- Required evaluator profile.
- Access: super admin with a valid evaluator profile, or educator with `exam:update` for the
  qualifying shared batch.
- Only `scheduled` or `inProgress` exams are recordable.
- In one transaction:
  1. insert evaluation for exam student/chapter with evaluator;
  2. update exam to completed with evaluation ID and current `performedAt`;
  3. guard update with `evaluationId IS NULL` and, preferably, an expected recordable status;
  4. roll back inserted evaluation if the guarded update loses.
- Concurrent or repeated result: 409, with no orphan evaluation.
- Return updated exam with 200.

### 11.7 Exam tests

Retain the existing full transition table and add:

- list cursor ties;
- self visibility;
- instructor/TA qualifying batch visibility;
- wrong batch/track denial;
- cross-product regression;
- school admin with no profile list;
- create target role validation;
- missing chapter;
- invalid transition;
- concurrent transition;
- reschedule semantics;
- terminal result rejection;
- two simultaneous result attempts with exactly one evaluation committed;
- detail/list visibility equivalence.

---

## 12. Tracks and chapters

These are read-only parity modules. Authoring/upload/revision endpoints in old documentation are
not implemented by the current backend and are out of scope.

### 12.1 Content view

Add a policy operation:

1. require school `content:read`;
2. if caller also has school `content:update`, return `{ kind: 'authoring' }`;
3. otherwise return `{ kind: 'learnerPreview' }`.

Super admins get authoring view. Ordinary members get learner preview. No active profile is
required.

### 12.2 `GET /tracks`

- Query tracks ordered by `track.order` ascending.
- Relationally include chapters ordered by `chapter.order` ascending.
- Authoring view includes draft and published chapters.
- Learner view includes only published chapters.
- A track with no visible chapters still appears with `chapters: []`.
- Return 200 array.

### 12.3 `GET /tracks/:trackId`

- UUID param.
- Apply the same ordered chapter visibility.
- Missing track: 404.
- Return 200.

### 12.4 `GET /chapters/:chapterId`

- UUID param.
- Authoring view can load draft or published.
- Learner view must query `id AND status = published`; a draft must appear as 404, not 403, to
  avoid disclosing hidden content.
- Return the raw public chapter fields currently exposed:
  `id, trackId, code, title, status, order, script`.
- Return 200.

Tests: ordering, empty tracks, mixed visibility, direct draft lookup, ordinary member,
owner/admin, super admin, caller without content read, unknown IDs, school isolation.

---

## 13. Server, auth, observability, and shutdown

### 13.1 Middleware order

The versioned router order must be:

1. Helmet;
2. CORS with trusted origins, credentials, and
   `GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS`;
3. request context/request ID;
4. request completion logger;
5. special `POST /auth/phone-number/send-otp` body parsing and limiters;
6. BetterAuth wildcard handler before the general JSON parser;
7. general `express.json()`;
8. health routes before general API limiter;
9. general API rate limiter;
10. application routes;
11. versioned JSON 404;
12. top-level error middleware.

Preserve BetterAuth's access to the raw request stream. The send-OTP exception parses JSON first
because its limiter needs `phoneNumber`; BetterAuth's Node handler can reserialize `req.body`.

### 13.2 Rate limits

- Auth: 100 requests per 15 minutes.
- Send OTP: it must pass both the auth limiter and 3 requests per 10 minutes keyed by exact
  string `phoneNumber`; malformed/missing phone falls back to normalized IP key.
- Application API: 1000 requests per 15 minutes.
- Standard headers `draft-8`, no legacy headers.
- Health remains outside the application limiter.

Test limit boundaries with an injectable memory store/clock and ensure two IPs targeting the same
phone share the phone limit.

### 13.3 Request context/logging

- Accept a nonblank incoming `x-request-id`; otherwise generate UUID.
- Echo it on the response.
- Create a child logger containing request ID.
- Log completion on `finish` with event `request.completed`, method, original URL, status, and
  duration.
- Use info below 400, warn for 4xx, error for 5xx.
- Log exceptions as `request.error` with structured `err`.
- Do not log auth tokens, cookies, OTP codes, request bodies, phone numbers, or notes.

Use Pino in production and pretty transport outside production, matching the current deployment
shape.

### 13.4 Errors and database errors

Error middleware order:

1. if `AppError`, serialize it;
2. else try `translateDbError`;
3. else if malformed JSON/body parser error, translate to 400;
4. otherwise log and return generic 500 if headers are not sent.

Consider translating specific constraint names to domain messages, but the status/code must be
stable and unknown database details must not leak.

### 13.5 Graceful shutdown

- Handle `SIGINT`, `SIGTERM`, and the currently supported `SIGUSR1`/`SIGUSR2`.
- Start shutdown only once.
- Stop accepting HTTP connections.
- Allow at most 10 seconds.
- Clear timeout after server close.
- Close public and all scoped database pools exactly once.
- Exit 0 on clean shutdown, 1 on server-close/pool-close/timeout failures.
- Log signal, timeout/failure, and termination through the request-independent logger.

Extract enough coordination to unit test repeated signals, close error, pool error, and timeout
without calling the real `process.exit`.

---

## 14. Testing strategy

The current baseline is green:

- draft TypeScript compile: passes;
- current API typecheck: passes;
- API lint: passes;
- `pnpm --filter @narada/api test`: 20 tests pass.

However, those 20 tests are only the draft exam transition table and database-error translation.
They provide almost no route parity confidence.

### 14.1 Test layers

1. **Pure unit tests**
   - Zod schemas;
   - cursor encode/decode and comparator behavior;
   - school/batch permission evaluators;
   - exam transitions;
   - database error mapping.
2. **Service integration tests against PostgreSQL**
   - scoped schemas and cross-school isolation;
   - joins/read scopes;
   - pagination;
   - transaction rollback;
   - unique/FK/concurrency races.
3. **HTTP integration tests**
   - headers/session/profile resolution;
   - route status and envelope;
   - authorization matrix;
   - rate limits/CORS;
   - malformed inputs;
   - BetterAuth mounting boundaries.
4. **Web compatibility smoke tests**
   - run the existing `apps/web/lib/api/*` callers against the draft;
   - verify the dashboard, batch detail/roster, student history, evaluations, exams, and tracks
     deserialize without adapters.

### 14.2 Fixture matrix

Create at least:

- two schools with separate scoped schemas;
- super admin;
- owner, admin, ordinary member, nonmember;
- profiles for instructor, TA, two students, unrelated user;
- two tracks with published/draft chapters;
- batches sharing a track and batches on different tracks;
- nullable and tied start dates;
- full class schedules;
- enrollments covering every role;
- evaluations with tied/null timestamps;
- exams in every status.

Use deterministic IDs/timestamps where cursor assertions depend on them.

### 14.3 Required negative tests

For every school-scoped endpoint:

- no school header;
- unknown school;
- unauthenticated;
- authenticated nonmember where membership matters;
- missing profile when required;
- foreign-owned profile header;
- valid ID from another school;
- malformed UUID;
- malformed JSON;
- unknown fields only;
- database constraint race where relevant.

For every list:

- empty result;
- one item;
- exactly limit items;
- limit + 1;
- at least three pages;
- filter plus cursor;
- cursor tampering.

### 14.4 Verification commands

From repository root, at minimum:

```sh
pnpm --filter @narada/api-next typecheck
pnpm --filter @narada/api-next lint
pnpm --filter @narada/api-next test
pnpm --filter @narada/api typecheck
pnpm --filter @narada/api lint
pnpm --filter @narada/api test
```

Keep rewrite tests owned by `@narada/api-next`; do not rely on the current API's Vitest discovery
to find tests in another workspace package.

---

## 15. Implementation order

Work in this order. Do not add domain routes on top of known-wrong wrappers or ACLs.

### Phase 0 — Contract freeze and harness

- Record route matrix and response fixtures.
- Compare every recommended behavior in this plan against the §1.1 compatibility baseline.
- Create one design note per proposed deviation using §1.2; conduct the design discussion and
  record manual approval, rejection, or deferral before behavior-changing implementation.
- Mark approval dependencies on affected phases/slices so compatible work can proceed without
  implicitly choosing an unapproved design.
- Add server dependency injection/test app construction.
- Add response/error contract tests.
- Add school/profile/session fixtures.

**Gate:** tests can express current behavior without calling production services; every proposed
deviation has a decision ID and status; no behavior-changing code has started for an unapproved
decision.

### Phase 1 — Request context, wrappers, and AccessPolicy

- Merge request ID/logger/cache and session caching.
- Implement public/school/user/optional-profile/required-profile contexts.
- Implement typed school permission evaluation using the compatibility baseline unless DD-006 is
  approved; apply unknown-role behavior from the approved DD-010 outcome.
- Implement batch permission lookup/read scopes.
- Fix response envelopes and school error semantics.

**Approval dependencies:** DD-006, DD-007, DD-010 wherever the recommended policy differs from
the current compatibility baseline.

**Gate:** complete table-driven actor/permission tests; batch routes no longer require profiles
for school-wide admins; implemented deviations have explicit approval records.

### Phase 2 — Align existing profiles and batches

- Align profile inputs/ownership/envelopes.
- Fix batch schemas, ordering, compound cursors, scopes, and envelopes.
- Add batch roster/class slots detail.
- Add the schedule route. Preserve the current CORS list unless DD-008 is approved; if approved,
  add `PUT` according to its rollout and acceptance criteria.
- Add profile batch-history route.

**Approval dependency:** DD-008 for changing the CORS method list.

**Gate:** current web batch/dashboard clients work for admin, instructor, TA, and student.

### Phase 3 — Enrollment

- Add module and route mounting.
- Add composite lookup/create/delete/shared-history services.
- Add instructor vs TA ACL tests.

**Gate:** roster can be mutated only by the exact allowed actors, and races map correctly.

### Phase 4 — Evaluations

- Add schemas/service/routes.
- Add compound pagination.
- Add assignment invariants and access scopes.
- Add full student/educator/admin tests.

**Gate:** teacher and TA workflows can list and create evaluations; students can read only their
own.

### Phase 5 — Exams

- Add qualifying-assignment resolver.
- Add manageable list scope and full ACL.
- Retain and strengthen transition/result concurrency behavior.
- Test the detail extension.

**Approval dependencies:** DD-002, DD-003, DD-004, and DD-005. Without approval, implement the
compatibility baseline for the affected behavior and omit the new detail endpoint.

**Gate:** exam visibility and mutations match the manually approved DD-002–DD-005 outcomes. If
DD-005 is not approved, tests explicitly lock and document the compatibility-baseline visibility
behavior rather than silently changing it.

### Phase 6 — Content

- Add typed content view.
- Add tracks and chapters modules with ordering/visibility.

**Gate:** current web track and chapter reads work; draft chapters remain hidden from learners.

### Phase 7 — Public administration/bootstrap

- Add singular profile bootstrap.
- Add schools module.

**Gate:** login/session bootstrap and super-admin school management match current responses.

### Phase 8 — Runtime parity

- Add OTP limiter/mount order.
- Complete logging, rate-limit tests, and graceful shutdown; implement database/JSON/404 error
  behavior according to the approved DD-001/DD-009 outcomes or the compatibility baseline.
- Run full cross-school and web smoke suite.

**Approval dependencies:** DD-001 and DD-009 for behavior that differs from current error
handling.

**Gate:** runtime acceptance tests pass and no sensitive values appear in logs.

### Phase 9 — Promotion

- Freeze feature work and perform one controlled package cutover.
- Remove the superseded current `apps/api` implementation and promote `apps/api-next` to
  `apps/api`.
- Rename the package from `@narada/api-next` to `@narada/api` and update root scripts, workspace
  links, TypeScript, ESLint, Vitest, Docker, Compose, and production entrypoints.
- Do not leave production running the old `apps/api/src/index.ts` while assuming the rewrite is
  live.
- Run typecheck, lint, tests, Docker build, readiness probe, and web smoke tests.
- Remove superseded old helpers only after all callers are migrated.
- Retain the parity suite as regression coverage.

**Final gate:** the route matrix is fully checked off, approved design changes and migrations are
complete, and `apps/api-next` can replace `apps/api` without losing code or tests.

---

## 16. Per-slice completion checklist

Apply this checklist to every route/module before marking it complete:

Unless a line explicitly says otherwise, “correct” below means the compatibility baseline or the
exact manually approved replacement design—not an agent-selected improvement.

- [ ] Each §1.1 compatibility-baseline item was compared to the intended implementation.
- [ ] Every proposed deviation has a narrow decision ID and completed design note.
- [ ] Manual approval was recorded before any behavior-changing code was written.
- [ ] The implementation stays within the approved alternative, conditions, and scope.
- [ ] Rejected/deferred/unproposed deviations use the compatibility baseline.
- [ ] Route is mounted at the baseline method/path or the manually approved replacement and
      migration are complete.
- [ ] Public vs school database context is correct.
- [ ] Session requirement is correct.
- [ ] Profile is optional/required exactly where intended.
- [ ] Path, query, and body schemas match the transport contract.
- [ ] Unknown-only update bodies fail.
- [ ] School and batch permissions match shared ACLs.
- [ ] Query is tenant-scoped and read-scope constrained.
- [ ] Success status and `{ ok: true, data }` envelope match.
- [ ] 204 has no body.
- [ ] 400/401/403/404/409/422 behavior is tested.
- [ ] Unique/FK races use domain or global translation.
- [ ] List ordering is deterministic.
- [ ] Cursor contains every sort key and has multi-page tests.
- [ ] Multi-row writes are transactional.
- [ ] Concurrent writes have a defined result.
- [ ] No raw user/membership/profile/database fields leak.
- [ ] No route-local authorization query duplicates `AccessPolicy`.
- [ ] Service contains no Express request/response dependency.
- [ ] Unit and integration tests pass.
- [ ] Existing callers either need no adapter or use the manually approved migration/rollout
      path.

---

## 17. Explicitly out of scope for parity

Do not expand this rewrite to cover endpoints only described in old planning/docs:

- track/chapter authoring and ordering mutations;
- chapter script/audio staged uploads;
- revisions, segments, audio mappings;
- student-specific aggregate dashboard endpoints;
- batch matrix endpoints;
- invitations/member management beyond BetterAuth's mounted APIs;
- enrollment history/audit schema;
- adding `batchId` to evaluations;
- soft deletion;
- new search/filter/sort features;
- new API versioning or response format.

These may be valuable future work, but mixing them into parity makes it impossible to tell whether
the rewrite is safe to promote.

---

## 18. Final audit summary

The draft has a sounder direction than the current backend in several places, but it is not close
to drop-in parity yet:

- health is present;
- profiles, batches, and exams exist but all have contract or authorization gaps;
- enrollment, evaluations, tracks, chapters, schools, auth bootstrap, batch history, and class
  schedule routes are missing;
- runtime OTP limiting, observability, and response envelopes are behind;
- the only tests cover exam transitions and database-error mapping.

The critical path is therefore not “add the missing routers.” It is:

1. establish correct request/profile/policy foundations;
2. align existing modules and response contracts;
3. add enrollment and batch detail/schedule primitives;
4. build evaluations and complete exam ACLs on those primitives;
5. add content and public administration/bootstrap;
6. prove runtime and tenant parity through integration tests;
7. promote the rewrite into the actual production entrypoint.

Following that sequence preserves the draft's better patterns while preventing a superficially
complete router list from hiding authorization, pagination, concurrency, or deployment
regressions.
