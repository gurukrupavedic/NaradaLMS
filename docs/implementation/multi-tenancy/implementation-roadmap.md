# Implementation Roadmap: Multi-Tenancy

This roadmap sequences work after Waves 1--2 are locked. It assumes **backend-first** delivery and a **clean dev DB reset** (no legacy migration).

References:

- [architecture-decisions.md](./architecture-decisions.md)
- [schema-design.md](./schema-design.md)
- [api-contract-changes.md](./api-contract-changes.md)

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

**Goal:** Org and membership tables exist; global `users.roles` / `users.status` removed; `users.is_super_admin` added.

**Slices:**

1. **1.1 Schema migration (clean DB)**
   - Add `organizations`, `user_organizations`.
   - Add `is_super_admin` on `users`.
   - Drop `users.roles`, `users.status`, and related CHECKs (per [schema-design.md](./schema-design.md)).
   - Generate/commit Drizzle migration.

2. **1.2 Seed baseline orgs**
   - Insert `slmts`, `rr` (status per operational choice).
   - Document slugs used by tenant config and API (`slmts`, `rr`).

3. **1.3 Dev bootstrap**
   - Seed at least one super-admin account and minimal SLMTS memberships for smoke testing.
   - No production hosting assumptions.

**Done when:** Migrations apply on empty DB; typecheck shows no broken references to removed columns (may require Layer 2 for full compile green).

---

## Layer 2: Identity, JWT, and governance APIs

**Goal:** Auth flow is membership-aware; super-admin owns user governance; org context can be carried on the session (JWT).

**Slices:**

2. **2.1 JWT and Express typing**
   - Replace global `roles`/`status` claims with `isSuperAdmin`, `currentOrgId`, `orgRoles`, optional `orgMembershipStatus`.
   - Update `server/auth/jwt.utils.ts`, `server/shared/types.ts`, `server/middleware/jwt-auth.middleware.ts`.

3. **2.2 Login / register behavior**
   - Register: create user + **pending** membership for tenant inferred from request (header or agreed dev convention).
   - Login: allow authentication even when user has **no active** memberships; return state for pending UI (per [product-context.md](./product-context.md)).
   - Align with [api-contract-changes.md](./api-contract-changes.md) (remove dependence on `IdentityService.authenticateLocal` blocking on global status).

4. **2.3 Org switch**
   - `POST /api/auth/switch-org` (or equivalent): validate membership, reissue JWT.

5. **2.4 Super-admin-only user management APIs**
   - Replace or extend `/api/auth/admin/*` so only `is_super_admin` can approve/reject memberships, assign org roles, grant/revoke super-admin.
   - Org admins retain non-user routes only (content/batches/audit within org).

6. **2.5 Event and audit alignment**
   - Emit membership-centric events; log governance actions with `org_id` null where platform-scoped (per architecture decisions).

**Done when:** Super-admin can list users with memberships, approve pending membership, assign org roles; org admin cannot hit user-governance routes; login/register match pending-access story.

---

## Layer 3: Org-scoped data isolation

**Goal:** Content, batches, progress, and related rows are filtered by `org_id`; cross-org leakage is impossible by construction for scoped routes.

**Slices:**

7. **3.1 Pass A — `org_id` on core tables**
   - `tracks`, `chapters`, `batches`, `enrollments`
   - Backfill seed data to SLMTS org; enforce NOT NULL after backfill.
   - Update uniques: e.g. `tracks.title` -> `UNIQUE (org_id, title)` (coordinate with [schema-design.md](./schema-design.md)).

8. **3.2 Pass B — remaining scoped tables**
   - `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, `audit_logs` (nullable `org_id` for platform rows as designed).

9. **3.3 Middleware and handlers**
   - Resolve `req.orgId` from JWT + membership validation.
   - Enforce org filter on all CRUD for scoped resources.
   - Revisit enrollment: partial unique “one active enrollment per student” may need org-scoped variant when `enrollments.org_id` exists.

**Done when:** Automated or manual checks show Org A data never returned under Org B context; indexes in place for `org_id` filters.

---

## Layer 4: Student chameleon (config-based white-label)

**Goal:** Student portal reads tenant from `TENANT` (and port in dev); branding is name + logo; no DB themes.

**Slices:**

10. **4.1 Tenant config package**
    - `config/tenants/slmts/`, `config/tenants/rr/` (or repo-equivalent path) with typed config + assets.
    - Document `npm` scripts: SLMTS on `3000`, RR on `3010` (admin `3001`, API `5000` unchanged).

11. **4.2 Replace hardcoded tenant assets in student portal**
    - e.g. auth page and headers: load from tenant config, not static SLMTS-only imports.

12. **4.3 API client: tenant hint**
    - Student portal passes agreed header (e.g. `X-Tenant-Slug`) or uses deploy-time API base config so register/login attach correct org.

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

## Parallel tracks (after Layer 2 is stable)

- **API:** Layer 3 passes A/B, handler updates.
- **Student UI:** Layer 4 chameleon work can proceed in parallel once Layer 2 auth contract is stable.
- **Admin UI:** User management grid filters and super-admin gate — after Layer 2 endpoints.

---

## Branching suggestion

- Long-lived: `multi-tenancy`
- Slice branches: `slice-1.1-org-schema`, `slice-2.2-auth-membership`, etc.
- Merge to long-lived branch after each slice verification (see [verification-strategy.md](./verification-strategy.md)).

---

## Relationship to [roadmap.md](../roadmap.md)

The repo root [roadmap.md](../roadmap.md) (Layer 1--3 tenancy + DB themes) predates the **config-based student branding** and **super-admin user governance** decisions. This file supersedes student theming for v1 (config, not `themes` table). Keep [roadmap.md](../roadmap.md) for historical context; treat **this roadmap** as the execution source for multi-tenancy going forward.
