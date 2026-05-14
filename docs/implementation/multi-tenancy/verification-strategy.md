# Verification Strategy: Multi-Tenancy

This document defines how we know each layer is **done** and the platform is safe to expand (RR) after SLMTS pilot.

**Current build:** Layer 2 includes **2.1**–**2.5** plus **2.12** on `multi-tenancy` (JWT, membership-first auth, pending student UX, org switch, **super-admin governance**, org-admin directory, governance event/audit alignment, and Google OAuth membership-policy parity). Layer **3 Pass A** and **3 Pass B** are now implemented for the core, media, progress, and audit tables, including physical `audit_logs.org_id` support. Layer **4.1** tenant-config foundation plus the authenticated student-shell branding follow-up are also merged for the student portal, and pilot closeout documentation is now complete through checklist **6.4** — see [implementation-status.md](./implementation-status.md).

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
- **Governance events:** `npx tsx scripts/test/contracts/identity-governance-events.test.ts` validates aligned payloads plus audit subscriber mappings for membership and super-admin governance actions.
- **Governance gate:** `npx tsx scripts/test/contracts/require-super-admin.test.ts` validates 401-without-user, 403-for-org-admin, and pass-through for `isSuperAdmin`.
- **Audit visibility:** `npx tsx scripts/test/contracts/audit-log-visibility.test.ts` validates that org admins are constrained to current-org audit scope while super-admins remain unrestricted.
- **Admin org switcher helpers:** `npx tsx scripts/test/contracts/admin-org-switcher-utils.test.ts` validates switchable-membership filtering, current-org resolution, and org-scoped admin query invalidation predicates used by the admin shell switcher.
- **Layer 3 schema + guards:** `npx tsx scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts` validates `org_id` columns and `requireOrgContext` wiring on core routers.
- **Layer 3 isolation:** `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts` creates SLMTS/RR fixtures on the same DB and asserts content + batch isolation.
- **Layer 3 Pass B schema + backfill:** `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts` validates the remaining `org_id` columns, nullable `audit_logs.org_id`, and migration guard/backfill shape.
- **Layer 3 Pass B media/content isolation:** `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts` validates org-scoped create/read/update/delete behavior for audio, text segments, media segments, and mappings.
- **Layer 3 Pass B progress/audit isolation:** `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts` validates org-scoped progress writes/reads, per-org enrollment semantics, and event-handler-backed audit persistence.
- **Enrollment schema contract:** `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts` also validates the partial unique enrollment index on `(org_id, student_id)` for active rows.
- **Student tenant-config helpers:** `npx tsx scripts/test/contracts/student-tenant-config.test.ts` validates `TENANT` resolution, tenant metadata, and register header/body generation for `slmts` and `rr`.
- **OAuth tenant propagation:** `npx tsx scripts/test/contracts/oauth-tenant-context.test.ts` validates server-signed OAuth `state`, verified tenant parsing, and safe post-auth redirect fallback for allowed, disallowed, and tampered inputs.
- **OAuth membership parity:** `npx tsx scripts/test/contracts/oauth-membership-parity.test.ts` validates that Google OAuth creates pending target-tenant memberships when none exist, preserves pending/active/inactive/rejected memberships as-is, and does not reopen closed memberships.
- **Register:** creates `user_organizations` row `pending` for slug from tenant header/env.

Until automated tests exist, use the manual scenarios below and record results in the PR/slice notes.

---

## Layer 1 — Schema verification

- [ ] `pnpm`/`npm` workspace typecheck: passes after each merge; after slice 1.4 contract, there should be **zero** remaining references to `users.roles` or `users.status` outside historical/archive docs and migrations.
- [ ] Migration on fresh DB succeeds (`drizzle-kit migrate` after reset; `npm run db:reset` must clear both `public` and Drizzle's `drizzle` schema).
- [ ] After slice 1.1 expand: `\d users` shows `is_super_admin` alongside legacy columns; `\dt` includes `organizations` and `user_organizations`.
- [ ] Seed creates two orgs with expected `slug` values (after seed slice 1.5 / checklist 1.5).

---

## Slice 1.4 — Schema contract verification (after Layer 2)

Run on branch `slice-1.4-schema-contract` once [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) has no open items.

- [ ] Contract migration applies on fresh DB; `\d users` no longer lists `roles`, `status`, or `users_status_check`.
- [ ] Full workspace typecheck: no remaining references to `users.roles` or `users.status` in server, packages, apps, or scripts.

Verification note for **1.4-contract**:

- Verified on `2026-05-12` in the contract slice worktree via `npm run check`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, `npx tsx scripts/test/contracts/require-super-admin.test.ts`, `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`, `npx tsx scripts/test/contracts/admin-user-filters.test.ts`, and `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`.
- Additional focused contract regressions now live in `scripts/test/contracts/passport-local-membership-auth.test.ts`, `scripts/test/contracts/batch-eligible-students-membership.test.ts`, and `scripts/test/contracts/admin-stats-membership.test.ts`.

---

## Layer 2 — Auth and governance verification

### Registration (new user, SLMTS tenant)

1. POST `/api/auth/register` with tenant context for `slmts` (`X-Tenant-Slug: slmts` and/or JSON `tenantSlug: "slmts"`; default server slug from `DEFAULT_TENANT_SLUG` / `slmts` if omitted).
2. **Implemented behavior:** `users` row exists without any global role/status semantics; **`user_organizations`** row for SLMTS has `status = pending` and roles `['student']`.
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

1. New Google user: membership policy matches local register (pending until super-admin approve).
2. Existing user with no membership in the resolved tenant: Google OAuth creates a **pending** membership for that tenant instead of requiring a separate Google-only path.
3. Existing user with **inactive** or **rejected** membership in the resolved tenant: Google OAuth preserves that closed membership and does not silently reopen access.

---

## Layer 3 — Data isolation verification

### Preparation

- Create Track `T-SLMTS` in org SLMTS and `T-RR` in org RR (distinct titles or same title per org after `UNIQUE (org_id, title)`).
- Create batch/enrollment under each org.
- Fresh DB path: `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`. First-time `db:seed-dev` requires `SUPER_ADMIN_PASSWORD`.

### Assertions

- In SLMTS context: list tracks -> only SLMTS tracks.
- In RR context: list tracks -> only RR tracks.
- Direct ID guessing: fetch by id of other org's chapter/track/batch -> **404 via scoped lookup** for current Pass A core routes.
- Pass B media/content lookups and mutations (`audio_files`, `text_segments`, `media_segments`, `segment_mappings`) reject or hide foreign-org rows even when IDs are guessed correctly.
- Progress reads/writes use physical `student_progress.org_id`, not chapter-only inference.
- Org-admin audit reads use physical `audit_logs.org_id`; platform rows remain visible only to super-admins.

### Enrollment rule

- Schema guard: `unique_active_enrollment_idx` must be a partial **unique** index on `(org_id, student_id)` where `status = 'active'`.
- Verify the same student can hold independent active enrollments in different orgs.
- Verify the same student cannot create a second active enrollment inside the same org.

---

## Layer 4 — Student chameleon verification

- Start student portal with `TENANT=slmts` on port **3000**: logo and display name match SLMTS config.
- Start second instance with `TENANT=rr` on port **3001**: logo and display name match RR config.
- Confirm the auth page's **left half remains Narada-branded** on both student instances.
- Confirm the tenant-facing auth form area and root metadata differ between the two instances.
- Confirm the authenticated shell/header and pending-approval surface differ by tenant between the two instances.
- Confirm register requests no longer hardcode `slmts`; tenant slug/header should match the running instance.
- Confirm tenant-initiated Google OAuth sends the running tenant plus a safe post-auth return URL to `/auth/google`, and that callback handling returns to the originating portal instance only when the provider round-trip preserves verified `state`.
- Admin portal on **3010** unchanged (Narada branding).
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
- **Supporting guard checks:** `npx tsx scripts/test/contracts/require-super-admin.test.ts`, `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`, `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`, `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`, `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`, and `npx tsx scripts/test/contracts/student-tenant-config.test.ts` all passed.
- **At that point, still outstanding after `6.1`:** checklist `6.2` RR isolation smoke, `6.3` second-org join verification, and `6.4` documentation of known out-of-scope gaps.

---

### 2026-05-12 — checklist 6.2 validated

- **Environment reset:** `npm run build:types`, `npm run db:reset`, `npm run db:seed-orgs`, `npm run db:seed-dev`, `npm run db:seed`, and `npm run check` all passed on a fresh local database in the slice worktree.
- **Dedicated smoke command:** `API_BASE_URL=http://localhost:5201 SUPER_ADMIN_PASSWORD=dev-superadmin-pass npm run test:rr-isolation-smoke`
- **Smoke setup:** the harness in `scripts/test/smoke/rr-isolation-smoke.test.ts` logs in as the seeded super-admin (`SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD`), upserts an active RR membership (idempotent with canonical `db:seed-dev`), creates unique SLMTS/RR marker tracks and batches, and uses live cookies plus `POST /api/auth/switch-org` to verify session truth.
- **SLMTS assertion:** initial `/api/auth/me` stayed on active SLMTS, `GET /api/content/tracks` and `GET /api/batches` included only SLMTS marker data, and direct RR lookups returned `404`.
- **RR assertion:** after switching org to RR, `/api/auth/me` reported `currentOrgId = rr`, `GET /api/content/tracks` and `GET /api/batches` included only RR marker data, and direct SLMTS lookups returned `404`.
- **Result:** `npm run test:rr-isolation-smoke` passed with `rr-isolation-smoke: 16 assertions passed.`
- **At that point, still outstanding in the pilot gate:** checklist `6.4` documentation of known out-of-scope gaps.

---

### 2026-05-12 — checklist 6.3 validated

- **Targeted regression checks:** `npm run check`, `npx tsx scripts/test/contracts/identity-request-membership.test.ts`, `npx tsx scripts/test/contracts/student-tenant-session.test.ts`, and `npx tsx scripts/test/contracts/student-tenant-config.test.ts` all passed on merged `multi-tenancy`.
- **Dedicated smoke command:** `API_BASE_URL=http://localhost:5203 SUPER_ADMIN_PASSWORD=dev-superadmin-pass npm run test:second-org-join-smoke`
- **Smoke setup:** the new harness in `scripts/test/smoke/second-org-join-smoke.test.ts` registers a unique SLMTS user, approves the SLMTS membership as super-admin, creates a tenant-scoped RR marker track, requests RR membership through `POST /api/auth/request-membership`, and then uses live cookies plus `POST /api/auth/switch-org` to verify session truth before and after approval.
- **Pending RR assertion:** after the request, `/api/auth/me` showed active SLMTS plus pending RR membership, and `POST /api/auth/switch-org` returned `403` for the RR org while approval was still pending.
- **Approved RR assertion:** after super-admin approval, `POST /api/auth/switch-org` returned `200`, `/api/auth/me` reported `currentOrgId = rr`, and `GET /api/content/tracks` included the RR marker track.
- **Portal behavior covered by this slice:** the student portal now computes current-tenant access state from `memberships[]`, exposes the RR request-access action on the pending page, and latches failed auto-switch attempts so users do not get trapped in a retry loop.
- **Result:** `npm run test:second-org-join-smoke` passed with `second-org-join-smoke: 17 assertions passed.`

---

### 2026-05-12 — checklist 4.4 validated

- **Focused verification in the slice worktree:** `npm run build:types`, `npm run check`, `npx tsx scripts/test/contracts/student-tenant-config.test.ts`, `npx tsx scripts/test/contracts/student-tenant-session.test.ts`, and `npx tsx scripts/test/contracts/oauth-tenant-context.test.ts` all passed.
- **Merged-branch verification also passed:** after the local-origin follow-up landed on `multi-tenancy`, `npm run build:types`, `npm run check`, `npx tsx scripts/test/contracts/student-tenant-config.test.ts`, `npx tsx scripts/test/contracts/student-tenant-session.test.ts`, and `npx tsx scripts/test/contracts/oauth-tenant-context.test.ts` passed again on the integration branch.
- **Student OAuth propagation covered:** the student tenant helper now builds Google OAuth URLs with explicit `tenantSlug` plus a safe `returnTo`, and the server tenant-context helper now signs/verifies OAuth `state` before resolving tenant context or callback redirect targets.
- **Redirect safety covered:** callback redirect resolution now accepts configured local origins and falls back to `FRONTEND_URL` for unknown origins instead of trusting arbitrary callback destinations.
- **Callback UX covered in code:** failed or unauthorized OAuth callbacks now return to the auth pages with explicit error codes instead of dropping users into protected-route redirect loops.
- **Limit of current evidence:** `npx tsx scripts/test/contracts/identity-request-membership.test.ts` could not be rerun in the isolated worktree because `DATABASE_URL` was unavailable there, and no live Google provider/browser round-trip was run in this slice.

---

### 2026-05-12 — checklist 2.12 validated

- **Focused OAuth-policy verification:** `npm run check`, `npx tsx scripts/test/contracts/oauth-membership-parity.test.ts`, `npx tsx scripts/test/contracts/oauth-tenant-context.test.ts`, and `npx tsx scripts/test/contracts/identity-request-membership.test.ts` all passed on the slice branch.
- **Policy outcome covered:** Google OAuth now reuses the shared membership-first tenant policy, so new or cross-org users without a target-tenant membership land in `pending`, active memberships continue to log in normally, and inactive/rejected memberships stay closed.
- **Scope boundary held:** tenant resolution, signed OAuth `state`, and safe post-auth redirect handling from Layer `4.4` were preserved; this slice changed policy outcomes, not tenant propagation.

---

### 2026-05-12 — checklist 6.4 documented

- **Scope of this step:** documentation-only closeout using the already-recorded `6.1` through `6.3` evidence; no new runtime verification was added for `6.4`.
- **Canonical known gaps now recorded across the execution docs:** email invites/notifications remain out of scope, questionnaire-driven onboarding remains deferred, production subdomain/TLS/cookie `SameSite` and `Domain` behavior remains unverified outside local dev, and RR onboarding browser coverage remains lighter than the SLMTS pilot browser pass.
- **Result:** the pilot checklist is now complete through `6.4`, the Layer `4.4` tenant-aware OAuth propagation follow-up is now merged, checklist `2.12` is now validated, and future chats should default to optional cleanup or operational verification rather than reopening `1.4-contract`, pilot-closeout work, or OAuth policy parity.

---

## Sign-off

Record:

- Date
- Git commit or tag
- Person
- Notes on known limitations (email, questionnaire, production cookie/subdomain behavior)

---

## Deferred verification (explicit)

- Production subdomain TLS and cookie `SameSite`/`Domain` behavior
- Email-delivered invites
- Questionnaire-driven approval workflow
