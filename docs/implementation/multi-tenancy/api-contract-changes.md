# API Contract Changes: Multi-Tenancy Wave 2

This document records the backend contract changes that shipped to move from global user role/status to org-scoped membership with super-admin governance.

**Migration sequencing (physical schema):** Layer 2 moved JWT payloads, middleware, and routes to `user_organizations` plus `users.is_super_admin`, and slice **`slice-1.4-schema-contract`** has now removed the physical `users.roles` / `users.status` columns and `users_status_check`. The API contracts below now describe the **live** membership-first behavior unless a section explicitly says otherwise.

**Implementation snapshot:** Slices **1.4**, **2.1**–**2.5**, and **2.12** (schema contract, JWT, membership-first auth, org switch, **super-admin governance APIs** + org-admin directory, governance event/audit alignment, and Google OAuth membership-policy parity) are merged to `multi-tenancy`; checklist **6.3** adds the real authenticated second-org request path through **`POST /api/auth/request-membership`** plus tenant-scoped student pending/no-access handling, and checklist **6.4** now documents the remaining out-of-scope pilot gaps. See [implementation-status.md](./implementation-status.md) for the current merged behavior and optional governance extras (for example add/delete membership routes).

Grounded references:

- `server/routes/identity.routes.ts`
- `server/modules/identity-access/service.ts`
- `server/shared/middleware/auth.ts`
- `server/auth/jwt.utils.ts`
- `server/middleware/jwt-auth.middleware.ts`
- `server/shared/types.ts`

---

## 1) JWT payload changes

**Former** payload (pre–slice 2.1; removed from new tokens):

- `id`
- `email`
- `roles` (global)
- `status` (global)

Live payload:

- `id`
- `email`
- `isSuperAdmin` (global)
- `currentOrgId` (active tenant context for request)
- `orgRoles` (roles for current org only)
- optional: `orgMembershipStatus` (for quick UI state)

Rationale:

- remove dependency on global `roles/status`
- make every authenticated request explicitly org-contextual

---

## 2) Express user typing updates

Current Express augmentation in `server/shared/types.ts` includes the JWT-backed membership fields:

- `isSuperAdmin: boolean`
- `currentOrgId?: string`
- `orgRoles?: string[]`
- `orgMembershipStatus?: 'pending' | 'active' | 'inactive' | 'rejected'`
- `Request.orgId?: string`

There are no remaining `roles` / `status` global fields on `Express.User`.

---

## 3) Auth and authorization middleware

Live guard stack:

1. `authMiddleware` (existing): require authenticated user
2. `requireOrgRole(...roles)`: canonical org-scoped role check against JWT `orgRoles`
3. `requireRole(...roles)`: backward-compatible alias to `requireOrgRole(...roles)`
4. `requireSuperAdmin`: check `user.isSuperAdmin`
5. `requireInstructor` and `requireAdmin`: wrappers around `requireOrgRole`
6. `requireOrgContext`: require `req.orgId` when a route needs resolved org context

Behavior notes:

- super-admin can bypass org role checks for management routes where intended.
- org role checks must never use global role state.

---

## 4) Tenant/org context resolution

Live API org context resolution is session/JWT based:

1. `jwtAuth` populates `req.user.currentOrgId`
2. `attachOrgContext` copies that value onto `req.orgId`
3. `requireOrgContext` returns `403` when org context is missing on scoped routes

Host-based org resolution remains future production follow-up; it is not part of the current server contract.

---

## 5) Identity route surface

Identity/admin endpoints now live on the membership-first model.

### Authentication endpoints

- `POST /api/auth/register`
  - create user if missing
  - create pending membership in tenant inferred from request context
  - returns pending-state response

- `POST /api/auth/login`
  - authenticate credentials
  - if no active memberships: still issue auth cookie and return pending/no-access state
  - if active memberships exist:
    - set default `currentOrgId`
    - include org-scoped claims in JWT

- `POST /api/auth/request-membership`
  - authenticated endpoint for an existing user to request membership in the tenant resolved from request context
  - creates a pending membership when none exists
  - returns explicit result states for already pending, already active, inactive, and rejected memberships

- `POST /api/auth/switch-org`
  - authenticated endpoint
  - validates user has an active membership in the target org
  - reissues JWT with new `currentOrgId` and `orgRoles`

- `GET /api/auth/me`
  - return user profile + memberships summary + current org context

### Super-admin-only user governance endpoints

All gated by `requireSuperAdmin`.

- `GET /api/auth/admin/users`
  - global user list with memberships included
  - supports org/status/search filters

- `GET /api/auth/admin/users/:userId`
  - user details + all memberships + role map

- `POST /api/auth/admin/memberships/:membershipId/approve`
- `POST /api/auth/admin/memberships/:membershipId/reject`
- `POST /api/auth/admin/memberships/:membershipId/disable`
- `POST /api/auth/admin/memberships/:membershipId/enable`

- `PATCH /api/auth/admin/memberships/:membershipId/roles`
  - replace/merge org roles

- `POST /api/auth/admin/users/:userId/super-admin/grant`
- `POST /api/auth/admin/users/:userId/super-admin/revoke`

### Optional governance extras (not implemented in current branch)

- `POST /api/auth/admin/users/:userId/memberships`
  - would add membership in org (default includes student role)
- `DELETE /api/auth/admin/memberships/:membershipId`
  - would remove org membership

Authority boundaries are already settled even though those extras remain out of scope for the current branch.

---

## 6) Service layer shape (`IdentityService`)

Live service capabilities are membership- and super-admin-centric:

1. Account/auth methods
   - `registerUserForOrg(...)`
   - `authenticateLocal(...)`
   - `getEffectiveLoginState(userId)` (active memberships vs pending-only)
2. Membership lifecycle
   - `requestMembership(...)`
   - `approveMembership(...)`
   - `rejectMembership(...)`
   - `setMembershipStatus(...)`
3. Role management (org-scoped)
   - `setMembershipRoles(...)`
4. Super-admin management
   - `grantSuperAdmin(...)`
   - `revokeSuperAdmin(...)`
5. User-management query APIs
   - `listUsersWithMemberships(...)`
   - `getUserWithMemberships(...)`
6. OAuth parity helper
   - `resolveOAuthLogin(...)`

The live identity module is already membership-level governance; legacy user-level approval/status helpers are no longer the contract center.

---

## 7) Admin portal contract impact

Current admin portal expectations:

- only super-admin can access user-management routes
- route payloads include multi-org membership arrays
- org/status/search filters run server-side
- responses include enough metadata for data-grid display without client-side joins
- org-admin pickers use the separate `/api/admin/directory/users` route with current-org scoping

---

## 8) Student portal contract impact

Student portal contract changes:

1. Registration and login responses must include pending/no-active-membership states.
2. Add explicit org join request endpoint for second-org onboarding. **Implemented as `POST /api/auth/request-membership` in the current 6.3 baseline.**
3. Add clear API response codes/messages for:
   - pending membership
   - inactive membership
   - no membership in tenant

Portal should show pending screen when authenticated but lacking active membership for current tenant.

---

## 9) Audit event contract updates

Live identity/governance event semantics are membership/super-admin based:

- `MembershipApproved`
- `MembershipRejected`
- `MembershipEnabled`
- `MembershipDisabled`
- `MembershipRolesChanged`
- `SuperAdminGranted`
- `SuperAdminRevoked`

Current event payload shape:

- actor user id
- target user id
- membership id when applicable
- org id when applicable
- timestamp
- correlation/request id when available

---

## 10) Backward compatibility stance

No backward compatibility bridge is required for this phase because:

- local dev DB reset/reseed is accepted
- old global role/status endpoints can be replaced directly

This allows cleaner API contracts without temporary dual semantics.

---

## 11) Typing sync expectations

1. Auth schemas/types should reflect the live payload shape (no global roles/status).
2. Membership DTOs should cover:
   - `MembershipSummary`
   - `MembershipApprovalRequest`
   - `MembershipRoleUpdate`
3. Admin user-management endpoint schemas/types should expose multi-org data.
4. Portal-facing generated or shared client types should consume the membership-first contracts.

---

## 12) Deferred API contracts

- questionnaire submission payloads
- email invite/notification endpoints
- cross-org analytics endpoints
