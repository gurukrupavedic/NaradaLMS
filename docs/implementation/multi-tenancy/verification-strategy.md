# Verification Strategy: Multi-Tenancy

This document defines how we know each layer is **done** and the platform is safe to expand (RR) after SLMTS pilot.

**Current build:** Layer 2 includes **2.1**–**2.5** on `multi-tenancy` (JWT, membership-first auth, pending student UX, org switch, **super-admin governance**, org-admin directory, governance event/audit alignment). Physical `audit_logs.org_id` schema support remains deferred to Layer `3.B.1` — see [implementation-status.md](./implementation-status.md).

---

## Principles

1. **Server is source of truth** — UI-only hiding is insufficient; APIs must enforce org and role boundaries.
2. **Negative tests matter** — attempt cross-org access and expect empty result or 403.
3. **Super-admin is explicit** — user management actions must fail for org-only admins.
4. **Clean DB discipline** — verification includes applying migrations on an **empty** database and reseeding.

---

## Automated checks (recommended)

Add or extend tests when implementation lands (exact framework TBD per repo convention):

- **Auth JWT:** token contains `isSuperAdmin`, `currentOrgId`, `orgRoles` (no global `roles`/`status`).
- **Org guard:** scoped route without org context returns 403.
- **Isolation:** given user A active only in `slmts`, requests with `currentOrgId` = `rr` return 403 or empty for RR-scoped resources.
- **Governance:** org admin token receives 403 on `membership approve` endpoint; super-admin receives 200.
- **Governance events:** `npx tsx scripts/test/identity-governance-events.test.ts` validates aligned payloads plus audit subscriber mappings for membership and super-admin governance actions.
- **Governance gate:** `npx tsx scripts/test/require-super-admin.test.ts` validates 401-without-user, 403-for-org-admin, and pass-through for `isSuperAdmin`.
- **Audit visibility:** `npx tsx scripts/test/audit-log-visibility.test.ts` validates that org admins are constrained to current-org audit scope while super-admins remain unrestricted.
- **Register:** creates `user_organizations` row `pending` for slug from tenant header/env.

Until automated tests exist, use the manual scenarios below and record results in the PR/slice notes.

---

## Layer 1 — Schema verification

- [ ] `pnpm`/`npm` workspace typecheck: passes after each merge (legacy `users.roles` / `users.status` may still exist until slice 1.4 contract; **zero** references is required only after [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) is complete and item **1.4-contract** is done).
- [ ] Migration on fresh DB succeeds (`drizzle-kit migrate` after reset).
- [ ] After slice 1.1 expand: `\d users` shows `is_super_admin` alongside legacy columns; `\dt` includes `organizations` and `user_organizations`.
- [ ] Seed creates two orgs with expected `slug` values (after seed slice 1.5 / checklist 1.5).

---

## Slice 1.4 — Schema contract verification (after Layer 2)

Run only on branch `slice-1.4-schema-contract` when [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) has no open items.

- [ ] Contract migration applies on fresh DB; `\d users` no longer lists `roles`, `status`, or `users_status_check`.
- [ ] Full workspace typecheck: no remaining references to `users.roles` or `users.status` in server, packages, apps, or scripts.

---

## Layer 2 — Auth and governance verification

### Registration (new user, SLMTS tenant)

1. POST `/api/auth/register` with tenant context for `slmts` (`X-Tenant-Slug: slmts` and/or JSON `tenantSlug: "slmts"`; default server slug from `DEFAULT_TENANT_SLUG` / `slmts` if omitted).
2. **Implemented behavior:** `users` row exists with `status = active` and legacy `roles = []` for self-serve signups; **`user_organizations`** row for SLMTS with `status = pending` and roles `['student']`.
3. POST `/api/auth/login` succeeds (200, `auth_token` cookie); response includes `loginState.hasActiveMembership === false` until membership is approved.
4. Student portal shows **`/pending-approval`** until an active membership exists (unless `isSuperAdmin`).
5. Learning/content APIs remain **403 or empty** until membership is **active** (enforced by existing route logic + org roles in JWT).

### Super-admin approval

1. Super-admin approves membership for SLMTS: **`POST /api/auth/admin/memberships/:membershipId/approve`** (super-admin JWT); `user_organizations.status` becomes **`active`** for that row.
2. After governance work: user can access SLMTS-scoped content APIs when `user_organizations.status = active` for SLMTS.

### Org switch (API)

1. Authenticated user with **active** SLMTS membership: `POST /api/auth/switch-org` with SLMTS `orgId` returns **200** and refreshed cookie; `/api/auth/me` reflects `currentOrgId`.
2. Same user with **pending** RR membership only: `POST` with RR `orgId` returns **403**.

### Org admin restriction

1. Token: org admin only (no super-admin).
2. Call user management approve/list endpoints -> **403**.
3. `GET /api/admin/audit-logs` returns only rows whose audit metadata matches the current org scope.

### Governance event + audit alignment

1. Membership approve/reject/enable/disable and role changes emit membership-scoped events with `actorUserId`, `targetUserId`, `membershipId`, `orgId`, and `timestamp`.
2. Super-admin grant/revoke emit platform-scoped events with `actorUserId`, `targetUserId`, and `timestamp`, with no `orgId`.
3. Audit subscribers persist governance rows with `scope: 'org'` for membership actions and `scope: 'platform'` for super-admin actions until Layer `3.B.1` adds a physical `audit_logs.org_id` column.

### Org switch (admin portal)

1. User is admin in SLMTS and RR (via super-admin setup).
2. Switch org; JWT `currentOrgId` changes; data returned matches org.

### OAuth (if enabled in dev)

1. New Google user: membership policy matches local register (pending until super-admin approve) unless explicitly documented otherwise.

---

## Layer 3 — Data isolation verification

### Preparation

- Create Track `T-SLMTS` in org SLMTS and `T-RR` in org RR (distinct titles or same title per org after `UNIQUE (org_id, title)`).
- Create batch/enrollment under each org.

### Assertions

- In SLMTS context: list tracks -> only SLMTS tracks.
- In RR context: list tracks -> only RR tracks.
- Direct ID guessing: fetch by id of other org's chapter/track -> **403 or 404** (pick one policy and document; prefer 404 if IDs are enumerable).

### Enrollment rule

- If org-scoped “one active enrollment” applies: verify student cannot hold active enrollments in two orgs simultaneously **if** that is product intent; otherwise document allowed behavior.

---

## Layer 4 — Student chameleon verification

- Start student portal with `TENANT=slmts` on port **3000**: logo and display name match SLMTS config.
- Start second instance with `TENANT=rr` on port **3010**: logo and display name match RR config.
- Admin portal on **3001** unchanged (Narada branding).
- API on **5000** serves both; tenant header/env causes correct org on register.

---

## Pilot gate checklist (SLMTS)

Before calling SLMTS pilot-ready:

| # | Check | Pass criteria |
| --- | --- | --- |
| 1 | Fresh DB path | migrations + seed + dev login |
| 2 | Pending UX | new user sees pending until super-admin acts |
| 3 | Learning path | approved student completes one core flow (e.g. open track/chapter) |
| 4 | Admin ops | org admin manages content/batch in SLMTS |
| 5 | Isolation | minimal RR data does not leak into SLMTS session |
| 6 | Super-admin | only super-admin manages users/memberships |
| 7 | RR join | optional: second-org request path verified in dev |

---

## Sign-off

Record:

- Date
- Git commit or tag
- Person
- Notes on known limitations (email, questionnaire, OAuth edge cases)

---

## Deferred verification (explicit)

- Production subdomain TLS and cookie `SameSite`/`Domain` behavior
- Email-delivered invites
- Questionnaire-driven approval workflow
