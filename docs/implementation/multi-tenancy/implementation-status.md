# Multi-tenancy — implementation status and handoff

**Purpose:** Single entry point for humans and agents continuing work in a **new chat**. It reflects what is already merged to the integration branch **`multi-tenancy`**, how the system behaves today, known gaps, and the recommended next steps.

**Execution source of truth:** [implementation-roadmap.md](./implementation-roadmap.md), [implementation-checklist.md](./implementation-checklist.md), and the DB/runbook cleanup tracker [db-audit-remediation-checklist.md](./db-audit-remediation-checklist.md). This file does not replace them; it **summarizes current reality** so the roadmap/checklist are easier to interpret.

**Last updated:** Reflects Layer **1** through **1.4 contract** (including fresh-DB verification on the merged branch), Layer **2** roadmap slices **2.1–2.5** plus **2.12** OAuth parity, Layer **3** Pass A and Pass B, student Layer **4.1 / 4.2 / 4.4**, admin checklist **5.1**–**5.4**, pilot closeout through checklist **6.4**, and **slices 5–6** tenant-scoped **`/api/learning/*`** delivery (header + active membership, no super-admin bypass per **§3.4 A**).

---

## Integration branch and git ritual

- **Branch:** `multi-tenancy` (pushed to `origin`). Feature work should use slice branches and merge back with **`git merge --no-ff`**, then **`git push origin multi-tenancy`** after verification (`npm run check` at minimum).
- **Slice naming:** Prefer names aligned with the roadmap. Recent integration merges include:
  - `slice-2.3-switch-org` — `req.orgId`, `attachOrgContext`, `POST /api/auth/switch-org`
  - `slice-2.4-superadmin-governance` — `requireSuperAdmin`, membership governance routes, `GET /api/admin/directory/users`, admin UserList + hooks
  - `slice-2.5-governance-event-alignment` — governance event contract alignment, persisted audit subscriber alignment, org-scoped audit-log visibility
  - `slice-2.12-oauth-parity` — Google OAuth now reuses the membership-first tenant policy so target-tenant access stays pending until approval when required
  - `slice-3.a-core-org-isolation` — `org_id` on core content/batch tables plus org-scoped handlers
  - `slice-3b-schema-foundation` — Pass B schema/backfill foundation for media, progress, and audit tables
  - `slice-3b-media-isolation` — Pass B media/content runtime org isolation
  - `slice-3b-progress-audit-isolation` — Pass B progress/audit runtime isolation and event wiring
  - `slice-3b-docs-verification` — Pass B docs refresh plus merged-baseline verification closeout
  - `slice-1.4-schema-contract` — remove `users.roles` / `users.status` / `users_status_check`, migrate remaining runtime/UI/script consumers, and refresh the execution docs
  - `slice-5.2-admin-user-org-filter` — admin user-management org filter UI, hook/query wiring, and filtered-governance pagination fix
  - `slice-5.3-admin-org-switcher` — admin shell org switcher + auth/query refresh behavior
- `slice-4.1-tenant-config` — student tenant config foundation, tenant-aware auth branding + metadata, and dual-instance student dev scripts
- `slice-4.3-student-shell-branding` — tenant-aware authenticated student shell/pending branding, client-safe tenant env wiring, and explicit preservation of the shared Narada auth-left hero
- `slice-4.4-tenant-aware-oauth` — student/admin OAuth start parameters, server-signed callback state, safe post-auth redirect handling, and tenant-aware Google membership resolution
- `slice-6.3-second-org-join` — authenticated tenant membership requests, tenant-scoped student access state, RR auto-switch behavior, second-org smoke coverage, and 6.3 docs refresh
- `slice-6.4-known-gaps-docs` — pilot closeout documentation, canonical known-gap wording, and execution-doc sync so new chats stop treating `6.4` as pending
- `slice-5-tenant-learning-org` — **`/api/learning/*`** resolves **`req.orgId`** from **`X-Tenant-Slug`** with **active** `user_organizations` only (**§3.4 A**, no super-admin bypass); CORS **`allowedHeaders`**; student portal **`apiRequest`** merges tenant slug; RR isolation smoke asserts learning header + inactive-membership denial
- `slice-6-mt-docs-verification` — this status file + **architecture-decisions** ADR for tenant learning APIs; contract smoke pass notes

---

## Completed work (merged to `multi-tenancy`)

### Layer 1 — tenant foundation

| Roadmap / checklist | What was delivered |
| ------------------- | ------------------- |
| **1.1–1.4** (expand / seed / bootstrap / contract) | `organizations`, `user_organizations`, `users.is_super_admin`, and the generated contract migration [`0004_dapper_zzzax.sql`](../../../migrations/0004_dapper_zzzax.sql) that removes `users.roles`, `users.status`, and `users_status_check`. Drizzle schema lives in `@narada/types`; SQL lives under repo root [`migrations/`](../../../migrations/). Remaining seeds/scripts/bootstrap flows were also migrated so the fresh reset path works without the removed columns. |
| **1.5** | `npm run db:seed-orgs` — orgs `slmts`, `rr`. See [`server/db-seeding/seed-organizations.ts`](../../../server/db-seeding/seed-organizations.ts). |
| **1.6** | `npm run db:seed-dev` — super-admin for `SUPER_ADMIN_EMAIL`, **active** memberships on `slmts` and `rr` (`student` + `admin` each). See [`server/db-seeding/seed-dev-bootstrap.ts`](../../../server/db-seeding/seed-dev-bootstrap.ts). Requires `SUPER_ADMIN_EMAIL`; new super-admin creation needs `SUPER_ADMIN_PASSWORD` (see script / `.env.example`). |

Contract verification now also has focused regression coverage for the last high-risk consumers that blocked slice `1.4`: local passport auth without global status gates, membership-based eligible-student selection, and membership-based admin stats (see the verification list below).

### Layer 2 — slices implemented so far

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **2.1** JWT + Express typing | JWT claims: `isSuperAdmin`, `currentOrgId`, `orgRoles`, `orgMembershipStatus` (no global `roles`/`status` in token). `verifyToken` rejects legacy token shape. Default org in token: prefer **active** `slmts`, else first active by slug; if none, prefer **pending** `slmts`, else first pending by slug. | [`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) (`getJwtSignClaimsForUser`), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), portals `useAuth` / role guards |
| **2.2** Login / register (membership-first) | Register creates **`user_organizations`** row (`pending`, roles `['student']`) for tenant from **`X-Tenant-Slug`**, optional body `tenantSlug`, or **`DEFAULT_TENANT_SLUG`** / `slmts` ([`server/config.ts`](../../../server/config.ts), [`.env.example`](../../../.env.example)). **Admin email** path: active SLMTS membership (`student`+`admin`, self-approved). Passport local and Google login no longer depend on global user status; access is governed by memberships plus `isSuperAdmin`. Google creates/backfills memberships on the resolved tenant. **Login** returns `loginState` (`hasActiveMembership`, membership summaries). **`GET /api/auth/me`** returns session user + `memberships[]` + `hasActiveMembership`. Student portal: **`/pending-approval`** when authenticated, not super-admin, and no active membership. | [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx) |
| **2.3** Org context + switch-org | **`req.orgId`** set from JWT `currentOrgId` on every `jwtAuth` / `optionalJwtAuth` success via [`attachOrgContext`](../../../server/shared/middleware/org-context.ts). **`requireOrgContext`** returns **403** when `req.orgId` is missing (for Layer 3 composition). **`POST /api/auth/switch-org`** (body `orgId`): requires **active** `user_organizations` row for that org; otherwise **403**; reissues `auth_token` with `currentOrgId` / `orgRoles` / `orgMembershipStatus`. [`getJwtSignClaimsForUser`](../../../server/modules/identity-access/storage.ts) accepts optional `{ targetOrgId }` for switch vs default-org selection. | [`server/middleware/jwt-auth.middleware.ts`](../../../server/middleware/jwt-auth.middleware.ts), [`server/shared/middleware/org-context.ts`](../../../server/shared/middleware/org-context.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts) |
| **2.4** Super-admin governance | **`requireSuperAdmin`** on governance routes under [`/api/auth/admin/…`](../../../server/routes/identity.routes.ts). **`GET /api/auth/admin/users`** returns users with nested **`memberships[]`**; query filters: **`membershipStatus`**, **`role`** (membership role in any org), **`orgSlug`**, **`search`**. **`GET /api/auth/admin/users/:userId`** returns one user + memberships. **`POST`** …`/memberships/:membershipId/{approve,reject,disable,enable}`; **`PATCH`** …`/memberships/:membershipId/roles`; **`POST`** …`/users/:userId/super-admin/{grant,revoke}` (revoke blocks self and last super-admin). **`GET /api/admin/directory/users`** ([`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts)): **`jwtAuth` + `requireAdmin` + `requireOrgContext`** — lists users in **current JWT org** with optional **`membershipRole`** / legacy **`role`** + **`search`** (used by instructor/student pickers). Admin portal: [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) **super-admin gate** + membership-based actions; [`useAdminUsers.ts`](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts); [`useSearchStudents.ts`](../../../apps/admin-portal/src/lib/hooks/useSearchStudents.ts) + [`useBatchRelations.ts`](../../../packages/ui/src/hooks/data/useBatchRelations.ts) call **directory** API, not governance list. | [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) |
| **2.5** Governance event + audit alignment | Membership governance events now use a consistent contract: membership actions publish **`actorUserId`**, **`targetUserId`**, **`membershipId`**, **`orgId`**, and **`timestamp`**; platform-scoped super-admin actions publish **`actorUserId`**, **`targetUserId`**, and **`timestamp`** with **no `orgId`**. **`setMembershipActiveFlag`** now emits **`MembershipEnabled`** / **`MembershipDisabled`**; role updates emit **`MembershipRolesChanged`**. [`initializeEventHandlers`](../../../server/modules/system-admin/events.ts) now auto-logs membership governance and super-admin actions to persisted audit rows with explicit scope metadata in `changes` (`scope: 'org'` vs `scope: 'platform'`). Layer **3.B** now extends that model with physical `audit_logs.org_id` persistence and filtering for org-scoped rows. | [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/system-admin/events.ts`](../../../server/modules/system-admin/events.ts), [`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts), [`server/shared/events/types.ts`](../../../server/shared/events/types.ts), [`scripts/test/contracts/identity-governance-events.test.ts`](../../../scripts/test/contracts/identity-governance-events.test.ts), [`scripts/test/contracts/require-super-admin.test.ts`](../../../scripts/test/contracts/require-super-admin.test.ts), [`scripts/test/contracts/audit-log-visibility.test.ts`](../../../scripts/test/contracts/audit-log-visibility.test.ts) |
| **2.12** OAuth parity with local register | Google OAuth now reuses the same membership-first tenant policy as local registration and second-org join. New Google users and existing users without a membership in the resolved tenant get a **pending** membership for that tenant; existing **pending**, **active**, **inactive**, and **rejected** tenant memberships are preserved as-is, so OAuth no longer relies on ad hoc membership backfills or silently reopens closed memberships. | [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`scripts/test/contracts/oauth-membership-parity.test.ts`](../../../scripts/test/contracts/oauth-membership-parity.test.ts), [`scripts/test/contracts/oauth-tenant-context.test.ts`](../../../scripts/test/contracts/oauth-tenant-context.test.ts), [`scripts/test/contracts/identity-request-membership.test.ts`](../../../scripts/test/contracts/identity-request-membership.test.ts) |

### Layer 3 — Pass A core org isolation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **3.A** Core org isolation | Added **`org_id`** to `tracks`, `chapters`, `batches`, and `enrollments` with backfill-to-SLMTS migration **`0002_marvelous_dark_beast.sql`**. Updated uniques to **`tracks (org_id, title)`** and **`batches (org_id, batch_code)`**; added org relations/indexes in `@narada/types`. Core content, batch, learning, and student flows now require **`req.orgId`** and scope reads/writes to the active org. Fresh DB reset now clears both `public` and Drizzle's `drizzle` schema; dev verification also fixed the ESM entrypoint in [`server/db-seeding/seed-curriculum.ts`](../../../server/db-seeding/seed-curriculum.ts). Focused checks now cover schema + guard wiring and dual-org isolation. | [`packages/types/src/schema.ts`](../../../packages/types/src/schema.ts), [`migrations/0002_marvelous_dark_beast.sql`](../../../migrations/0002_marvelous_dark_beast.sql), [`server/routes/content.routes.ts`](../../../server/routes/content.routes.ts), [`server/routes/batch.routes.ts`](../../../server/routes/batch.routes.ts), [`server/routes/learning.routes.ts`](../../../server/routes/learning.routes.ts), [`server/routes/student.routes.ts`](../../../server/routes/student.routes.ts), [`scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`](../../../scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts), [`scripts/test/contracts/layer3-pass-a-isolation.test.ts`](../../../scripts/test/contracts/layer3-pass-a-isolation.test.ts), [`scripts/db/reset.ps1`](../../../scripts/db/reset.ps1) |

### Layer 3 — Pass B media / progress / audit isolation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **3.B** Schema + runtime isolation | Added **`org_id`** to `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, and `audit_logs` (nullable for platform rows) in migration **`0003_wakeful_warhawk.sql`**, with deterministic backfills, indexes, and guard rails. Media/content routes and storage now validate parent ownership and active-org ownership on create/read/update/delete, learning and batch progress reads now use physical **`student_progress.org_id`**, active enrollment checks are enforced **per org**, and audit writes/reads now persist/filter on physical **`audit_logs.org_id`** rather than JSON-only metadata. Domain events for content, media, batch, and progress flows now carry enough org/actor data for audit consumers. | [`packages/types/src/schema.ts`](../../../packages/types/src/schema.ts), [`migrations/0003_wakeful_warhawk.sql`](../../../migrations/0003_wakeful_warhawk.sql), [`server/modules/content-publishing/service.ts`](../../../server/modules/content-publishing/service.ts), [`server/modules/media-pipeline/service.ts`](../../../server/modules/media-pipeline/service.ts), [`server/modules/learning-delivery/storage.ts`](../../../server/modules/learning-delivery/storage.ts), [`server/modules/batch-cohort/service.ts`](../../../server/modules/batch-cohort/service.ts), [`server/modules/system-admin/storage.ts`](../../../server/modules/system-admin/storage.ts), [`server/modules/system-admin/events.ts`](../../../server/modules/system-admin/events.ts), [`scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`](../../../scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts), [`scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`](../../../scripts/test/contracts/layer3-pass-b-media-isolation.test.ts), [`scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`](../../../scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts), [`scripts/test/contracts/layer3-pass-b-script-compat.test.ts`](../../../scripts/test/contracts/layer3-pass-b-script-compat.test.ts) |

### Layer 4 — student tenant-config foundation, shell branding, and OAuth propagation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **4.1 / 4.2 / 4.4** Tenant config foundation + shell/OAuth follow-up | Student portal now resolves **`TENANT`** to typed configs for **`slmts`** and **`rr`**, mirrors that tenant into the client runtime for browser-rendered branding, drives tenant-specific branding for the auth form area, root metadata, authenticated shell, and pending-approval surface, builds tenant-aware register headers/body instead of hardcoding **`slmts`**, computes **current-tenant** access state so RR users can request membership, see tenant-specific pending copy, and auto-switch into RR after approval without relying on global `hasActiveMembership`, and now sends tenant slug plus post-auth return intent to `/auth/google` so the server can mint a signed OAuth `state`, safely validate callback redirects, preserve the originating tenant during Google membership creation/backfill, and return callback failures to the auth pages with explicit error codes instead of silent route bounces. The auth page's **left hero remains Narada-branded across tenants by design** so the product identity stays consistent. Dev scripts support the documented dual-instance local setup on **`3000`** and **`3001`**, and local OAuth return handling explicitly allows those documented portal origins even if a developer's CORS env lags behind. | [`apps/student-portal/src/config/tenants/index.ts`](../../../apps/student-portal/src/config/tenants/index.ts), [`apps/student-portal/src/config/tenants/slmts.ts`](../../../apps/student-portal/src/config/tenants/slmts.ts), [`apps/student-portal/src/config/tenants/rr.ts`](../../../apps/student-portal/src/config/tenants/rr.ts), [`apps/student-portal/src/lib/tenant.ts`](../../../apps/student-portal/src/lib/tenant.ts), [`apps/student-portal/src/lib/tenant-session.ts`](../../../apps/student-portal/src/lib/tenant-session.ts), [`apps/student-portal/src/components/auth/StudentAuthPage.tsx`](../../../apps/student-portal/src/components/auth/StudentAuthPage.tsx), [`apps/student-portal/src/app/layout.tsx`](../../../apps/student-portal/src/app/layout.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/next.config.ts`](../../../apps/student-portal/next.config.ts), [`apps/admin-portal/src/components/auth/AdminAuthPage.tsx`](../../../apps/admin-portal/src/components/auth/AdminAuthPage.tsx), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`scripts/test/contracts/student-tenant-config.test.ts`](../../../scripts/test/contracts/student-tenant-config.test.ts), [`scripts/test/contracts/student-tenant-session.test.ts`](../../../scripts/test/contracts/student-tenant-session.test.ts), [`scripts/test/contracts/oauth-tenant-context.test.ts`](../../../scripts/test/contracts/oauth-tenant-context.test.ts) |

### Tenant-scoped learning delivery (slices **5–6**)

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **5** | **`/api/learning/*`** requires **`X-Tenant-Slug`** (allowlisted slug). Middleware **`attachLearningTenantOrgContext`** runs after **`jwtAuth`**, parses the header with **`parseXTenantSlugHeader`**, loads the org by slug, requires an **active** `user_organizations` row for `(user.id, org.id)` (**no `isSuperAdmin` bypass** — **§3.4 A**), then sets **`req.orgId`** before **`requireOrgContext`**. Stable **403** bodies: `TENANT_SLUG_REQUIRED`, `TENANT_SLUG_INVALID`, `TENANT_ORG_NOT_FOUND`, `TENANT_MEMBERSHIP_REQUIRED`. CORS preflight allows **`X-Tenant-Slug`**. Student portal shared **`apiRequest`** merges **`X-Tenant-Slug: getCurrentTenantSlug()`**. **`GET /api/learning/progress`** still branches student vs instructor using JWT **`orgRoles`** (current JWT org); follow-up if multi-org power users need roles derived from tenant-org membership. | [`server/shared/middleware/tenant-learning-org-context.ts`](../../../server/shared/middleware/tenant-learning-org-context.ts), [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`server/routes/learning.routes.ts`](../../../server/routes/learning.routes.ts), [`server/index.ts`](../../../server/index.ts), [`apps/student-portal/src/lib/api.ts`](../../../apps/student-portal/src/lib/api.ts), [`scripts/test/smoke/rr-isolation-smoke.test.ts`](../../../scripts/test/smoke/rr-isolation-smoke.test.ts) |
| **6** | Documentation: this file + [`architecture-decisions.md`](./architecture-decisions.md) §12. | This file; [`architecture-decisions.md`](./architecture-decisions.md) |

---

## Checklist §2 crosswalk (Layer 2 auth / governance)

Use this to map [implementation-checklist.md](./implementation-checklist.md) line items to reality without re-reading the whole server.

| Checklist | Status | Notes |
| --------- | ------ | ----- |
| **2.1** JWT / `verifyToken` / claims | **Done** | See slice **2.1**. |
| **2.2** `Express.User` / typing | **Done** | Includes `Request.orgId` for org context. |
| **2.3** Org context on request | **Done** | `attachOrgContext` + `requireOrgContext`; JWT `currentOrgId` → `req.orgId`. |
| **2.4** `requireOrgRole` + `requireSuperAdmin` | **Done** | `requireOrgRole` is now the canonical org-scoped guard over JWT `orgRoles`; `requireRole` remains as a backward-compatible alias, and `requireAdmin` / `requireInstructor` continue to wrap the org-scoped helper. |
| **2.5** Register + pending membership | **Done** | Covered in slice **2.2**. |
| **2.6** Login + pending UX | **Done** | Passport + `loginState`; slice **2.2**. |
| **2.7** `GET /api/auth/me` | **Done** | Slice **2.2**. |
| **2.8** `POST /api/auth/switch-org` | **Done** | Slice **2.3**; active membership only. |
| **2.9** Governance on memberships + super-admin gate | **Done** | Slice **2.4**; legacy user-level approve/reject **routes removed**. |
| **2.10** Super-admin grant/revoke | **Done** | Slice **2.4** routes + slice **2.5** event/audit alignment. |
| **2.11** Remove legacy `/api/auth/admin/*` user-status semantics | **Done** | Old approve/reject/roles/disable/enable **user** routes are gone, the service/storage cleanup removed the remaining legacy user-level helpers, and the admin UI now speaks membership status directly. |
| **2.12** OAuth parity with local register | **Done** | Google OAuth now follows the same tenant membership policy as local register and `POST /api/auth/request-membership`; new or cross-org users land on pending membership for the resolved tenant, while inactive/rejected memberships stay closed. |

---

## Admin portal checklist §5 crosswalk (incremental)

| Checklist | Status | Notes |
| --------- | ------ | ----- |
| **5.1** User management super-admin only | **Done** (UI + server) | [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) shows **Super-admin only** for others; APIs return **403**. |
| **5.2** List + memberships + org filter | **Done** | The admin user-management UI now exposes a dedicated org filter with **All organizations**, **SLMTS**, and **RR** options, threads **`orgSlug`** through the governance hook/query key, and aligns the supporting governance queries so both filtered pagination and status-tab counts work without the prior Postgres `SELECT DISTINCT ... ORDER BY` error. Key files: [`apps/admin-portal/src/components/admin/UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx), [`apps/admin-portal/src/lib/hooks/useAdminUsers.ts`](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts), [`apps/admin-portal/src/lib/admin-user-filters.ts`](../../../apps/admin-portal/src/lib/admin-user-filters.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`scripts/test/contracts/admin-user-filters.test.ts`](../../../scripts/test/contracts/admin-user-filters.test.ts), [`scripts/test/contracts/governance-org-filter-storage.test.ts`](../../../scripts/test/contracts/governance-org-filter-storage.test.ts). |
| **5.3** Org switcher in admin UI | **Done** | Admin shell now renders an org switcher in the shared header, calls **`POST /api/auth/switch-org`**, refetches **`GET /api/auth/me`**, and invalidates org-scoped admin query families before a conservative `router.refresh()`. Verified locally against a temporary dual-active admin fixture (seeded super-admin password reset + RR membership promoted from pending to active/admin for the verification session). Key files: [`apps/admin-portal/src/components/layout/AdminOrgSwitcher.tsx`](../../../apps/admin-portal/src/components/layout/AdminOrgSwitcher.tsx), [`apps/admin-portal/src/hooks/useSwitchOrg.ts`](../../../apps/admin-portal/src/hooks/useSwitchOrg.ts), [`apps/admin-portal/src/lib/org-switcher.ts`](../../../apps/admin-portal/src/lib/org-switcher.ts), [`packages/ui/src/components/layout/app-shell.tsx`](../../../packages/ui/src/components/layout/app-shell.tsx), [`scripts/test/contracts/admin-org-switcher-utils.test.ts`](../../../scripts/test/contracts/admin-org-switcher-utils.test.ts). |
| **5.4** Org admins cannot governance APIs | **Done** | **403** without `isSuperAdmin`; directory uses separate route. |

---

## HTTP API quick reference (multi-tenancy–relevant)

Base URL in dev is typically `http://localhost:5000` with routes under **`/api`** (see [`packages/api-client`](../../../packages/api-client/src/index.ts) — client uses `NEXT_PUBLIC_API_URL` default `http://localhost:5000/api`).

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | -------- |
| POST | `/api/auth/register` | Public (+ rate limit) | Create user + pending (or bootstrap) membership; tenant from header/body/env. |
| POST | `/api/auth/login` | Public (+ rate limit) | Cookie + `loginState` / user session fields. |
| GET | `/api/auth/google` | Public | Start Google OAuth; accepts tenant/return intent and mints verified callback `state`. |
| POST | `/api/auth/logout` | Cookie | Clear session. |
| GET | `/api/auth/me` | JWT cookie | Profile + `memberships[]` + `hasActiveMembership`. |
| POST | `/api/auth/request-membership` | JWT + CSRF | Create a pending membership request for the current tenant when the user is already authenticated. Returns explicit result states for created, already pending, already active, inactive, and rejected memberships. |
| POST | `/api/auth/switch-org` | JWT + CSRF | Body `{ orgId }`; active membership required. |
| GET | `/api/auth/admin/users` | JWT + **super-admin** | Paginated users + nested `memberships[]`; governance filters. |
| GET | `/api/auth/admin/users/:userId` | JWT + **super-admin** | Single user + memberships. |
| POST | `/api/auth/admin/memberships/:membershipId/approve` | JWT + **super-admin** + CSRF | Approve pending membership. |
| POST | `/api/auth/admin/memberships/:membershipId/reject` | JWT + **super-admin** + CSRF | Reject pending membership. |
| POST | `/api/auth/admin/memberships/:membershipId/disable` | JWT + **super-admin** + CSRF | Set membership `inactive`. |
| POST | `/api/auth/admin/memberships/:membershipId/enable` | JWT + **super-admin** + CSRF | Set membership `active`. |
| PATCH | `/api/auth/admin/memberships/:membershipId/roles` | JWT + **super-admin** + CSRF | Body `{ roles: string[] }`. |
| POST | `/api/auth/admin/users/:userId/super-admin/grant` | JWT + **super-admin** + CSRF | |
| POST | `/api/auth/admin/users/:userId/super-admin/revoke` | JWT + **super-admin** + CSRF | |
| GET | `/api/admin/directory/users` | JWT + org **admin** + **`req.orgId`** | Query `membershipRole` or `role`, `search`, `limit`; in-org directory for pickers. |
| GET | `/api/admin/audit-logs` | JWT + **admin** | Super-admin sees full stream; org admin sees only current-org rows whose physical `audit_logs.org_id` matches the active org. |
| GET / POST | `/api/learning/*` | JWT cookie + **`X-Tenant-Slug`** | Learning delivery facade; **`req.orgId`** is the org for the resolved tenant slug. Requires **active** membership in that org (**403** with stable `code` if header missing/invalid or membership missing/inactive). **`isSuperAdmin` does not** substitute for membership (**§3.4 A**). |

---

## Current runtime behavior (quick reference)

1. **JWT** carries org context from memberships (active preferred, else pending) plus `isSuperAdmin`.
2. **Register** must target a real org slug; the student portal now derives tenant slug/header from **`TENANT`** config so the same app can send SLMTS context on `3000` and RR context on `3001`.
3. **Login** succeeds for valid credentials; there is no remaining global user-status gate, and pending **membership** does not block login.
4. **`/api/auth/me`** is the source for portals: use `hasActiveMembership` and `memberships`, not only JWT fields.
5. **Super-admin** without any org membership still bypasses `requireOrgRole` (and the compatibility alias `requireRole`) via `isSuperAdmin` on the server for typical org routes; **exception:** **`/api/learning/*`** always requires **`X-Tenant-Slug`** plus an **active** membership in the resolved org (**no** super-admin-only access). Student UI still skips the pending gate for `isSuperAdmin`.
6. **`POST /api/auth/switch-org`** only succeeds when the target **`orgId`** has an **active** membership; pending orgs return **403**. Authenticated requests that ran through **`jwtAuth`** expose **`req.orgId`** (mirror of JWT `currentOrgId`).
7. **Admin shell** now exposes a header org switcher whenever the current admin has more than one switchable active org; org-admin users only see active orgs where they still have admin access, while super-admins can switch across all active memberships.
8. After admin org switch, the portal refreshes **`auth/me`** and invalidates org-sensitive query families before `router.refresh()`. Local verification on the slice branch confirmed RR content collapsed to the single RR track and SLMTS content restored to the 10 SLMTS tracks after switching back.
9. **Super-admin** uses **`GET /api/auth/admin/users`** (+ mutations) for user governance; the admin user-management screen now exposes a dedicated organization filter that drives the existing server-side **`orgSlug`** query parameter, and the returned status-tab counts now stay aligned with the active org filter instead of remaining global. **Org admins** use **`GET /api/admin/directory/users`** for in-org student/instructor pickers (requires JWT org context).
10. **`GET /api/admin/audit-logs`** now respects authority boundaries using physical `audit_logs.org_id`: super-admin sees the full audit stream, org admins see only current-org rows, and platform rows (`org_id IS NULL`) remain super-admin only.
11. **Pass B media/content flows** now reject or hide foreign-org audio, text segment, media-segment, and mapping rows even when IDs are guessed correctly.
12. **Batch and learning progress** now use physical `student_progress.org_id`; active enrollment semantics are enforced per org via a partial unique index on `(org_id, student_id)` for `status = 'active'`, and foreign-org enrollment drop attempts no longer mutate the target row.
13. **Membership approve/reject** updates **`user_organizations`** only; org-only admins receive **403** on governance routes.
14. **Legacy DB columns are gone.** `users.roles`, `users.status`, and `users_status_check` were removed in slice `1.4`; live code and scripts now use memberships plus `isSuperAdmin` only.
15. **Student auth and portal surfaces** now split branding intentionally: the auth page's **left hero stays Narada-branded** across tenants, while the auth form area, root metadata, authenticated shared shell, and pending-approval surface resolve tenant-specific branding from typed config under [`apps/student-portal/src/config/tenants/`](../../../apps/student-portal/src/config/tenants/).
16. **Portal-initiated Google OAuth now preserves tenant context and return target.** Student/admin auth pages send tenant slug and return intent to `/auth/google`, the server mints and verifies a signed OAuth `state`, the callback resolves tenant context from that verified state before falling back to query/header/body/default resolution, and successful callbacks redirect back to the originating portal instance instead of always using the single configured `FRONTEND_URL`.
17. **OAuth callback failures are now surfaced on the auth pages.** The callback redirects failed or unauthorized flows back to `/` with explicit error codes (`auth_failed`, `session_failed`, `access_denied`) instead of sending users into confusing protected-route redirects; admin callbacks also clear the auth cookie if the Google account lacks admin access.
18. **Local dev callback safety now matches the documented ports.** In non-production environments, safe post-auth redirects explicitly accept the documented portal origins on `3000`, `3001`, and `3010` in addition to configured origins so the RR local instance continues to work even if a developer's local env has stale CORS values.
19. **Google OAuth now follows the same membership policy as local register and second-org join.** New Google users or existing users without a membership in the current tenant get a **pending** membership for that tenant; existing **pending** memberships stay pending, **active** memberships log in normally, and **inactive** / **rejected** memberships are preserved instead of being silently reopened.
20. **`POST /api/auth/request-membership`** now supports the real 6.3 path: an authenticated user can request access to the current tenant without creating a second account. The route is idempotent for active/pending memberships and preserves inactive/rejected memberships instead of silently reopening them.
21. **Student portal access is now tenant-scoped.** The portal derives current-tenant membership state from `memberships[]`, not just global `hasActiveMembership`, so an SLMTS-active user on the RR portal can still see RR pending/no-membership states correctly.
22. **Student portal auto-switches only once per tenant org.** If the current tenant has an active membership but the JWT still points at another org, the portal attempts `POST /api/auth/switch-org`; failures are latched to avoid retry loops and surface a user-visible error instead of spinning forever.
23. **`/api/learning/*` org context follows the student build tenant, not JWT `currentOrgId`.** Callers must send **`X-Tenant-Slug`**; the student portal **`apiRequest`** wrapper adds it automatically. **`/api/content/*`** and other routes still use JWT org context unless extended in a future slice.

---

## Pilot gate status

- **Checklist 6.1 is now validated** on a fresh local database.
- **Checklist 6.2 is now validated** with a dedicated RR isolation smoke harness.
- **Checklist 6.3 is now validated** with a dedicated second-org join smoke harness plus tenant-scoped student-session helper coverage.
- **Checklist 6.4 is now documented** across the execution docs using the existing 6.1–6.3 evidence; no new runtime verification was added for this closeout step.
- Fresh baseline passed via `npm run build:types`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, and `npm run check`.
- Browser verification confirmed the end-to-end SLMTS flow for `pilot+1747051589@test.local`:
  - self-serve registration and login landed on `http://localhost:3100/pending-approval`
  - visible copy confirmed the `slmts` membership was pending
  - super-admin approval through `POST /api/auth/admin/memberships/:membershipId/approve` succeeded
  - post-approval login reached `http://localhost:3100/my-learning` with normal student content visible
- Supporting high-signal guard checks also passed:
  - `npx tsx scripts/test/contracts/require-super-admin.test.ts`
  - `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`
  - `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`
  - `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`
  - `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`
  - `npx tsx scripts/test/contracts/student-tenant-config.test.ts`
- RR isolation is now covered by `npm run test:rr-isolation-smoke`, which logs in with the seeded super-admin (`SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD`), creates temporary dual-org marker data, proves the default session remains on SLMTS, switches to RR through `POST /api/auth/switch-org`, verifies that list endpoints plus direct track/batch lookups stay org-scoped in both directions, and asserts **`/api/learning/tracks`** isolation via **`X-Tenant-Slug`** (including **403** when the header is missing/invalid and **403** `TENANT_MEMBERSHIP_REQUIRED` when RR membership is temporarily **inactive**).
- Second-org join is now covered by `npm run test:second-org-join-smoke`, which registers a new SLMTS user, approves the initial SLMTS membership, requests RR membership through `POST /api/auth/request-membership`, confirms RR stays pending in `/api/auth/me`, verifies `POST /api/auth/switch-org` returns `403` while RR is pending, then approves RR and verifies `switch-org` plus RR-scoped content access succeed afterward.
- Pilot closeout is now complete through **6.4**. The known out-of-scope or deferred gaps are: email invites/notifications, questionnaire-driven onboarding, production subdomain/TLS/cookie `SameSite` and `Domain` behavior outside local dev, and RR onboarding browser coverage beyond the current smoke/API path.

---

## Known out-of-scope pilot gaps

These are now intentionally documented rather than left as implied follow-up:

1. **Email invites and notifications** remain out of scope for this phase; approval and onboarding are still manual and super-admin driven.
2. **Questionnaire-driven onboarding** remains deferred; the current membership-first flow stops at pending membership plus super-admin approval.
3. **Production subdomain/TLS/cookie behavior** remains unverified outside local dev, especially `SameSite` and `Domain` interactions for subdomain routing.
4. **RR browser-only onboarding coverage** remains lighter than SLMTS pilot coverage; RR readiness is currently evidenced by targeted smoke/API validation while public onboarding remains operationally gated.

---

## Not done yet (do not assume)

| Area | Checklist / roadmap | Notes |
| ---- | -------------------- | ----- |
| Governance extras | **api-contract** | Optional: `POST …/users/:userId/memberships`, `DELETE …/memberships/:id` are still not implemented. |
| Non–student-portal **`/api/learning/*` callers** | **platform-org-rbac plan** | **Breaking:** mobile or third-party clients must send **`X-Tenant-Slug`**; there is no JWT-only fallback for learning routes. |

---

## Suggested next slice order (for a new chat)

Use the distinction below so slice selection is not misleading:

1. **DB/runbook remediation:** complete the cleanup in [db-audit-remediation-checklist.md](./db-audit-remediation-checklist.md) so schema authority, reset paths, and seed expectations are explicit.
2. **Optional governance extras:** implement `POST …/users/:userId/memberships` and/or `DELETE …/memberships/:id` only when a real operator workflow needs them.
3. **Operational follow-up:** verify production subdomain/TLS/cookie behavior and expand RR browser-only onboarding coverage when rollout readiness needs deeper production confidence.

Pick one vertical per PR; keep **`git merge --no-ff`** into `multi-tenancy` after `npm run check`.

---

## Fresh Chat Resume Recipe

When continuing in a brand-new chat, do this first:

1. Confirm checkout is on **`multi-tenancy`** and up to date with `origin/multi-tenancy`.
2. Read **this file first**, then re-check [implementation-roadmap.md](./implementation-roadmap.md) and [implementation-checklist.md](./implementation-checklist.md).
3. Treat **1.4-contract** as already merged, **6.1** through **6.4** as already complete, the Layer **4.4** tenant-aware OAuth propagation follow-up as merged, and **slices 5–6** (tenant-scoped **`/api/learning/*`**) as merged.
4. Treat **2.4** and **2.12** as complete, and default next work to the DB/remediation checklist or later operational follow-up rather than reopening auth naming or OAuth policy work. If you touch Layer 2/3 governance or audit behavior again, rerun the targeted checks listed below before merging.

---

## Verification commands

- **Typecheck:** `npm run check` (root `tsc`).
- **Governance event contract:** `npx tsx scripts/test/contracts/identity-governance-events.test.ts`.
- **Governance super-admin gate:** `npx tsx scripts/test/contracts/require-super-admin.test.ts`.
- **Admin user filter helpers:** `npx tsx scripts/test/contracts/admin-user-filters.test.ts`.
- **Governance org filter storage:** `npx tsx scripts/test/contracts/governance-org-filter-storage.test.ts`.
- **Audit visibility:** `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`.
- **Layer 3 schema + guards:** `npx tsx scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`.
- **Layer 3 isolation:** `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`.
- **Layer 3 Pass B schema + guards:** `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`.
- **Layer 3 Pass B script compatibility:** `npx tsx scripts/test/contracts/layer3-pass-b-script-compat.test.ts`.
- **Layer 3 Pass B media isolation:** `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`.
- **Layer 3 Pass B progress/audit isolation:** `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`.
- **Slice 1.4 local auth contract:** `npx tsx scripts/test/contracts/passport-local-membership-auth.test.ts`.
- **Slice 1.4 eligible-student contract:** `npx tsx scripts/test/contracts/batch-eligible-students-membership.test.ts`.
- **Slice 1.4 admin-stats contract:** `npx tsx scripts/test/contracts/admin-stats-membership.test.ts`.
- **Admin org-switcher helper coverage:** `npx tsx scripts/test/contracts/admin-org-switcher-utils.test.ts`.
- **Identity request-membership contract:** `npx tsx scripts/test/contracts/identity-request-membership.test.ts`.
- **OAuth membership parity:** `npx tsx scripts/test/contracts/oauth-membership-parity.test.ts`.
- **Student tenant-config helpers:** `npx tsx scripts/test/contracts/student-tenant-config.test.ts`.
- **Student tenant-session helpers:** `npx tsx scripts/test/contracts/student-tenant-session.test.ts`.
- **DB:** `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed` (see [README.md](./README.md) seed order; first-time dev bootstrap needs `SUPER_ADMIN_PASSWORD`).
- **RR isolation smoke (server running):** `npx tsx scripts/test/smoke/rr-isolation-smoke.test.ts` or `npm run test:rr-isolation-smoke` (set `API_BASE_URL` if the API is not on `http://localhost:5000`; if `SUPER_ADMIN_PASSWORD` is not present in `.env`, supply it inline for the seeded admin login).
- **Second-org join smoke (server running):** `npx tsx scripts/test/smoke/second-org-join-smoke.test.ts` or `npm run test:second-org-join-smoke` (set `API_BASE_URL` if the API is not on `http://localhost:5000`; if `SUPER_ADMIN_PASSWORD` is not present in `.env`, supply it inline for the seeded admin login).
- **Smoke (optional, server running):** `npx tsx scripts/test/smoke/api-smoke-test.ts` — auth section includes register + pending login; when seeded **super-admin** login succeeds: **`GET /api/auth/admin/users`** (expects `memberships[]` on users), **`GET /api/admin/directory/users`**, **`POST /api/auth/switch-org`** (403 unknown org; 200 when switching between active `rr` and `slmts` per seed data).

---

## Doc map (this folder)

| Document | Role |
| -------- | ---- |
| **This file** | Status + handoff |
| [implementation-roadmap.md](./implementation-roadmap.md) | Sequenced slices by layer |
| [implementation-checklist.md](./implementation-checklist.md) | Checkbox execution |
| [db-audit-remediation-checklist.md](./db-audit-remediation-checklist.md) | Canonical DB/reset/seed support matrix + audit cleanup tracker |
| [api-contract-changes.md](./api-contract-changes.md) | Target API/JWT contracts (some sections are ahead of remaining work) |
| [verification-strategy.md](./verification-strategy.md) | How to prove each layer |
| [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) | DB column removal gate for slice 1.4 |
| [task-coverage-matrix.md](./task-coverage-matrix.md) | Alternate MT-* sequencing (**see warning inside** — IDs do not match roadmap slice numbers 1:1) |
| [product-context.md](./product-context.md), [architecture-decisions.md](./architecture-decisions.md), [schema-design.md](./schema-design.md) | Product and schema intent |

---

## Ambiguity resolved: roadmap vs task matrix IDs

- **Roadmap** uses labels like **2.1**, **2.2**, **2.3** (org *switch*), **2.4** (governance).
- **[task-coverage-matrix.md](./task-coverage-matrix.md)** uses **MT-2.x** with a *different* ordering. **Trust the roadmap + checklist for slice order**; use the matrix as a secondary file list, not as slice numbering.

When in doubt: **roadmap slice title + checklist item number** win.
