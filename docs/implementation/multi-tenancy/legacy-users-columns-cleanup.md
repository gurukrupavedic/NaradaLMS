# Legacy `users.roles` / `users.status` cleanup tracker

Physical columns `users.roles`, `users.status`, and constraint `users_status_check` remain until **slice `slice-1.4-schema-contract`** (checklist **1.4-contract**). Layer 2 work must migrate every consumer to `user_organizations` and `users.is_super_admin`.

When every row below is checked, run slice 1.4 to drop the columns and regenerate the contract migration.

## Layer 2 progress (JWT vs database)

As of slices **2.1** and **2.2** merged to `multi-tenancy`:

- **JWT / `req.user` (post–2.1):** No global `roles` / `status` claims; use `orgRoles`, `orgMembershipStatus`, `isSuperAdmin`, `currentOrgId` ([`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts)).
- **Database columns:** Still read/written in many paths (Passport **inactive** check, `IdentityService` approve/disable, admin user listing, seeds, etc.). Rows in the tables below track **removal of dependency on DB columns**, not JWT work already done.
- **New self-serve users:** `users.status` is typically **`active`** with pending **`user_organizations`**; admin UIs that list “pending” users by `users.status = pending_approval` will **miss** them until governance/list APIs use membership state ([implementation-status.md](./implementation-status.md)).

## Runtime — server

| Done | File | Notes | Target slice (initial guess) |
| ---- | ---- | ----- | ---------------------------- |
| [ ] | [server/auth/passport-config.ts](../../../server/auth/passport-config.ts) | Passport session / user shape | 2.1–2.6 |
| [x] | [server/routes/identity.routes.ts](../../../server/routes/identity.routes.ts) | **Governance:** super-admin membership APIs; register/login unchanged (still touch legacy columns). | 2.9–2.11 (partial) |
| [ ] | [server/modules/identity-access/service.ts](../../../server/modules/identity-access/service.ts) | Legacy `approveUser` / `assignRoles` / etc. retained for non-route callers; governance uses membership methods. | 1.4 |
| [ ] | [server/modules/identity-access/storage.ts](../../../server/modules/identity-access/storage.ts) | Governance queries added; legacy user listing helpers remain for scripts. | 1.4 |
| [ ] | [server/modules/system-admin/storage.ts](../../../server/modules/system-admin/storage.ts) | Admin listing / roles | 2.9 |
| [ ] | [server/shared/middleware/auth.ts](../../../server/shared/middleware/auth.ts) | `requireSuperAdmin` added; `requireRole` unchanged | 2.4 |
| [ ] | [server/modules/batch-cohort/storage.ts](../../../server/modules/batch-cohort/storage.ts) | Role/status in batch queries | 2.4 / 3.x |
| [ ] | [server/routes/batch.routes.ts](../../../server/routes/batch.routes.ts) | Batch route auth | 2.4 |
| [ ] | [server/routes/learning.routes.ts](../../../server/routes/learning.routes.ts) | Learning route auth | 2.4 |

Historical SQL only (no app runtime): [server/migrations/004_bundle_c_constraint_hardening.sql](../../../server/migrations/004_bundle_c_constraint_hardening.sql) — **exclude** from cleanup; do not edit for tenancy.

## Runtime — portals

| Done | File | Notes | Target slice (initial guess) |
| ---- | ---- | ----- | ---------------------------- |
| [ ] | [apps/admin-portal/src/components/layout/AdminLayout.tsx](../../../apps/admin-portal/src/components/layout/AdminLayout.tsx) | Layout guards | 5.x |
| [ ] | [apps/admin-portal/src/components/auth/AdminAuthPage.tsx](../../../apps/admin-portal/src/components/auth/AdminAuthPage.tsx) | Post-login UI | 5.x |
| [ ] | [apps/admin-portal/src/hooks/useRoleGuard.ts](../../../apps/admin-portal/src/hooks/useRoleGuard.ts) | Client role guard | 2.x / 5.x |
| [ ] | [apps/admin-portal/src/app/admin/content/page.tsx](../../../apps/admin-portal/src/app/admin/content/page.tsx) | Content page guard | 2.x |
| [x] | [apps/admin-portal/src/components/admin/UserList.tsx](../../../apps/admin-portal/src/components/admin/UserList.tsx) | Membership-based grid + super-admin gate | 2.4 |
| [ ] | [apps/admin-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/admin-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI | 2.x |
| [ ] | [apps/student-portal/src/app/(portal)/layout.tsx](../../../apps/student-portal/src/app/(portal)/layout.tsx) | Student layout guard | 2.x |
| [ ] | [apps/student-portal/src/hooks/useRoleGuard.ts](../../../apps/student-portal/src/hooks/useRoleGuard.ts) | Client role guard | 2.x |
| [ ] | [apps/student-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/student-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI | 2.x |

## Scripts and tests (fix in slice 1.4 or alongside last Layer 2 item)

| Done | File | Notes |
| ---- | ---- | ----- |
| [x] | [scripts/test/api-smoke-test.ts](../../../scripts/test/api-smoke-test.ts) | Governance + directory smoke paths updated |
| [ ] | [scripts/seed/create-approved-users.ts](../../../scripts/seed/create-approved-users.ts) | Seed uses global roles/status |
| [ ] | [scripts/utils/list-users.ts](../../../scripts/utils/list-users.ts) | CLI listing |
| [ ] | [scripts/utils/full-proficiency-reset.ts](../../../scripts/utils/full-proficiency-reset.ts) | Maintenance script |
| [ ] | [scripts/utils/check-instructor-batches.ts](../../../scripts/utils/check-instructor-batches.ts) | Utility |
| [ ] | [scripts/utils/test-e2e-batches.ts](../../../scripts/utils/test-e2e-batches.ts) | E2E helper |

## Sign-off for slice 1.4

- [ ] All rows above checked.
- [ ] `npm run check` passes with columns removed.
- [ ] `npm run db:reset` on empty DB after contract migration.
- [ ] Update [verification-strategy.md](./verification-strategy.md) slice 1.4 checklist with date / commit.
