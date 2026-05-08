# Multi-Tenancy Setup Baseline (Section 0)

This file records the execution evidence for checklist section `0) Setup` in [implementation-checklist.md](./implementation-checklist.md).

## Capture metadata

- Date/time: `2026-05-08T09:41:18.8556371-04:00`
- Branch: `multi-tenancy`
- Base commit: `fc31ecb1`

## 0.1 Branch creation

- Created long-lived branch `multi-tenancy` from latest `main`.
- Branching strategy for implementation: follow roadmap slice branches (for example `slice-1.1-org-schema`) and merge each verified slice into `multi-tenancy`.
- Final merge style from `multi-tenancy` to `main` is intentionally deferred.

## 0.2 DB reset / migration-from-empty path

Executed:

- `npm run db:reset`
- `psql -U postgres -h 127.0.0.1 -d naradalms_dev -c '\dt'`

Result:

- DB reset succeeded (drop public schema, recreate schema, drizzle push applied).
- Table list after reset confirmed schema objects are present:
  - `users`
  - `tracks`
  - `chapters`
  - `batches`
  - `enrollments`
  - `audio_files`
  - `text_segments`
  - `media_segments`
  - `segment_mappings`
  - `student_progress`
  - `proficiency_evaluation_log`
  - `audit_logs`
  - `batch_co_instructors`
  - `system_settings`

Note: the first `db:reset` attempt hung at the `psql` step because password input was required. Re-run with `PGPASSWORD` exported completed successfully.

## 0.3 Baseline typecheck/tests capture

Executed baseline commands:

- `npm run check`
- `npm run lint`
- `npm run test:format-date`

Baseline summary:

- TypeScript typecheck: pass (`0` errors)
- ESLint: `640` warnings, `0` errors
- Format-date tests: pass (`8 tests passed`)

### Typecheck issue categories

No typecheck failures in this baseline (`npm run check` passed cleanly). There are no `users.roles`/`users.status` compiler failures at baseline; these may still appear as runtime or lint-level concerns once schema/auth refactors begin.

### Lint highlights (non-blocking baseline noise)

Most recurring warnings are:

- `@typescript-eslint/no-unused-vars` for caught error variables.
- Unused `eslint-disable` directives in a small number of files.

## Skipped checks

The following checks were intentionally skipped in section 0 baseline:

- `npm run test:smoke`
- `npm run test:content`
- `npm run verify`

Reason: these depend on a running server and are better re-baselined after Layer 2/Layer 3 auth and org-scoping contracts stabilize.
