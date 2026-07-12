# Architecture Review — Outstanding Items

**Date:** 2026-05-28
**Audience:** A coding agent picking up this document cold. Every item is meant to be actionable without further context.

**Status:** The previous passes have been almost entirely worked through. Both cross-batch leaks (read and write side), audio idempotency, audio delete ordering, staged uploads for direct-to-R2 content, the dead auth branch, exam-route auth ordering, the `CREATE EXTENSION` placement, R2 signed-download enforcement, per-request URL caching, the duplicated response mappers/types/enums, validation helpers, rate limiting, explicit CORS methods, Node pinning, the logger type, duplicate failed-request logging, documented merge-param routers, BetterAuth CLI/version pinning, school context via `X-School-Slug`, school creation tooling, UUIDv7 domain IDs/cursor tie-breaks, cascade delete strategy, bulk content reordering, enrollment status removal, chapter code uniqueness, the decision to keep BetterAuth `organization.metadata`, the revised exam/evaluation model, service modules as named free functions, `SchoolDbExecutor` for transaction-compatible service calls, access-query auth helpers, typed `publicRoute` / `schoolRoute` context instead of Express locals for school db access, route-index school-context simplification, stale `Database` call-site cleanup, skipping shared route-param schemas as too much indirection for the utility, BetterAuth CSRF hardening via default origin validation / `SameSite=Lax` cookies / configured `trustedOrigins`, and intentionally ignoring CSP for now are all resolved. This document keeps **only the items that still need attention**, grouped by whether they're objective or opinion.

**How to read:** §1 is ops. §2 records deferred decisions.

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

Then an integration suite (vitest + Postgres-via-docker) for the cross-batch authorization paths and school provisioning rollback. Add a root `test` script (currently only `@narada/auth` has one) so `pnpm -r test` works.

## 2. Deferred decisions

### 2.1 Make school provisioning resumable

The old school reconciliation script was compensating for partial provisioning: an organization row could exist without a school schema, or a schema could exist without its organization row. The better fix is to make provisioning resumable rather than adding an API or script that cleans up after the fact. Track provisioning state on the school record, make schema creation/migration idempotent, and have school creation resume or fail from explicit states such as `provisioning`, `ready`, and `failed`.

Everything else here is incrementally cleanable alongside other work in the same files.
