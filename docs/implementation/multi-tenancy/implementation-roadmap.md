# Implementation Roadmap: Multi-Tenancy

This roadmap sequences work after Waves 1--2 are locked. It assumes **backend-first** delivery and a **clean dev DB reset** (no legacy migration).

References:

- [architecture-decisions.md](./architecture-decisions.md)
- [schema-design.md](./schema-design.md)
- [api-contract-changes.md](./api-contract-changes.md)
- [implementation-status.md](./implementation-status.md) — **what is already implemented** on `multi-tenancy` (agent handoff)

### Progress on branch `multi-tenancy` (high level)

The following **roadmap slices are implemented and merged** unless your checkout is behind `origin/multi-tenancy`:

- **Layer 1:** 1.1 schema expand (orgs + memberships + `is_super_admin`), 1.2 seed orgs, 1.3 dev bootstrap. **Not** slice 1.4 contract (legacy `users.roles` / `users.status` still in DB).
- **Layer 2:** **2.1**–**2.5** JWT, membership-first auth, org switch, **super-admin governance**, governance event/audit alignment, and org-admin **directory** API; student pending UX unchanged.
- **Layer 3 Pass A:** core org isolation on `tracks`, `chapters`, `batches`, and `enrollments`, plus org-scoped handler/query enforcement and fresh DB verification.
- **Layer 3 Pass B:** physical `org_id` coverage is now in place for media, progress, and audit tables, including backfills, route/service/storage org scoping, and physical `audit_logs.org_id` filtering.
- **Layer 4.1:** tenant config foundation is now merged for the student portal: typed tenant configs for `slmts` / `rr`, `TENANT`-driven auth branding + root metadata, tenant-aware register request building, and dual student dev scripts on `3000` / `3010`.
- **Admin portal:** **5.3** org switcher is now merged; **5.1** and **5.4** are also in place. **5.2** remains partial because the governance API supports `orgSlug` filtering but the current user-management UI does not yet expose a dedicated org filter control.
- **Next up:** continue **Layer 4** with the broader authenticated student-shell branding pass (`4.2` / `4.3`), unless you prefer the smaller admin-portal **5.2** org-filter UI follow-up first.
- **Deferred:** checklist **2.12** OAuth parity unless Google OAuth becomes real product scope — see [implementation-status.md](./implementation-status.md).

---

## Layers (stack order)

Lower layers must complete before higher ones.

```text
Layer 4 — Student chameleon (config + UX polish for white-label)
Layer 3 — Org-scoped data isolation (org_id + query scoping)
Layer 2 — Identity & membership (JWT, super-admin, governance APIs)
Layer 1 — Tenant foundation (organizations + user_organizations + users schema shift)
```

Layer numbers increase toward the user-visible surface; **implement from Layer 1 upward**.

---

## Layer 1: Tenant foundation (schema + seeds)

**Goal:** Org and membership tables exist; `users.is_super_admin` added. Legacy global `users.roles` / `users.status` are **removed only in slice 1.4** after Layer 2 migrates all consumers (expand–contract; see [implementation-checklist.md](./implementation-checklist.md) section 1).

**Slices:**

1. **1.1 Schema expand (clean DB, slice `slice-1.1-org-schema`)**
  - Add `organizations`, `user_organizations`.
  - Add `is_super_admin` on `users`.
  - Commit Drizzle schema + **generated** SQL migrations (`drizzle-kit generate`; dev reset uses `drizzle-kit migrate`). Do **not** drop `users.roles` / `users.status` in this slice.
  - Add [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) to track remaining references until contract slice.
2. **1.2 Seed baseline orgs**
  - Insert `slmts`, `rr` (status per operational choice).
  - Document slugs used by tenant config and API (`slmts`, `rr`).
3. **1.3 Dev bootstrap**
  - Seed at least one super-admin account and minimal SLMTS memberships for smoke testing.
  - No production hosting assumptions.
4. **1.4 Schema contract (slice `slice-1.4-schema-contract`, after Layer 2)**
  - Drop `users.roles`, `users.status`, and `users_status_check` per [schema-design.md](./schema-design.md) once the cleanup tracker is empty.
  - Generate/commit the contract migration.

**Done when:** Migrations apply on empty DB; typecheck stays green after each merge to `multi-tenancy`. No legacy column drops until slice 1.4; after 1.4, no references to removed columns remain.

---

## Layer 2: Identity, JWT, and governance APIs

**Goal:** Auth flow is membership-aware; super-admin owns user governance; org context can be carried on the session (JWT).

**Slices:**

1. **2.1 JWT and Express typing**
  - Replace global `roles`/`status` claims with `isSuperAdmin`, `currentOrgId`, `orgRoles`, optional `orgMembershipStatus`.
  - Update `server/auth/jwt.utils.ts`, `server/shared/types.ts`, `server/middleware/jwt-auth.middleware.ts`.
2. **2.2 Login / register behavior**
  - Register: create user + **pending** membership for tenant inferred from request (header or agreed dev convention).
  - Login: allow authentication even when user has **no active** memberships; return state for pending UI (per [product-context.md](./product-context.md)).
  - Align with [api-contract-changes.md](./api-contract-changes.md) (remove dependence on `IdentityService.authenticateLocal` blocking on global status).
3. **2.3 Org switch**
  - `POST /api/auth/switch-org` (or equivalent): validate membership, reissue JWT.
4. **2.4 Super-admin-only user management APIs**
  - Replace or extend `/api/auth/admin/`* so only `is_super_admin` can approve/reject memberships, assign org roles, grant/revoke super-admin.
  - Org admins retain non-user routes only (content/batches/audit within org).
5. **2.5 Event and audit alignment**
  - Emit membership-centric events; log governance actions with `org_id` null where platform-scoped (per architecture decisions).
  - Standardize governance payloads around `actorUserId`, `targetUserId`, `membershipId`, `orgId` (membership actions only), and `timestamp`.
  - Restrict the audit read path so org admins only see current-org audit rows.
  - Persist scope metadata in audit `changes`; Layer 3 Pass B now also persists physical `audit_logs.org_id` for org-scoped rows.

**Done when:** Super-admin can list users with memberships, approve pending membership, assign org roles; org admin cannot hit user-governance routes; login/register match pending-access story.

---

## Layer 3: Org-scoped data isolation

**Goal:** Content, batches, progress, and related rows are filtered by `org_id`; cross-org leakage is impossible by construction for scoped routes.

**Slices:**

1. **3.1 Pass A — `org_id` on core tables**
  - `tracks`, `chapters`, `batches`, `enrollments`
  - Backfill seed data to SLMTS org; enforce NOT NULL after backfill.
  - Update uniques: e.g. `tracks.title` -> `UNIQUE (org_id, title)` (coordinate with [schema-design.md](./schema-design.md)).
2. **3.2 Pass B — remaining scoped tables**
  - `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, `audit_logs` (nullable `org_id` for platform rows as designed).
3. **3.3 Middleware and handlers**
  - Resolve `req.orgId` from JWT + membership validation.
  - Enforce org filter on all CRUD for scoped resources.
  - Runtime enrollment semantics are now one active enrollment per org; only revisit schema-level uniqueness if product rules or DB enforcement require it later.

**Done when:** Automated or manual checks show Org A data never returned under Org B context; indexes in place for `org_id` filters.

---

## Layer 4: Student chameleon (config-based white-label)

**Goal:** Student portal reads tenant from `TENANT` (and port in dev); branding is name + logo; no DB themes.

**Slices:**

1. **4.1 Tenant config package**
  - `config/tenants/slmts/`, `config/tenants/rr/` (or repo-equivalent path) with typed config + assets.
    - Document `npm` scripts: SLMTS on `3000`, RR on `3010` (admin `3001`, API `5000` unchanged).
    - Status: **merged** on `multi-tenancy` via `slice-4.1-tenant-config`, using the repo-equivalent layout under `apps/student-portal/src/config/tenants/`.
2. **4.2 Replace hardcoded tenant assets in student portal**
  - e.g. auth page and headers: load from tenant config, not static SLMTS-only imports.
  - Status: **partially complete**. Auth page and root metadata are now tenant-config driven; the shared authenticated student shell/header/nav remain follow-up work.
3. **4.3 API client: tenant hint**
  - Student portal passes agreed header (e.g. `X-Tenant-Slug`) or uses deploy-time API base config so register/login attach correct org.
  - Status: **partially complete**. Register now builds tenant-aware header/body from config; broader shared client propagation can stay as the next follow-up if needed.

**Done when:** Running two student dev instances shows correct logo/name per tenant; same code, different env.

---

## Pilot gate (SLMTS-only product readiness)

Before treating SLMTS as “pilot ready”:

1. All Layer 1--3 complete for paths SLMTS uses.
2. User lifecycle: register -> pending -> super-admin approve -> active student in SLMTS.
3. Second-org request: existing user on RR portal -> pending RR membership -> super-admin approve.
4. Isolation smoke: create minimal data in both orgs; verify no cross-org reads.
5. Admin portal: org switcher + super-admin user management works against multi-org list.

RR public onboarding can remain gated operationally (data/flags) even if code supports both tenants.

---

## Slice 1.4: Schema contract (after Layer 2)

This slice is **not** part of the initial Layer 1 expand work. Run branch `slice-1.4-schema-contract` only after:

- Layer 2 auth, JWT, governance, and portals no longer read `users.roles` or `users.status`.
- [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) has zero unchecked items.

Then drop the legacy columns and CHECK in one small migration and re-verify fresh DB + full typecheck.

---

## Parallel tracks (after Layer 2 is stable)

- **API:** Layer 3 passes A/B, handler updates.
- **Student UI:** Layer 4 chameleon work can proceed in parallel once Layer 2 auth contract is stable.
- **Admin UI:** User management grid filters and super-admin gate — after Layer 2 endpoints.

---

## Branching suggestion

- Long-lived: `multi-tenancy`
- Slice branches: `slice-1.1-org-schema`, `slice-1.2-seed-orgs`, `slice-1.3-dev-bootstrap`, `slice-1.4-schema-contract` (after Layer 2), `slice-2.1-jwt-payload`, `slice-2.2-login-register`, `slice-4.1-tenant-config`, etc.
- Merge to long-lived branch after each slice verification (see [verification-strategy.md](./verification-strategy.md)).

---

## Relationship to [roadmap.md](../roadmap.md)

The repo root [roadmap.md](../roadmap.md) (Layer 1--3 tenancy + DB themes) predates the **config-based student branding** and **super-admin user governance** decisions. This file supersedes student theming for v1 (config, not `themes` table). Keep [roadmap.md](../roadmap.md) for historical context; treat **this roadmap** as the execution source for multi-tenancy going forward.