# DB Audit Remediation Checklist

This checklist tracks the multi-tenancy DB audit follow-up work so future chats can distinguish the active database path from older utilities and historical artifacts.

## Canonical DB authority

Use this chain as the default source of truth for schema and reset behavior on the current repo state:

1. `drizzle.config.ts`
2. `packages/types/src/schema.ts`
3. `migrations/`
4. `npm run db:reset` via `scripts/test/db-reset.ps1`
5. `npm run db:seed-orgs`
6. `npm run db:seed-dev`
7. `npm run db:seed` when curriculum data is needed

## Support status matrix

| Path | Status | Notes |
| --- | --- | --- |
| `drizzle.config.ts` | `official` | Canonical Drizzle entrypoint. |
| `packages/types/src/schema.ts` | `official` | Canonical schema contract. |
| `migrations/` | `official` | Versioned SQL that defines the supported schema history. |
| `scripts/test/db-reset.ps1` | `official` | Package-wired reset path for this repo. Drops `public` and `drizzle`, then runs `drizzle-kit migrate`. |
| `server/seed-organizations.ts` | `official` | Canonical org seed for `slmts` and `rr`. |
| `server/seed-dev-bootstrap.ts` | `official` | Canonical dev super-admin + membership bootstrap. |
| `server/seed-vedic-curriculum.ts` | `official` | Canonical curriculum seed. Uses `server/seeds/curriculum.json` and targets SLMTS curriculum data. |
| `server/seeds/curriculum.json` | `official` | Checked-in curriculum source for `db:seed`. |
| `scripts/db/reset-db.ts` | `manual utility` | Cross-platform reset helper that mirrors the reset + migrate flow, but is not the package-wired entrypoint on this repo state. |
| `server/init-database.ts` | `manual utility` | Compatibility wrapper around the official seed entrypoints; not the primary runbook path. |
| `scripts/seed/` | `manual utility` | Optional local/dev data helpers, not part of the canonical clean-bootstrap sequence. |
| `scripts/utils/` | `manual utility` | One-off operational helpers; review script-by-script before use. |
| `scripts/test/` | `manual utility` | Focused verification harnesses; keep the multi-tenancy contract tests aligned with the live schema. |
| `server/migrations/` | `historical/legacy` | Legacy SQL artifacts outside the active Drizzle migration chain. Do not treat as current migration authority. |
| `server/seeds/tracks-4-8.json` | `historical/legacy` | Old seed asset retained for history; not used by the supported `db:seed` path. |

## Seed and utility classifications

| Path | Status | Notes |
| --- | --- | --- |
| `scripts/seed/create-sample-users.ts` | `manual utility` | Local sample-user helper for pending SLMTS memberships. |
| `scripts/seed/create-approved-users.ts` | `manual utility` | Local helper for approved SLMTS memberships. |
| `scripts/seed/create-30-students.ts` | `manual utility` | Higher-volume local data seeding helper. |
| `scripts/seed/create-sample-batches.ts` | `manual utility` | Local batch fixture helper. |
| `scripts/seed/assign-secondary-instructors.ts` | `manual utility` | Local batch-assignment helper. |
| `scripts/utils/list-users.ts` | `manual utility` | Read-only local inspection helper. |
| `scripts/utils/update-user-role.ts` | `manual utility` | Hardcoded local role/membership adjustment helper. |
| `scripts/utils/check-instructor-batches.ts` | `manual utility` | Local inspection helper. |
| `scripts/utils/test-e2e-batches.ts` | `manual utility` | Local flow helper, not part of the baseline DB runbook. |
| `scripts/utils/check-and-reset-proficiency.ts` | `manual utility` | Targeted repair helper for proficiency rows. |
| `scripts/utils/full-proficiency-reset.ts` | `manual utility` | Destructive rebuild helper; use carefully. |
| `scripts/utils/reset-all-proficiency.ts` | `manual utility` | Bulk reset helper. |

## Verification script classifications

### Official contract checks

These are the focused DB/auth/isolation checks to keep aligned with the live multi-tenancy model:

- `scripts/test/require-super-admin.test.ts`
- `scripts/test/audit-log-visibility.test.ts`
- `scripts/test/identity-governance-events.test.ts`
- `scripts/test/admin-user-filters.test.ts`
- `scripts/test/governance-org-filter-storage.test.ts`
- `scripts/test/admin-org-switcher-utils.test.ts`
- `scripts/test/passport-local-membership-auth.test.ts`
- `scripts/test/batch-eligible-students-membership.test.ts`
- `scripts/test/admin-stats-membership.test.ts`
- `scripts/test/identity-request-membership.test.ts`
- `scripts/test/oauth-membership-parity.test.ts`
- `scripts/test/oauth-tenant-context.test.ts`
- `scripts/test/student-tenant-config.test.ts`
- `scripts/test/student-tenant-session.test.ts`
- `scripts/test/layer3-pass-a-schema-and-guards.test.ts`
- `scripts/test/layer3-pass-a-isolation.test.ts`
- `scripts/test/layer3-pass-b-schema-and-guards.test.ts`
- `scripts/test/layer3-pass-b-script-compat.test.ts`
- `scripts/test/layer3-pass-b-media-isolation.test.ts`
- `scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`

### Manual smoke checks

These remain useful, but they are operator-driven or require a running server instead of acting as lightweight contract checks:

- `scripts/test/auth-test.ts`
- `scripts/test/api-smoke-test.ts`
- `scripts/test/content-smoke.ts`
- `scripts/test/admin-batches-smoke.ts`
- `scripts/test/rr-isolation-smoke.test.ts`
- `scripts/test/second-org-join-smoke.test.ts`

## Latest verification evidence

Verified on `2026-05-12` on branch `mt-audit-remediation` using the supported local DB path:

1. `npm run build:types`
2. `npm run db:reset`
3. `DEV_SUPERADMIN_PASSWORD=dev-superadmin-pass npm run db:seed-dev` after `npm run db:seed-orgs` on the fresh DB
4. `npm run db:seed`
5. `npm run check`
6. Focused contract checks:
   - `npx tsx scripts/test/layer3-pass-a-schema-and-guards.test.ts`
   - `npx tsx scripts/test/layer3-pass-a-isolation.test.ts`
   - `npx tsx scripts/test/layer3-pass-b-schema-and-guards.test.ts`
   - `npx tsx scripts/test/layer3-pass-b-script-compat.test.ts`
   - `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts`
   - `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`
   - `npx tsx scripts/test/passport-local-membership-auth.test.ts`
   - `npx tsx scripts/test/batch-eligible-students-membership.test.ts`
   - `npx tsx scripts/test/admin-stats-membership.test.ts`

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
