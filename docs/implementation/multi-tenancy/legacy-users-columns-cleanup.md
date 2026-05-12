# Legacy `users.roles` / `users.status` cleanup tracker

Physical columns `users.roles`, `users.status`, and constraint `users_status_check` remain until **slice `slice-1.4-schema-contract`** (checklist **1.4-contract**). Layer 2 work must migrate every consumer to `user_organizations` and `users.is_super_admin`.

Current execution baseline: the branch is now documented through Layer **2.1–2.5**, Layer **3** Pass A/B, student Layer **4.1 / 4.2 / 4.4**, admin **5.1–5.4**, and pilot closeout through checklist **6.4**. This tracker remains the gate for the blocked schema-contract slice, not a summary of the overall multi-tenancy rollout.

When every row below is checked, run slice 1.4 to drop the columns and regenerate the contract migration.

## Layer 2 progress (JWT vs database)

As of the current `multi-tenancy` baseline:

- **JWT / `req.user` (post–2.1):** No global `roles` / `status` claims; use `orgRoles`, `orgMembershipStatus`, `isSuperAdmin`, `currentOrgId` ([`server/auth/jwt.utils.ts`](../../../server/auth/jwt.utils.ts)).
- **Database columns:** Still read or written in the remaining paths listed below (Passport **inactive** check, `IdentityService` approve/disable, admin user listing, seeds, etc.). Rows in the tables below track **removal of dependency on DB columns**, not the broader rollout work that already landed after Layer 2. This tracker was refreshed for slice `1.4` planning so already-migrated guards are marked done and missing script/test consumers are listed explicitly.
- **New self-serve users:** `users.status` is typically **`active`** with pending **`user_organizations`**; admin UIs that list “pending” users by `users.status = pending_approval` will **miss** them until governance/list APIs use membership state ([implementation-status.md](./implementation-status.md)).

## Runtime — server

| Done | File | Notes | Target slice (initial guess) |
| ---- | ---- | ----- | ---------------------------- |
| [x] | [server/auth/passport-config.ts](../../../server/auth/passport-config.ts) | Local and Google auth now ignore removed global status columns; membership context drives access after login. | 2.1–2.6 |
| [x] | [server/routes/identity.routes.ts](../../../server/routes/identity.routes.ts) | Governance routes and query params are fully membership-native. | 2.9–2.11 |
| [x] | [server/modules/identity-access/service.ts](../../../server/modules/identity-access/service.ts) | Legacy user-level role/status helpers removed; service is membership-first end to end. | 1.4 |
| [x] | [server/modules/identity-access/storage.ts](../../../server/modules/identity-access/storage.ts) | User creation/governance hydration no longer writes or returns legacy role/status fields. | 1.4 |
| [x] | [server/modules/system-admin/storage.ts](../../../server/modules/system-admin/storage.ts) | Admin dashboard counts now aggregate from membership rows, not user status. | 2.9 / 1.4 |
| [x] | [server/shared/middleware/auth.ts](../../../server/shared/middleware/auth.ts) | `requireRole` name is legacy, but the middleware already reads `orgRoles` + `isSuperAdmin`, not DB columns. | 2.4 |
| [x] | [server/modules/batch-cohort/storage.ts](../../../server/modules/batch-cohort/storage.ts) | `listEligibleStudents()` now reads active org memberships with `student` role. | 2.4 / 3.x |
| [x] | [server/routes/batch.routes.ts](../../../server/routes/batch.routes.ts) | Route auth already reads `orgRoles` / `isSuperAdmin`; no direct DB-column dependency remains here. | 2.4 |
| [x] | [server/routes/learning.routes.ts](../../../server/routes/learning.routes.ts) | Route auth already reads `orgRoles` / `isSuperAdmin`; no direct DB-column dependency remains here. | 2.4 |

Historical SQL only (no app runtime): [server/migrations/004_bundle_c_constraint_hardening.sql](../../../server/migrations/004_bundle_c_constraint_hardening.sql) — **exclude** from cleanup; do not edit for tenancy.

## Runtime — portals

| Done | File | Notes | Target slice (initial guess) |
| ---- | ---- | ----- | ---------------------------- |
| [x] | [apps/admin-portal/src/components/layout/AdminLayout.tsx](../../../apps/admin-portal/src/components/layout/AdminLayout.tsx) | Layout gate already reads `isSuperAdmin` / `orgRoles`. | 5.x |
| [x] | [apps/admin-portal/src/components/auth/AdminAuthPage.tsx](../../../apps/admin-portal/src/components/auth/AdminAuthPage.tsx) | Post-login access gate already reads `isSuperAdmin` / `orgRoles`. | 5.x |
| [x] | [apps/admin-portal/src/hooks/useRoleGuard.ts](../../../apps/admin-portal/src/hooks/useRoleGuard.ts) | Client guard already reads `isSuperAdmin` / `orgRoles`. | 2.x / 5.x |
| [x] | [apps/admin-portal/src/app/admin/content/page.tsx](../../../apps/admin-portal/src/app/admin/content/page.tsx) | Content page gate already reads `isSuperAdmin` / `orgRoles`. | 2.x |
| [x] | [apps/admin-portal/src/components/admin/UserList.tsx](../../../apps/admin-portal/src/components/admin/UserList.tsx) | Grid and tabs now use membership-only status vocabulary. | 1.4 |
| [x] | [apps/admin-portal/src/lib/hooks/useAdminUsers.ts](../../../apps/admin-portal/src/lib/hooks/useAdminUsers.ts) | Governance response typing now exposes membership-native counts only. | 1.4 |
| [x] | [apps/admin-portal/src/lib/admin-user-filters.ts](../../../apps/admin-portal/src/lib/admin-user-filters.ts) | Client filter vocabulary now serializes `pending` directly. | 1.4 |
| [x] | [apps/admin-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/admin-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI no longer reads legacy account roles/status directly. | 2.x |
| [x] | [apps/student-portal/src/app/(portal)/layout.tsx](../../../apps/student-portal/src/app/(portal)/layout.tsx) | Student layout already uses tenant-scoped session access state and `isSuperAdmin`. | 2.x |
| [x] | [apps/student-portal/src/hooks/useRoleGuard.ts](../../../apps/student-portal/src/hooks/useRoleGuard.ts) | Client guard already reads `isSuperAdmin` / `orgRoles`. | 2.x |
| [x] | [apps/student-portal/src/components/instructor/InstructorStudentList.tsx](../../../apps/student-portal/src/components/instructor/InstructorStudentList.tsx) | Instructor UI no longer reads legacy account roles/status directly. | 2.x |

## Scripts and tests (fix in slice 1.4 or alongside last Layer 2 item)

| Done | File | Notes |
| ---- | ---- | ----- |
| [x] | [scripts/test/api-smoke-test.ts](../../../scripts/test/api-smoke-test.ts) | Governance + directory smoke paths updated |
| [x] | [scripts/test/layer3-pass-b-progress-audit-isolation.test.ts](../../../scripts/test/layer3-pass-b-progress-audit-isolation.test.ts) | Fixture lookup now resolves students through active org memberships. |
| [x] | [scripts/test/auth-test.ts](../../../scripts/test/auth-test.ts) | Helper now approves memberships instead of toggling removed user status. |
| [x] | [scripts/seed/create-approved-users.ts](../../../scripts/seed/create-approved-users.ts) | Seed now creates active SLMTS memberships with membership roles. |
| [x] | [scripts/seed/create-sample-users.ts](../../../scripts/seed/create-sample-users.ts) | Seed now creates pending SLMTS student memberships. |
| [x] | [scripts/seed/create-30-students.ts](../../../scripts/seed/create-30-students.ts) | Seed now creates active SLMTS student memberships. |
| [x] | [scripts/seed/create-sample-batches.ts](../../../scripts/seed/create-sample-batches.ts) | Instructor lookup now uses active SLMTS membership roles. |
| [x] | [scripts/seed/assign-secondary-instructors.ts](../../../scripts/seed/assign-secondary-instructors.ts) | Instructor lookup now uses active SLMTS membership roles. |
| [x] | [scripts/utils/list-users.ts](../../../scripts/utils/list-users.ts) | CLI output now summarizes memberships by org. |
| [x] | [scripts/utils/full-proficiency-reset.ts](../../../scripts/utils/full-proficiency-reset.ts) | Already migrated to active `user_organizations` memberships plus chapter org scoping. |
| [x] | [scripts/utils/check-instructor-batches.ts](../../../scripts/utils/check-instructor-batches.ts) | Utility no longer reads removed global role/status fields. |
| [x] | [scripts/utils/test-e2e-batches.ts](../../../scripts/utils/test-e2e-batches.ts) | E2E helper no longer reads removed global role/status fields. |
| [x] | [scripts/utils/update-user-role.ts](../../../scripts/utils/update-user-role.ts) | Utility now updates SLMTS membership roles instead of `users.roles`. |

## Sign-off for slice 1.4

- [x] All rows above checked.
- [x] `npm run check` passes with columns removed.
- [x] `npm run db:reset` on empty DB after contract migration.
- [x] Update [verification-strategy.md](./verification-strategy.md) slice 1.4 checklist with date / commit.
