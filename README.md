# Narada LMS

A multi-tenant learning management system. Schools are fully isolated via schema-per-school PostgreSQL. Content (tracks, chapters, audio) is authored by admins and consumed by students enrolled in batches.

## Requirements

| Tool | Version |
|------|---------|
| Node | 22.13.1 (pinned in `.nvmrc` and `engines`) |
| pnpm | 9.15.0 |
| sops | any recent (install: `brew install sops`) |
| age | any recent (install: `brew install age`) |

PostgreSQL and a Cloudflare R2 bucket are required at runtime. All connection strings and credentials are provided via `.env`.

## Setup

```sh
pnpm install
pnpm env:fetch                  # decrypt .env.sops → root .env + workspace symlinks
```

If this is your first time, you need an age key and a maintainer must add your public key to `.sops.yaml` before `env:fetch` will succeed. See [Environment management](#environment-management).

**Start the database:**

```sh
docker compose up -d narada-db  # PostgreSQL on port 5432
pnpm db:push                    # apply schema to the local database
```

Useful Docker commands:

```sh
docker logs narada-db -f                              # tail database logs
docker exec -it narada-db psql -U narada -d narada    # open a psql shell
docker logs narada-api -f                             # tail API logs (when running via Docker)
```

**Seed a local environment** (first time only):

```sh
pnpm seed superadmin --email superadmin@local.test --name "Admin"
pnpm seed school --slug local
```

This creates a super-admin account (`superadmin@local.test` / `testing123`) and a `local` school populated with test tracks, batches, instructors, and students. See [Seed tools](#seed-tools) for all options.

**Start the dev servers:**

```sh
pnpm api:dev        # Express API on port 3000
pnpm web:dev        # Next.js frontend
```

## Commands

### Development

```sh
pnpm api:dev        # start API with tsx watch (hot reload)
pnpm web:dev        # start Next.js dev server
```

### Build

```sh
pnpm api:build      # tsc → dist/
pnpm web:build      # next build
pnpm typecheck      # typecheck all packages
```

### Database

```sh
pnpm db:generate:public   # generate Drizzle migration for public schema
pnpm db:generate:school   # generate Drizzle migration for school schema
pnpm db:push              # push schema changes (dev only)
pnpm db:studio            # open Drizzle Studio
```

### Auth

```sh
pnpm auth:generate        # regenerate BetterAuth schema from config
```

### Schools

```sh
pnpm schools:create --name "..." --slug "..."
```

Only use this rare provisioning tool as a super-admin user. The tool prompts for the super-admin email and password, verifies that the authenticated user is a super-admin, and adds that user as the initial owner. Pass `--ownerEmail "..."` to make a different user the owner.

### Seed tools

Tools for local development and testing. All seed user accounts share the password `testing123` unless overridden.

**Bootstrap a super-admin** (run this first, before anything else):

```sh
pnpm seed superadmin --email admin@example.com --name "Admin"
```

Creates a user and sets `isSuperAdmin = true`. Does not require existing credentials.

**Seed a full school** with tracks, batches, and enrolled users:

```sh
pnpm seed school --slug test-school
# with options:
pnpm seed school --slug test-school --name "Test School" \
  --tracks 2 --chapters 5 --batches 2 --instructors 2 --students 5
```

Prompts for super-admin credentials, then idempotently creates:
- The school org and its Postgres schema
- `{slug}-owner@seed.test` and `{slug}-admin@seed.test` as org members
- Published seed chapters for every track
- N instructor and M student users, distributed across all batches (max 2 instructors per batch)

**Create a single user** with an optional role:

```sh
# User only
pnpm seed user --email jane@example.com --name "Jane"

# Org-level role (owner | admin | member)
pnpm seed user --email jane@example.com --name "Jane" \
  --role admin --schoolSlug test-school

# Batch-level role (instructor | ta | student)
pnpm seed user --email jane@example.com --name "Jane" \
  --role student --schoolSlug test-school --batchId <uuid>
```

All seed commands are idempotent — safe to run multiple times against the same slug or email.

### Environment management

```sh
pnpm env:fetch      # decrypt packages/env/.env.sops → root .env, recreate workspace symlinks
pnpm env:encrypt    # encrypt root .env → packages/env/.env.sops (commit the result)
pnpm env:link       # recreate workspace .env symlinks without re-decrypting
```

### Linting and formatting

```sh
pnpm lint           # eslint across all packages
pnpm format         # prettier across all packages
```

## Environment management

The source of truth for secrets is `packages/env/.env.sops`, encrypted with [SOPS](https://github.com/getsops/sops) and [age](https://github.com/FiloSottile/age). The root `.env` is gitignored. Workspace packages (`apps/api`, `apps/web`, `packages/db`, etc.) each get a `.env` symlink pointing to the root `.env`.

**First-time setup:**

```sh
mkdir -p "$HOME/Library/Application Support/sops/age"
age-keygen -o "$HOME/Library/Application Support/sops/age/keys.txt"
```

Send the public key (starts with `age1`) to a maintainer. They add it to `.sops.yaml` and re-run `pnpm env:encrypt`. Then you can run `pnpm env:fetch`.

**Adding or removing a developer:** Edit `.sops.yaml` to add or remove their `age1...` recipient, then re-run `pnpm env:encrypt` and commit. Removing a recipient prevents future decryptions; rotate any credentials they had access to if needed.

**Never commit the root `.env`.**

The `packages/env/src/index.ts` module validates all required variables at startup using `@t3-oss/env-core` and zod. Any missing or malformed variable throws at boot, not at runtime.

## Workspace structure

```
apps/
  api/          @narada/api     Express 5 backend
  web/          @narada/web     Next.js 16 frontend
packages/
  auth/         @narada/auth    BetterAuth config, permissions, ids
  db/           @narada/db      Drizzle ORM, schema definitions, connection pooling
  env/          @narada/env     Env validation (t3-oss/env-core + zod), .env.sops storage
  storage/      @narada/storage Cloudflare R2 client (AWS SDK v3)
tools/          @narada/tools   Internal CLI utilities (env and rare provisioning tools)
docs/
  api.md        HTTP API reference
  data-model.md Database schema, roles, multi-tenancy strategy
  architecture-review.md Outstanding work items
```

All packages are ESM (`"type": "module"`) with `NodeNext` module resolution. TypeScript sources are executed directly via `tsx` during development; the API is compiled with `tsc` for production.

## Architecture

### Multi-tenancy

Each school gets its own Postgres schema (`school_<organizationId>`). The `public` schema holds shared data: BetterAuth tables, the school (organization) registry, and user accounts.

`packages/db` exports two branded database types:
- `PublicDatabase` — `search_path=public`, for auth and cross-school operations
- `SchoolDatabase` — `search_path=school_<id>,public`, for per-school domain data

School databases are created lazily and cached in an LRU cache (`getScopedDatabase(organizationId)`). The API middleware resolves the school from the `X-School-Slug` header and attaches the scoped database to the request context.

### Authentication and roles

Authentication is handled by [BetterAuth](https://www.better-auth.com/) with the organization plugin. Sessions use cookies (`SameSite=Lax`).

There are two role levels:

**School-level** (BetterAuth `member.role`): `owner`, `admin`, `member`.

**Batch-level** (`enrollment.role` in the school schema): `instructor`, `ta`, `student`.

**Super admin** is a flag on `public.user.isSuperAdmin` and bypasses all school-level access control.

Authorization is done with utility functions, not middleware. There are no values injected onto `req.locals` — the school database and auth context are typed on the request object via `schoolRoute` / `publicRoute` wrappers in `apps/api/src/naradaRoute.ts`.

### API

- All routes are prefixed `/v1`.
- School-scoped routes require `X-School-Slug`.
- Every response uses the envelope `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
- Paginated lists use cursor-based pagination: `?cursor=&limit=` in, `{ items, nextCursor }` out.
- Error codes are machine-readable strings (`RESOURCE_NOT_FOUND`, `PERMISSION_DENIED`, etc.). See `docs/api.md` for the full reference.

### File storage

Chapter text and audio files are stored in Cloudflare R2 under:

```
schools/{organizationId}/chapters/{chapterId}/text/{uuid}.txt
schools/{organizationId}/chapters/{chapterId}/audio/{uuid}.{ext}
```

Uploads use a staged presign → upload → complete flow: the API first creates a pending staged upload row with the final object key, the client uploads directly to R2, then the API completes the staged upload into the durable chapter text or audio asset record. Download URLs are signed per-request and cached within the request lifecycle.

## Codebase patterns

**Env access:** import `env` from `@narada/env`. Never read `process.env` directly inside application code.

**Database access:** use `publicDb` for public-schema queries, `getScopedDatabase(organizationId)` for school-scoped queries. Service functions that must work inside transactions accept `SchoolDbExecutor` (union of `SchoolDatabase | SchoolTransaction`).

**IDs:** domain records use UUIDv7 (time-ordered). BetterAuth-managed records use BetterAuth's own ID generation (text). See `packages/db/src/ids.ts` and `packages/auth/src/ids.ts`.

**Validation:** request bodies are validated with zod at the route level. Shared schemas live in the relevant service or route file — there are intentionally no shared route-param schema registries.

**Error handling:** the API uses a small set of typed `AppError` subclasses defined in `apps/api/src/error.ts`. Throw those; the route wrapper maps them to the response envelope.

**TypeScript style:** prefer `satisfies` over explicit type annotations when inference and shape validation are both needed. Service modules export named free functions, not class instances or default exports.

**Operator actions:** rare provisioning operations such as school creation live in `@narada/tools`. Repair or cleanup work should be designed as explicit domain workflows or infrastructure policy, not as one-off scripts.
