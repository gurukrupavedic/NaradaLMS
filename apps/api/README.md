# Backend

This is the current backend API (promoted from `apps/api-next`, its name during the rewrite).
`apps/api-legacy` is the frozen, executable pre-rewrite reference it replaced — still runnable,
testable, and reviewable independently, kept as a fallback while this rewrite is still settling in.

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

The default development port still comes from the shared environment. To also run the legacy API
through Docker, use its Compose profile; it exposes that service on host port 3001:

```sh
docker compose --profile legacy up narada-db narada-api-legacy
```

Planning documents (written during the rewrite — still the audit trail for the decisions behind
this app's shape, not a live spec):

- [`PARITY_PLAN.md`](./PARITY_PLAN.md) defines replacement compatibility with the current API.
- [`HARDENING_PLAN.md`](./HARDENING_PLAN.md) defines a separately gated track for correctness,
  security, data-lifecycle, and operational improvements beyond parity.
- [`decisions/`](./decisions/) contains approval-gated behavior proposals; a `proposed` note is
  not authorization to implement the change.
