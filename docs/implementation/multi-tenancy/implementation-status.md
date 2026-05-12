# Multi-tenancy — implementation status and handoff

**Purpose:** Single entry point for humans and agents continuing work in a **new chat**. It reflects what is already merged to the integration branch **`multi-tenancy`**, how the system behaves today, known gaps, and the recommended next steps.

**Execution source of truth:** [implementation-roadmap.md](./implementation-roadmap.md) and [implementation-checklist.md](./implementation-checklist.md). This file does not replace them; it **summarizes current reality** so the roadmap/checklist are easier to interpret.

**Last updated:** Reflects Layer **1** through **1.4 contract** (including fresh-DB verification on the merged branch), Layer **2** roadmap slices **2.1–2.5**, Layer **3** Pass A and Pass B, student Layer **4.1 / 4.2 / 4.4**, admin checklist **5.1**–**5.4**, and pilot closeout through checklist **6.4** on the current multi-tenancy slice flow.

---

## Integration branch and git ritual

- **Branch:** `multi-tenancy` (pushed to `origin`). Feature work should use slice branches and merge back with **`git merge --no-ff`**, then **`git push origin multi-tenancy`** after verification (`npm run check` at minimum).
- **Slice naming:** Prefer names aligned with the roadmap. Recent integration merges include:
  - `slice-2.3-switch-org` — `req.orgId`, `attachOrgContext`, `POST /api/auth/switch-org`
  - `slice-2.4-superadmin-governance` — `requireSuperAdmin`, membership governance routes, `GET /api/admin/directory/users`, admin UserList + hooks
  - `slice-2.5-governance-event-alignment` — governance event contract alignment, persisted audit subscriber alignment, org-scoped audit-log visibility
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

---

## Completed work (merged to `multi-tenancy`)

### Layer 1 — tenant foundation

| Roadmap / checklist | What was delivered |
| ------------------- | ------------------- |
| **1.1–1.4** (expand / seed / bootstrap / contract) | `organizations`, `user_organizations`, `users.is_super_admin`, and the generated contract migration [`0004_dapper_zzzax.sql`](../../../migrations/0004_dapper_zzzax.sql) that removes `users.roles`, `users.status`, and `users_status_check`. Drizzle schema lives in `@narada/types`; SQL lives under repo root [`migrations/`](../../../migrations/). Remaining seeds/scripts/bootstrap flows were also migrated so the fresh reset path works without the removed columns. |
| **1.5** | `npm run db:seed-orgs` — orgs `slmts`, `rr`. See [`server/seed-organizations.ts`](../../../server/seed-organizations.ts). |
| **1.6** | `npm run db:seed-dev` — super-admin for `ADMIN_EMAIL`, SLMTS active + RR **pending** memberships. See [`server/seed-dev-bootstrap.ts`](../../../server/seed-dev-bootstrap.ts). Requires `ADMIN_EMAIL`; new super-admin creation needs `DEV_SUPERADMIN_PASSWORD` (see script / `.env.example`). |

Contract verification now also has focused regression coverage for the last high-risk consumers that blocked slice `1.4`: local passport auth without global status gates, membership-based eligible-student selection, and membership-based admin stats (see the verification list below).

### Layer 2 — slices implemented so far

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **2.1** JWT + Express typing | JWT claims: `isSuperAdmin`, `currentOrgId`, `orgRoles`, `orgMembershipStatus` (no global `roles`/`status` in token). `verifyToken` rejects legacy token shape. Default org in token: prefer **active** `slmts`, else first active by slug; if none, prefer **pending** `slmts`, else first pending by slug. | [`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) (`getJwtSignClaimsForUser`), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), portals `useAuth` / role guards |
| **2.2** Login / register (membership-first) | Register creates **`user_organizations`** row (`pending`, roles `['student']`) for tenant from **`X-Tenant-Slug`**, optional body `tenantSlug`, or **`DEFAULT_TENANT_SLUG`** / `slmts` ([`server/config.ts`](../../../server/config.ts), [`.env.example`](../../../.env.example)). **Admin email** path: active SLMTS membership (`student`+`admin`, self-approved). Passport local and Google login no longer depend on global user status; access is governed by memberships plus `isSuperAdmin`. Google creates/backfills memberships on the resolved tenant. **Login** returns `loginState` (`hasActiveMembership`, membership summaries). **`GET /api/auth/me`** returns session user + `memberships[]` + `hasActiveMembership`. Student portal: **`/pending-approval`** when authenticated, not super-admin, and no active membership. | [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx) |
| **2.3** Org context + switch-org | **`req.orgId`** set from JWT `currentOrgId` on every `jwtAuth` / `optionalJwtAuth` success via [`attachOrgContext`](../../../server/shared/middleware/org-context.ts). **`requireOrgContext`** returns **403** when `req.orgId` is missing (for Layer 3 composition). **`POST /api/auth/switch-org`** (body `orgId`): requires **active** `user_organizations` row for that org; otherwise **403**; reissues `auth_token` with `currentOrgId` / `orgRoles` / `orgMembershipStatus`. [`getJwtSignClaimsForUser`](../../../server/modules/identity-access/storage.ts) accepts optional `{ targetOrgId }` for switch vs default-org selection. | [`server/middleware/jwt-auth.middleware.ts`](../../../server/middleware/jwt-auth.middleware.ts), [`server/shared/middleware/org-context.ts`](../../../server/shared/middleware/org-context.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts) |
| **2.4** Super-admin governance | **`requireSuperAdmin`** on governance routes under [`/api/auth/admin/…`](../../../server/routes/identity.routes.ts). **`GET /api/auth/admin/users`** returns users with nested **`memberships[]`**; query filters: **`membershipStatus`**, **`role`** (membership role in any org), **`orgSlug`**, **`search`**. **`GET /api/auth/admin/users/:userId`** returns one user + memberships. **`POST`** …`/memberships/:membershipId/{approve,reject,disable,enable}`; **`PATCH`** …`/memberships/:membershipId/roles`; **`POST`** …`/users/:userId/super-admin/{grant,revoke}` (revoke blocks self and last super-admin). **`GET /api/admin/directory/users`** ([`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts)): **`jwtAuth` + `requireAdmin` + `requireOrgContext`** — lists users in **current JWT org** with optional **`membershipRole`** / legacy **`role`** + **`search`** (used by instructor/student pickers). Admin portal: [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) **super-admin gate** + membership-based actions; [`useAdminUsers.ts`](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts); [`useSearchStudents.ts`](../../../apps/admin-portal/src/lib/hooks/useSearchStudents.ts) + [`useBatchRelations.ts`](../../../packages/ui/src/hooks/data/useBatchRelations.ts) call **directory** API, not governance list. | [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) |
| **2.5** Governance event + audit alignment | Membership governance events now use a consistent contract: membership actions publish **`actorUserId`**, **`targetUserId`**, **`membershipId`**, **`orgId`**, and **`timestamp`**; platform-scoped super-admin actions publish **`actorUserId`**, **`targetUserId`**, and **`timestamp`** with **no `orgId`**. **`setMembershipActiveFlag`** now emits **`MembershipEnabled`** / **`MembershipDisabled`**; role updates emit **`MembershipRolesChanged`**. [`initializeEventHandlers`](../../../server/modules/system-admin/events.ts) now auto-logs membership governance and super-admin actions to persisted audit rows with explicit scope metadata in `changes` (`scope: 'org'` vs `scope: 'platform'`). Layer **3.B** now extends that model with physical `audit_logs.org_id` persistence and filtering for org-scoped rows. | [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/system-admin/events.ts`](../../../server/modules/system-admin/events.ts), [`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts), [`server/shared/events/types.ts`](../../../server/shared/events/types.ts), [`scripts/test/identity-governance-events.test.ts`](../../../scripts/test/identity-governance-events.test.ts), [`scripts/test/require-super-admin.test.ts`](../../../scripts/test/require-super-admin.test.ts), [`scripts/test/audit-log-visibility.test.ts`](../../../scripts/test/audit-log-visibility.test.ts) |

### Layer 3 — Pass A core org isolation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **3.A** Core org isolation | Added **`org_id`** to `tracks`, `chapters`, `batches`, and `enrollments` with backfill-to-SLMTS migration **`0002_marvelous_dark_beast.sql`**. Updated uniques to **`tracks (org_id, title)`** and **`batches (org_id, batch_code)`**; added org relations/indexes in `@narada/types`. Core content, batch, learning, and student flows now require **`req.orgId`** and scope reads/writes to the active org. Fresh DB reset now clears both `public` and Drizzle's `drizzle` schema; dev verification also fixed the ESM entrypoint in [`server/seed-vedic-curriculum.ts`](../../../server/seed-vedic-curriculum.ts). Focused checks now cover schema + guard wiring and dual-org isolation. | [`packages/types/src/schema.ts`](../../../packages/types/src/schema.ts), [`migrations/0002_marvelous_dark_beast.sql`](../../../migrations/0002_marvelous_dark_beast.sql), [`server/routes/content.routes.ts`](../../../server/routes/content.routes.ts), [`server/routes/batch.routes.ts`](../../../server/routes/batch.routes.ts), [`server/routes/learning.routes.ts`](../../../server/routes/learning.routes.ts), [`server/routes/student.routes.ts`](../../../server/routes/student.routes.ts), [`scripts/test/layer3-pass-a-schema-and-guards.test.ts`](../../../scripts/test/layer3-pass-a-schema-and-guards.test.ts), [`scripts/test/layer3-pass-a-isolation.test.ts`](../../../scripts/test/layer3-pass-a-isolation.test.ts), [`scripts/test/db-reset.ps1`](../../../scripts/test/db-reset.ps1) |

### Layer 3 — Pass B media / progress / audit isolation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **3.B** Schema + runtime isolation | Added **`org_id`** to `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, and `audit_logs` (nullable for platform rows) in migration **`0003_wakeful_warhawk.sql`**, with deterministic backfills, indexes, and guard rails. Media/content routes and storage now validate parent ownership and active-org ownership on create/read/update/delete, learning and batch progress reads now use physical **`student_progress.org_id`**, active enrollment checks are enforced **per org**, and audit writes/reads now persist/filter on physical **`audit_logs.org_id`** rather than JSON-only metadata. Domain events for content, media, batch, and progress flows now carry enough org/actor data for audit consumers. | [`packages/types/src/schema.ts`](../../../packages/types/src/schema.ts), [`migrations/0003_wakeful_warhawk.sql`](../../../migrations/0003_wakeful_warhawk.sql), [`server/modules/content-publishing/service.ts`](../../../server/modules/content-publishing/service.ts), [`server/modules/media-pipeline/service.ts`](../../../server/modules/media-pipeline/service.ts), [`server/modules/learning-delivery/storage.ts`](../../../server/modules/learning-delivery/storage.ts), [`server/modules/batch-cohort/service.ts`](../../../server/modules/batch-cohort/service.ts), [`server/modules/system-admin/storage.ts`](../../../server/modules/system-admin/storage.ts), [`server/modules/system-admin/events.ts`](../../../server/modules/system-admin/events.ts), [`scripts/test/layer3-pass-b-schema-and-guards.test.ts`](../../../scripts/test/layer3-pass-b-schema-and-guards.test.ts), [`scripts/test/layer3-pass-b-media-isolation.test.ts`](../../../scripts/test/layer3-pass-b-media-isolation.test.ts), [`scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`](../../../scripts/test/layer3-pass-b-progress-audit-isolation.test.ts), [`scripts/test/layer3-pass-b-script-compat.test.ts`](../../../scripts/test/layer3-pass-b-script-compat.test.ts) |

### Layer 4 — student tenant-config foundation, shell branding, and OAuth propagation

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **4.1 / 4.2 / 4.4** Tenant config foundation + shell/OAuth follow-up | Student portal now resolves **`TENANT`** to typed configs for **`slmts`** and **`rr`**, mirrors that tenant into the client runtime for browser-rendered branding, drives tenant-specific branding for the auth form area, root metadata, authenticated shell, and pending-approval surface, builds tenant-aware register headers/body instead of hardcoding **`slmts`**, computes **current-tenant** access state so RR users can request membership, see tenant-specific pending copy, and auto-switch into RR after approval without relying on global `hasActiveMembership`, and now sends tenant slug plus post-auth return intent to `/auth/google` so the server can mint a signed OAuth `state`, safely validate callback redirects, preserve the originating tenant during Google membership creation/backfill, and return callback failures to the auth pages with explicit error codes instead of silent route bounces. The auth page's **left hero remains Narada-branded across tenants by design** so the product identity stays consistent. Dev scripts support the documented dual-instance local setup on **`3000`** and **`3010`**, and local OAuth return handling explicitly allows those documented portal origins even if a developer's CORS env lags behind. | [`apps/student-portal/src/config/tenants/index.ts`](../../../apps/student-portal/src/config/tenants/index.ts), [`apps/student-portal/src/config/tenants/slmts.ts`](../../../apps/student-portal/src/config/tenants/slmts.ts), [`apps/student-portal/src/config/tenants/rr.ts`](../../../apps/student-portal/src/config/tenants/rr.ts), [`apps/student-portal/src/lib/tenant.ts`](../../../apps/student-portal/src/lib/tenant.ts), [`apps/student-portal/src/lib/tenant-session.ts`](../../../apps/student-portal/src/lib/tenant-session.ts), [`apps/student-portal/src/components/auth/StudentAuthPage.tsx`](../../../apps/student-portal/src/components/auth/StudentAuthPage.tsx), [`apps/student-portal/src/app/layout.tsx`](../../../apps/student-portal/src/app/layout.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/next.config.ts`](../../../apps/student-portal/next.config.ts), [`apps/admin-portal/src/components/auth/AdminAuthPage.tsx`](../../../apps/admin-portal/src/components/auth/AdminAuthPage.tsx), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`scripts/test/student-tenant-config.test.ts`](../../../scripts/test/student-tenant-config.test.ts), [`scripts/test/student-tenant-session.test.ts`](../../../scripts/test/student-tenant-session.test.ts), [`scripts/test/oauth-tenant-context.test.ts`](../../../scripts/test/oauth-tenant-context.test.ts) |

---

## Checklist §2 crosswalk (Layer 2 auth / governance)

Use this to map [implementation-checklist.md](./implementation-checklist.md) line items to reality without re-reading the whole server.

| Checklist | Status | Notes |
| --------- | ------ | ----- |
| **2.1** JWT / `verifyToken` / claims | **Done** | See slice **2.1**. |
| **2.2** `Express.User` / typing | **Done** | Includes `Request.orgId` for org context. |
| **2.3** Org context on request | **Done** | `attachOrgContext` + `requireOrgContext`; JWT `currentOrgId` → `req.orgId`. |
| **2.4** `requireOrgRole` + `requireSuperAdmin` | **Partial** | **`requireSuperAdmin`** implemented. **`requireRole`** / **`requireAdmin`** still org-scoped via JWT `orgRoles`; no rename to `requireOrgRole` yet (optional cleanup). |
| **2.5** Register + pending membership | **Done** | Covered in slice **2.2**. |
| **2.6** Login + pending UX | **Done** | Passport + `loginState`; slice **2.2**. |
| **2.7** `GET /api/auth/me` | **Done** | Slice **2.2**. |
| **2.8** `POST /api/auth/switch-org` | **Done** | Slice **2.3**; active membership only. |
| **2.9** Governance on memberships + super-admin gate | **Done** | Slice **2.4**; legacy user-level approve/reject **routes removed**. |
| **2.10** Super-admin grant/revoke | **Done** | Slice **2.4** routes + slice **2.5** event/audit alignment. |
| **2.11** Remove legacy `/api/auth/admin/*` user-status semantics | **Done** | Old approve/reject/roles/disable/enable **user** routes are gone, the service/storage cleanup removed the remaining legacy user-level helpers, and the admin UI now speaks membership status directly. |
| **2.12** OAuth parity with local register | **Not done** | Tenant-aware OAuth propagation is now in place via Layer `4.4`, but broader product-policy parity should still be evaluated explicitly if Google OAuth becomes real product scope; see [api-contract-changes.md](./api-contract-changes.md). |

---

## Admin portal checklist §5 crosswalk (incremental)

| Checklist | Status | Notes |
| --------- | ------ | ----- |
| **5.1** User management super-admin only | **Done** (UI + server) | [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) shows **Super-admin only** for others; APIs return **403**. |
| **5.2** List + memberships + org filter | **Done** | The admin user-management UI now exposes a dedicated org filter with **All organizations**, **SLMTS**, and **RR** options, threads **`orgSlug`** through the governance hook/query key, and aligns the supporting governance queries so both filtered pagination and status-tab counts work without the prior Postgres `SELECT DISTINCT ... ORDER BY` error. Key files: [`apps/admin-portal/src/components/admin/UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx), [`apps/admin-portal/src/lib/hooks/useAdminUsers.ts`](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts), [`apps/admin-portal/src/lib/admin-user-filters.ts`](../../../apps/admin-portal/src/lib/admin-user-filters.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`scripts/test/admin-user-filters.test.ts`](../../../scripts/test/admin-user-filters.test.ts), [`scripts/test/governance-org-filter-storage.test.ts`](../../../scripts/test/governance-org-filter-storage.test.ts). |
| **5.3** Org switcher in admin UI | **Done** | Admin shell now renders an org switcher in the shared header, calls **`POST /api/auth/switch-org`**, refetches **`GET /api/auth/me`**, and invalidates org-scoped admin query families before a conservative `router.refresh()`. Verified locally against a temporary dual-active admin fixture (seeded super-admin password reset + RR membership promoted from pending to active/admin for the verification session). Key files: [`apps/admin-portal/src/components/layout/AdminOrgSwitcher.tsx`](../../../apps/admin-portal/src/components/layout/AdminOrgSwitcher.tsx), [`apps/admin-portal/src/hooks/useSwitchOrg.ts`](../../../apps/admin-portal/src/hooks/useSwitchOrg.ts), [`apps/admin-portal/src/lib/org-switcher.ts`](../../../apps/admin-portal/src/lib/org-switcher.ts), [`packages/ui/src/components/layout/app-shell.tsx`](../../../packages/ui/src/components/layout/app-shell.tsx), [`scripts/test/admin-org-switcher-utils.test.ts`](../../../scripts/test/admin-org-switcher-utils.test.ts). |
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

---

## Current runtime behavior (quick reference)

1. **JWT** carries org context from memberships (active preferred, else pending) plus `isSuperAdmin`.
2. **Register** must target a real org slug; the student portal now derives tenant slug/header from **`TENANT`** config so the same app can send SLMTS context on `3000` and RR context on `3010`.
3. **Login** succeeds for valid credentials; there is no remaining global user-status gate, and pending **membership** does not block login.
4. **`/api/auth/me`** is the source for portals: use `hasActiveMembership` and `memberships`, not only JWT fields.
5. **Super-admin** without any org membership still bypasses `requireRole` via `isSuperAdmin` on the server; student UI also skips the pending gate for `isSuperAdmin`.
6. **`POST /api/auth/switch-org`** only succeeds when the target **`orgId`** has an **active** membership; pending orgs return **403**. Authenticated requests that ran through **`jwtAuth`** expose **`req.orgId`** (mirror of JWT `currentOrgId`).
7. **Admin shell** now exposes a header org switcher whenever the current admin has more than one switchable active org; org-admin users only see active orgs where they still have admin access, while super-admins can switch across all active memberships.
8. After admin org switch, the portal refreshes **`auth/me`** and invalidates org-sensitive query families before `router.refresh()`. Local verification on the slice branch confirmed RR content collapsed to the single RR track and SLMTS content restored to the 10 SLMTS tracks after switching back.
9. **Super-admin** uses **`GET /api/auth/admin/users`** (+ mutations) for user governance; the admin user-management screen now exposes a dedicated organization filter that drives the existing server-side **`orgSlug`** query parameter, and the returned status-tab counts now stay aligned with the active org filter instead of remaining global. **Org admins** use **`GET /api/admin/directory/users`** for in-org student/instructor pickers (requires JWT org context).
10. **`GET /api/admin/audit-logs`** now respects authority boundaries using physical `audit_logs.org_id`: super-admin sees the full audit stream, org admins see only current-org rows, and platform rows (`org_id IS NULL`) remain super-admin only.
11. **Pass B media/content flows** now reject or hide foreign-org audio, text segment, media-segment, and mapping rows even when IDs are guessed correctly.
12. **Batch and learning progress** now use physical `student_progress.org_id`; runtime enrollment semantics allow one active enrollment per org, and foreign-org enrollment drop attempts no longer mutate the target row.
13. **Membership approve/reject** updates **`user_organizations`** only; org-only admins receive **403** on governance routes.
14. **Legacy DB columns are gone.** `users.roles`, `users.status`, and `users_status_check` were removed in slice `1.4`; live code and scripts now use memberships plus `isSuperAdmin` only.
15. **Student auth and portal surfaces** now split branding intentionally: the auth page's **left hero stays Narada-branded** across tenants, while the auth form area, root metadata, authenticated shared shell, and pending-approval surface resolve tenant-specific branding from typed config under [`apps/student-portal/src/config/tenants/`](../../../apps/student-portal/src/config/tenants/).
16. **Portal-initiated Google OAuth now preserves tenant context and return target.** Student/admin auth pages send tenant slug and return intent to `/auth/google`, the server mints and verifies a signed OAuth `state`, the callback resolves tenant context from that verified state before falling back to query/header/body/default resolution, and successful callbacks redirect back to the originating portal instance instead of always using the single configured `FRONTEND_URL`.
17. **OAuth callback failures are now surfaced on the auth pages.** The callback redirects failed or unauthorized flows back to `/` with explicit error codes (`auth_failed`, `session_failed`, `access_denied`) instead of sending users into confusing protected-route redirects; admin callbacks also clear the auth cookie if the Google account lacks admin access.
18. **Local dev callback safety now matches the documented ports.** In non-production environments, safe post-auth redirects explicitly accept the documented portal origins on `3000`, `3001`, and `3010` in addition to configured origins so the RR local instance continues to work even if a developer's local env has stale CORS values.
19. **`POST /api/auth/request-membership`** now supports the real 6.3 path: an authenticated user can request access to the current tenant without creating a second account. The route is idempotent for active/pending memberships and preserves inactive/rejected memberships instead of silently reopening them.
20. **Student portal access is now tenant-scoped.** The portal derives current-tenant membership state from `memberships[]`, not just global `hasActiveMembership`, so an SLMTS-active user on the RR portal can still see RR pending/no-membership states correctly.
21. **Student portal auto-switches only once per tenant org.** If the current tenant has an active membership but the JWT still points at another org, the portal attempts `POST /api/auth/switch-org`; failures are latched to avoid retry loops and surface a user-visible error instead of spinning forever.

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
  - post-approval login reached `http://localhost:3100/vedic-learning` with normal student content visible
- Supporting high-signal guard checks also passed:
  - `npx tsx scripts/test/require-super-admin.test.ts`
  - `npx tsx scripts/test/audit-log-visibility.test.ts`
  - `npx tsx scripts/test/layer3-pass-a-isolation.test.ts`
  - `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts`
  - `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`
  - `npx tsx scripts/test/student-tenant-config.test.ts`
- RR isolation is now covered by `npm run test:rr-isolation-smoke`, which logs in with the seeded super-admin (`ADMIN_EMAIL` + `DEV_SUPERADMIN_PASSWORD`), creates temporary dual-org marker data, proves the default session remains on SLMTS, switches to RR through `POST /api/auth/switch-org`, and verifies that list endpoints plus direct track/batch lookups stay org-scoped in both directions.
- Second-org join is now covered by `npm run test:second-org-join-smoke`, which registers a new SLMTS user, approves the initial SLMTS membership, requests RR membership through `POST /api/auth/request-membership`, confirms RR stays pending in `/api/auth/me`, verifies `POST /api/auth/switch-org` returns `403` while RR is pending, then approves RR and verifies `switch-org` plus RR-scoped content access succeed afterward.
- Pilot closeout is now complete through **6.4**. The known out-of-scope or deferred gaps are: email invites/notifications, questionnaire-driven onboarding, Google OAuth parity unless it becomes real product scope, production subdomain/TLS/cookie `SameSite` and `Domain` behavior outside local dev, and RR onboarding browser coverage beyond the current smoke/API path.

---

## Known out-of-scope pilot gaps

These are now intentionally documented rather than left as implied follow-up:

1. **Email invites and notifications** remain out of scope for this phase; approval and onboarding are still manual and super-admin driven.
2. **Questionnaire-driven onboarding** remains deferred; the current membership-first flow stops at pending membership plus super-admin approval.
3. **Google OAuth parity** remains deferred unless OAuth becomes real product scope; the local credential flow is still the implementation baseline for membership approval behavior.
4. **Production subdomain/TLS/cookie behavior** remains unverified outside local dev, especially `SameSite` and `Domain` interactions for subdomain routing.
5. **RR browser-only onboarding coverage** remains lighter than SLMTS pilot coverage; RR readiness is currently evidenced by targeted smoke/API validation while public onboarding remains operationally gated.

---

## Not done yet (do not assume)

| Area | Checklist / roadmap | Notes |
| ---- | -------------------- | ----- |
| `requireOrgRole` rename (optional) | **2.4** | `requireRole` still enforces org-scoped JWT roles today; rename/alias cleanup is optional only. |
| OAuth parity with local register | **2.12** | Deferred unless Google OAuth becomes real product scope; current flow preserves tenant context and return routing, but broader product-policy parity is still a follow-up decision. |
| Governance extras | **api-contract** | Optional: `POST …/users/:userId/memberships`, `DELETE …/memberships/:id` are still not implemented. |

---

## Suggested next slice order (for a new chat)

Use the distinction below so slice selection is not misleading:

1. **Deferred slice: Checklist 2.12** — OAuth vs membership pending policy. The tenant-aware propagation work is now merged, but broader product-policy parity should still be reprioritized only if Google OAuth becomes real product scope.
2. **Optional cleanup:** decide whether `requireRole` should be renamed to `requireOrgRole` and whether the optional governance extras in [api-contract-changes.md](./api-contract-changes.md) are worth implementing.

Pick one vertical per PR; keep **`git merge --no-ff`** into `multi-tenancy` after `npm run check`.

---

## Fresh Chat Resume Recipe

When continuing in a brand-new chat, do this first:

1. Confirm checkout is on **`multi-tenancy`** and up to date with `origin/multi-tenancy`.
2. Read **this file first**, then re-check [implementation-roadmap.md](./implementation-roadmap.md) and [implementation-checklist.md](./implementation-checklist.md).
3. Treat **1.4-contract** as already merged, **6.1** through **6.4** as already complete, and the Layer **4.4** tenant-aware OAuth propagation follow-up as merged.
4. Default next work to deferred **2.12** unless Google OAuth becomes product scope; optional cleanup work is limited to small governance/auth naming or API-surface follow-ups. If you touch Layer 2/3 governance or audit behavior again, rerun the targeted checks listed below before merging.

---

## Verification commands

- **Typecheck:** `npm run check` (root `tsc`).
- **Governance event contract:** `npx tsx scripts/test/identity-governance-events.test.ts`.
- **Governance super-admin gate:** `npx tsx scripts/test/require-super-admin.test.ts`.
- **Admin user filter helpers:** `npx tsx scripts/test/admin-user-filters.test.ts`.
- **Governance org filter storage:** `npx tsx scripts/test/governance-org-filter-storage.test.ts`.
- **Audit visibility:** `npx tsx scripts/test/audit-log-visibility.test.ts`.
- **Layer 3 schema + guards:** `npx tsx scripts/test/layer3-pass-a-schema-and-guards.test.ts`.
- **Layer 3 isolation:** `npx tsx scripts/test/layer3-pass-a-isolation.test.ts`.
- **Layer 3 Pass B schema + guards:** `npx tsx scripts/test/layer3-pass-b-schema-and-guards.test.ts`.
- **Layer 3 Pass B script compatibility:** `npx tsx scripts/test/layer3-pass-b-script-compat.test.ts`.
- **Layer 3 Pass B media isolation:** `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts`.
- **Layer 3 Pass B progress/audit isolation:** `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`.
- **Slice 1.4 local auth contract:** `npx tsx scripts/test/passport-local-membership-auth.test.ts`.
- **Slice 1.4 eligible-student contract:** `npx tsx scripts/test/batch-eligible-students-membership.test.ts`.
- **Slice 1.4 admin-stats contract:** `npx tsx scripts/test/admin-stats-membership.test.ts`.
- **Admin org-switcher helper coverage:** `npx tsx scripts/test/admin-org-switcher-utils.test.ts`.
- **Identity request-membership contract:** `npx tsx scripts/test/identity-request-membership.test.ts`.
- **Student tenant-config helpers:** `npx tsx scripts/test/student-tenant-config.test.ts`.
- **Student tenant-session helpers:** `npx tsx scripts/test/student-tenant-session.test.ts`.
- **DB:** `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed` (see [README.md](./README.md) seed order; first-time dev bootstrap needs `DEV_SUPERADMIN_PASSWORD`).
- **RR isolation smoke (server running):** `npx tsx scripts/test/rr-isolation-smoke.test.ts` or `npm run test:rr-isolation-smoke` (set `API_BASE_URL` if the API is not on `http://localhost:5000`; if `DEV_SUPERADMIN_PASSWORD` is not present in `.env`, supply it inline for the seeded admin login).
- **Second-org join smoke (server running):** `npx tsx scripts/test/second-org-join-smoke.test.ts` or `npm run test:second-org-join-smoke` (set `API_BASE_URL` if the API is not on `http://localhost:5000`; if `DEV_SUPERADMIN_PASSWORD` is not present in `.env`, supply it inline for the seeded admin login).
- **Smoke (optional, server running):** `npx tsx scripts/test/api-smoke-test.ts` — auth section includes register + pending login; when seeded **super-admin** login succeeds: **`GET /api/auth/admin/users`** (expects `memberships[]` on users), **`GET /api/admin/directory/users`**, **`POST /api/auth/switch-org`** (403 pending RR / 200 active SLMTS per seed data).

---

## Doc map (this folder)

| Document | Role |
| -------- | ---- |
| **This file** | Status + handoff |
| [implementation-roadmap.md](./implementation-roadmap.md) | Sequenced slices by layer |
| [implementation-checklist.md](./implementation-checklist.md) | Checkbox execution |
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
