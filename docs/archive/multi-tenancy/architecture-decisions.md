# Architecture Decisions: Multi-Tenancy Wave 1

Status: locked for implementation planning.

This file captures the agreed decisions that implementation must follow.

---

## 1) Core architecture

1. Single codebase per portal type:
   - `apps/student-portal`
   - `apps/admin-portal`
2. Multi-tenancy is implemented through:
   - org-scoped data (`org_id`)
   - org memberships (`user_organizations`)
   - org-scoped roles
3. Build once, deploy many remains the operating principle.

---

## 2) Branding and tenant presentation

1. Student portal is white-labeled by tenant.
2. Admin portal is always Narada-branded.
3. Tenant branding is config-based, not DB-driven:
   - `config/tenants/<slug>/...`
4. The student auth page keeps a shared Narada-branded left hero across tenants; tenant branding applies to the tenant-facing auth form area and authenticated student experience.
5. No runtime `themes` table for this phase.
6. No admin theme editor for this phase.
7. v1 tenant branding variance is small (primarily name + logo).

---

## 3) Identity, membership, and roles

1. One global user identity per person.
2. Membership is per-org via `user_organizations`.
3. Roles are per-org (`student`, `instructor`, `admin`).
4. Default membership role includes `student`.
5. Global super-admin role is modeled as `users.is_super_admin`.
6. Keep role naming as:
   - global: `is_super_admin`
   - org-scoped: `admin`, `instructor`, `student`

---

## 4) Authority boundaries

### Super-admin only

- User Management module access
- Approve pending memberships
- Add/remove memberships across orgs
- Assign/remove org roles
- Promote/demote super-admins

### Org admin

- Content operations within authorized org(s)
- Batch management within authorized org(s)
- Org-scoped audit visibility

Org admins cannot perform user governance actions.

---

## 5) Registration and access lifecycle

1. New registration:
   - create global user
   - create pending membership in registration org
2. Users with no active memberships can still authenticate and land on pending screen.
3. Existing users can request membership in another org from that org's student portal.
4. Membership activation always requires super-admin approval.
5. Questionnaire flow is deferred and out of scope.

---

## 6) Data model direction

1. Add `organizations` (generic model, not patasala-specific).
2. Add `user_organizations` with:
   - `user_id`
   - `org_id`
   - `roles`
   - `status`
   - timestamps
3. Add `org_id` to tenant-scoped tables in phased rollout.
4. Keep content strictly siloed by org in v1.
5. Remove legacy global role/status semantics from `users`:
   - drop `users.roles`
   - drop `users.status`
6. Add `users.is_super_admin`.

---

## 7) Audit boundaries

1. Org-scoped actions include `org_id` and are visible within org authority.
2. Global user-governance actions are platform-scoped (no org context) and visible to super-admins only.

---

## 8) Local dev and runtime port plan

To avoid collisions with existing services:

- Student portal (SLMTS): `3000`
- Student portal (RR): `3001`
- Admin portal: `3010`
- API server: `5000`

This keeps SLMTS on `3000`, uses `3001` for the RR student instance, and keeps the admin portal isolated on `3010` for local tenant validation.

---

## 9) Production routing direction (long-term)

1. Tenant routing target: subdomains.
   - `slmts.naradalms.com`
   - `rr.naradalms.com`
2. Root-domain behavior is deferred until hosting/domain decisions are finalized.

---

## 10) Delivery approach

1. Backend-first execution:
   - schema
   - server middleware/services
   - API contracts
   - UI updates
2. Reuse and adapt existing user-management module; do not rebuild from scratch.
3. Data migration from current dev state is not required for this phase:
   - reset/purge local DB
   - reseed against the new model

---

## 11) Explicitly deferred

- email notifications and invite flows
- cross-org analytics dashboards
- questionnaire collection/storage
- cross-org content reuse
- production hosting and domain setup details
- advanced seed automation policy for future org creation

---

## 12) Tenant-scoped learning APIs (`/api/learning/*`) — slice 5

Aligned with [platform-org-rbac-and-tenant-scoped-learning-plan.md](./platform-org-rbac-and-tenant-scoped-learning-plan.md) **§3.4 policy A**.

1. **Tenant header is mandatory** for all routes under **`/api/learning/*`**. Clients send **`X-Tenant-Slug`** with an allowlisted value (same slugs as tenant foundation: e.g. `slmts`, `rr`). Missing or unknown slug values yield **403** with stable machine-readable `code` values (`TENANT_SLUG_REQUIRED`, `TENANT_SLUG_INVALID`, `TENANT_ORG_NOT_FOUND`).
2. **Org resolution:** the server maps slug → `organizations` row and sets **`req.orgId`** to that org for the learning router chain. This runs **after** `jwtAuth` (which still runs `attachOrgContext` from JWT); the learning middleware **overwrites** `req.orgId` for learning only.
3. **Active membership required:** the user must have **`user_organizations.status === 'active'`** for `(user, org)`. There is **no** `is_super_admin`-only bypass for these routes (**§3.4 A**). Inactive or missing membership yields **403** with `TENANT_MEMBERSHIP_REQUIRED` (or related messaging).
4. **Student portal:** the shared **`apiRequest`** wrapper merges **`X-Tenant-Slug`** from build-time tenant config so browser learning calls stay aligned with the deployed tenant instance.
5. **CORS:** browser preflight for student portals must allow **`X-Tenant-Slug`** on credentialed requests; server CORS **`allowedHeaders`** includes it.
6. **Out of scope for this slice:** **`/api/content/*`** and other org-scoped routes continue to use JWT **`currentOrgId`** → `req.orgId` unless a future slice extends the same header pattern.
