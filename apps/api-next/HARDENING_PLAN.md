# Plan — Backend hardening beyond parity

**Plan date:** 2026-07-18  
**Target:** `apps/api-next`, plus the shared `@narada/db` contracts it consumes  
**Status:** proposed; execution is subject to the gates in this document  
**Audience:** an engineer or coding agent starting with no context beyond this repository

Before changing the draft, read [`AGENTS.md`](./AGENTS.md),
[`PARITY_PLAN.md`](./PARITY_PLAN.md), and the applicable notes under
[`decisions/`](./decisions/).

---

## 1. Purpose and relationship to parity

[`PARITY_PLAN.md`](./PARITY_PLAN.md) answers: **what must the rewrite preserve so it can
replace the current backend?**

This document answers: **which existing patterns or data models should be hardened even when
that work is not necessary for parity?**

The plans deliberately remain separate:

- Parity work must not silently acquire behavior changes from this plan.
- This plan must not become a second route-parity backlog.
- A hardening item that changes an HTTP contract, authorization result, stored side effect,
  deletion behavior, error status, or concurrency result is blocked until its decision note is
  manually approved under `PARITY_PLAN.md` §1.2.
- Test infrastructure, characterization tests, compile-time boundary tests, and internal
  refactors may proceed before approval only when they preserve observable behavior.
- Approval of this plan as a planning artifact does **not** approve the individual design
  decisions listed below.

### 1.1 In scope

1. Exam transition/result concurrency.
2. Profile deletion and educational-record retention.
3. The missing school-membership uniqueness invariant.
4. HTTP datetime and meeting-URL validation.
5. Constraint-aware database-error translation.
6. Deterministic request-context resolution.
7. Public-schema versus school-schema type boundaries.
8. Tenant connection-pool budgeting and lifecycle.
9. Stable batch context for exams and evaluations.
10. A consistent service/repository boundary for authorization and transactions.

### 1.2 Explicit non-goals

- Adding any route missing from the parity matrix.
- Changing response envelopes merely as part of hardening.
- Implementing the optional-profile parity work.
- Completing instructor/TA exam authorization.
- Reworking batch ordering or cursor semantics.
- Adding class schedules, roster endpoints, content routes, OTP behavior, or request logging.
- Treating a successful typecheck or the existing 20 unit tests as evidence that the
  integration and concurrency behavior is correct.

---

## 2. Governing implementation rules

### 2.1 Thin service layer

Use this module responsibility split for existing and future draft domains:

```text
route.ts       parse HTTP inputs and serialize HTTP outputs
service.ts     authorize, choose transaction boundaries, orchestrate domain operations
repository.ts  execute scoped database reads and writes
schema.ts      define HTTP input/output schemas; do not model persistence indirectly
```

This is not a request for a framework, service locator, repository class hierarchy, CQRS bus,
or dependency-injection container. Prefer named functions and small dependency objects.

Rules:

- A route must not call an exported, unguarded mutation directly.
- A service owns authorization and the complete transaction for a command.
- A read policy returns a scope; the repository applies that scope in SQL.
- A repository accepts the narrow `PublicDb` or `SchoolDb` capability; it must not import a
  global database that is outside its declared dependency boundary.
- Domain errors are translated closest to the operation when the constraint meaning is known.
- The global error handler is a final safety net, not the primary source of domain semantics.

### 2.2 Data invariants belong at the strongest practical layer

Use, in descending order:

1. Database constraints for invariants expressible by one table or stable foreign keys.
2. A single atomic SQL statement for invariants expressible by a guarded mutation.
3. A transaction with compare-and-set or row locking for multi-step invariants.
4. Application prechecks for friendly errors, never as the only race-safety mechanism.

### 2.3 Every concurrent command has a defined winner

For each mutation, document:

- the value used as the optimistic concurrency token;
- which operation wins each meaningful race;
- the response returned to the loser;
- which rows must be absent after a rollback;
- whether a retry is safe and whether an idempotency key is needed.

### 2.4 Database capability vocabulary and call pattern

Do not carry `SchoolDbExecutor` forward. The name describes an implementation union rather than
the capability a function needs, and it forces callers to know that the value might be a pooled
database or a Drizzle transaction.

Use this vocabulary:

| Name             | Meaning                                                                                              | May open a transaction? | Intended consumers                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------: | ------------------------------------------- |
| `SchoolDbClient` | Root, tenant-scoped Drizzle client returned by the school database provider                          |                     Yes | Request context and services                |
| `SchoolDb`       | Narrow school-schema query/mutation capability implemented by both the root client and a transaction |                      No | Repository functions                        |
| `PublicDbClient` | Root public-schema Drizzle client                                                                    |                     Yes | Application composition and public services |
| `PublicDb`       | Narrow public-schema query/mutation capability                                                       |                      No | Public repository functions                 |

`SchoolDb` and `PublicDb` should be explicit structural capabilities, such as a `Pick` of the
common Drizzle methods actually used (`query`, `select`, `insert`, `update`, `delete`, and
`execute`). They should not be unions of concrete client and transaction implementation types.
Add another method only when a real repository needs it.

The concrete Drizzle transaction types should remain inferred inside `.transaction(...)`
callbacks or private to `@narada/db`; application modules should not import them. A transaction
must structurally satisfy `SchoolDb`/`PublicDb`, which is proven with compile-time tests.

Alternatives considered:

- **Rename the union only:** `SchoolDatabase | SchoolTransaction` renamed to `SchoolDb` removes
  the disliked word but preserves the leaky abstraction. Rejected.
- **Pass `SchoolDbClient` everywhere:** simpler initially, but lets repository functions open
  nested transactions or access pool-specific details. Rejected in favor of a narrow capability.
- **Repository classes/interfaces:** useful when swapping storage implementations, but this
  project has one Drizzle implementation and benefits from named free functions. Rejected as
  unnecessary ceremony.
- **A full unit-of-work object containing every repository:** can make transaction composition
  elegant, but creates a large indirection surface and encourages unrelated domain coupling.
  Defer unless real cross-domain workflows make free-function transaction passing unwieldy.
- **Chosen:** narrow structural database capabilities, free-function domain repositories, and
  service-owned transactions.

Calling conventions:

- Repository free functions put the database capability first:
  `findExam(db, examId)`, `insertExam(db, data)`, `completeExam(db, command)`.
- Services accept one context/dependency object first and parsed input second:
  `recordExamResult(context, input)`.
- The service opens the transaction and passes the inferred transaction to every repository
  participating in that command.
- Repositories never open transactions, call authorization policy, read HTTP headers, or import
  the root `publicDb` singleton.
- Services never issue ad hoc Drizzle queries; any data access needed for authorization or an
  invariant is a named repository operation.
- Do not create one repository interface/class per table. A domain `repository.ts` containing
  named free functions is the default. Split it only when the domain becomes genuinely large.

Target shape:

```ts
// @narada/db — illustrative; choose the exact Drizzle method set from real usage.
export type SchoolDb = Pick<
  SchoolDbClient,
  'query' | 'select' | 'insert' | 'update' | 'delete' | 'execute'
>

// exams/repository.ts
export function findExam(db: SchoolDb, examId: string): Promise<Exam | undefined> {
  // Drizzle query
}

// exams/service.ts
export async function recordExamResult(context: ExamCommandContext, input: RecordResultInput) {
  return context.db.transaction(async tx => {
    const exam = await findExam(tx, input.examId)
    // authorize and apply the guarded command through repository functions
  })
}
```

The transition path is:

1. Introduce `SchoolDb`, `SchoolDbClient`, `PublicDb`, and `PublicDbClient` alongside the old
   exports.
2. Keep `SchoolDbExecutor` only as a temporary deprecated alias so the current backend keeps
   compiling while the draft migrates.
3. Convert draft repository functions and call sites domain by domain.
4. Convert remaining current-backend/tooling call sites in separate mechanical changes.
5. Remove the alias only after `rg SchoolDbExecutor` returns no call sites.
6. Split the public and school Drizzle schemas in H8; the capability names and calling pattern
   remain stable across that change.

---

## 3. Decision and data-audit gates

Do not implement a gated behavior until its note has a completed manual approval record.

| ID to create/update             | Decision                               | Recommended alternative                                              | Gate                                |
| ------------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| [DD-001](./decisions/DD-001.md) | Database-error translation             | Domain/constraint-aware mapping with a safe global fallback          | Approved 2026-07-19                 |
| [DD-002](./decisions/DD-002.md) | Exam transition/result concurrency     | Exact-status compare-and-set plus transactional rollback             | Agent-approved 2026-07-19, pending human review |
| `DD-011`                        | Profile lifecycle and record retention | Soft-delete profile, revoke active participation, retain assessments | Product/privacy approval            |
| `DD-012`                        | Persist assessment batch context       | Store `batchId` on exams/evaluations and authorize against it        | Product/API/data-migration approval |
| `DD-013`                        | HTTP datetime and meeting-URL policy   | Offset-bearing ISO instants and HTTPS-only meeting URLs              | Client compatibility approval       |
| `DD-014`                        | Request failure precedence             | Header presence → authentication → school lookup → profile/policy    | API compatibility/security approval |
| `DD-015`                        | Tenant connection budget               | Explicit per-instance pool budget, timeouts, metrics, bounded cache  | Operations/deployment approval      |

### 3.1 Required audits before approval

#### Membership duplicates

Run against the public schema:

```sql
select
  "organizationId",
  "userId",
  count(*) as member_count,
  array_agg(role order by role) as roles,
  array_agg(id order by "createdAt", id) as member_ids
from member
group by "organizationId", "userId"
having count(*) > 1;
```

Resolution rules:

- Zero rows: proceed to the uniqueness migration.
- Duplicate rows with the same role: confirm no external reference to the discarded member ID,
  retain one deterministic row, and record the remediation.
- Duplicate rows with different roles: block migration for manual resolution. Never choose the
  highest or lowest privilege automatically.

#### Stored meeting URLs

For every school schema, report:

- null values;
- HTTPS values;
- HTTP values;
- all other schemes;
- values that the proposed validator rejects.

Do not tighten validation until every stored nonconforming value has an explicit remediation.

#### Assessment-to-batch candidates

For every exam and evaluation, calculate the batches that simultaneously match:

- the assessment's student;
- a student-role enrollment; and
- the chapter's track.

Report counts for zero, exactly one, and multiple candidates. `DD-012` cannot be approved
without a policy for the zero- and multi-candidate groups.

#### Connection budget

Record:

- PostgreSQL `max_connections` and reserved connections;
- maximum application instance count;
- expected concurrently active schools per instance;
- observed active/idle/waiting connections at peak;
- whether a connection proxy is present and its pooling mode.

The configured worst case must satisfy:

```text
public pool maximum
+ application instances × cached school pools × school-pool maximum
≤ 70% of usable PostgreSQL connections
```

---

## 4. Execution order and pull-request boundaries

Each row is intended to be independently reviewable and reversible. Do not combine schema
migrations with an unrelated architectural refactor.

| PR  | Work                                                    | Approval required before code?             | Exit criterion                                                             |
| --- | ------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| H1  | Postgres integration harness and characterization tests | No                                         | Current behavior and races are reproducible                                |
| H2  | Database capabilities plus service/repository boundary  | No, if behavior-preserving                 | No draft call site uses `SchoolDbExecutor` or unguarded mutations          |
| H3  | Exam result/cancellation race fix                       | Yes: DD-002                                | Both race orders have one defined winner and no orphan evaluation          |
| H4  | Membership duplicate audit and unique constraint        | Only if duplicate remediation changes data | Database guarantees one membership per school/user                         |
| H5  | Deterministic request-context resolution                | Yes: DD-014                                | Combined failure cases return stable errors                                |
| H6  | Strict datetime and meeting-URL schemas                 | Yes: DD-013                                | Invalid/coercible values are rejected; clients are migrated                |
| H7  | Constraint-aware database-error translation             | Yes: DD-001                                | Insert/delete constraint failures have truthful errors                     |
| H8  | Split public/school Drizzle schemas at the type level   | No, if behavior-preserving                 | Cross-boundary queries fail to typecheck                                   |
| H9  | Pool budget, timeouts, eviction lifecycle, metrics      | Yes: DD-015                                | Worst-case connections fit the approved budget                             |
| H10 | Soft-delete profile lifecycle                           | Yes: DD-011                                | Profile deactivation cannot erase assessments                              |
| H11 | Persist and backfill assessment `batchId`               | Yes: DD-012                                | Authorization no longer derives historical context from current enrollment |

H1 should land first. H3–H9 may proceed independently after their gates, but avoid editing the
same draft modules concurrently with parity slices. H10 must precede any foreign-key hardening
that would otherwise make the current delete endpoint fail. H11 should follow H10 because the
two decisions jointly define the lifetime of profiles, enrollment, and educational records.

---

## 5. H1 — Postgres integration and concurrency harness

### 5.1 Harness requirements

- Use a dedicated test database; refuse to run against a URL not explicitly marked for tests.
- Create unique public/test-school schema names per test worker or run schema-mutating suites
  serially.
- Apply the real public and school migrations.
- Provide fixtures for users, organizations, memberships, profiles, tracks, chapters, batches,
  enrollments, exams, and evaluations.
- Provide cleanup that drops only the exact validated test schemas it created.
- Provide two independent database connections and an explicit barrier helper for deterministic
  concurrency tests. Do not use timing sleeps to create races.
- Make the harness usable by route integration tests and lower-level service/repository tests.

### 5.2 Characterization matrix

Add tests for:

1. Result recording racing with exam cancellation in both commit orders.
2. Two simultaneous result submissions.
3. Profile deletion when the profile is only a student.
4. Profile deletion when the profile is referenced as an evaluator.
5. Insertion of duplicate memberships with equal and conflicting roles.
6. `null`, numeric, invalid-calendar, offset-free, and valid-offset datetimes.
7. `javascript:`, `mailto:`, `ftp:`, HTTP, and HTTPS meeting URLs.
8. Foreign-key failure caused by inserting a missing reference.
9. Foreign-key failure caused by deleting a referenced parent.
10. Missing/unknown school combined with a missing/expired session.
11. Queries that must remain inside one school schema.

Characterization tests may document undesirable current behavior, but must not make the main
suite permanently red. Use an explicit expected-current-behavior assertion or keep the failing
acceptance test in the fixing PR.

### 5.3 H1 completion gate

- The harness runs locally with one documented command.
- CI can provide the same Postgres dependency.
- Concurrent tests pass repeatedly without sleeps.
- Test cleanup cannot target the public schema, a production-looking database, or an unresolved
  environment variable.

---

## 6. H2 — Database capabilities and application boundary

H2 establishes the naming and call pattern in §2.4 before more draft domains multiply the
current `SchoolDbExecutor` convention.

### 6.1 Add transaction-compatible capabilities

In `@narada/db`:

1. Rename the pool-backed root types to `SchoolDbClient` and `PublicDbClient`.
2. Define narrow structural `SchoolDb` and `PublicDb` capabilities from the methods used by
   repositories.
3. Keep pool access and concrete transaction types private to the database package.
4. Rename `getScopedDatabase(organizationId)` to
   `getSchoolDb(organizationId): SchoolDbClient`, retaining a temporary deprecated alias while
   current-backend call sites migrate.
5. Add temporary deprecated aliases for existing live-backend imports.
6. Add type-only tests proving:
   - a root school client satisfies `SchoolDb`;
   - a school transaction satisfies `SchoolDb`;
   - `SchoolDb` cannot open a transaction or access the pool client;
   - public and school capabilities are not assignable to each other after H8.

Do not expose a public `SchoolTransaction` type merely to replace `SchoolDbExecutor` with a
differently named union.

### 6.2 Separate orchestration from persistence

Apply the pattern only to currently implemented commands:

- profile create/update/delete;
- batch create/update;
- exam create/update/result recording.

For each command:

1. Move authorization and orchestration into `service.ts`.
2. Pass an explicit actor/request context and dependency object.
3. Move raw SQL/Drizzle operations into free functions in `repository.ts`.
4. Put the `SchoolDb`/`PublicDb` argument first on every repository function.
5. Ensure the inferred transaction is passed through every repository call participating in the
   command.
6. Keep route parsing and response behavior unchanged.
7. Do not introduce generic base classes, repository classes, or a universal command bus.

Suggested shape:

```ts
type ExamCommandContext = {
  db: SchoolDbClient
  access: AccessPolicy
  clock: () => Date
}

async function recordExamResult(
  context: ExamCommandContext,
  input: RecordExamResultInput,
): Promise<ExamResult>
```

The final domain-specific function names may differ, but the database vocabulary, database-first
repository convention, and context-first service convention should remain consistent.

### 6.3 H2 acceptance criteria

- `SchoolDbExecutor` has no draft call sites.
- Repository functions accept `SchoolDb` or `PublicDb`, never a pool, transaction union, Express
  object, or global singleton.
- Repository functions consistently place the database first.
- Services consistently accept one context object first.
- Only services/application composition receive `SchoolDbClient`/`PublicDbClient` and may open
  transactions.
- Transactional commands pass the inferred transaction to every repository call.
- No route directly imports a repository mutation.
- Existing HTTP responses, authorization outcomes, and SQL side effects remain unchanged.

---

## 7. H3 — Exam result/cancellation race

The current result operation checks recordability before its transaction, then updates using
only `exam.id` and `evaluationId IS NULL`. A cancellation can commit between those steps and be
overwritten by completion.

### 7.1 Required algorithm

1. Read the exam and authorize the actor.
2. Reject a status outside `scheduled | inProgress`.
3. Start the transaction.
4. Insert the evaluation.
5. Update the exam using a compare-and-set predicate containing:
   - exam ID;
   - the exact status read in step 1; and
   - `evaluationId IS NULL`.
6. If zero rows update, throw inside the transaction so the evaluation insert rolls back.
7. Outside the failed transaction, distinguish a missing exam from a lost race only if the API
   contract requires a 404/409 distinction.

### 7.2 Acceptance criteria

- Cancellation wins: result returns the approved conflict response, exam remains cancelled,
  evaluation count remains zero.
- Result wins: exam is completed with one evaluation; cancellation loses with the approved
  conflict response.
- Two results: exactly one success, one approved conflict, one evaluation.
- A pre-existing terminal exam never receives a new evaluation.
- No race path produces an orphan evaluation.

---

## 8. H4 — Membership uniqueness

The documented invariant is one membership per `(organizationId, userId)`, but the public schema
currently has only independent indexes.

### 8.1 Migration sequence

1. Run and save the audit from §3.1.
2. Resolve duplicates under the documented rules.
3. Add a composite unique index or constraint on `(organizationId, userId)`.
4. Keep the individual `userId` index for reverse membership lookup.
5. Determine from query plans whether the individual `organizationId` index remains useful
   after the composite index is present.
6. Add a concurrency test proving two membership inserts cannot both commit.

For a large production table, use an operations-approved concurrent-index procedure rather than
holding a long blocking table lock. Do not assume the migration runner supports `CREATE INDEX
CONCURRENTLY` inside its normal transaction wrapper.

### 8.2 Role validity

Unknown-role behavior remains governed by DD-010. Do not bundle a role `CHECK` constraint into
H4 unless DD-010 is approved and compatibility with BetterAuth custom roles is confirmed.

---

## 9. H5 — Deterministic request context

Replace independent `Promise.all` resolution with a request-scoped resolver that caches each
successful or in-flight step.

### 9.1 Recommended failure order

For an authenticated school route:

1. Missing or malformed required school header: 400 without I/O.
2. Missing or invalid session: 401.
3. Unknown school slug: 404.
4. Missing organization membership: 403.
5. Missing or invalid required profile header: approved 400/403 behavior.
6. Failed domain authorization: 403 or resource-hiding 404 according to that route's contract.

Public routes must not resolve a school. Profile-optional routes must not manufacture a profile
failure merely to construct a policy.

### 9.2 Acceptance criteria

- Every pair of simultaneous invalid conditions has one stable documented response.
- An unauthenticated request with a syntactically valid header performs no school lookup.
- School, session, profile, membership, and policy each resolve at most once per request.
- The solution keeps values in typed wrapper arguments or an explicit context object, not
  untyped `req` mutations or `res.locals`.

---

## 10. H6 — Transport validation

### 10.1 Schema separation

Define independent schemas/types for:

- create body;
- update body;
- route parameters;
- list query;
- decoded cursor;
- database row;
- response projection.

Do not build write schemas by `pick`/`partial` from schemas containing persistence-oriented
coercions or response nullability.

### 10.2 Datetime policy

The proposed input policy is an ISO-8601 string representing an instant with `Z` or an explicit
offset, transformed to `Date` only after validation.

Required tests:

- reject `null`, numbers, booleans, empty strings, impossible calendar dates, and offset-free
  timestamps;
- accept valid `Z`, positive-offset, and negative-offset timestamps;
- demonstrate round-trip serialization without changing the instant.

### 10.3 Meeting-URL policy

The proposed policy is HTTPS only. If local development needs non-HTTPS links, use explicit test
fixtures or a narrowly approved localhost exception; do not permit all URL schemes.

Required tests:

- reject script, data, mail, file, FTP, protocol-relative, and credential-bearing URLs;
- reject HTTP unless an approved exception exists;
- accept ordinary HTTPS meeting links;
- confirm the web client treats the value as an external link and does not reinterpret it.

---

## 11. H7 — Constraint-aware database errors

SQLSTATE identifies a category, not the domain meaning. In particular, `23503` can mean either
"the inserted parent does not exist" or "the row being deleted is still referenced."

### 11.1 Translation layers

1. The operation maps known constraint names and operation context to a domain error.
2. The global handler maps only safe generic cases and never claims a reference is missing when
   the operation was blocked by an existing child.
3. Logs may contain the internal constraint name; API responses must not.

Examples to cover:

| Operation                           | Constraint meaning                  | Proposed domain result                             |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------- |
| Create batch                        | Track does not exist                | 422 unknown/invalid track                          |
| Change batch code                   | Code already exists                 | 409 duplicate batch code                           |
| Create evaluation                   | Student/chapter/evaluator missing   | 422 invalid reference                              |
| Delete referenced evaluator profile | Evaluations still reference profile | 409 profile in use                                 |
| Unknown integrity constraint        | Meaning unavailable                 | Safe generic conflict or internal error per DD-001 |

Prechecks may remain for friendly messages, but the database-error path must cover the race.

---

## 12. H8 — Compile-time public/school database boundaries

The current `PublicDatabase` and `SchoolDatabase` brands both wrap a Drizzle database built from
the combined schema. The brand distinguishes the root clients but does not restrict the tables
available through `db.query`. H2 establishes the capability names and call pattern; H8 narrows
the schemas behind those capabilities.

### 12.1 Target structure

- `publicSchema`: BetterAuth and organization tables plus only their relations.
- `schoolSchema`: profile, content, batch, enrollment, exam, and evaluation tables plus only
  their relations.
- `PublicDbClient`: root `NodePgDatabase<typeof publicSchema>`.
- `SchoolDbClient`: root `NodePgDatabase<typeof schoolSchema>`.
- `PublicDb` and `SchoolDb`: narrow structural capabilities derived from their corresponding
  root clients.
- Concrete transaction types remain inferred/private and expose only their matching schema.

Keep table exports available to migrations and explicitly cross-schema tooling without making
them all queryable from every runtime database capability.

### 12.2 Acceptance criteria

- `schoolDb.query.member` is a compile-time error.
- `publicDb.query.exam` is a compile-time error.
- Existing valid queries retain their runtime SQL and tenant search path.
- Provisioning and migration code can still access the schema definitions it owns.
- Cross-schema application operations declare both dependencies explicitly.
- `SchoolDbExecutor`, `PublicDatabase`, `SchoolDatabase`, and the broad `Database` union are
  removed after all compatibility aliases have no remaining call sites.

---

## 13. H9 — Tenant connection lifecycle

The current cache can retain 100 tenant pools. Each unconfigured node-postgres pool can hold ten
connections, creating a theoretical tenant capacity near 1,000 connections per process before
the public pool.

### 13.1 Required controls

Add explicit, validated configuration for:

- public-pool maximum;
- school-pool maximum;
- school-pool cache maximum;
- connection acquisition timeout;
- idle timeout;
- maximum connection lifetime if operations require it;
- statement/query timeout;
- readiness-check deadline.

Pool eviction starts asynchronously today. Track closing promises so shutdown can await both
cached pools and pools already being evicted.

### 13.2 Observability

Expose or log:

- cached school-pool count;
- total/open/idle/waiting clients per pool or in aggregate;
- acquisition timeout count;
- pool creation/eviction count;
- readiness timeout/failure count;
- school identifier in internal logs, without credentials or connection strings.

### 13.3 Load acceptance

Test at the approved maximum active-school count:

- total connections remain inside the budget;
- an evicted pool closes cleanly;
- a request arriving during eviction gets a valid new pool;
- shutdown awaits all closing pools;
- a dead database makes readiness fail within the deadline rather than hang.

---

## 14. H10 — Profile lifecycle and record retention

This phase is blocked on DD-011. The current physical delete can cascade through a student's
exams/evaluations, while an evaluator reference can block deletion. The result is both
destructive and role-dependent.

### 14.1 Recommended lifecycle

1. Add nullable `profile.deletedAt`.
2. Treat a deleted profile as unusable for active request context and new enrollment,
   evaluation, or exam operations.
3. Change the user-facing delete operation to a transaction that:
   - verifies ownership;
   - ends or removes active enrollments under the approved retention rule;
   - clears phone and city;
   - applies the approved name-retention/anonymization policy; and
   - sets `deletedAt`.
4. Retain the stable profile ID and educational records.
5. Replace assessment cascades with restrictive or retained-history semantics after all delete
   paths have stopped physically deleting profiles.
6. Design permanent erasure as a separate, audited privacy/administrative operation.

### 14.2 Decisions DD-011 must settle

- Whether historical reports retain a learner name, a snapshot, or `Deleted learner`.
- Required retention period for exams and evaluations.
- Whether enrollment rows are deleted or gain `endedAt`.
- Whether undelete is supported.
- Who may perform administrative deactivation.
- How a legal erasure request differs from ordinary profile deletion.

### 14.3 Migration and rollout

1. Add `deletedAt` as nullable; existing rows remain active.
2. Deploy reads that exclude deleted profiles from active flows but preserve historical joins.
3. Deploy soft-delete writes.
4. Verify no application path physically deletes a profile.
5. Change foreign-key actions in a later migration.
6. Add a guarded maintenance path only if approved.

### 14.4 Acceptance criteria

- Deactivation returns the approved HTTP response without deleting assessments.
- The profile cannot authenticate as an active profile or receive a new enrollment.
- Historical exam/evaluation reads retain the approved identity projection.
- Repeating deletion is idempotent or returns the explicitly approved error.
- Evaluator and student profiles follow the same lifecycle rules.

---

## 15. H11 — Stable assessment batch context

This phase is blocked on DD-012. An exam currently stores student and chapter but not the batch
whose enrollment authorized the assignment. Current-enrollment changes can therefore alter the
meaning and visibility of historical records.

### 15.1 Target data model

- Add `batchId` to `exam`.
- Add `batchId` to `evaluation`.
- Reference the school-schema batch table.
- Index at least `(batchId, studentId)` for scoped history queries.
- Treat the stored batch as immutable assessment context.

Do not add a permanent foreign key from an assessment to the current `enrollment` row unless
enrollment itself becomes a retained lifecycle record. A hard enrollment delete would otherwise
make valid historical assessments undeletable or force their deletion.

### 15.2 Write behavior

- A new exam selects an explicit qualifying `batchId`.
- A direct evaluation selects an explicit qualifying `batchId`.
- An evaluation created from an exam copies the exam's batch ID.
- Authorization uses that exact batch, not independently derived student and chapter sets.
- Qualification is established in one guarded statement or transaction so a precheck is not the
  only protection.

### 15.3 Backfill

1. Add nullable columns.
2. Populate rows with exactly one candidate batch.
3. Export zero-candidate and multi-candidate rows for manual resolution.
4. Record every manual choice.
5. Deploy dual-read diagnostics comparing old inferred scope with stored batch scope.
6. Deploy writes that always set `batchId`.
7. Migrate clients to send an explicit batch selection where required.
8. Switch authorization and reads to stored context.
9. Make columns non-null only after the unresolved count is zero.

Never select an arbitrary candidate with `limit 1` during the backfill.

### 15.4 Acceptance criteria

- Moving or removing a student's current enrollment does not rewrite historical assessment
  context.
- An educator is authorized only through the assessment's stored batch.
- A multi-batch student cannot create an ambiguous exam/evaluation.
- Every migrated record has a documented batch source.
- Cross-school batch IDs remain impossible through the scoped schema and foreign key.

---

## 16. Verification commands

Run from the repository root after every hardening PR:

```sh
pnpm --filter @narada/api-next typecheck
pnpm --filter @narada/api-next lint
pnpm --filter @narada/api-next test
```

For changes to `@narada/db`, also run its typecheck/lint and migration-generation or migration
verification command defined by that package. The integration suite must run separately against
the explicitly configured test Postgres database.

During H2/H8, run the workspace-wide typecheck as well; changing a shared database capability can
affect the live backend, tools, and provisioning code even when the rewrite package typechecks.

Do not regenerate migrations merely to make a snapshot look current. Review generated SQL,
foreign-key actions, indexes, locks, and rollback/forward-fix strategy before applying it.

---

## 17. Completion checklist

### Planning and approval

- [ ] DD-001 reflects constraint-aware translation and has a manual decision.
- [ ] DD-002 reflects the cancellation/result race and has a manual decision.
- [ ] DD-011 through DD-015 exist with explicit approval records where required.
- [ ] Membership, URL, assessment-context, and connection-budget audits are recorded.

### Foundations

- [ ] Postgres integration harness runs locally and in CI.
- [ ] Concurrency tests use barriers, not sleeps.
- [ ] Existing mutations enter through authorized services.
- [ ] No draft call site uses `SchoolDbExecutor`.
- [ ] Repository functions use database-first `SchoolDb`/`PublicDb` capabilities.
- [ ] Public and school database capabilities expose only their own tables.

### Correctness and security

- [ ] Cancellation/result and double-result races have defined winners.
- [ ] Membership uniqueness is enforced by the database.
- [ ] HTTP dates cannot coerce arbitrary JSON values.
- [ ] Meeting URLs cannot persist unsafe or unintended schemes.
- [ ] Database-error messages match operation and constraint meaning.
- [ ] Request failure precedence is deterministic.

### Operations and data lifecycle

- [ ] Pool capacity fits the approved database budget.
- [ ] Connection acquisition and readiness have deadlines.
- [ ] Evicted pools are awaited during shutdown.
- [ ] Ordinary profile deletion cannot erase educational records.
- [ ] Exams/evaluations retain immutable approved batch context.
- [ ] Every schema migration has preflight, rollout, verification, and forward-fix instructions.
