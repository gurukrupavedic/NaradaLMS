# Verification Strategy: Multi-Tenancy

This document defines how we know each layer is **done** and the platform is safe to expand (RR) after SLMTS pilot.

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
- **Register:** creates `user_organizations` row `pending` for slug from tenant header/env.

Until automated tests exist, use the manual scenarios below and record results in the PR/slice notes.

---

## Layer 1 — Schema verification

- [ ] `pnpm`/`npm` workspace typecheck: no remaining references to `users.roles` or `users.status` in server and packages (after Layer 2 completes, or same slice if coordinated).
- [ ] Migration on fresh DB succeeds.
- [ ] Seed creates two orgs with expected `slug` values.

---

## Layer 2 — Auth and governance verification

### Registration (new user, SLMTS tenant)

1. POST register with tenant context for `slmts`.
2. Expect: user row exists; `user_organizations` row for SLMTS with `status = pending`; roles include `student` (if policy sets roles at request time) or empty roles until approval — **align with implementation** (document actual behavior in PR).
3. Login succeeds (cookie set) but student content routes return pending or 403 until approval.

### Super-admin approval

1. Super-admin approves membership for SLMTS.
2. User can access SLMTS-scoped content APIs.

### Org admin restriction

1. Token: org admin only (no super-admin).
2. Call user management approve/list endpoints -> **403**.

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
