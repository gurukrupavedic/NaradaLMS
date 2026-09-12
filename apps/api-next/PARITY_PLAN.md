# Plan — Capability parity for `apps/api-next`

**Audit date:** 2026-07-17 (routes/behavior audit)  
**Philosophy revised:** 2026-08-28 — see §1  
**Reference implementation:** `apps/api/src` at the current working tree — read for *what it lets
a school do*, not *how to shape the API*  
**Target:** `apps/api-next/src`  
**Audience:** an engineer or coding agent picking this up without prior context

Before changing the draft, read [`AGENTS.md`](./AGENTS.md) in full.

For correctness, security, data-lifecycle, and operational improvements that are intentionally
outside this plan's capability scope, also read [`HARDENING_PLAN.md`](./HARDENING_PLAN.md) — see
its own §1 for how the two plans relate.

**Read §1 below before anything else in this document.** It defines what "parity" means here
(capability, not contract) and supersedes language elsewhere in this file that still talks about
matching `apps/api/src`'s exact routes/response shapes/ordering/pagination — that framing predates
the 2026-08-28 revision. `apps/api/src` remains the reference for *behavior worth preserving*
(§1.1) and *architecture never worth copying* (§1.3); it is not a wire-format spec.

This document supersedes the 2026-07-12 parity plan. That plan identified the largest missing
domains, but it did not cover all current routes or contract differences. In particular, it
missed `GET /profiles/:profileId/batches`, the recurring-class schedule endpoint, the
phone-number OTP limiter, response-envelope differences, optional-profile administrator flows,
request logging, and a number of already-present draft behaviors that are not actually at parity.

---

## 0. Resync addendum — 2026-08-28

The reference implementation moved after the 2026-07-17 audit above was written (the rewrite
branch had drifted 18 commits behind `main`). This addendum reconciles it; the numbered sections
below remain as originally audited except where a note in this addendum says otherwise. Do not
re-derive "current behavior" from anything before this date without checking `apps/api/src`
directly — treat this addendum as authoritative over the numbered sections wherever they conflict.

**Corrected baseline, not just new surface area:** §7.2's recommended `GET
/profiles/:profileId/batches` policy — "all batches for super/owner/admin" regardless of which
profile was requested — was transcribing a bug in the reference implementation at audit time, not
its intended behavior. `apps/api/src/utils/auth.ts`'s `getProfileBatchListAccess` has since been
fixed (`9deacb11`): school-wide (`schoolWide`) access is now granted only when the caller is
looking up **their own** profile's batches. A lookup of a *different* profile is always scoped to
that target's own enrollments (via `{ kind: 'enrolled', profileId: targetProfileId }`), whether
the caller is a super admin, owner, admin, or a shared instructor/TA — school-wide permission only
buys the caller the right to skip the shared-history check, not license to see every batch in the
school. Implement the corrected rule, not the one written in §7.2 step 4. Test explicitly: an
admin without a profile viewing student X's batches gets X's batches, not the full school list.

**New/changed contract surface since the audit:**

1. **`GET /me/dashboard`** (new, missing from the original route matrix). `profileRoute`-gated
   (requires an active profile). Returns one aggregated payload —
   `{ firstName, memberships, tracks, studentEvaluations, upcomingExams, teaching,
   pastBatchesByStudent }` — assembled server-side in a fixed number of queries
   (`apps/api/src/services/dashboard.ts`) to replace what used to be a per-panel HTTP fan-out from
   the Next.js server. This replaced the batch-list N+1 that was exhausting the DB connection pool
   (see [[project_batch_n1_incident]]). Treat this as required parity surface, not an optional
   extension: `apps/web`'s dashboard now depends on it exclusively.

2. **`GET /profiles/search`** (new, missing from the original route matrix). School-scoped, gated
   by the same permission as creating an enrollment (`{ scope: 'school', permissions: {
   enrollment: ['create'] } }`) — there is no broader "read any profile" permission check here by
   design, since the only caller is the admin "enroll a student" flow. Query: optional `query`
   (name substring, case-insensitive) and optional `excludeBatchId` (filters out profiles already
   enrolled in that batch, applied in SQL so `LIMIT 25` stays meaningful). Returns up to 25
   profiles ordered by name.

3. **`GET /profiles/:profileId/batches`** gained an optional `withDetail=true` query flag
   (`profileBatchesQuerySchema` in `apps/api/src/routes/profiles.ts`). When set, each returned
   batch is eager-loaded with its full roster (`members: { profileId, name, phone, city, role,
   joinedAt }[]`) and `classSlots`, plus the target profile's own `role` in that batch — i.e. the
   same detail shape as `GET /batches/:batchId` (§9.2), but for every item in the list in one
   query (`findBatchesWithDetail` in `services/batch.ts`). Without the flag, behavior is unchanged
   from the original §7.2 spec (bare `Batch` rows). The draft should implement both response
   shapes behind the same flag rather than only the bare-row form.

4. **Exam list/detail responses are no longer bare `Exam` rows.** `apps/api/src/services/exam.ts`
   now returns `ExamWithDetail = Exam & { chapter: Pick<Chapter, 'id'|'code'|'title'|'trackId'>,
   evaluation: Pick<Evaluation, 'level'|'notes'> | null }` from every list/read path
   (`findVisibleExamsForProfile`, `findAllExams`), eager-loaded via the existing `chapter`/
   `evaluation` relations (not a new fan-out). Update §11.2's list contract and the route matrix's
   `GET /exams` row accordingly: the draft's response schema must include the nested `chapter` and
   `evaluation` projections, not just the bare exam row it currently returns.

5. **CORS origin matching now supports globs**, not just exact strings
   (`apps/api/src/server.ts`'s `isTrustedOrigin`) — a `TRUSTED_ORIGINS` entry containing `*` (e.g.
   `https://web-*-gurukrupa-vedic.vercel.app`, for Vercel preview deployments) is matched as a
   glob via a generated `RegExp`; entries without `*` still match exactly. §13.1's CORS middleware
   description should be read as "glob-capable trusted-origin matching," not a plain array/string
   comparison.

6. **Authentication is now phone-OTP only.** Email/password sign-in was removed from
   `@narada/auth` entirely (`8e6b67d7`); `/auth/*splat` still wildcard-mounts BetterAuth exactly as
   §13.1 describes, but the set of operations it exposes changed (no email/password endpoints).
   This doesn't change the draft's mounting mechanics, but any Phase 8 web-smoke test that assumes
   an email/password flow is testing a path that no longer exists. A new workspace package,
   `packages/otp` (Twilio Verify client), backs this — `apps/api-next`'s `server.ts` will need it
   as a dependency once Phase 8 (runtime/auth mounting parity) is implemented; it did not exist in
   the rewrite branch before this resync.

7. **Two new school-schema columns exist with no API surface yet**: `enrollment.status` (enum:
   `active | break | dropped | inactive`, default `active`) and `enrollment.leftDate`
   (`packages/db/src/schema/school.ts`, migration `school/0001_lowly_star_brand.sql`). As of this
   resync, `apps/api/src` does not read or write either column through any route — they exist in
   the schema but aren't part of the compatibility baseline yet. Don't build draft API surface for
   them; note them here so a future audit isn't surprised to find unused columns.

8. **Docker**: `apps/api/Dockerfile`'s deps stage now copies `packages/otp`'s manifest
   (`69780f2f`). `apps/api-next/Dockerfile` will need the equivalent addition before Phase 9
   promotion — flagging now so it isn't missed later.

---

## 1. What parity means here

Parity means the rewrite lets a school do everything the current backend lets it do — schedule an
exam, see a student's history in a batch, enroll someone, record an evaluation, browse the
curriculum — not that every URL, response envelope, field name, status code, or pagination detail
matches `apps/api/src` exactly. `apps/api/src` is the executable specification of *what the
product needs to support*. It is deliberately **not** a specification of the wire format, and
matching that wire format byte-for-byte is not a goal of this rewrite.

This corrects how this document originally framed things (§1.1–§1.4 below, as they read before
2026-08-28, are superseded by this section — kept in git history, not reproduced here). The
original process required every URL/method/header/response-shape/ordering/error-code detail to
match `apps/api/src` unless a human explicitly approved each individual deviation through an
8-section design note. That process caught real value once: several notes under
[`decisions/`](./decisions/) document genuine authorization bugs — DD-005's cross-product exam
visibility leak, the admin-bypass gaps `optionalProfileRoute` surfaced — found specifically
because the process demanded reading the old code closely before touching anything. But it also
spent real engineering time matching contract details (exact pagination tie-breaking order,
response envelope shape, filter-schema field lists) that no actual capability depended on.
`apps/web` is the only consumer of either backend today, it has not been migrated to
`apps/api-next` yet, and we control it — so a contract-shape decision here is not "breaking a
client" until the migration actually happens, at which point it's one caller-side change, not a
compatibility crisis. Treating every shape decision as a standing compatibility obligation was
solving a problem this project doesn't have yet.

### 1.1 What still needs real scrutiny

These categories are where "use good judgment and move on" is not enough — get them right
deliberately, because getting them wrong is a security problem, hard to reverse, or touches real
stored data:

1. **Authorization and visibility** — who can see or do what. This is where the actual bugs were.
   New capability work should default to the access rules `apps/api/src` encodes — they're the
   accumulated real product decisions about who gets to do what — verified by reading the actual
   current code, never assumed from a stale note or symmetry with a similar-looking domain (piece
   4's two exam bugs were both cases of assuming symmetry that didn't hold). The goal is the
   *correct* rule, though — not a byte-for-byte copy of however the old code happens to express it.
2. **Tenant isolation** — a request scoped to one school must never see another school's data.
   Non-negotiable regardless of contract shape.
3. **Data-affecting side effects and migrations** — anything that writes, deletes, or changes the
   shape of stored data needs a real rollout/rollback plan, not just "it works in a test."
4. **Concurrency/transaction correctness** — races that can corrupt data or leave inconsistent
   state (the exam result/cancellation race DD-002 fixed is the template).
5. **Irreversible or expensive-to-reverse decisions** — a shape a *real, migrated* client already
   depends on, or a schema choice that's costly to walk back later.

For all five: research the actual current behavior first, document the reasoning, and if there's
a genuine tradeoff, get a second opinion before shipping — a short conversation, not necessarily
the full decision-note process. `decisions/`'s template remains the right tool when a decision is
security-relevant, contested, or has real rollout stakes; it is not the tool for routine API
design.

### 1.2 What's a design choice, not a constraint

Everything else — URLs, HTTP methods, response envelope shape, field names, exact pagination or
ordering, which endpoint a piece of data lives under, status codes for edge cases, request/
response schema shape — is a normal engineering decision. Default to whatever is clearest and
most consistent with the patterns already established in `apps/api-next` (§1.3), informed by what
`apps/api/src` actually does as **useful prior art**, not a spec to satisfy. No approval process
is required to choose differently than the old backend here. A one-line comment or a note in the
relevant plan section is enough to record that the choice was deliberate, not an oversight.

The detailed per-domain sections later in this document (§7 onward) describe `apps/api/src`'s
actual behavior in a lot of contract-level detail. Read those as a **well-researched default**,
not a mandate: they're the fastest route to a correct, working implementation without re-deriving
business rules from scratch, and following them costs nothing extra when there's no reason to
deviate — but where a clearer contract is obvious, use it. Don't wait for permission.

### 1.3 Architecture, unconditionally

Independent of the parity-vs-contract question: `apps/api/src` defines *behavior* worth
preserving (§1.1), never *architecture* worth copying. New code always uses the patterns already
established in `apps/api-next`:

- typed domain folders — `route.ts`, `schema.ts`, `service.ts`, `repository.ts`, `index.ts`;
- a centralized `AccessPolicy` — never scattered `authorize`/`getBatchAccess`-style orchestration
  reinvented per route;
- explicit repository read scopes, so authorization determines the query scope instead of
  fetching every row and filtering in application code;
- typed schemas, explicit service/repository boundaries, and request-scoped caching.

Where the draft has no precedent, prefer the underlying library's idioms (Express 5, Drizzle,
Zod, BetterAuth) over porting an old-backend helper.

### 1.4 Historical decisions

The design notes under [`decisions/`](./decisions/), recorded under the stricter process this
section supersedes, remain valid records of real decisions and real bugs found — several document
genuine security fixes, not contract trivia. Don't relitigate an approved decision just because
the process that produced it has changed. Do feel free to make the equivalent call informally,
without a new decision note, for anything §1.2 covers going forward. The summary table below is
kept as a historical record of what was reviewed and why; new routine contract choices don't need
an entry here.

| Decision ID                     | Candidate improvement                                                                                                                          | Compatibility baseline if not approved                                                                | Status   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| [DD-001](./decisions/DD-001.md) | Use `translateDbError` as a final race-safe mapping for PostgreSQL unique and foreign-key failures.                                            | Preserve each current endpoint's observed database-error behavior.                                    | approved |
| [DD-002](./decisions/DD-002.md) | Keep the draft exam transition state machine, optimistic status guard, transactional single-result winner, and terminal-result checks.         | Preserve the current exam transition/update/result side effects.                                      | approved (Revanth Pothukuchi, 2026-08-28) |
| [DD-003](./decisions/DD-003.md) | Require an exam target to be enrolled with role exactly `student`.                                                                             | Preserve the current “enrolled under any role” assignment behavior.                                   | approved (2026-08-28), implementation gated on the §5 production data check |
| [DD-004](./decisions/DD-004.md) | Add and retain `GET /exams/:examId`.                                                                                                           | Do not expose a new detail endpoint.                                                                  | approved (2026-08-28) |
| [DD-005](./decisions/DD-005.md) | Fix exam-list cross-product authorization with a correlated educator/student/chapter relationship.                                             | Preserve the current visible-exam query, while documenting its risk.                                  | approved (2026-08-28) — live authorization bug, prioritize |
| [DD-006](./decisions/DD-006.md) | Evaluate school permissions from the school resolved by `X-School-Slug` and persisted membership instead of BetterAuth `activeOrganizationId`. | Preserve current BetterAuth permission resolution and active-organization dependency.                 | approved (2026-08-28) |
| [DD-007](./decisions/DD-007.md) | Let public routes ignore an unrelated invalid `X-School-Slug`.                                                                                 | Superseded — verified 2026-08-28 that `/schools`/`/profile` currently 404 on it; approved as a deliberate deviation from that verified baseline, not a no-op. | approved (2026-08-28) |
| [DD-008](./decisions/DD-008.md) | Add `PUT` to CORS methods for the schedule route.                                                                                              | Preserve the current CORS method list.                                                                | approved (2026-08-28) |
| [DD-009](./decisions/DD-009.md) | Return structured JSON 400 for malformed JSON and JSON 404 for unmatched API routes.                                                           | Verified 2026-08-28: current backend returns 500 (not 400) for malformed JSON and HTML (not JSON) 404s for unmatched routes. | approved (2026-08-28) |
| [DD-010](./decisions/DD-010.md) | Fail closed on unknown school roles rather than normalizing them to `member`.                                                                  | Verified 2026-08-28: current backend has no normalization step at all — it delegates to BetterAuth's `hasPermission`, which already fails closed on an unrecognized role. | approved (2026-08-28) |

These decisions predate the 2026-08-28 philosophy revision and were reviewed under the old
"any deviation needs approval" standard — that's why routine items like DD-007/DD-008/DD-009 have
a decision note at all. Going forward, only §1.1's five categories need this level of process;
treat the rigor already spent here as sunk value, not a template to keep reproducing for
contract-shape choices.

### 1.5 Definition of done

The rewrite is ready to promote when:

- every capability in the route matrix (§2) is deliverable through *some* implemented endpoint —
  not necessarily the one listed there, if a clearer shape was chosen (§1.2);
- §1.1's five categories — authorization/visibility, tenant isolation, data-affecting side
  effects, concurrency correctness, and irreversible decisions — have been deliberately gotten
  right, not defaulted into;
- cross-school isolation and the authorization matrix (§5) are covered by tests;
- list endpoints have real pagination tests where they paginate (multi-page, ties, nullable sort
  fields);
- both packages typecheck, the rewrite passes lint and its full unit/integration suite;
- `apps/web` has been migrated to call the rewrite's actual contract — not the other way around;
- the production entrypoint and Docker image run the promoted rewrite rather than the current
  backend.

---

## 2. Audited route matrix

Legend:

- **Present / parity work** — a draft route exists, but the capability isn't fully there yet
  (missing ACL, missing data, or a real gap — not merely "the contract differs from `apps/api/src`").
- **Missing** — no draft route delivers this capability yet.
- **Present / extension** — draft-only behavior that may remain.

This matrix was originally written to record contract-level parity gaps; per §1.2, matching
`apps/api/src`'s exact contract is no longer the goal, so read "Required work" as *what
capability is still missing*, not *what still differs from the old wire format*. Cell text
written under the old framing (exact schema/envelope/field-name wording) is left as useful detail
about what `apps/api/src` does, not as a requirement.

| Current endpoint                               | Draft state                   | Required work                                                                                                      |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /health`                                  | Present                       | Domain behavior matches; retain rate-limit bypass and verify server envelope exception.                            |
| `GET /health/ready`                            | Present                       | Domain behavior matches; verify it always checks the public database and bypasses school resolution/rate limiting. |
| `POST /auth/phone-number/send-otp`             | Present (2026-09-01)          | Parsed-body pre-mount (`express.json()` before `authRateLimit`/`sendOtpRateLimit`) plus the phone-keyed 3-per-10-minute limiter (`utils/serverSecurity.ts::createSendOtpRateLimit`, keyed by `body.phoneNumber` falling back to normalized IP) both added, mirroring `apps/api/src/server.ts`. `@narada/otp` added as a direct dependency (was only a transitive peer of `@narada/auth`) and copied into the Dockerfile deps stage — addendum §0.8's gap. Unit-tested (boundary at 3/4th request, independent per-phone keys, IP fallback) without a full server. |
| `ALL /auth/*splat`                             | Present                       | Raw-body ordering, BetterAuth base path, and general 100-per-15-minute limiter unchanged from before this pass.    |
| `GET /schools`                                 | Present (2026-09-01)          | Real gap closed. New `schools` domain, mounted on `authRoute` (session required, no school context — schools admin necessarily runs before a school is selected). `session.ts::requireSuperAdmin` added as a standalone check rather than an `AccessPolicy` method, since `AccessPolicy` always requires a resolved school and this domain has none. Response projects only `id/name/slug/createdAt` — never `logo`/`metadata`. Verified against real Postgres. |
| `PATCH /schools/:schoolId`                     | Present (2026-09-01)          | Same `requireSuperAdmin` gate. Friendly slug-conflict precheck (409) plus the DB's own unique index as an independent fallback for a concurrent claim (tested directly by racing the precheck via `repository.update`). `schoolId` is a plain non-empty string path param, not a UUID (BetterAuth-generated org IDs aren't UUIDs). Verified against real Postgres. |
| `GET /profile`                                 | Present (2026-08-29)          | New singular `profile` domain (distinct from the plural `profiles` per-school-identity domain) — super-admin flag and organization memberships, via a new `authRoute` wrapper (session required, no school). Verified against real Postgres. |
| `GET /me/dashboard`                            | Present (2026-08-29)          | New `dashboard` domain — assembles memberships, tracks, own evaluations/exams, teaching summary, and taught-students' past batches in a small fixed number of queries (avoids the N+1 that caused [[project_batch_n1_incident]]). Deliberately scopes "my batches" to `{kind:'enrolled', profileId}` always, never admin-wide visibility — a dashboard shows a profile's own activity. `ExamWithDetail` (chapter/evaluation projection) built for this, in `exams/schema.ts` — see addendum §0.4; also extended to the general `GET /exams` list and `GET /exams/:examId` on 2026-09-01. As of 2026-09-01 the response also carries `certifications` — a track's certification result, previously modeled in the imported spreadsheet as a fake "TRACK N CERTIFICATION" `chapter` row with an ordinary evaluation against it, now a dedicated `trackCertification` table (`packages/db/src/schema/school.ts`) decoupled from `chapter` entirely. `tools/src/parse-excel-to-json.ts`/`import-school.ts` no longer produce that fake chapter for a fresh import; the already-imported `slmts` school was backfilled in place via the new `tools/src/backfill-track-certifications.ts` (moves each fake chapter's evaluations into `trackCertification`, then deletes the chapter — not a re-import, since re-running the parser mints fresh random ids for every row and would have duplicated all 10k+ existing evaluations). Deliberately scoped to `apps/api-next`/shared schema only — `apps/api`'s own code and behavior are untouched, since it has no notion of this table. Verified against real Postgres, including a two-different-tracks bucketing test and dedicated `findCertificationsForStudent` tests. |
| `GET /profiles`                                | Present (2026-09-10)          | Verified against `apps/api/src/services/schoolProfile.ts` and the spec (§7.1): scoped to `userId === session.user.id`, no membership check beyond the route's own. The `{ ok: true, data }` vs `{ data }` envelope is a wire-format difference, not a capability — out of scope per §1.2's own framing. |
| `GET /profiles/search`                         | Present (2026-08-29)          | `requireCanSearchProfiles` (school-admin-only today — see its comment on the school-ACL shortcut). ilike name match, `excludeBatchId` filter via subquery, deactivated profiles always excluded. Verified against real Postgres. |
| `POST /profiles`                               | Present (2026-09-10)          | Verified against §7.1 and the old service: `name` required, `phone`/`city` optional, super-admin-or-membership check, inserts with the authenticated user's own ID (never from the body), FK/uniqueness translated centrally. Already matched; only the stale "envelope" note was outstanding. |
| `GET /profiles/:profileId/batches`             | Present (2026-09-01)          | `AccessPolicy.getProfileBatchListScope` implements the corrected rule (self admin → all; other-profile lookup → always scoped, even for a super admin; shared-instructor-history otherwise) — reuses `batches/service.ts::findAllAccessible` directly rather than a second pagination implementation. `withDetail=true` (2026-09-01) added once a real consumer surfaced while scoping the `apps/web` migration — `admin/page.tsx` calls it for the admin's own profile to get every school batch with roster/schedule in one query. New `batches/repository.ts::findAccessibleWithDetail` mirrors the reference `findBatchesWithDetail`; `BatchWithRole.role` is now nullable (was wrongly non-nullable — only true for the dashboard's always-enrolled case, not this endpoint's `all` scope). Verified against real Postgres, including multi-page and 'all'-vs-'enrolled' ordering-equivalence tests. |
| `PATCH /profiles/:profileId`                   | Present (2026-09-10)          | The two behavioral differences from the old API are deliberate, not gaps: (1) a foreign-owned profile 404s rather than 403s — `updateProfile`'s own doc comment: "a foreign-owned profile 404s the same as a missing one," consistent with this rewrite's established hidden-resource pattern (`chapters/service.ts::findById`'s identical reasoning); (2) the update itself already restricts to `name/phone/city` per `UpdateProfileSchema`. Envelope difference out of scope, as above. |
| `DELETE /profiles/:profileId`                  | Present (2026-09-10)          | Soft-delete (not the old hard-delete) is DD-011 (`HARDENING_PLAN.md` §14), approved by name (Revanth Pothukuchi, 2026-07-28/08-02) specifically because the old physical delete could cascade through a student's exam/evaluation history — a deliberate supersession of the old contract, not a gap. Ownership 404-not-403 as above. |
| `GET /tracks`                                  | Present (2026-08-29)          | New `tracks` domain — `AccessPolicy.getContentReadView` (every member reads published content; owner/admin/super additionally see drafts), ordered tracks with ordered/visibility-filtered chapters. Verified against real Postgres. |
| `GET /tracks/:trackId`                         | Present (2026-08-29)          | Same content view; 404 for a nonexistent track. Verified against real Postgres.                                    |
| `GET /chapters/:chapterId`                     | Present (2026-08-29)          | New `chapters` domain (schema shared with `tracks` — `chapters/schema.ts::Chapter`). A hidden draft 404s exactly like a nonexistent chapter, never 403 — a caller can't distinguish "hidden" from "doesn't exist." Verified against real Postgres. |
| `GET /batches`                                 | Present (2026-09-10)          | Optional-profile admin flow (2026-08-28) and the full `(startDate desc nulls last, id asc)` compound cursor (§3.4/§9.1) implemented and verified against real Postgres (`batches.integration.test.ts`). `FindBatchesSchema` (status + compound cursor + limit) verified identical in shape to the old `listBatchesQuerySchema` — the "missing filter schema" note was stale. |
| `GET /batches/:batchId`                        | Present                       | Optional-profile admin flow (2026-08-28) and roster (2026-08-29, `findByIdWithMembers`) both delivered. As of 2026-09-01, `findByIdWithMembers` also eager-loads `classSlots` now that `PUT /batches/:batchId/schedule` gives that data a writer — "who's in this batch and when does it meet" is a real capability, not cosmetic response shape (§1.2). |
| `POST /batches`                                | Present (2026-09-10)          | Active profile no longer required (2026-08-28, `optionalProfileRoute`). Verified `CreateBatchSchema` and `createBatch`'s FK/uniqueness translation already match §9.3 exactly; only the stale "envelope" note was outstanding. |
| `PATCH /batches/:batchId`                      | Present (2026-09-10)          | Real gap closed. Active profile no longer required (2026-08-28). `trackId` removed from `UpdateBatchSchema` (§9.4 — a batch's track is set once at creation; the old API never allowed moving it) — Zod strips unknown keys by default, so the fix is the schema no longer listing the field; `batches/schema.test.ts` documents the strip, `batches.integration.test.ts` confirms a `trackId` in the body never reaches the DB. |
| `PUT /batches/:batchId/schedule`               | Present (2026-09-01)          | Real gap closed. `batches/repository.ts::deleteClassSlots`/`insertClassSlots` (service opens the transaction, per the established pattern in `exams/service.ts` — repositories never open their own), reusing `access.requireCanUpdateBatch` (same school `batch:update` check as `PATCH /batches/:batchId`, no new ACL surface). `PUT` added to `CORS_METHODS`. Schema enforces max 7 slots / one-per-day; the DB's own `batchClassSlot_batchId_dayOfWeek_uidx` backs the same invariant independently (tested directly by bypassing the schema). Verified against real Postgres, including atomic-replace, empty-list-clears, per-batch isolation, and transaction-rollback-on-constraint-violation tests. |
| `POST /batches/:batchId/members`               | Present (2026-08-29)          | New `enrollment` domain HTTP surface — `requireCanCreateEnrollment` (instructor or school admin only, verified against `packages/auth/src/permissions/batch.ts`), 404 on unknown target profile, 409 on duplicate enrollment. Verified against real Postgres. |
| `DELETE /batches/:batchId/members/:profileId`  | Present (2026-08-29)          | `requireCanRemoveEnrollment`, 204/404 behavior. Verified against real Postgres.                                    |
| `GET /batches/:batchId/evaluations`            | Present (2026-08-28)          | `evaluations` domain added — admin/instructor/TA batch-wide list with the full null-aware compound cursor (§10.2), ported directly from `apps/api/src`'s reference pagination logic, and mounted on `optionalProfileRoute` (§10.3: "resolve optional actor profile"). Verified against real Postgres (`evaluations.integration.test.ts`). |
| `GET /batches/:batchId/evaluations/:studentId` | Present (2026-08-28)          | Own-student read vs educator/admin read policy implemented via `AccessPolicy.requireCanReadStudentEvaluations`. Same pagination-verification caveat as the row above. |
| `POST /batches/:batchId/evaluations`           | Present (2026-08-28)          | Evaluator policy (`requireCanCreateEvaluation`, no school-admin fallback per §10.5), student-role invariant (`enrollment/service.ts::assertStudentEnrolledInBatch`) and chapter-track invariant implemented; append-only insert.                               |
| `GET /exams`                                   | Present (2026-09-01)          | Real gap closed. Educator (`manageable`) visibility, correlated (per-batch, not cross-product) semantics, and the optional-profile administrator flow implemented (2026-08-28, DD-005, `optionalProfileRoute`). `repository.findMany` now eager-loads `chapter`/`evaluation` for every scope (`all`/`own`/`manageable`) — addendum §0.4's `ExamWithDetail` projection, previously built only for the dashboard's `findUpcomingForStudent`. Verified against real Postgres, including a test confirming the evaluation projection actually reflects a recorded result, not just a null placeholder. |
| `POST /exams`                                  | Present (2026-09-10)          | Instructor/TA ACL implemented (2026-08-28, DD-003/DD-006) via `access.requireCanCreateExam(batchId)`, checked after `resolveQualifyingBatch` resolves the same batch the exam is stored against. Draft assignment validation (ambiguous/no qualifying batch) retained. Verified: mounted on `profileRoute`, so an active profile is required for every caller including super admins, exactly per §11.4. |
| `PATCH /exams/:examId`                         | Present (2026-09-10)          | Instructor/TA ACL implemented (2026-08-28) via `access.requireCanUpdateExam(exam)` against the exam's stored `batchId`; transition/concurrency hardening (H3/DD-002) retained. Verified `UpdateExamSchema` already excludes `completed` from the allowed `status` values and the optimistic `updateGuarded` distinguishes 404 (deleted) from 409 (concurrent status change), exactly per §11.5. |
| `POST /exams/:examId/results`                  | Present (2026-09-10)          | Instructor/TA ACL implemented (2026-08-28) — `requireCanRecordEvaluation` delegates to `requireCanUpdateExam` per §11.6; single-result transaction hardening retained. Verified `recordExamResult`'s transaction (evaluation insert + guarded completion, rolled back on a lost race) already matches §11.6's spec exactly.       |
| `GET /exams/:examId`                           | Present / extension           | List-equivalent visibility implemented (2026-08-28) — `requireCanReadExam` mirrors `getExamVisibility`'s scope exactly. As of 2026-09-01, also returns the `ExamWithDetail` projection via a new `repository.findByIdWithDetail` (kept separate from the internal, bare-row `findById` that authorization/transition logic uses — those never needed chapter/evaluation detail). List/detail equivalence (§11.3/DD-004) verified against real Postgres. |

There are 29 current non-auth application endpoints (27 at the original audit, plus `GET
/me/dashboard` and `GET /profiles/search` added since — see addendum §0), plus BetterAuth's
mounted handler surface. Only health is behaviorally close to complete. “Batches, exams, profiles
are present” must not be treated as meaning those domains are at parity.

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

**Implemented 2026-08-28.** `optionalProfileRoute` now exists (`naradaRoute.ts`) and batch
list/detail/create/update, exam list/detail, and the batch-wide evaluations list are mounted on
it instead of `profileRoute`. Building this surfaced two real correctness gaps beyond the missing
wrapper itself, both fixed along with it: `AccessPolicy.getExamVisibility`/`requireCanReadExam`
were treating any school admin as seeing "all" exams unconditionally, when the reference
implementation (`apps/api/src/routes/exams.ts`) only gives unconditional "all" to a *super*
admin — a school owner/admin who supplies a profile gets scoped visibility just like anyone else;
and `requireCanCreateExam`/`requireCanUpdateExam`/`requireCanRecordEvaluation` had a school-admin
bypass that the reference implementation's `canManageExam` never had at all (only `isSuperAdmin`
bypasses there — a plain owner/admin with no batch role is denied). Batches and evaluations
didn't have this nuance (verified against `apps/api/src/utils/auth.ts`'s `getBatchListAccess`/
`getBatchAccess`, which grant admin bypass unconditionally, profile or not).

The draft previously routed every batch and exam operation through `profileRoute`, which
incorrectly made `X-Profile-Id` mandatory for school-wide administrators on:

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
- `schools` (present, 2026-09-01)
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
- Existing target owned by another user: 404, not 403 — DD-011-era hardening; see the status
  matrix row's note. This paragraph originally said 403 (the old API's behavior); superseded.
- Update and return 200 with the row.
- Do not broaden this into an admin edit endpoint.

#### `DELETE /profiles/:profileId`

- Apply the same existence and ownership rules (404 for both missing and foreign-owned).
- Soft-delete (`deletedAt`), not a physical delete — DD-011 (`HARDENING_PLAN.md` §14), approved
  2026-07-28/08-02, specifically to stop a delete from cascading through a student's exam/
  evaluation history. This paragraph originally said "do not add soft deletion during parity
  work"; DD-011 supersedes that.
- Return an empty 204.

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

**Status (2026-09-01):** the runtime-hygiene gap this section describes is now closed —
`server.ts`/`requestContext.ts`/`logger.ts`/`utils/serverSecurity.ts` implement 13.1–13.5 below.
Specifically: glob-capable CORS origin matching (`utils/serverSecurity.ts::isTrustedOrigin`,
ported from `apps/api/src/server.ts::isTrustedOrigin`, parameterized on the trusted-origin list
rather than reading `@narada/env` directly so it stays unit-testable — see
`utils/serverSecurity.test.ts`); a `WeakMap<Request, Logger>`-keyed request context
(`requestContext.ts`), the same per-request-caching idiom `naradaRoute.ts`'s `schoolCache`/
`session.ts`'s `sessionCache` already use, rather than porting `AsyncLocalStorage` as a second
pattern — nothing in this draft needs ambient access outside of what already has `req` in scope;
`x-request-id` echo, per-request child logger, and severity-by-status completion logging;
the phone-keyed send-OTP limiter with its parsed-body pre-mount; `ok:false` error envelopes
including a versioned JSON 404 and a translated 400 for malformed JSON bodies (DD-009); and
SIGINT/SIGTERM/SIGUSR1/SIGUSR2 graceful shutdown with a "start shutdown only once" guard that the
prior draft was missing entirely (only the exit path was guarded — two near-simultaneous signals
would have raced `server.close()` and left two competing shutdown timers). `@narada/otp` was also
added as a direct dependency and copied into the Dockerfile deps stage (addendum §0.8). Verified
by `utils/serverSecurity.test.ts` (rate-limit boundary/CORS glob unit tests) and
`server.integration.test.ts` (real Postgres, full middleware chain via supertest) — both passing,
alongside the full unit (220) and integration (85) suites.

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

### Phase 0 — Harness (superseded framing — see §1)

This phase's original bullets ("create one design note per proposed deviation," "compare every
recommended behavior against the compatibility baseline") described the pre-2026-08-28 process.
Under §1's revision, that step is unnecessary for routine contract choices (§1.2) — do it only for
the five scrutiny categories in §1.1. What's still worth doing upfront:

- Record the route matrix (§2) as a capability checklist.
- Add server dependency injection/test app construction.
- Add response/error contract tests for whatever contract is actually chosen.
- Add school/profile/session fixtures.

**Gate:** tests can express the chosen behavior without calling production services; any §1.1
scrutiny-category decision made along the way is documented, not silently assumed.

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

Apply this checklist to every route/module before marking it complete. Per §1, "correct" below
means *delivers the capability well*, using whatever contract is clearest — not "matches
`apps/api/src`'s exact wire format." The §1.1-scrutiny items are marked; everything else is a
normal engineering-quality bar, not a compatibility check.

- [ ] Authorization/visibility rule was verified against the real current code, not assumed —
      including for actors the happy path doesn't cover (§1.1 #1).
- [ ] Query is tenant-scoped — a request for one school cannot see another's data (§1.1 #2).
- [ ] Any data-affecting side effect or migration has a real rollout/rollback plan, not just a
      passing test (§1.1 #3).
- [ ] Concurrent writes have a defined, tested winner (§1.1 #4).
- [ ] Public vs school database context is correct.
- [ ] Session requirement is correct.
- [ ] Profile is optional/required exactly where the capability actually needs it, not merely
      where `apps/api/src` happens to require it.
- [ ] Path, query, and body schemas are internally consistent and documented — not required to
      match `apps/api/src`'s field names/shape unless a real reason exists to.
- [ ] Unknown-only update bodies fail.
- [ ] School and batch permissions match shared ACLs (`AccessPolicy`).
- [ ] Success/error response shape is consistent with the rest of `apps/api-next`, whatever shape
      that ends up being — not required to be `{ ok: true, data }` specifically.
- [ ] 204 has no body.
- [ ] 400/401/403/404/409/422 distinctions are meaningful and tested.
- [ ] Unique/FK races use domain or global translation.
- [ ] List ordering is deterministic where the capability needs it to be.
- [ ] Cursor (if any) contains every sort key and has multi-page tests.
- [ ] Multi-row writes are transactional.
- [ ] No raw user/membership/profile/database fields leak.
- [ ] No route-local authorization query duplicates `AccessPolicy`.
- [ ] Service contains no Express request/response dependency.
- [ ] Unit and integration tests pass.
- [ ] If `apps/web` already calls the equivalent old-backend endpoint, note what caller-side
      change its eventual migration will need — don't block on it now.

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
