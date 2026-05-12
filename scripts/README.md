# Scripts Directory

This directory contains database reset helpers, local seed utilities, verification harnesses, and one-off operational scripts.

## Safety

Do not run destructive scripts against production.

## Supported DB path

For the current multi-tenancy repo state, the supported local DB workflow is:

1. `npm run db:reset`
2. `npm run build:types`
3. `npm run db:seed-orgs`
4. `npm run db:seed-dev`
5. `npm run db:seed` when curriculum data is needed

The canonical schema authority for that flow is `drizzle.config.ts` -> `packages/types/src/schema.ts` -> repo-root `migrations/`. See `docs/implementation/multi-tenancy/db-audit-remediation-checklist.md` for the full support matrix.

## Support status

| Path | Status | Notes |
| --- | --- | --- |
| `test/db-reset.ps1` | `official` | Package-wired reset path. Drops `public` and `drizzle`, then runs `drizzle-kit migrate`. |
| `db/reset-db.ts` | `manual utility` | Cross-platform helper that mirrors reset + migrate, but is not the package-wired entrypoint. |
| `seed/` | `manual utility` | Optional local/dev data helpers outside the canonical clean-bootstrap path. |
| `utils/` | `manual utility` | One-off admin or repair helpers; read each script before use. |
| `test/` | `manual utility` | Verification harnesses. Prefer the multi-tenancy contract tests listed below for DB/auth/isolation work. |

## Database helpers

- `test/db-reset.ps1`
  - Usage: `npm run db:reset` or `.\scripts\test\db-reset.ps1`
  - Purpose: supported full reset on this repo state

- `db/reset-db.ts`
  - Usage: `npx tsx scripts/db/reset-db.ts`
  - Purpose: manual cross-platform fallback for the same reset + migrate flow

## Canonical seed scripts

- `server/seed-organizations.ts`
  - Usage: `npm run db:seed-orgs`
  - Purpose: create or update the canonical `slmts` and `rr` organizations

- `server/seed-dev-bootstrap.ts`
  - Usage: `npm run db:seed-dev`
  - Purpose: create/update the `ADMIN_EMAIL` super-admin and baseline memberships

- `server/seed-vedic-curriculum.ts`
  - Usage: `npm run db:seed`
  - Purpose: seed SLMTS curriculum tracks and chapters from `server/seeds/curriculum.json`

## Optional local/dev seeds

- `seed/create-sample-users.ts`: create pending SLMTS student memberships for local testing
- `seed/create-30-students.ts`: create a larger active SLMTS student set
- `seed/create-approved-users.ts`: create additional approved users with mixed roles
- `seed/create-sample-batches.ts`: create sample SLMTS batches for local testing
- `seed/assign-secondary-instructors.ts`: attach co-instructors to existing batches

## Utilities

- `utils/list-users.ts`: inspect recent users and memberships
- `utils/update-user-role.ts`: hardcoded local role/membership adjustment helper
- `utils/check-instructor-batches.ts`: inspect instructor-to-batch assignments
- `utils/test-e2e-batches.ts`: local batch/enrollment flow helper
- `utils/check-and-reset-proficiency.ts`: fill missing proficiency rows for enrolled students
- `utils/full-proficiency-reset.ts`: destructive full proficiency rebuild
- `utils/reset-all-proficiency.ts`: set all existing proficiency rows to not-started

## Recommended verification scripts

For multi-tenancy DB or auth changes, start with:

- `npx tsx scripts/test/layer3-pass-a-schema-and-guards.test.ts`
- `npx tsx scripts/test/layer3-pass-a-isolation.test.ts`
- `npx tsx scripts/test/layer3-pass-b-schema-and-guards.test.ts`
- `npx tsx scripts/test/layer3-pass-b-script-compat.test.ts`
- `npx tsx scripts/test/layer3-pass-b-media-isolation.test.ts`
- `npx tsx scripts/test/layer3-pass-b-progress-audit-isolation.test.ts`
- `npx tsx scripts/test/require-super-admin.test.ts`
- `npx tsx scripts/test/audit-log-visibility.test.ts`
