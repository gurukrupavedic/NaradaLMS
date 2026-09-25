# Backend

This is the backend API. The pre-rewrite API it replaced has been removed; it remains in Git history
(`git show 9a35fcdc:apps/api-legacy/src/…`).

This app intentionally imports live workspace contracts instead of copying them:

- `@narada/db` owns public/school database types, scoped school databases, and schema tables.
- `@narada/auth` owns BetterAuth setup and session handling.
- `@narada/auth/permissions` owns school and batch permission types/helpers.
- `@narada/env` owns runtime configuration.

The core actor model is:

1. Resolve school from `X-School-Slug`.
2. Resolve authenticated user from BetterAuth.
3. Require organization membership for school-scoped work.
4. Resolve `SchoolProfile` from `X-Profile-Id` for profile-scoped work.
5. Authorize batch work through profile enrollment roles.

Use these commands from the repository root:

```sh
pnpm api:typecheck
pnpm api:lint
pnpm api:test
pnpm api:dev
```

The default development port still comes from the shared environment.
