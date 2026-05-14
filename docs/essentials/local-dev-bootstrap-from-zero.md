# Local development bootstrap from zero (multi-tenant)

This document is a **granular runbook** for standing up a **fresh** local NaradaLMS environment after the **multi-tenancy** architecture is in place. Use it when the Postgres database is **empty** (or you want a deliberate factory reset) and you need a clear picture of **what is already satisfied by the repo**, **what you must do on your machine**, and **what remains optional**.

Companion docs:

- [Environment setup and seeding overview](environment-setup.md)
- [Scripts layout and commands](scripts-guide.md)
- Multi-tenancy status and depth: [implementation-status.md](../implementation/multi-tenancy/implementation-status.md)

---

## 1. How to read this runbook

Each major section ends with a **status line**:

- **Repository**: already true in the codebase (nothing for you to “implement”).
- **Your machine**: you do this once per workstation (or when tooling changes).
- **Your database**: you do this per local database instance.
- **Your `.env`**: you do this per clone or when secrets change.
- **Optional**: skip until a feature needs it.

Seeding is **not** one command: it is an **ordered sequence** of migrations plus small, idempotent scripts. Skipping a step usually produces a **clear error** (for example, curriculum seed requires the `slmts` organization row).

---

## 2. End state you are aiming for

After the **required** path below, you typically have:

| Layer | What exists |
| --- | --- |
| Schema | All tables from `./migrations/` (Drizzle). |
| Tenants | Two organizations: `slmts`, `rr`. |
| Users | One local super-admin aligned to `ADMIN_EMAIL`, with **active** SLMTS membership (`student` + `admin`) and **pending** RR membership (`student`) for second-org flows. |
| Curriculum (optional) | SLMTS tracks and chapters from `server/seeds/curriculum-slmts.json` via `npm run db:seed`; RR placeholder via `npm run db:seed:curriculum:rr`. |

You **do not** get demo batches, secondary instructors, or bulk fake students unless you run **optional** scripts under `scripts/seeds/demo/` (those paths are intentionally not part of the canonical bootstrap).

---

## 3. Phase A — Workstation and repository

### A.1 Install prerequisites

| Step | Detail |
| --- | --- |
| A.1.1 | Install **Node.js** (v18+ per [environment-setup](environment-setup.md)). |
| A.1.2 | Install **PostgreSQL** (local install or remote provider). For `npm run db:reset`, the reset script expects **`psql.exe`** in a standard Windows path (see `scripts/db/reset.ps1`) or adjust the script. |
| A.1.3 | Install **Git**. |

**Status:** **Your machine**

### A.2 Clone and install dependencies

| Step | Command / action |
| --- | --- |
| A.2.1 | Clone the repository and `cd` into the repo root. |
| A.2.2 | Run `npm install` at the **repository root** (npm workspaces). |

**Status:** **Your machine** (clone); **Repository** defines workspace layout

### A.3 Shared types package (when needed)

| Step | Detail |
| --- | --- |
| A.3.1 | After **schema or `@narada/types` changes**, run `npm run build:types` so downstream TypeScript and seeds align. |
| A.3.2 | On a **clean** checkout with no local type edits, you can often proceed without this until something fails to compile. |

**Status:** **Optional** for first boot; **Your machine** when types drift

---

## 4. Phase B — PostgreSQL database object

### B.1 Create an empty database

| Step | Detail |
| --- | --- |
| B.1.1 | Create a dedicated database (example name: `naradalms`). |
| B.1.2 | Ensure your DB user can create schemas and apply migrations (local dev usually uses a superuser or a role with sufficient rights). |

**Status:** **Your database**

---

## 5. Phase C — Environment variables (`.env`)

### C.1 Create `.env` from the template

| Step | Command / action |
| --- | --- |
| C.1.1 | Copy `.env.example` to `.env`. |

**Status:** **Your `.env`**

### C.2 Database URL (required for app and all TS seeds)

The application resolves the DB connection from **`DATABASE_URL` only** (`server/db.ts` → `config.database.url`). If `DATABASE_URL` is missing, Node will throw when loading the DB module.

| Step | Detail |
| --- | --- |
| C.2.1 | Set **`DATABASE_URL`** in `.env` to a full connection string, for example `postgresql://USER:PASSWORD@localhost:5432/naradalms`. |
| C.2.2 | **Note:** `scripts/db/reset.ps1` can *construct* a URL from `PG*` variables for its own `psql` and `drizzle-kit` subprocess, but **tsx seed scripts** still load `dotenv` and expect **`DATABASE_URL`** to be present for `server/db.ts`. Prefer defining **`DATABASE_URL` explicitly** in `.env` to avoid confusion. |

**Status:** **Your `.env`** (required)

### C.3 Auth and CORS (minimum for local dev)

| Variable | Required for | Notes |
| --- | --- | --- |
| `JWT_SECRET` | Sessions / JWT signing | Has a dev default in code but set a real value for anything beyond throwaway local. |
| `CORS_ORIGINS` | API ↔ browser origins | `.env.example` lists student, RR student, and admin ports. |
| `FRONTEND_URL` | Links and redirects | Often `http://localhost:3000` for SLMTS student portal. |

**Status:** **Your `.env`**

### C.4 Multi-tenant defaults

| Variable | Role |
| --- | --- |
| `DEFAULT_TENANT_SLUG` | When clients omit `X-Tenant-Slug`, register/OAuth use `slmts` or `rr` (default `slmts` if unset). |

**Status:** **Your `.env`** (optional; defaults exist)

### C.5 Dev super-admin bootstrap (for `npm run db:seed-dev`)

| Variable | When required |
| --- | --- |
| `ADMIN_EMAIL` | **Always** for `db:seed-dev` (script throws if missing). |
| `DEV_SUPERADMIN_PASSWORD` | **Only when** the user row for `ADMIN_EMAIL` **does not exist yet** (first insert). |
| `DEV_SUPERADMIN_RESET_PASSWORD=1` | Optional: with `DEV_SUPERADMIN_PASSWORD`, re-hash password for an **existing** user. |
| `DEV_SUPERADMIN_FIRST_NAME`, `DEV_SUPERADMIN_LAST_NAME` | Optional display names. |

**Status:** **Your `.env`**

### C.6 Google OAuth (optional)

If you need Google login locally, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and callback URL per `.env.example`. Not required for password-based local super-admin.

**Status:** **Optional**

---

## 6. Phase D — Schema (migrations only, no business data)

You can get schema in either of two ways.

### D.1 Non-destructive: apply migrations to an empty DB

| Step | Command |
| --- | --- |
| D.1.1 | `npm run db:migrate` |

**Result:** Tables exist; **no** organizations, users, or curriculum.

**Status:** **Your database** (command)

### D.2 Destructive factory reset (typical local “start over”)

| Step | Command |
| --- | --- |
| D.2.1 | `npm run db:reset` |

**What it does (granular):**

1. Requires `.env` at repo root.
2. Ensures `DATABASE_URL` exists (builds from `PG*` if needed **for the script’s environment**).
3. Uses `psql` to `DROP SCHEMA public CASCADE` and `DROP SCHEMA drizzle CASCADE`.
4. Recreates `public` and grants.
5. Runs `npx drizzle-kit migrate` to apply everything under `./migrations/`.

**What it does *not* do:** any seed (orgs, users, curriculum).

**Status:** **Your database** (destructive); **Repository** provides `scripts/db/reset.ps1`

---

## 7. Phase E — Canonical data seeding (order matters)

Run these from the **repository root** after Phase D.

### E.1 Organizations (multi-tenancy baseline)

| Step | Command | Idempotent |
| --- | --- | --- |
| E.1.1 | `npm run db:seed-orgs` | Yes (`onConflictDoNothing` on `slug`) |

**Implements:** `server/db-seeding/seed-organizations.ts` — inserts `slmts` and `rr`.

**If skipped:** later seeds that look up `organizations.slug` fail with explicit errors.

**Status:** **Repository** (script); **You** run the command

### E.2 Dev super-admin and memberships

| Step | Command | Idempotent |
| --- | --- | --- |
| E.2.1 | `npm run db:seed-dev` | Yes (upserts memberships; updates user flags) |

**Preconditions:**

- Phase E.1 completed (`slmts` and `rr` rows exist).
- `ADMIN_EMAIL` set; `DEV_SUPERADMIN_PASSWORD` set **on first create**.

**Postcondition (intended local story):**

- User: `is_super_admin`, local provider, approved.
- `user_organizations`: SLMTS **active** with roles `student` + `admin`; RR **pending** `student`.

**Status:** **Repository** (script); **You** run the command and own `.env` values

### E.3 SLMTS curriculum (optional but common)

| Step | Command | Idempotent |
| --- | --- | --- |
| E.3.1 | `npm run db:seed` | Yes (upserts; ensures curriculum import system user) |

**Preconditions:** `slmts` org exists (E.1).

**If skipped:** admin/student content experiences that need tracks/chapters will look empty.

**Status:** **Repository** (script); **Optional** for your workflow

---

## 8. Phase F — Optional demo data (explicitly non-canonical)

Only when UI needs many pending users or students:

| Step | Command | Purpose |
| --- | --- | --- |
| F.1 | `npx tsx scripts/seeds/demo/create-sample-users.ts` | Pending SLMTS students (password documented in [scripts-guide](scripts-guide.md)). |
| F.2 | `npx tsx scripts/seeds/demo/create-30-students.ts` | Bulk active SLMTS students. |

**Status:** **Optional**; **Repository** provides scripts; **not** wired as required `npm run` steps

---

## 9. Phase G — Run the application stack

| Step | Command | What starts |
| --- | --- | --- |
| G.1 | `npm run dev` | API only (`server/index.ts`, default port **5000**). |
| G.2 | `npm run dev:all` | API + SLMTS student (**3000**) + RR student (**3001**) + admin (**3010**) via `scripts/dev/start-all.ps1`. |

**Preconditions:** `.env` valid; database migrated and seeded to the level you need.

**Status:** **Your machine** (terminals)

---

## 10. Phase H — Verify what you have

### H.1 Read-only inspection

| Step | Command |
| --- | --- |
| H.1.1 | `npx tsx scripts/db/list-users.ts` — lists recent users and memberships (no `npm` alias). |

**Status:** **Optional** troubleshooting

### H.2 Smoke and contract tests

See [scripts-guide](scripts-guide.md) for `npm run auth:test`, `npm run test:smoke`, RR isolation, second-org join, and contract test paths. Many require a **running API** and sensible seed data.

**Status:** **Optional** quality gates

---

## 11. Compatibility wrapper (`server/init-database.ts`)

| Fact | Detail |
| --- | --- |
| What it does when run as main | Calls **organization seed** then **curriculum seed** only. |
| What it does **not** do | **No** `db:seed-dev` (no super-admin/membership bootstrap). |
| Recommendation | Prefer the **documented npm sequence** (`db:seed-orgs` → `db:seed-dev` → optional `db:seed`). Use `init-database.ts` only if you already understand the gap. |

**Status:** **Repository** (legacy / convenience)

---

## 12. Checklist summary (copy for onboarding)

**Machine / repo**

- [ ] Node, Postgres, Git installed  
- [ ] Repo cloned, `npm install`  

**Database**

- [ ] Empty database created  
- [ ] Either `npm run db:migrate` **or** `npm run db:reset` executed successfully  

**Configuration**

- [ ] `.env` present  
- [ ] **`DATABASE_URL` set** (required for app + seeds using `server/db.ts`)  
- [ ] `JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL` set appropriately  
- [ ] `ADMIN_EMAIL` (+ `DEV_SUPERADMIN_PASSWORD` on first user) for dev bootstrap  

**Canonical seeds (order)**

- [ ] `npm run db:seed-orgs`  
- [ ] `npm run db:seed-dev`  
- [ ] `npm run db:seed` *(optional)*  

**Run**

- [ ] `npm run dev:all` *(or `npm run dev`)*  

**Optional**

- [ ] Demo seed scripts  
- [ ] Smoke / contract tests  

---

## 13. “Already done” vs “still on you” (after multi-tenancy migration)

| Item | Typical status |
| --- | --- |
| Multi-tenant schema, API behavior, app routing | **Repository / already migrated** (your statement: complete) |
| Postgres server install, database creation | **Your machine** |
| `.env` with valid `DATABASE_URL` and secrets | **Your environment** |
| Applying migrations | **You run** `db:migrate` or `db:reset` |
| Tenant rows (`slmts`, `rr`) | **You run** `db:seed-orgs` unless you intentionally want an org-less DB |
| First super-admin + memberships | **You run** `db:seed-dev` (or register via UI with `ADMIN_EMAIL` auto-promotion per [environment-setup](environment-setup.md)) |
| Curriculum JSON load | **You run** `db:seed` if needed |
| Demo users / batches / old helper scripts | **Not** in default path; several legacy scripts were **removed** (see [scripts-guide](scripts-guide.md) “Removed Scripts”) |

---

## 14. Learnings to record (common pitfalls)

1. **`DATABASE_URL` missing:** seeds and API fail early; `PG*` alone is insufficient for `server/db.ts`.  
2. **Wrong seed order:** `db:seed-dev` before `db:seed-orgs` fails with a clear “run seed-orgs first” style error.  
3. **`db:reset` wipes data:** always re-run E.1–E.3 as needed.  
4. **RR curriculum:** `npm run db:seed` loads **`curriculum-slmts.json`** by default. Use **`npm run db:seed:curriculum:rr`** (or `CURRICULUM_SEED_FILE=curriculum-rr.json`) after you populate `server/seeds/curriculum-rr.json`.  
5. **Windows vs POSIX:** `db:reset` and `dev:all` are PowerShell-first; other platforms may need equivalent commands or WSL.  

---

## 15. Quick reference — one-line happy path

```bash
npm install
# Ensure .env has DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, DEV_SUPERADMIN_PASSWORD (first time)
npm run db:reset
npm run build:types
npm run db:seed-orgs
npm run db:seed-dev
npm run db:seed
npm run dev:all
```

Adjust by removing `db:reset` if you must preserve data, swapping in `db:migrate`, and dropping `db:seed` or `build:types` when not needed.
