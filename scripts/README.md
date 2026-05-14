# Scripts Directory

This directory is organized by what each script is for. Prefer root `npm` scripts for normal workflows; run files directly only when you need a specific manual helper.

## Safety

Do not run destructive scripts against production. Anything under `maintenance/` is local-only unless explicitly reviewed.

## Supported Local DB Path

For the current multi-tenancy repo state, the supported local DB workflow is:

1. `npm run db:reset`
2. `npm run build:types`
3. `npm run db:seed-orgs`
4. `npm run db:seed-dev`
5. `npm run db:seed` when curriculum data is needed

The canonical schema authority for that flow is `drizzle.config.ts` -> `packages/types/src/schema.ts` -> repo-root `migrations/`.

## Folder Map

| Folder | Purpose | Status |
| --- | --- | --- |
| `dev/` | Local startup helpers. | Supported |
| `db/` | Database reset and inspection helpers. | Supported/manual |
| `build/` | Build orchestration and build checks. | Supported |
| `verify/` | Aggregate verification runner. | Supported |
| `seeds/demo/` | Optional local demo data. | Manual |
| `maintenance/proficiency/` | Destructive progress/proficiency repair tools. | Manual, high risk |
| `test/smoke/` | API and flow smoke checks. | Supported where package-wired |
| `test/contracts/` | Focused regression and contract checks. | Manual |
| `test/unit/` | Small unit-style scripts. | Supported where package-wired |

## Supported Commands

| Command | Script | Purpose |
| --- | --- | --- |
| `npm run dev:all` | `dev/start-all.ps1` | Start API, both student portals, and admin portal. |
| `npm run db:reset` | `db/reset.ps1` | Drop/recreate app schemas and rerun migrations. |
| `npm run test:build` | `build/check.ps1` | Run TypeScript and build checks. |
| `npm run verify` | `verify/all.ps1` | Run the aggregate local verification flow. |
| `npm run auth:test` | `test/smoke/auth-test.ts` | Authentication smoke/e2e helper. |
| `npm run smoke:batches` | `test/smoke/admin-batches-smoke.ts` | Batch API smoke check. |
| `npm run test:smoke` | `test/smoke/api-smoke-test.ts` | General API smoke check. |
| `npm run test:content` | `test/smoke/content-smoke.ts` | Content smoke check. |
| `npm run test:rr-isolation-smoke` | `test/smoke/rr-isolation-smoke.test.ts` | RR tenant isolation smoke check. |
| `npm run test:second-org-join-smoke` | `test/smoke/second-org-join-smoke.test.ts` | Second-organization join flow smoke check. |
| `npm run test:format-date` | `test/unit/format-date.test.ts` | Date formatting regression check. |

## Canonical Seed Scripts

The canonical seed entrypoints live under `server/db-seeding/` because they are app-level bootstrap scripts:

- `server/db-seeding/seed-organizations.ts`: `npm run db:seed-orgs`
- `server/db-seeding/seed-dev-bootstrap.ts`: `npm run db:seed-dev`
- `server/db-seeding/seed-vedic-curriculum.ts`: `npm run db:seed`

## Manual Demo Seeds

- `seeds/demo/create-sample-users.ts`: creates pending SLMTS student memberships for local testing.
- `seeds/demo/create-30-students.ts`: creates a larger active SLMTS student set.

These are not part of the canonical clean bootstrap path.

## Maintenance Scripts

- `maintenance/proficiency/check-and-reset.ts`: fills missing progress rows for enrolled students, then resets proficiency.
- `maintenance/proficiency/full-reset.ts`: rebuilds proficiency coverage from active student memberships, then resets proficiency.
- `maintenance/proficiency/reset-all.ts`: resets every existing proficiency row.

These scripts mutate progress data in bulk. Use only on disposable/local data.

## Contract Tests

For multi-tenancy DB or auth changes, start with:

- `npx tsx scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-script-compat.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`
- `npx tsx scripts/test/contracts/require-super-admin.test.ts`
- `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`

## Removed Scripts

The following local-only scripts were removed because they were duplicate, stale, hardcoded, or dependent on old assumptions:

- `scripts/db/reset-db.ts`
- `scripts/utils/check-theme-integrity.js`
- `scripts/utils/update-user-role.ts`
- `scripts/utils/check-instructor-batches.ts`
- `scripts/utils/test-e2e-batches.ts`
- `scripts/seed/create-approved-users.ts`
- `scripts/seed/create-sample-batches.ts`
- `scripts/seed/assign-secondary-instructors.ts`
