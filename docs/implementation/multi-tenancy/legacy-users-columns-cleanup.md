# Legacy `users.roles` / `users.status` cleanup tracker

Physical columns `users.roles`, `users.status`, and constraint `users_status_check` remain until **slice `slice-1.4-schema-contract`** (checklist **1.4-contract**). Layer 2 work must migrate every consumer to `user_organizations` and `users.is_super_admin`.

When every row below is checked, run slice 1.4 to drop the columns and regenerate the contract migration.

## Runtime — server

| Done | File | Notes | Target slice (initial guess) |
| ---- | ---- | ----- | ---------------------------- |
| [ ] | [server/auth/passport-config.ts](../../../server/auth/passport-config.ts) | Passport session / user shape | 2.1–2.6 |
| [ ] | [server/routes/identity.routes.ts](../../../server/routes/identity.routes.ts) | Register, login, admin routes | 2.5–2.11 |
| [ ] | [server/modules/identity-access/service.ts](../../../server/modules/identity-access/service.ts) | Identity domain logic | 2.5–2.9 |
| [ ] | [server/modules/identity-access/storage.ts](../../../server/modules/identity-access/storage.ts) | DB reads/writes for users | 2.5–2.9 |
| [ ] | [server/modules/system-admin/storage.ts](../../../server/modules/system-admin/storage.ts) | Admin listing / roles | 2.9 |
| [ ] | [server/shared/middleware/auth.ts](../../../server/shared/middleware/auth.ts) | `requireRole` / global role checks | 2.4 |
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
| [ ] | [apps/admin-portal/src/components/admin/UserList.tsx](../../../apps/admin-portal/src/components/admin/UserList.tsx) | User grid columns | 5.2 |
| [ ] | [apps/admin-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/admin-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI | 2.x |
| [ ] | [apps/student-portal/src/app/(portal)/layout.tsx](../../../apps/student-portal/src/app/(portal)/layout.tsx) | Student layout guard | 2.x |
| [ ] | [apps/student-portal/src/hooks/useRoleGuard.ts](../../../apps/student-portal/src/hooks/useRoleGuard.ts) | Client role guard | 2.x |
| [ ] | [apps/student-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/student-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI | 2.x |

## Scripts and tests (fix in slice 1.4 or alongside last Layer 2 item)

| Done | File | Notes |
| ---- | ---- | ----- |
| [ ] | [scripts/test/api-smoke-test.ts](../../../scripts/test/api-smoke-test.ts) | Smoke expectations |
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
