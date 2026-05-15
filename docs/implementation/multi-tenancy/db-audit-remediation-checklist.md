# DB Audit Remediation Checklist

This checklist tracks the multi-tenancy DB audit follow-up work so future chats can distinguish the active database path from older utilities and historical artifacts.

## Canonical DB authority

Use this chain as the default source of truth for schema and reset behavior on the current repo state:

1. `drizzle.config.ts`
2. `packages/types/src/schema.ts`
3. `migrations/`
4. `npm run db:reset` via `scripts/db/reset.ps1`
5. `npm run db:seed-orgs`
6. `npm run db:seed-dev`
7. `npm run db:seed` when curriculum data is needed

## Support status matrix

| Path | Status | Notes |
| --- | --- | --- |
| `drizzle.config.ts` | `official` | Canonical Drizzle entrypoint. |
| `packages/types/src/schema.ts` | `official` | Canonical schema contract. |
| `migrations/` | `official` | Versioned SQL that defines the supported schema history. |
| `scripts/db/reset.ps1` | `official` | Package-wired reset path for this repo. Drops `public` and `drizzle`, then runs `drizzle-kit migrate`. |
| `server/db-seeding/seed-organizations.ts` | `official` | Canonical org seed for `slmts` and `rr`. |
| `server/db-seeding/seed-dev-bootstrap.ts` | `official` | Canonical dev super-admin + membership bootstrap (active `student`+`admin` on `slmts` and `rr`). |
| `server/db-seeding/seed-curriculum.ts` | `official` | Canonical curriculum seed. Reads `server/seeds/<file>`; default file is `curriculum-slmts.json`. Override with `CURRICULUM_SEED_FILE`. |
| `server/seeds/curriculum-slmts.json` | `official` | SLMTS (Vedic) curriculum source for `npm run db:seed`. |
| `server/seeds/curriculum-rr.json` | `official` | RR (Puranokta) curriculum placeholder; load with `npm run db:seed:curriculum:rr`. |
| `server/init-database.ts` | `manual utility` | Compatibility wrapper around the official seed entrypoints; not the primary runbook path. |
| `scripts/seeds/demo/` | `manual utility` | Optional local/dev data helpers, not part of the canonical clean-bootstrap sequence. |
| `scripts/maintenance/` | `manual utility` | One-off repair helpers; review script-by-script before use. |
| `scripts/test/` | `manual utility` | Focused verification harnesses; keep the multi-tenancy contract tests aligned with the live schema. |
| `server/migrations/` | `historical/legacy` | Legacy SQL artifacts outside the active Drizzle migration chain. Do not treat as current migration authority. |

## Seed and utility classifications

| Path | Status | Notes |
| --- | --- | --- |
| `scripts/seeds/demo/create-sample-users.ts` | `manual utility` | Local sample-user helper for pending SLMTS memberships. |
| `scripts/seeds/demo/create-30-students.ts` | `manual utility` | Higher-volume local data seeding helper. |
| `scripts/db/list-users.ts` | `manual utility` | Read-only local inspection helper. |
| `scripts/maintenance/proficiency/check-and-reset.ts` | `manual utility` | Targeted repair helper for proficiency rows. |
| `scripts/maintenance/proficiency/full-reset.ts` | `manual utility` | Destructive rebuild helper; use carefully. |
| `scripts/maintenance/proficiency/reset-all.ts` | `manual utility` | Bulk reset helper. |

## Verification script classifications

### Official contract checks

These are the focused DB/auth/isolation checks to keep aligned with the live multi-tenancy model:

- `scripts/test/contracts/require-super-admin.test.ts`
- `scripts/test/contracts/audit-log-visibility.test.ts`
- `scripts/test/contracts/identity-governance-events.test.ts`
- `scripts/test/contracts/admin-user-filters.test.ts`
- `scripts/test/contracts/governance-org-filter-storage.test.ts`
- `scripts/test/contracts/admin-org-switcher-utils.test.ts`
- `scripts/test/contracts/passport-local-membership-auth.test.ts`
- `scripts/test/contracts/batch-eligible-students-membership.test.ts`
- `scripts/test/contracts/admin-stats-membership.test.ts`
- `scripts/test/contracts/identity-request-membership.test.ts`
- `scripts/test/contracts/oauth-membership-parity.test.ts`
- `scripts/test/contracts/oauth-tenant-context.test.ts`
- `scripts/test/contracts/student-tenant-config.test.ts`
- `scripts/test/contracts/student-tenant-session.test.ts`
- `scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`
- `scripts/test/contracts/layer3-pass-a-isolation.test.ts`
- `scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`
- `scripts/test/contracts/layer3-pass-b-script-compat.test.ts`
- `scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`
- `scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`

### Manual smoke checks

These remain useful, but they are operator-driven or require a running server instead of acting as lightweight contract checks:

- `scripts/test/smoke/auth-test.ts`
- `scripts/test/smoke/api-smoke-test.ts`
- `scripts/test/smoke/content-smoke.ts`
- `scripts/test/smoke/admin-batches-smoke.ts`
- `scripts/test/smoke/rr-isolation-smoke.test.ts`
- `scripts/test/smoke/second-org-join-smoke.test.ts`

## Latest verification evidence

Verified on `2026-05-12` on branch `mt-audit-remediation` using the supported local DB path:

1. `npm run build:types`
2. `npm run db:reset`
3. `SUPER_ADMIN_PASSWORD=dev-superadmin-pass npm run db:seed-dev` after `npm run db:seed-orgs` on the fresh DB
4. `npm run db:seed`
5. `npm run check`
6. Focused contract checks:
   - `npx tsx scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`
   - `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`
   - `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`
   - `npx tsx scripts/test/contracts/layer3-pass-b-script-compat.test.ts`
   - `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`
   - `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`
   - `npx tsx scripts/test/contracts/passport-local-membership-auth.test.ts`
   - `npx tsx scripts/test/contracts/batch-eligible-students-membership.test.ts`
   - `npx tsx scripts/test/contracts/admin-stats-membership.test.ts`

Result: all commands above passed after the seed-script type fix and the per-org enrollment migration was generated as `migrations/0005_funny_revanche.sql`.

## Remediation checklist

- [x] Create a dedicated remediation branch from `multi-tenancy`.
- [x] Document the canonical Drizzle/schema/reset path and link this checklist from the current-facing multi-tenancy docs.
- [x] Make the `db:seed` curriculum contract explicit and accurate.
- [x] Reconcile active enrollment uniqueness so schema, migrations, runtime, and docs agree.
- [x] Remove stale `db:push`, bootstrap, and role-constraint claims from current-facing docs.
- [x] Expand the support matrix so contributors can tell which DB scripts and tests are official, manual, or historical.
- [x] Re-run the supported reset/migrate/seed/verification path and record the evidence here.
- [ ] Merge the verified remediation work back into `multi-tenancy`.
