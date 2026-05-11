# Multi-Tenancy Implementation Checklist

Execution checklist for multi-tenancy. Source of truth for product/architecture: [architecture-decisions.md](./architecture-decisions.md), [schema-design.md](./schema-design.md), [api-contract-changes.md](./api-contract-changes.md).

**Current implementation snapshot:** [implementation-status.md](./implementation-status.md) (use when resuming in a new session).

Mark items done only when verification for that slice passes (see [verification-strategy.md](./verification-strategy.md)).

---

## 0) Setup

- **0.1** Create branch for multi-tenancy work (e.g. `multi-tenancy`).
- **0.2** Reset/purge local dev DB; confirm migration-from-empty path only (no legacy migration). *(Re-verify whenever migrations change.)*
- **0.3** Baseline: `npm` typecheck/tests (capture failures to clear after schema/auth work). *(Ongoing: run `npm run check` before merges.)*

---

## 1) Layer 1 — Tenant foundation (schema)

Layer 1 uses an **expand–contract** pattern so `multi-tenancy` stays buildable at every merge:

1. **Expand (slice `slice-1.1-org-schema`):** add `organizations`, `user_organizations`, and `users.is_super_admin` only. Keep legacy `users.roles` / `users.status` (and `users_status_check`) until application code no longer reads them.
2. **Migrate (Layer 2):** move auth, JWT, routes, and portals to membership + `is_super_admin`. Track every remaining legacy reference in [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) until every row in that tracker is checked.
3. **Contract (slice `slice-1.4-schema-contract`, after Layer 2):** drop `users.roles`, `users.status`, and `users_status_check` in a dedicated slice once the cleanup tracker is clear.

- **1.1** Add `organizations` table (additive; see [schema-design.md](./schema-design.md)). *(Drizzle in `@narada/types`; SQL under repo `migrations/`.)*
- **1.2** Add `user_organizations` table with unique `(user_id, org_id)`, status + roles columns (additive).
- **1.3** Add `users.is_super_admin` (boolean, default false; additive).
- **1.4** Commit Drizzle schema changes and **generated** SQL migrations together (`drizzle-kit generate`; dev reset applies them via `drizzle-kit migrate`). Include a baseline migration that matches the pre–multi-tenancy schema plus a migration for the additive Layer 1 changes.
- **1.5** Seed `slmts` and `rr` org rows + document slugs (`npm run db:seed-orgs`; [server/seed-organizations.ts](../../../server/seed-organizations.ts)).
- **1.6** Seed dev super-admin + minimal test memberships (`npm run db:seed-dev`; [server/seed-dev-bootstrap.ts](../../../server/seed-dev-bootstrap.ts)).

### Deferred — slice `slice-1.4-schema-contract` (after Layer 2 completes)

Do not start this block until [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) has no open items.

- **1.4-contract** Remove `users.roles`, `users.status`, and `users_status_check` (and any remaining code or scripts that depend on them). Generate/commit the contract migration. Re-verify fresh DB + typecheck.

---

## 2) Layer 2 — Auth, JWT, governance APIs

**Roadmap `2.5` follow-up (after `2.9` / `2.10`):** align governance event contracts and audit subscribers around membership-first semantics. Membership events should carry `actorUserId`, `targetUserId`, `membershipId`, `orgId`, and `timestamp`; platform-scoped super-admin events should omit `orgId`. Defer physical `audit_logs.org_id` schema work to Layer `3.B.1`.

- **2.1** Update `JWTPayload` / `generateToken` / `verifyToken` for new claims ([api-contract-changes.md](./api-contract-changes.md)).
- **2.2** Update `server/shared/types.ts` `Express.User` augmentation.
- **2.3** Implement org context resolution middleware (JWT `currentOrgId` first; extensible for host later).
- **2.4** Replace `requireRole` global checks with `requireOrgRole` + `requireSuperAdmin` pattern; keep `requireAdmin`/`requireInstructor` as org-scoped wrappers.
- **2.5** Register: create user + pending `user_organizations` row for tenant from request.
- **2.6** Login: do not block solely on removed global status; enforce access via membership state + return pending UX contract.
- **2.7** `GET /api/auth/me`: return profile + memberships + current org context.
- **2.8** `POST /api/auth/switch-org`: membership check + cookie reissue.
- **2.9** User governance routes: gate with `requireSuperAdmin`; operate on memberships (approve/reject/roles/disable), not global user status.
- **2.10** Super-admin grant/revoke endpoints + audit events.
- **2.11** Remove or redirect old `/api/auth/admin/`* semantics that assume global `users.roles` / `users.status`.
- **2.12** OAuth path: align with membership model (no auto-active bypass that skips super-admin approval if product requires parity with local register).

---

## 3) Layer 3 — Org-scoped data (`org_id`)

### Pass A

Pass A is implemented in slice `slice-3.a-core-org-isolation` and should now be treated as the baseline state after this branch lands.

- [x] **3.A.1** Add `org_id` to `tracks`, `chapters`, `batches`, `enrollments`; backfill SLMTS; NOT NULL + FK.
- [x] **3.A.2** Update uniqueness: `tracks` title per org; plan `batches.batch_code` per org ([schema-design.md](./schema-design.md)).
- [x] **3.A.3** Update all handlers/queries for these tables to filter by `req.orgId`.

### Pass B

- **3.B.1** Add `org_id` to `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, `audit_logs` (nullable on `audit_logs` for platform actions).
- **3.B.2** Backfill; enforce NOT NULL where required; add indexes on `org_id`.
- **3.B.3** Update remaining handlers for org filters; fix `student_progress` / enrollment uniqueness if org-scoping demands it.

---

## 4) Layer 4 — Student chameleon (config)

- **4.1** Add `config/tenants/<slug>/` structure + TypeScript types for tenant config.
- **4.2** Wire `TENANT` env (and `PORT` for RR on `3010` if using separate dev processes).
- **4.3** Student portal: replace hardcoded branding with tenant config (auth shell, headers).
- **4.4** Student API client: send tenant slug header (or equivalent) on auth/register so server creates correct org membership. *(SLMTS student register already sends `X-Tenant-Slug` + `tenantSlug`; RR-dedicated dev instance / shared client abstraction still Layer 4.)*
- **4.5** Document dev commands in root or app `package.json` (SLMTS :3000, RR :3010).

---

## 5) Admin portal (incremental, after backend)

- **5.1** Gate existing User Management module: **super-admin only** (not org admin).
- **5.2** API integration: list users with all memberships; add org filter (server-side).
- [x] **5.3** Org switcher: JWT switch + refresh admin data for active org.
- **5.4** Ensure org admins cannot access user-governance API routes (403).

Verification note for **5.3**:
- Confirmed admin shell org switcher refreshes `auth/me`, content queries, batch queries, and org-directory query families on switch. Focused utility coverage lives in [`scripts/test/admin-org-switcher-utils.test.ts`](../../../scripts/test/admin-org-switcher-utils.test.ts). Local browser verification used a temporary dual-active admin fixture by resetting the seeded super-admin password and promoting the RR membership from pending to active/admin for the session.

---

## 6) Pilot gate (SLMTS)

- **6.1** Register -> pending -> super-admin approve -> SLMTS student access works.
- **6.2** Cross-org isolation smoke with minimal RR data.
- **6.3** Second-org join flow: RR portal -> pending RR membership -> approve.
- **6.4** Document known gaps (email, questionnaire) as out of scope.

---

## 7) Out of scope reminders (do not implement in this checklist)

- DB-backed themes / theme editor
- Questionnaire columns
- Email invites
- Cross-org analytics dashboards
- Production DNS/SSL (document only in deployment follow-up)
