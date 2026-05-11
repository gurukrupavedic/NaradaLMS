# Multi-tenancy — implementation status and handoff

**Purpose:** Single entry point for humans and agents continuing work in a **new chat**. It reflects what is already merged to the integration branch **`multi-tenancy`**, how the system behaves today, known gaps, and the recommended next steps.

**Execution source of truth:** [implementation-roadmap.md](./implementation-roadmap.md) and [implementation-checklist.md](./implementation-checklist.md). This file does not replace them; it **summarizes current reality** so the roadmap/checklist are easier to interpret.

---

## Integration branch and git ritual

- **Branch:** `multi-tenancy` (pushed to `origin`). Feature work should use slice branches (e.g. `slice-2.3-switch-org`) and merge back with **`git merge --no-ff`**, then **`git push origin multi-tenancy`** after verification (`npm run check` at minimum).
- **Slice naming:** Prefer names aligned with the roadmap (e.g. `slice-2.1-jwt-payload`, `slice-2.2-login-register`).

---

## Completed work (merged to `multi-tenancy`)

### Layer 1 — tenant foundation

| Roadmap / checklist | What was delivered |
| ------------------- | ------------------- |
| **1.1–1.4** (expand) | `organizations`, `user_organizations`, `users.is_super_admin`; legacy `users.roles` / `users.status` **still present** (expand–contract). Drizzle schema in `@narada/types`; SQL under repo root [`migrations/`](../../../migrations/) (e.g. org tables in generated migrations). |
| **1.5** | `npm run db:seed-orgs` — orgs `slmts`, `rr`. See [`server/seed-organizations.ts`](../../../server/seed-organizations.ts). |
| **1.6** | `npm run db:seed-dev` — super-admin for `ADMIN_EMAIL`, SLMTS active + RR pending memberships. See [`server/seed-dev-bootstrap.ts`](../../../server/seed-dev-bootstrap.ts). |

### Layer 2 — slices implemented so far

| Slice | Summary | Key files |
| ----- | ------- | --------- |
| **2.1** JWT + Express typing | JWT claims: `isSuperAdmin`, `currentOrgId`, `orgRoles`, `orgMembershipStatus` (no global `roles`/`status` in token). `verifyToken` rejects legacy token shape. Default org in token: prefer **active** `slmts`, else first active by slug; if none, prefer **pending** `slmts`, else first pending by slug. | [`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts) (`getJwtSignClaimsForUser`), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`server/shared/middleware/auth.ts`](../../../server/shared/middleware/auth.ts), portals `useAuth` / role guards |
| **2.2** Login / register (membership-first) | Register creates **`user_organizations`** row (`pending`, roles `['student']`) for tenant from **`X-Tenant-Slug`**, optional body `tenantSlug`, or **`DEFAULT_TENANT_SLUG`** / `slmts` ([`server/config.ts`](../../../server/config.ts), [`.env.example`](../../../.env.example)). New self-serve users: `users.status = **active**`, legacy `roles = []` (access governed by membership). **Admin email** path: active user + **active** SLMTS membership (`student`+`admin`, self-approved). Passport **does not** block local login on `pending_approval` alone; still blocks **inactive**. Google: new users `active` + pending org on `defaultTenantSlug`; existing users with **no** memberships get a pending row backfilled. **Login** returns `loginState` (`hasActiveMembership`, membership summaries). **`GET /api/auth/me`** returns session user + `memberships[]` + `hasActiveMembership`. Student portal: **`/pending-approval`** when authenticated, not super-admin, and no active membership. | [`server/modules/identity-access/tenant-context.ts`](../../../server/modules/identity-access/tenant-context.ts), [`server/auth/passport-config.ts`](../../../server/auth/passport-config.ts), [`server/modules/identity-access/service.ts`](../../../server/modules/identity-access/service.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts), [`apps/student-portal/src/app/(portal)/pending-approval/page.tsx`](../../../apps/student-portal/src/app/(portal)/pending-approval/page.tsx), [`apps/student-portal/src/app/(portal)/layout.tsx`](../../../apps/student-portal/src/app/(portal)/layout.tsx) |
| **2.3** Org context + switch-org | **`req.orgId`** set from JWT `currentOrgId` on every `jwtAuth` / `optionalJwtAuth` success via [`attachOrgContext`](../../../server/shared/middleware/org-context.ts). **`requireOrgContext`** returns **403** when `req.orgId` is missing (for Layer 3 composition). **`POST /api/auth/switch-org`** (body `orgId`): requires **active** `user_organizations` row for that org; otherwise **403**; reissues `auth_token` with `currentOrgId` / `orgRoles` / `orgMembershipStatus`. [`getJwtSignClaimsForUser`](../../../server/modules/identity-access/storage.ts) accepts optional `{ targetOrgId }` for switch vs default-org selection. | [`server/middleware/jwt-auth.middleware.ts`](../../../server/middleware/jwt-auth.middleware.ts), [`server/shared/middleware/org-context.ts`](../../../server/shared/middleware/org-context.ts), [`server/shared/types.ts`](../../../server/shared/types.ts), [`server/modules/identity-access/storage.ts`](../../../server/modules/identity-access/storage.ts), [`server/routes/identity.routes.ts`](../../../server/routes/identity.routes.ts) |

---

## Current runtime behavior (quick reference)

1. **JWT** carries org context from memberships (active preferred, else pending) plus `isSuperAdmin`.
2. **Register** must target a real org slug; student portal sends `X-Tenant-Slug: slmts` and body `tenantSlug: slmts` for the default SLMTS path.
3. **Login** succeeds for valid credentials unless user is **inactive**; pending **membership** does not block login.
4. **`/api/auth/me`** is the source for portals: use `hasActiveMembership` and `memberships`, not only JWT fields.
5. **Super-admin** without any org membership still bypasses `requireRole` via `isSuperAdmin` on the server; student UI also skips the pending gate for `isSuperAdmin`.
6. **`POST /api/auth/switch-org`** only succeeds when the target **`orgId`** has an **active** membership; pending orgs return **403**. Authenticated requests that ran through **`jwtAuth`** expose **`req.orgId`** (mirror of JWT `currentOrgId`).
7. **Admin “pending users” UI** that filters on `users.status === pending_approval` will **not** list new self-serve signups (they are `active` with **pending membership**). Membership approval APIs and grid filters are **checklist 2.9 / 5.x** — not done yet.

---

## Not done yet (do not assume)

| Area | Checklist / roadmap | Notes |
| ---- | -------------------- | ----- |
| `requireOrgRole` / `requireSuperAdmin` split | **2.4** | Today `requireRole` checks `orgRoles` and super-admin bypasses; formal rename/split is optional cleanup. |
| Super-admin-only governance + membership approve/reject | **2.9–2.11** | Legacy `/api/auth/admin/*` still uses global `users` status/roles for listing and approve flows where applicable. |
| Slice **1.4-contract** | **1.4-contract** | Blocked until [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) is fully cleared. |
| Layer 3 `org_id` on content/batches/etc. | **3.x** | Not started. |
| Layer 4 student chameleon | **4.x** | Not started; checklist **4.4** partially overlaps (tenant header on register is done for student path). |

---

## Verification commands

- **Typecheck:** `npm run check` (root `tsc`).
- **DB:** After migrations, `npm run db:seed-orgs` then `npm run db:seed-dev` (see [README.md](./README.md) seed order).
- **Smoke (optional, server running):** `npx tsx scripts/test/api-smoke-test.ts` — auth section expects register with pending membership and **login 200** with `loginState.hasActiveMembership === false`; when seeded admin login succeeds, exercises **`POST /api/auth/switch-org`** (403 pending RR, 200 active SLMTS).

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

- **Roadmap** uses labels like **2.1**, **2.2**, **2.3** (org *switch*).
- **[task-coverage-matrix.md](./task-coverage-matrix.md)** uses **MT-2.x** with a *different* ordering (e.g. MT-2.2 is org middleware, MT-2.4 is register). **Trust the roadmap + checklist for slice order**; use the matrix as a secondary file list, not as slice numbering.

When in doubt: **roadmap slice title + checklist item number** win.
