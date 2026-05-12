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

**Roadmap `2.5` follow-up (after `2.9` / `2.10`):** align governance event contracts and audit subscribers around membership-first semantics. Membership events should carry `actorUserId`, `targetUserId`, `membershipId`, `orgId`, and `timestamp`; platform-scoped super-admin events should omit `orgId`. Physical `audit_logs.org_id` persistence is now landed as part of Layer `3.B`.

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

- [x] **3.B.1** Add `org_id` to `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, `audit_logs` (nullable on `audit_logs` for platform actions).
- [x] **3.B.2** Backfill; enforce NOT NULL where required; add indexes on `org_id`.
- [x] **3.B.3** Update remaining handlers for org filters; finish Pass B media/content/progress/audit isolation and settle the runtime enrollment rule as one active enrollment per org.

---

## 4) Layer 4 — Student chameleon (config)

- [x] **4.1** Add tenant config structure + TypeScript types for tenant config. *(Repo-equivalent landed under `apps/student-portal/src/config/tenants/` for `slmts` and `rr`.)*
- [x] **4.2** Wire `TENANT` env (and `PORT` for RR on `3010` if using separate dev processes).
- [x] **4.3** Continue replacing remaining student-portal hardcoded branding with tenant config. *(The authenticated shell/header and pending-approval surface now resolve tenant branding from config; the auth page's left hero intentionally remains Narada-branded across tenants as a shared product-brand surface.)*
- **4.4** Extend tenant-aware client behavior beyond the register flow as needed. *(Register already builds tenant-aware headers/body from config, and current student runtime now mirrors `TENANT` into browser-rendered shell/pending surfaces through `next.config`; broader shared auth-client and any future OAuth-specific handling remain follow-up work.)*
- [x] **4.5** Document dev commands in app `package.json` (SLMTS :3000, RR :3010).

---

## 5) Admin portal (incremental, after backend)

- [x] **5.1** Gate existing User Management module: **super-admin only** (not org admin).
- [x] **5.2** API integration: list users with all memberships; add org filter (server-side). *(The admin User Management screen now exposes `All organizations`, `SLMTS`, and `RR`, threads `orgSlug` through the governance hook/query key, and the governance service/storage queries now keep filtered pagination and status-tab counts aligned without the previous Postgres `SELECT DISTINCT ... ORDER BY` failure.)*
- [x] **5.3** Org switcher: JWT switch + refresh admin data for active org.
- [x] **5.4** Ensure org admins cannot access user-governance API routes (403).

Verification note for **5.3**:
- Confirmed admin shell org switcher refreshes `auth/me`, content queries, batch queries, and org-directory query families on switch. Focused utility coverage lives in [`scripts/test/admin-org-switcher-utils.test.ts`](../../../scripts/test/admin-org-switcher-utils.test.ts). Local browser verification used a temporary dual-active admin fixture by resetting the seeded super-admin password and promoting the RR membership from pending to active/admin for the session.

Verification note for **5.2**:
- Focused regression coverage now lives in [`scripts/test/admin-user-filters.test.ts`](../../../scripts/test/admin-user-filters.test.ts) and [`scripts/test/governance-org-filter-storage.test.ts`](../../../scripts/test/governance-org-filter-storage.test.ts). Local browser verification confirmed `All organizations`, `SLMTS`, and `RR` each drive the expected `GET /api/auth/admin/users` request shape and return filtered results successfully.

---

## 6) Pilot gate (SLMTS)

- [x] **6.1** Register -> pending -> super-admin approve -> SLMTS student access works.
- [x] **6.2** Cross-org isolation smoke with minimal RR data.
- [ ] **6.3** Second-org join flow: RR portal -> pending RR membership -> approve.
- [ ] **6.4** Document known gaps (email, questionnaire) as out of scope.

Verification note for **6.1**:
- Fresh-db validation passed on `2026-05-12` via `npm run build:types`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, and `npm run check`.
- Browser verification against local SLMTS student portal confirmed `pilot+1747051589@test.local` reached `http://localhost:3100/pending-approval` after self-serve registration/login, with the expected pending-membership copy for `slmts`.
- Super-admin API approval of the new SLMTS membership succeeded via `POST /api/auth/admin/memberships/:membershipId/approve`, after which the same user logged in with `hasActiveMembership: true`, `GET /api/auth/me` returned the active SLMTS membership, and `GET /api/content/tracks` returned `200` with `9` tracks.
- Browser follow-up after approval confirmed the user reached `http://localhost:3100/vedic-learning` instead of the pending gate, with visible track/chapter content and the normal student shell.
- Supporting tenancy checks also passed: `require-super-admin` (8 assertions), `audit-log-visibility` (4), `layer3-pass-a-isolation` (13), `layer3-pass-b-media-isolation` (8), `layer3-pass-b-progress-audit-isolation` (12), and `student-tenant-config` (20).

Verification note for **6.2**:
- Fresh-db verification passed on `2026-05-12` via `npm run build:types`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, and `npm run check`.
- The dedicated RR smoke harness now lives at [`scripts/test/rr-isolation-smoke.test.ts`](../../../scripts/test/rr-isolation-smoke.test.ts) and is exposed as `npm run test:rr-isolation-smoke`.
- Official slice verification passed against a local API instance using `API_BASE_URL=http://localhost:5201 npm run test:rr-isolation-smoke`.
- The smoke upserted an active RR membership for the seeded super-admin without changing seed defaults, created unique SLMTS/RR marker tracks and batches, confirmed the default session stayed on active SLMTS, then switched to RR with `POST /api/auth/switch-org`.
- In SLMTS context, the smoke saw only the SLMTS marker data and got `404` for direct RR track/batch lookups; after switching to RR, it saw only the RR marker data and got `404` for direct SLMTS track/batch lookups.

---

## 7) Out of scope reminders (do not implement in this checklist)

- DB-backed themes / theme editor
- Questionnaire columns
- Email invites
- Cross-org analytics dashboards
- Production DNS/SSL (document only in deployment follow-up)
