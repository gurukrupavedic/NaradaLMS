# Rewrite Backend

This tracked workspace package contains the next backend API while `apps/api` remains the frozen,
executable compatibility reference. It is intentionally runnable, testable, and reviewable
independently from the current backend.

The rewrite intentionally imports live workspace contracts instead of copying them:

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
pnpm api-next:typecheck
pnpm api-next:lint
pnpm api-next:test
pnpm api-next:dev
```

The default development port still comes from the shared environment. To run both APIs through
Docker, use the rewrite Compose profile; it exposes this service on host port 3001:

```sh
docker compose --profile rewrite up narada-db narada-api-next
```

Promote this package to `apps/api` only after the parity and hardening cutover gates pass.

Planning documents:

- [`PARITY_PLAN.md`](./PARITY_PLAN.md) defines replacement compatibility with the current API.
- [`HARDENING_PLAN.md`](./HARDENING_PLAN.md) defines a separately gated track for correctness,
  security, data-lifecycle, and operational improvements beyond parity.
- [`decisions/`](./decisions/) contains approval-gated behavior proposals; a `proposed` note is
  not authorization to implement the change.
