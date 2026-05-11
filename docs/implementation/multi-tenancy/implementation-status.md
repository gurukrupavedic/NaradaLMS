# Multi-tenancy — implementation status and handoff

**Purpose:** Single entry point for humans and agents continuing work in a **new chat**. It reflects what is already merged to the integration branch **`multi-tenancy`**, how the system behaves today, known gaps, and the recommended next steps.

**Execution source of truth:** [implementation-roadmap.md](./implementation-roadmap.md) and [implementation-checklist.md](./implementation-checklist.md). This file does not replace them; it **summarizes current reality** so the roadmap/checklist are easier to interpret.

**Last updated:** Reflects Layer **1** (expand) and Layer **2** roadmap slices **2.1–2.4** merged to `multi-tenancy` (JWT, membership-first auth, org context + switch-org, super-admin governance, org-admin directory).

---

## Integration branch and git ritual

- **Branch:** `multi-tenancy` (pushed to `origin`). Feature work should use slice branches and merge back with **`git merge --no-ff`**, then **`git push origin multi-tenancy`** after verification (`npm run check` at minimum).
- **Slice naming:** Prefer names aligned with the roadmap. Recent integration merges include:
  - `slice-2.3-switch-org` — `req.orgId`, `attachOrgContext`, `POST /api/auth/switch-org`
  - `slice-2.4-superadmin-governance` — `requireSuperAdmin`, membership governance routes, `GET /api/admin/directory/users`, admin UserList + hooks

---

## Completed work (merged to `multi-tenancy`)

### Layer 1 — tenant foundation

| Roadmap / checklist | What was delivered |
| ------------------- | ------------------- |
| **1.1–1.4** (expand) | `organizations`, `user_organizations`, `users.is_super_admin`; legacy `users.roles` / `users.status` **still present** (expand–contract). Drizzle schema in `@narada/types`; SQL under repo root [`migrations/`](../../../migrations/) (e.g. org tables in generated migrations). |
| **1.5** | `npm run db:seed-orgs` — orgs `slmts`, `rr`. See [`server/seed-organizations.ts`](../../../server/seed-organizations.ts). |
| **1.6** | `npm run db:seed-dev` — super-admin for `ADMIN_EMAIL`, SLMTS active + RR **pending** memberships. See [`server/seed-dev-bootstrap.ts`](../../../server/seed-dev-bootstrap.ts). Requires `ADMIN_EMAIL`; new super-admin creation needs `DEV_SUPERADMIN_PASSWORD` (see script / `.env.example`). |

### Layer 2 — slices implemented so far

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **2.1** JWT + Express typing | JWT claims: `isSuperAdmin`, `currentOrgId`, `orgRoles`, `orgMembershipStatus` (no global `roles`/`status` in token). `verifyToken` rejects legacy token shape. Default org in token: prefer **active** `slmts`, else first active by slug; if none, prefer **pending** `slmts`, else first pending by slug. | [`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) (`getJwtSignClaimsForUser`), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), portals `useAuth` / role guards |
| **2.2** Login / register (membership-first) | Register creates **`user_organizations`** row (`pending`, roles `['student']`) for tenant from **`X-Tenant-Slug`**, optional body `tenantSlug`, or **`DEFAULT_TENANT_SLUG`** / `slmts` ([`server/config.ts`](../../../server/config.ts), [`.env.example`](../../../.env.example)). New self-serve users: `users.status = **active**`, legacy `roles = []` (access governed by membership). **Admin email** path: active user + **active** SLMTS membership (`student`+`admin`, self-approved). Passport **does not** block local login on `pending_approval` alone; still blocks **inactive**. Google: new users `active` + pending org on `defaultTenantSlug`; existing users with **no** memberships get a pending row backfilled. **Login** returns `loginState` (`hasActiveMembership`, membership summaries). **`GET /api/auth/me`** returns session user + `memberships[]` + `hasActiveMembership`. Student portal: **`/pending-approval`** when authenticated, not super-admin, and no active membership. | [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx) |
| **2.3** Org context + switch-org | **`req.orgId`** set from JWT `currentOrgId` on every `jwtAuth` / `optionalJwtAuth` success via [`attachOrgContext`](../../../server/shared/middleware/org-context.ts). **`requireOrgContext`** returns **403** when `req.orgId` is missing (for Layer 3 composition). **`POST /api/auth/switch-org`** (body `orgId`): requires **active** `user_organizations` row for that org; otherwise **403**; reissues `auth_token` with `currentOrgId` / `orgRoles` / `orgMembershipStatus`. [`getJwtSignClaimsForUser`](../../../server/modules/identity-access/storage.ts) accepts optional `{ targetOrgId }` for switch vs default-org selection. | [`server/middleware/jwt-auth.middleware.ts`](../../../server/middleware/jwt-auth.middleware.ts), [`server/shared/middleware/org-context.ts`](../../../server/shared/middleware/org-context.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts) |
| **2.4** Super-admin governance | **`requireSuperAdmin`** on governance routes under [`/api/auth/admin/…`](../../../server/routes/identity.routes.ts). **`GET /api/auth/admin/users`** returns users with nested **`memberships[]`**; query filters: **`membershipStatus`**, legacy **`status`** (e.g. `pending_approval` → pending), **`role`** (membership role in any org), **`orgSlug`**, **`search`**. **`GET /api/auth/admin/users/:userId`** returns one user + memberships. **`POST`** …`/memberships/:membershipId/{approve,reject,disable,enable}`; **`PATCH`** …`/memberships/:membershipId/roles`; **`POST`** …`/users/:userId/super-admin/{grant,revoke}` (revoke blocks self and last super-admin). **`GET /api/admin/directory/users`** ([`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts)): **`jwtAuth` + `requireAdmin` + `requireOrgContext`** — lists users in **current JWT org** with optional **`membershipRole`** / legacy **`role`** + **`search`** (used by instructor/student pickers). Admin portal: [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) **super-admin gate** + membership-based actions; [`useAdminUsers.ts`](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts); [`useSearchStudents.ts`](../../../apps/admin-portal/src/lib/hooks/useSearchStudents.ts) + [`useBatchRelations.ts`](../../../packages/ui/src/hooks/data/useBatchRelations.ts) call **directory** API, not governance list. | [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/routes/admin.routes.ts`](../../../server/routes/admin.routes.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) |

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
| **2.10** Super-admin grant/revoke | **Done** | Slice **2.4**; events emitted from service (audit depth = roadmap **2.5**). |
| **2.11** Remove legacy `/api/auth/admin/*` user-status semantics | **Done** for routes | Old approve/reject/roles/disable/enable **user** routes gone. **`IdentityService.approveUser` / `assignRoles` / etc.** may still exist for scripts — see [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md). |
| **2.12** OAuth parity with local register | **Not done** | Still evaluate against product; see [api-contract-changes.md](./api-contract-changes.md). |

---

## Admin portal checklist §5 crosswalk (incremental)

| Checklist | Status | Notes |
| --------- | ------ | ----- |
| **5.1** User management super-admin only | **Done** (UI + server) | [`UserList.tsx`](../../../apps/admin-portal/src/components/admin/UserList.tsx) shows **Super-admin only** for others; APIs return **403**. |
| **5.2** List + memberships + org filter | **Partial** | List + memberships + **`orgSlug`** / membership filters on **governance** API; no dedicated admin-only “org switcher” UX beyond what JWT + **switch-org** API already provide. |
| **5.3** Org switcher in admin UI | **Not done** | Backend **`POST /api/auth/switch-org`** exists; admin shell still needs explicit switcher + refetch pattern if desired. |
| **5.4** Org admins cannot governance APIs | **Done** | **403** without `isSuperAdmin`; directory uses separate route. |

---

## HTTP API quick reference (multi-tenancy–relevant)

Base URL in dev is typically `http://localhost:5000` with routes under **`/api`** (see [`packages/api-client`](../../../packages/api-client/src/index.ts) — client uses `NEXT_PUBLIC_API_URL` default `http://localhost:5000/api`).

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | -------- |
| POST | `/api/auth/register` | Public (+ rate limit) | Create user + pending (or bootstrap) membership; tenant from header/body/env. |
| POST | `/api/auth/login` | Public (+ rate limit) | Cookie + `loginState` / user session fields. |
| POST | `/api/auth/logout` | Cookie | Clear session. |
| GET | `/api/auth/me` | JWT cookie | Profile + `memberships[]` + `hasActiveMembership`. |
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

---

## Current runtime behavior (quick reference)

1. **JWT** carries org context from memberships (active preferred, else pending) plus `isSuperAdmin`.
2. **Register** must target a real org slug; student portal sends `X-Tenant-Slug: slmts` and body `tenantSlug: slmts` for the default SLMTS path.
3. **Login** succeeds for valid credentials unless user is **inactive**; pending **membership** does not block login.
4. **`/api/auth/me`** is the source for portals: use `hasActiveMembership` and `memberships`, not only JWT fields.
5. **Super-admin** without any org membership still bypasses `requireRole` via `isSuperAdmin` on the server; student UI also skips the pending gate for `isSuperAdmin`.
6. **`POST /api/auth/switch-org`** only succeeds when the target **`orgId`** has an **active** membership; pending orgs return **403**. Authenticated requests that ran through **`jwtAuth`** expose **`req.orgId`** (mirror of JWT `currentOrgId`).
7. **Super-admin** uses **`GET /api/auth/admin/users`** (+ mutations) for user governance; **org admins** use **`GET /api/admin/directory/users`** for in-org student/instructor pickers (requires JWT org context).
8. **Membership approve/reject** updates **`user_organizations`** only; org-only admins receive **403** on governance routes.
9. **Legacy DB columns** `users.roles` / `users.status` still exist and are still read in some paths (Passport inactive check, seeds, old service methods). Pilot listing must use **membership** APIs, not `users.status === pending_approval` alone.

---

## Not done yet (do not assume)

| Area | Checklist / roadmap | Notes |
| ---- | -------------------- | ----- |
| `requireOrgRole` rename (optional) | **2.4** | `requireRole` still org-scoped via JWT `orgRoles`; optional alias/split only. |
| OAuth parity with local register | **2.12** | Review [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts) / Google callback vs product pending story. |
| Governance extras | **api-contract** | Optional: `POST …/users/:userId/memberships`, `DELETE …/memberships/:id` not implemented in slice 2.4. |
| Roadmap **2.5** event/audit alignment | **2.5** | Membership / super-admin actions already published on event bus from [`identity.service`](../../../server/modules/identity-access/service.ts); **persisted audit rows** / full alignment with architecture doc is follow-up. |
| Admin **5.3** org switcher UI | **5.3** | Call existing **`POST /api/auth/switch-org`** + refresh admin queries. |
| Slice **1.4-contract** | **1.4-contract** | Blocked until [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) is fully cleared. |
| Layer 3 `org_id` on content/batches/etc. | **3.x** | Not started; `requireOrgContext` ready for scoped routers. |
| Layer 4 student chameleon | **4.x** | Not started; checklist **4.4** partially overlaps (tenant header on register is done for student path). |
| Pilot gate **6.x** | **6** | End-to-end pilot scenarios in [verification-strategy.md](./verification-strategy.md) — run after Layer 3 + any remaining Layer 2 gaps you care about. |

---

## Suggested next slice order (for a new chat)

1. **Roadmap 2.5** — Audit/event alignment: persist or standardize logging for governance events; confirm `org_id` null for platform actions per [architecture-decisions.md](./architecture-decisions.md).
2. **Checklist 2.12** — OAuth vs membership pending policy (if product requires strict parity with local register).
3. **Checklist 5.3** — Admin portal org switcher wired to **`POST /api/auth/switch-org`** + data refresh.
4. **Layer 3** — `org_id` on domain tables + handler scoping with **`req.orgId`** (see [schema-design.md](./schema-design.md)).
5. **Layer 4** — Tenant config + student chameleon ([README.md](./README.md) port plan :3000 / :3010).

Pick one vertical per PR; keep **`git merge --no-ff`** into `multi-tenancy` after `npm run check`.

---

## Verification commands

- **Typecheck:** `npm run check` (root `tsc`).
- **DB:** After migrations, `npm run db:seed-orgs` then `npm run db:seed-dev` (see [README.md](./README.md) seed order).
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
