# NaradaLMS Scripts Guide

This document explains the current script layout in plain English. The scripts were reorganized so the folder names now describe how each script should be used.

## How to arrange new scripts

Use this decision order when you add a helper, seed, or test runner.

1. **Is it part of normal app bootstrap (orgs, dev admin, curriculum)?**
   Put it in `server/db-seeding/` next to the other canonical seeds, wire it with a root `npm run db:seed-*` if the team should run it often, and keep it idempotent where possible. Read configuration from environment variables (for example `SUPER_ADMIN_EMAIL`), not hardcoded emails or passwords in source.
2. **Is it optional fake data for local UI only?**
  Put it under `scripts/seeds/demo/`. Do not add it to the canonical reset-and-seed sequence in this guide unless the product team explicitly adopts it.
3. **Does it start multiple local processes or wrap dev tooling?**
  Put it under `scripts/dev/`. Prefer PowerShell for Windows-first orchestration that mirrors `start-all.ps1`.
4. **Does it reset schemas, run migrations from the shell, or inspect DB rows?**
  Put it under `scripts/db/`. Treat anything that drops schemas as destructive and document risk in the script header.
5. **Does it orchestrate TypeScript checks or production builds?**
  Put it under `scripts/build/`. Use `check.ps1` for fast CI-style checks; use `build-all.ps1` for full production builds of the API and Next apps (see [Build And Quality Scripts](#build-and-quality-scripts)).
6. **Does it chain several checks (build + smoke + content)?**
  Put it under `scripts/verify/`. Document prerequisites (for example API must be running) in the script comment block.
7. **Does it bulk-fix or bulk-delete user progress or proficiency?**
  Put it under `scripts/maintenance/<domain>/`. Assume local-only unless reviewed for other environments.
8. **Is it an automated check?**
  - Broad HTTP or flow checks against a running API → `scripts/test/smoke/`.  
  - Focused auth, tenant, or schema regression → `scripts/test/contracts/`.  
  - Small helper or pure-function behavior → `scripts/test/unit/`.

**When to add a `package.json` script:** add one when the command is part of a documented team workflow, is run in CI or onboarding, or wraps a non-obvious path. For one-off contract tests, prefer documenting `npx tsx scripts/test/contracts/<file>.ts` instead of growing `package.json` for every file.

**Imports:** scripts under deeper folders import server code with relative paths (for example `../../../server/...`). Keep paths stable by importing from `server/` rather than duplicating app logic inside `scripts/`.

## Quick Summary

Use root `npm` commands for normal work. They are the safest entrypoints because they hide the internal file paths.

The most important commands are:

- `npm run dev:all`: starts the API, both student portals, and the admin portal.
- `npm run db:migrate`: applies database migrations to an existing database.
- `npm run db:reset`: wipes the configured app database schemas and rebuilds them from migrations.
- `npm run db:seed-orgs`: creates the SLMTS and RR organization rows.
- `npm run db:seed-dev`: creates one local developer/admin account and baseline memberships.
- `npm run db:seed`: loads curriculum from `server/seeds/curriculum-slmts.json` by default (`CURRICULUM_SEED_FILE` overrides). `npm run db:seed:curriculum:rr` loads `curriculum-rr.json`.
- `npm run check`: runs TypeScript checks.
- `npm run lint`: runs ESLint.
- `npm run verify`: runs the larger local verification script.

## Current Folder Layout


| Folder                             | What belongs here                     | How to think about it                                 |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `scripts/dev/`                     | Local startup helpers                 | Use when starting the app locally.                    |
| `scripts/db/`                      | Database reset and inspection helpers | Use carefully; reset scripts are destructive.         |
| `scripts/build/`                   | Build orchestration and build checks  | Use before larger changes or releases.                |
| `scripts/verify/`                  | Aggregate verification runners        | Use when you want several checks in one command.      |
| `scripts/seeds/demo/`              | Optional local demo data              | Use only when you need fake local users.              |
| `scripts/maintenance/proficiency/` | Progress/proficiency repair tools     | Dangerous, local-only maintenance scripts.            |
| `scripts/test/smoke/`              | App/API smoke checks                  | Use to confirm major flows still respond.             |
| `scripts/test/contracts/`          | Focused regression checks             | Use after auth, tenant, DB, or authorization changes. |
| `scripts/test/unit/`               | Small unit-style checks               | Use for narrow helper behavior.                       |


The canonical seed entrypoints live in `server/db-seeding/` because they are the official fresh-database bootstrap scripts, not generic local helpers under `scripts/`.

## The Main Local Workflow

For a fresh local database with useful starter data, the intended order is:

1. `npm run db:reset`
2. `npm run build:types`
3. `npm run db:seed-orgs`
4. `npm run db:seed-dev`
5. `npm run db:seed` when SLMTS curriculum data is needed (`npm run db:seed:curriculum:rr` for RR file)

What that gives you:

- a database schema built from migrations,
- two organizations: SLMTS and RR,
- one developer super-admin account from `SUPER_ADMIN_EMAIL`,
- baseline SLMTS/RR memberships for that account,
- SLMTS curriculum tracks and chapters if you run `db:seed`; RR file is separate (`db:seed:curriculum:rr`) and starts with an empty `tracks` array until you add Puranokta content.

If you want a completely empty database, run migrations only and do not run seed scripts.

## Local App Startup

### `npm run dev`

Runs the API server from `server/index.ts` on port `5000`.

Use this when you only want the backend API running.

### `npm run dev:all`

Runs `scripts/dev/start-all.ps1`.

It starts:

- API server on `http://localhost:5000`
- SLMTS student portal on `http://localhost:3000`
- RR student portal on `http://localhost:3001`
- Admin portal on `http://localhost:3010`

Use this when you want to manually test the app in the browser.

## Build And Quality Scripts

### `npm run build:types`

Builds the shared `@narada/types` package. Run this after schema/type changes.

### `npm run build`

Builds shared types, then bundles the API server into `dist/`.

### `npm run start`

Runs the already-built production server from `dist/index.js`. Use this only after `npm run build`.

### `npm run test:build`

Runs `scripts/build/check.ps1`.

It checks root TypeScript, both Next portals, and the server bundle.

### `scripts/build/build-all.ps1` (manual)

There is no root `npm` alias for this file. Run it when you need a **full production build** of the API (`npm run build` from repo root), the student portal, and the admin portal in sequence:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build/build-all.ps1
```

Use `check.ps1` for day-to-day verification; use `build-all.ps1` before release-style validation or deployment packaging.

### `npm run check`

Runs TypeScript checking for the repository.

### `npm run lint`

Runs ESLint across the repository.

### `npm run verify`

Runs `scripts/verify/all.ps1`.

This is the larger local verification wrapper. By default it runs, in order: `scripts/build/check.ps1`, the API smoke test (`scripts/test/smoke/api-smoke-test.ts`), and the content module smoke test (`scripts/test/smoke/content-smoke.ts`).

**Prerequisites:** PostgreSQL should be running, and the API should be listening on `http://localhost:5000` for the smoke steps. The script supports `-SkipBuild` (skip the build check) and `-SkipSmoke` (skip the API smoke test only). The content smoke step always runs; see the comment block at the top of `scripts/verify/all.ps1`.

## Database Scripts

### `npm run db:migrate`

Applies Drizzle migrations.

Use this when you want to update database structure without deleting data.

### `npm run db:reset`

Runs `scripts/db/reset.ps1`.

What it does:

- reads database settings from `.env`,
- connects to the configured database,
- drops the `public` schema,
- drops the Drizzle tracking schema,
- recreates `public`,
- reruns migrations.

What it does not do:

- it does not seed data,
- it does not create users,
- it does not load curriculum,
- it does not drop every PostgreSQL database on your machine.

Risk level: destructive for the configured app database. Use only for local development.

### `scripts/db/list-users.ts`

Read-only helper that prints recent users and their memberships. Use this to inspect local data after seeding or registration. There is no `npm` alias; run:

```bash
npx tsx scripts/db/list-users.ts
```

## Canonical Seed Scripts

### `npm run db:seed-orgs`

Runs `server/db-seeding/seed-organizations.ts`.

Creates or preserves the two canonical organizations:

- `slmts`: Sri Lalita Maha Tripura Sundari Pathasala
- `rr`: Raja Rajeswari Pathasala

Run this after migrations and before other seeds that need organizations.

### `npm run db:seed-dev`

Runs `server/db-seeding/seed-dev-bootstrap.ts`.

Creates or updates one local developer account from `SUPER_ADMIN_EMAIL`.

On a fresh database it also needs `SUPER_ADMIN_PASSWORD` so it can create the password hash.

It creates:

- one user with `isSuperAdmin: true`,
- an active SLMTS membership with roles `student` and `admin`,
- an active RR membership with roles `student` and `admin`.

This is useful for local testing, but it combines user creation and membership setup in one script. A future cleanup could split it into smaller seeds.

### `npm run db:seed`

Runs `server/db-seeding/seed-curriculum.ts`. Loads from `server/seeds/` using env `CURRICULUM_SEED_FILE` (basename only unless you pass an absolute path); default is `curriculum-slmts.json`. Current SLMTS file has 9 tracks and 72 chapters.

### `npm run db:seed:curriculum:rr`

Same script with `CURRICULUM_SEED_FILE=curriculum-rr.json`. Use after `db:seed-orgs`. The RR file is a structured placeholder for Puranokta content (`tracks` may be empty until you add rows).

## Optional Demo Seeds

These scripts are not part of the main bootstrap path. Use them only when you need extra local demo data.

### `scripts/seeds/demo/create-sample-users.ts`

Creates 10 pending SLMTS student users with password `welcome123`.

Use this for approval-flow testing.

### `scripts/seeds/demo/create-30-students.ts`

Creates 30 active SLMTS student users with password `welcome123`.

Use this when you need a larger student list for UI testing.

## Maintenance Scripts

These scripts mutate progress/proficiency data in bulk. Use only on disposable local data.

### `scripts/maintenance/proficiency/check-and-reset.ts`

Fills missing progress rows for enrolled students, then resets proficiency values.

### `scripts/maintenance/proficiency/full-reset.ts`

Rebuilds proficiency coverage from active student memberships, then resets proficiency values.

### `scripts/maintenance/proficiency/reset-all.ts`

Resets every existing proficiency row.

## Smoke Tests

### `npm run auth:test`

Runs `scripts/test/smoke/auth-test.ts`.

Use after changing login, registration, session, cookies, or approval behavior.

### `npm run smoke:batches`

Runs `scripts/test/smoke/admin-batches-smoke.ts`.

Checks batch list/detail endpoints against a running API.

### `npm run test:smoke`

Runs `scripts/test/smoke/api-smoke-test.ts`.

General API smoke check.

### `npm run test:content`

Runs `scripts/test/smoke/content-smoke.ts`.

Content pipeline smoke check. This can create temporary test data.

### `npm run test:rr-isolation-smoke`

Runs `scripts/test/smoke/rr-isolation-smoke.test.ts`.

Checks RR tenant isolation behavior.

### `npm run test:second-org-join-smoke`

Runs `scripts/test/smoke/second-org-join-smoke.test.ts`.

Checks second-organization join/request/approval behavior.

## Unit-Style Tests

### `npm run test:format-date`

Runs `scripts/test/unit/format-date.test.ts`.

Small date formatting regression check.

## Contract Tests

Contract tests are focused checks for specific auth, tenant, DB, or authorization behavior. Run them directly with `npx tsx`.

After multi-tenancy, auth, or schema work, the Layer 3 contract suite is a good starting set:

- `npx tsx scripts/test/contracts/layer3-pass-a-schema-and-guards.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-a-isolation.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-schema-and-guards.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-script-compat.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-media-isolation.test.ts`
- `npx tsx scripts/test/contracts/layer3-pass-b-progress-audit-isolation.test.ts`

Additional examples:

- `npx tsx scripts/test/contracts/require-super-admin.test.ts`
- `npx tsx scripts/test/contracts/audit-log-visibility.test.ts`
- `npx tsx scripts/test/contracts/student-tenant-config.test.ts`

Use these after changes to authentication, OAuth, tenant routing, org memberships, admin authorization, content isolation, media isolation, progress, or audit logs. For a full file list, see `scripts/README.md`.

## Removed Scripts

The following scripts were removed because they were stale, duplicated, hardcoded to one developer, or too dependent on old assumptions:

- `scripts/db/reset-db.ts`
- `scripts/utils/check-theme-integrity.js`
- `scripts/utils/update-user-role.ts`
- `scripts/utils/check-instructor-batches.ts`
- `scripts/utils/test-e2e-batches.ts`
- `scripts/seed/create-approved-users.ts`
- `scripts/seed/create-sample-batches.ts`
- `scripts/seed/assign-secondary-instructors.ts`

## Practical Recommendations

For an empty database:

1. Run migrations only.
2. Inspect empty app behavior.
3. Run `db:seed-orgs` when you are ready to add tenants.
4. Run `db:seed-dev` only when you need a login/admin test account.
5. Run `db:seed` only when you need curriculum data.
6. Run scripts under `scripts/seeds/demo/` only when you need extra fake students.

For manual browser testing:

1. Make sure PostgreSQL is running.
2. Make sure the database has the data your test needs.
3. Start the stack with `npm run dev:all`.
4. Use `3000` for SLMTS, `3001` for RR, `3010` for admin, and `5000` for the API.

