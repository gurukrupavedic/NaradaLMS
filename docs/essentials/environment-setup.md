# Environment Setup & Database Initialization

This guide provides a comprehensive walkthrough for setting up a new NaradaLMS instance or configuring a fresh local development environment.

---

## 🏗️ Core Setup Sequence

Follow these steps in order to ensure all dependencies and configurations are correctly applied.

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher.
- **PostgreSQL**: A local instance or a remote provider like [Neon](https://neon.tech/).
- **Git**: For repository management.

### 2. Initial Configuration

1. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd NaradaLMS
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the required values.

   ```bash
   cp .env.example .env
   ```

### 3. Database Initialization

NaradaLMS uses **Drizzle ORM** with versioned SQL migrations under `./migrations/` (generated from `packages/types/src/schema.ts`).

Apply pending migrations to an existing database:

```bash
npm run db:migrate
```

For a **clean** local database (drops and recreates `public`, then applies all migrations), use `npm run db:reset` (see Maintenance & Reset below).

---

## 🌱 Data Seeding Strategy

Seeding is divided into tenant org rows (multi-tenancy), mandatory curriculum data, and optional testing data.

### Phase 0: Tenant organizations (multi-tenancy)

After migrations, ensure canonical organization rows exist (`slmts`, `rr`):

```bash
npm run db:seed-orgs
```

- **Script**: `server/db-seeding/seed-organizations.ts`
- Idempotent: safe to re-run. Typical order: `npm run db:reset` (or `db:migrate`), then `db:seed-orgs`, then Phase 0b (below), then `db:seed` if you need curriculum data.
- **API / registration:** Clients may send **`X-Tenant-Slug: slmts`** or **`rr`** (or JSON `tenantSlug` on `POST /api/auth/register`). If omitted, the API uses **`DEFAULT_TENANT_SLUG`** from `.env` (default `slmts`; see `.env.example`). Multi-tenancy status: [implementation-status.md](../implementation/multi-tenancy/implementation-status.md).

### Phase 0b: Dev super-admin and memberships (multi-tenancy)

Seeds the account matching **`SUPER_ADMIN_EMAIL`** as a platform super-admin (`users.is_super_admin`) and upserts **`user_organizations`** rows: **active** membership on **`slmts`** and **`rr`** (roles `student` + `admin` on each). Second-org join smoke uses a separate test user, not this seed shape.

```bash
npm run db:seed-dev
```

- **Script**: `server/db-seeding/seed-dev-bootstrap.ts`
- **Required:** `SUPER_ADMIN_EMAIL` (same as [server/config.ts](../../server/config.ts) auto-promotion).
- **When the user row does not exist yet:** set **`SUPER_ADMIN_PASSWORD`** (bcrypt-hashed on insert). Re-runs without this variable are fine once the user exists.
- **Optional:** `DEV_SUPERADMIN_FIRST_NAME`, `DEV_SUPERADMIN_LAST_NAME` (defaults: Dev / SuperAdmin).
- **Optional (dev only):** `DEV_SUPERADMIN_RESET_PASSWORD=1` plus **`SUPER_ADMIN_PASSWORD`** to re-hash the password for an existing user.
- **Legacy aliases:** `ADMIN_EMAIL` and `DEV_SUPERADMIN_PASSWORD` are still read if `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` are unset.

### Phase A: Curriculum (optional)

Populates tracks and chapters for the org declared in the seed file (`curriculum-slmts.json` by default). Use after org and dev bootstrap when the local database needs curriculum data.

```bash
npm run db:seed
```

- **Script**: `server/db-seeding/seed-curriculum.ts`
- **Source**: `server/seeds/curriculum-slmts.json` by default; set `CURRICULUM_SEED_FILE` to another basename under `server/seeds/` (for example `curriculum-rr.json`) or use `npm run db:seed:curriculum:rr`

### Phase B: First Admin User (Required)

There are three ways to establish the first administrator:

1. **Recommended (Auto-Promotion)**:
   Add `SUPER_ADMIN_EMAIL=your.email@example.com` to your `.env` file. The first time you register via the UI using this email, you will be automatically granted the `admin` role and `active` status.
2. **Dev seed (multi-tenancy Phase 0b)**:
   After `db:seed-orgs`, run `npm run db:seed-dev` with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` set (see Phase 0b above). Creates or updates the user row, sets `is_super_admin`, and inserts minimal org memberships.
3. **Manual database update**:
   If you have already registered and need to repair local access manually, inspect the current membership rows and update them deliberately. The old hardcoded `update-user-role` helper was removed during script cleanup because it only handled one developer email.

### Phase C: Sample Testing Data (Optional)

Populates mock users, students, and batches for UI/UX testing.

- **Pending users**: `npx tsx scripts/seeds/demo/create-sample-users.ts`
- **Active students**: `npx tsx scripts/seeds/demo/create-30-students.ts`

---

## 🛠️ Maintenance & Reset

### Full Database Reset

If your database becomes inconsistent during development, you can perform a "factory reset":

```bash
npm run db:reset
```

*Support note: the package-wired reset entrypoint on this repo state is `scripts/db/reset.ps1`.*

**Reset Sequence**:

1. Drops the `public` and `drizzle` schemas.
2. Recreates the `public` schema.
3. Grants necessary permissions.
4. Executes `drizzle-kit migrate` against repo-root `migrations/`.

---

## 🔗 Key Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `SESSION_SECRET` | Yes | Random string for signing session cookies. |
| `SUPER_ADMIN_EMAIL` | No | Email that receives auto-promotion on first registration and matches dev bootstrap seed. |
| `SUPER_ADMIN_PASSWORD` | No | Plain password for **first** `db:seed-dev` insert only (then optional). |
| `GOOGLE_CLIENT_ID` | Opt | Required for Google OAuth 2.0. |
| `GOOGLE_CLIENT_SECRET` | Opt | Required for Google OAuth 2.0. |

---

## 💡 Troubleshooting

- **`psql` not found**: Ensure PostgreSQL bin folder is in your system PATH.
- **Connection Refused**: Check if your local Postgres service is running or if your firewall blocks port 5432.
- **Schema Mismatch**: Re-run the supported path: `npm run db:reset`, then the needed seed commands (`db:seed-orgs`, `db:seed-dev`, and optionally `db:seed`).
