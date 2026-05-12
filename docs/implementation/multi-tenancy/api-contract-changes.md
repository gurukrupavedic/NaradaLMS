# API Contract Changes: Multi-Tenancy Wave 2

This document defines backend contract changes needed to move from global user role/status to org-scoped membership with super-admin governance.

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

Target payload:

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

Current Express augmentation in `server/shared/types.ts` includes:

- `roles: string[]`
- `status: string`

Target typing:

- `isSuperAdmin: boolean`
- `currentOrgId?: string`
- `orgRoles?: string[]`
- `orgMembershipStatus?: 'pending' | 'active' | 'inactive' | 'rejected'`

Update middleware and route assumptions accordingly.

---

## 3) Auth and authorization middleware

### Current

`requireRole` in `server/shared/middleware/auth.ts` evaluates global `user.roles`.

### Target

Introduce layered guards:

1. `authMiddleware` (existing): require authenticated user
2. `requireOrgContext`: require resolved org context
3. `requireOrgRole(...roles)`: check roles against membership in current org
4. `requireSuperAdmin`: check `user.isSuperAdmin`
5. Keep `requireInstructor` and `requireAdmin` as wrappers around `requireOrgRole`

Behavior notes:

- super-admin can bypass org role checks for management routes where intended.
- org role checks must never use global role state.

---

## 4) Tenant/org context resolution

Add an org context resolver middleware for API routes:

Resolution order:

1. Explicit request override for dev/testing (if allowed)
2. JWT `currentOrgId`
3. Fail with 403 when org context is missing on scoped routes

Future-ready for host-based resolution in production subdomains.

---

## 5) Identity route redesign

Current identity admin endpoints under `/api/auth/admin/*` are global-role based and user-status based.

Target endpoints remain in identity module but switch to membership model.

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
  - validates user has membership in target org
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

- `POST /api/auth/admin/users/:userId/memberships`
  - add membership in org (default includes student role)

- `PATCH /api/auth/admin/memberships/:membershipId/roles`
  - replace/merge org roles

- `DELETE /api/auth/admin/memberships/:membershipId`
  - remove org membership

- `POST /api/auth/admin/users/:userId/super-admin/grant`
- `POST /api/auth/admin/users/:userId/super-admin/revoke`

Route naming can be refined, but authority boundary should not.

---

## 6) Service layer changes (`IdentityService`)

Current service methods are user-status/global-role centric (`approveUser`, `assignRoles`, `disableUser`, etc.).

Target service capabilities:

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

Keep the identity module but shift its domain model from user-level governance to membership-level governance.

---

## 7) Admin portal contract impact

Existing user management UI currently queries single-org/global mixed data under admin role.

Updated contract expectations:

- only super-admin can access user-management routes
- route payloads include multi-org membership arrays
- support org filter and pending filter server-side
- responses include enough metadata for data-grid display without client-side joins

Backend should be completed first; UI can then adapt incrementally.

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

Current eventing already exists in identity service (`UserApproved`, `UserRoleChanged`, etc.).

Update event semantics to membership/super-admin actions:

- `MembershipRequested`
- `MembershipApproved`
- `MembershipRejected`
- `MembershipRolesChanged`
- `MembershipRemoved`
- `SuperAdminGranted`
- `SuperAdminRevoked`

Each event should carry:

- actor user id
- target user id
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

## 11) OpenAPI/typing updates required

1. Update auth schemas to new payload shape (no global roles/status).
2. Add membership DTOs:
   - `MembershipSummary`
   - `MembershipApprovalRequest`
   - `MembershipRoleUpdate`
3. Update admin user-management endpoint schemas for multi-org data.
4. Ensure generated client types in portals consume new contracts.

---

## 12) Deferred API contracts

- questionnaire submission payloads
- email invite/notification endpoints
- cross-org analytics endpoints
