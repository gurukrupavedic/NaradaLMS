# Verification Strategy: Multi-Tenancy

This document defines how we know each layer is **done** and the platform is safe to expand (RR) after SLMTS pilot.

**Current build:** Layer 2 includes **2.1**–**2.5** on `multi-tenancy` (JWT, membership-first auth, pending student UX, org switch, **super-admin governance**, org-admin directory, governance event/audit alignment). Layer **3 Pass A** and **3 Pass B** are now implemented for the core, media, progress, and audit tables, including physical `audit_logs.org_id` support. Layer **4.1** tenant-config foundation plus the authenticated student-shell branding follow-up are also merged for the student portal — see [implementation-status.md](./implementation-status.md).

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
- **Admin org switcher helpers:** `npx tsx scripts/test/admin-org-switcher-utils.test.ts` validates switchable-membership filtering, current-org resolution, and org-scoped admin query invalidation predicates used by the admin shell switcher.
- **Layer 3 schema + guards:** `npx tsx scripts/test/layer3-pass-a-schema-and-guards.test.ts` validates `org_id` columns and `requireOrgContext` wiring on core routers.
- **Layer 3 isolation:** `npx tsx scripts/test/layer3-pass-a-isolation.test.ts` creates SLMTS/RR fixtures on the same DB and asserts content + batch isolation.
- **Layer 3 Pass B schema + backfill:** `npx tsx scripts/test/layer3-pass-b-schema-and-guards.test.ts` validates the remaining `org_id` columns, nullable `audit_logs.org_id`, and migration guard/backfill shape.
- **Layer 3 Pass B media/content isolation:** `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts` validates org-scoped create/read/update/delete behavior for audio, text segments, media segments, and mappings.
- **Layer 3 Pass B progress/audit isolation:** `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts` validates org-scoped progress writes/reads, per-org enrollment semantics, and event-handler-backed audit persistence.
- **Student tenant-config helpers:** `npx tsx scripts/test/student-tenant-config.test.ts` validates `TENANT` resolution, tenant metadata, and register header/body generation for `slmts` and `rr`.
- **Register:** creates `user_organizations` row `pending` for slug from tenant header/env.

Until automated tests exist, use the manual scenarios below and record results in the PR/slice notes.

---

## Layer 1 — Schema verification

- [ ] `pnpm`/`npm` workspace typecheck: passes after each merge (legacy `users.roles` / `users.status` may still exist until slice 1.4 contract; **zero** references is required only after [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) is complete and item **1.4-contract** is done).
- [ ] Migration on fresh DB succeeds (`drizzle-kit migrate` after reset; `npm run db:reset` must clear both `public` and Drizzle's `drizzle` schema).
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
3. `GET /api/admin/audit-logs` returns only rows whose physical `audit_logs.org_id` matches the current org; `NULL` platform rows remain super-admin only.

### Governance event + audit alignment

1. Membership approve/reject/enable/disable and role changes emit membership-scoped events with `actorUserId`, `targetUserId`, `membershipId`, `orgId`, and `timestamp`.
2. Super-admin grant/revoke emit platform-scoped events with `actorUserId`, `targetUserId`, and `timestamp`, with no `orgId`.
3. Audit subscribers persist governance rows with `scope: 'org'` for membership actions and `scope: 'platform'` for super-admin actions, and org-scoped subscribers also populate physical `audit_logs.org_id`.

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
- Fresh DB path: `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`. First-time `db:seed-dev` requires `DEV_SUPERADMIN_PASSWORD`.

### Assertions

- In SLMTS context: list tracks -> only SLMTS tracks.
- In RR context: list tracks -> only RR tracks.
- Direct ID guessing: fetch by id of other org's chapter/track/batch -> **404 via scoped lookup** for current Pass A core routes.
- Pass B media/content lookups and mutations (`audio_files`, `text_segments`, `media_segments`, `segment_mappings`) reject or hide foreign-org rows even when IDs are guessed correctly.
- Progress reads/writes use physical `student_progress.org_id`, not chapter-only inference.
- Org-admin audit reads use physical `audit_logs.org_id`; platform rows remain visible only to super-admins.

### Enrollment rule

- Verify the same student can hold independent active enrollments in different orgs.
- Verify the same student cannot create a second active enrollment inside the same org.

---

## Layer 4 — Student chameleon verification

- Start student portal with `TENANT=slmts` on port **3000**: logo and display name match SLMTS config.
- Start second instance with `TENANT=rr` on port **3010**: logo and display name match RR config.
- Confirm the auth page's **left half remains Narada-branded** on both student instances.
- Confirm the tenant-facing auth form area and root metadata differ between the two instances.
- Confirm the authenticated shell/header and pending-approval surface differ by tenant between the two instances.
- Confirm register requests no longer hardcode `slmts`; tenant slug/header should match the running instance.
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

## Latest pilot evidence

### 2026-05-12 — checklist 6.1 validated

- **Environment reset:** `npm run build:types`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, and `npm run check` all passed on a fresh local database in the slice worktree.
- **Pending UX:** a new self-serve SLMTS user (`pilot+1747051589@test.local`) registered and logged in successfully, then landed on `http://localhost:3100/pending-approval` with the expected pending copy and the listed `slmts` membership.
- **Super-admin approval:** the seeded super-admin approved the new SLMTS membership through `POST /api/auth/admin/memberships/:membershipId/approve`.
- **Approved learning access:** after approval, the same user logged in with `hasActiveMembership: true`, `GET /api/auth/me` returned an active SLMTS membership, `GET /api/content/tracks` returned `200` with `9` tracks, and browser verification confirmed access to `http://localhost:3100/vedic-learning`.
- **Supporting guard checks:** `npx tsx scripts/test/require-super-admin.test.ts`, `npx tsx scripts/test/audit-log-visibility.test.ts`, `npx tsx scripts/test/layer3-pass-a-isolation.test.ts`, `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts`, `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`, and `npx tsx scripts/test/student-tenant-config.test.ts` all passed.
- **Still outstanding in the pilot gate:** checklist `6.2` RR isolation smoke, `6.3` second-org join verification, and `6.4` documentation of known out-of-scope gaps.

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
