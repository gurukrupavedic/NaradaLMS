# Staging/production runbook: apply pending migrations + import the SLMTS roster

**Audience:** whoever has Railway access to the `narada` project's staging or production
environment. Written to be followed step-by-step; each step says what to run, what you should see,
and how to check it actually worked before moving on.

**Run this once per environment** — staging first, then production. Each environment is a separate
Railway environment/service with its own Postgres database and its own credentials; nothing here is
shared between them. Don't skip straight to production because staging "should" behave the same —
the whole point of doing staging first is to catch anything environment-specific before it matters.

**Covers:** applying any pending `packages/db/drizzle/public` migrations, bringing existing school
schemas up to date, and importing the real SLMTS registration/tracker data (currently: 1054 users /
1212 profiles / 8 tracks / 74 chapters / 91 batches / 957 enrollments / 10,396 evaluations — see
`seed-data/_report.json` for the exact numbers behind this run) into a new `slmts` school. Exams
and their results are **not** part of this import: a track's certification is its latest
`examResult`, which needs the real mark sheet, so seed those from data that carries the marks.

**Does not cover:** anything about the Twilio Verify OTP integration itself (that's already live —
see the login note in Step 2) beyond confirming its environment variables are set; anything about
`apps/api`'s own deploy process (this assumes the API is already deployed and reachable — see the
prerequisite below).

---

## ⚠️ Which API is actually live matters here

`railway.json` builds `apps/api/Dockerfile` — the rewritten API (the "Backend rewrite" PR), not
`apps/api-legacy` (the pre-rewrite app, kept only as a buildable fallback behind
`docker-compose.yaml`'s `legacy` profile). `tools/src/import-school.ts` validates every imported row
against `@narada/api`'s own live schemas for exactly this reason — a bulk import that bypasses the
HTTP layer should never write a row the real, currently-deployed API would reject. If that ever
changes (a future rewrite, a rollback to the legacy app), update `import-school.ts`'s imports
*before* running this runbook — otherwise Step 4/6's "passes validation" is validating against the
wrong app's rules.

---

## Prerequisites

1. Latest `main` checked out locally, `pnpm install` run. The tools used below live in `tools/`
   (`src/import-school.ts`, `src/seed.ts`). Schema migrations are **not** a tool: the API applies them
   itself on every boot (see Step 1).
2. **Railway CLI installed and logged in** (`railway whoami` should show your account). Find the
   `narada` project's ID once with `railway status --json` (or `railway status` for the
   human-readable form) — every command below needs it explicitly via `--project`, rather than
   relying on whatever happens to be linked in your current directory, so a stray `railway link` in
   some other project can't silently point a command at the wrong one.
3. **Open a local tunnel to this environment's database — never use the public connection string.**
   In its own terminal tab, run (substituting the real project ID from step 2 — `Postgres-J_f2` is
   the current Postgres service name; confirm with `railway status --project <PROJECT_ID> --environment staging`
   if it's ever been renamed or recreated):
   ```sh
   railway connect Postgres-J_f2 --project <PROJECT_ID> --environment staging --ssh --tunnel-only
   ```
   (`--environment production` for the production pass.) `--ssh` forces the tunnel over Railway's
   private SSH path instead of the database's public TCP proxy — don't omit it just because the
   service happens to have a public proxy domain that would otherwise work; the whole point here is
   to never touch that. `--tunnel-only` skips launching `psql` itself and just holds the tunnel open,
   printing something like:
   ```
   PostgreSQL tunnel open — point an external client at:

     Host:     127.0.0.1
     Port:     <ephemeral-port>
     User:     postgres
     Password: <redacted>
     Database: railway

     URL:      postgresql://postgres:<redacted>@127.0.0.1:<ephemeral-port>/railway

   Press Ctrl+C to close the tunnel.
   ```
   **Leave this terminal running for your entire session against this environment.** The port is
   ephemeral and only valid while the tunnel is open — if it dies (closed terminal, network blip),
   every command below will start failing to connect, and you'll need to restart the tunnel and
   pick up the new port in the next step. Don't reuse a URL from an earlier tunnel run.
4. **Pull this environment's other variables, then override `DATABASE_URL` with the tunnel's local
   URL:**
   ```sh
   railway variable list --service api --project <PROJECT_ID> --environment staging --kv > .env.staging
   ```
   (`.env.production` / `--environment production` for the production pass.) This is a
   **separate, local-only file** — do **not** overwrite your regular `.env` (used for local dev,
   pointing at `packages/env/.env.sops`'s shared dev config) and do **not** commit this file. Then
   open it and replace its `DATABASE_URL=...` line with the `URL:` value the tunnel printed in step
   3 — every other variable in the file (auth secrets, storage, Twilio) stays exactly as Railway has
   it; only the database connection changes to go through your local tunnel instead of the network.
   Load it into your shell before any command in this runbook:
   ```sh
   set -a && source .env.staging && set +a   # or .env.production
   ```
   Run that once per new terminal session, and again if you switch which environment you're working
   on. (On fish: `set -gx (cat .env.staging | grep -v '^#' | xargs -L1 echo)` is fussier — easiest is
   to temporarily use `bash` for this runbook.)
5. **Also `export NODE_ENV=production` in that same shell, every time — this is not optional.**
   `packages/env/src/load.ts` (imported by every `tools/src/*.ts` command in this runbook) does:
   ```js
   if (process.env.NODE_ENV !== 'production') {
     config({ path: '.../packages/env/.env', override: true })
   }
   ```
   `override: true` means it **silently overwrites whatever `DATABASE_URL` (and everything else)
   you just sourced from `.env.staging`/`.env.production` with local dev's `.env`** — every single
   time, unless `NODE_ENV` is already `'production'`. Plain `psql` isn't affected (it's not a Node
   process, dotenv never runs), which is exactly what makes this dangerous: your `psql "$DATABASE_URL"`
   verification queries will correctly hit staging/production, while every `pnpm exec tsx ...`
   command silently no-ops against your local database instead — with no error, no warning, just the
   wrong org getting migrated/queried/imported into. **Verify this actually worked** by re-running
   something read-only first — list the organizations through Node and compare with `psql`:
   ```sh
   cd tools && pnpm exec tsx -e "import('@narada/db').then(async ({ publicDb, shutdownPools }) => { console.log(await publicDb.query.organization.findMany({ columns: { id: true, slug: true } })); await shutdownPools() })"
   psql "$DATABASE_URL" -c "SELECT id, slug FROM organization;"
   ```
   The two lists must match. If the first one shows your local dev organizations instead, the
   environment did not load.
6. **Confirm `USE_TWILIO_API=true` and `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` /
   `TWILIO_VERIFY_SERVICE_SID` are all set** in the file from step 4 (they came from Railway's own
   variables, so if they're missing there, they're missing on the environment itself — go set them
   on the `api` service before continuing). Sign-in is phone-number OTP only
   (`emailAndPassword.enabled: false` in `packages/auth/src/index.ts`) — if these aren't set,
   `USE_TWILIO_API` defaults to `false` and the API silently logs OTP codes to its own console
   instead of sending them, so **nobody can actually receive a code to log in**. Confirm this before
   importing anyone real into this environment, not after.
7. Read access to run verification `psql` queries against this environment (the tunneled
   `DATABASE_URL` from step 4 already grants this — `psql "$DATABASE_URL"` connects through the same
   tunnel as everything else here).

---

## Step 1 — Public-schema migrations (applied by the API on boot)

There is no migration command to run. `apps/api/src/index.ts` applies the public-schema migrations
(`migratePublicSchema()`) and every school schema's (`migrateAllSchoolSchemas()`, Step 3) on every
boot, before the server opens its port. So this step is: make sure the API build you want is deployed
to this environment and started cleanly.

**Expect** in the API's logs: `applied pending database migrations` (`event: startup.migrated`), and
the service healthy. A migration that fails stops the boot, so a healthy API means the schema is
current.

**If the API fails to boot with `relation "..." already exists`** (e.g. `relation "account" already exists`, or
`column "phoneNumber" of relation "user" already exists`): this means drizzle's migration-tracking
table (`drizzle.__drizzle_migrations`) doesn't reflect reality — either it's missing the row for a
migration that's actually already applied, or it doesn't exist at all yet (the likely case if this
environment's public schema was ever set up via `pnpm db:push`, which never writes to that table).
`migrate()` runs in one transaction, so the failure itself is safe — nothing partial is left behind
— but don't just re-run it blindly. Reconcile first:

> **A note on the SQL below:** it's written as plain SQL to paste into an already-open `psql` session
> (e.g. Railway's console) — no shell involved, no shell-quoting needed. If you'd rather run it as a
> one-shot shell command instead (`psql "$DATABASE_URL" -c '...'`), that needs its own, different
> quoting to embed SQL string literals inside a shell argument — ask for that form rather than
> improvising it, since mixing the two conventions produces a confusing parse error rather than an
> obvious one.

1. **Check current state** (safe, read-only):
   ```sh
   psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
   ```
   Expect either "relation does not exist" or zero rows if this environment predates any tracked
   migration. **If you see unexpected rows already there, stop and investigate before continuing**
   — don't backfill on top of an unknown state.

2. **Backfill the tracking row(s) for whatever's genuinely already applied.** `packages/db/drizzle/public/`
   currently has four migrations (`0000_nebulous_the_liberteens` through `0003_grey_sheva_callister`
   — check `packages/db/drizzle/public/meta/_journal.json` for the current list, since more may have
   landed since this was written). For the common case — this environment's tables already exist
   from an original `db:push` setup, so however many of these migrations are already reflected in
   the live schema count as "already applied."

   Open an interactive session (`psql "$DATABASE_URL"`, or however your provider's console gets you
   a `psql`/`=#` prompt) and paste this as **plain SQL** — don't wrap it in `psql -c '...'` from a
   shell, since the quoting needed for that is different and easy to get wrong when pasting into an
   already-open session (ask me if you want the shell-wrapped form instead). Repeat the `INSERT` for
   each migration you're backfilling, in order:
   ```sql
   CREATE SCHEMA IF NOT EXISTS "drizzle";
   CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
     id SERIAL PRIMARY KEY,
     hash text NOT NULL,
     created_at bigint
   );
   INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
   VALUES ('b5d361c0be6cb4d0bcd7eed656eaf7e30a21676b28d2094188faa7840d65744f', 1780374016543);
   ```
   That hash/timestamp pair is `0000_nebulous_the_liberteens.sql` as of this runbook — recompute it
   yourself for any migration you're backfilling (`sha256` of the raw `.sql` file content; the
   timestamp is that migration's `when` in `packages/db/drizzle/public/meta/_journal.json`), don't
   reuse a stale value from this doc without checking.

3. **Verify exactly the row(s) you intended landed** (plain SQL, same session):
   ```sql
   SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
   ```

4. **Restart the API** — it should now skip whatever you backfilled and apply only what's genuinely
   still pending.

If the failure doesn't match this pattern (e.g. it's a *different* table/column than expected, or
you're unsure what's already applied), stop and ask rather than guessing at a backfill under time
pressure — an incorrect hash/timestamp here just makes `migrate()`'s bookkeeping wrong in a
different way, not obviously wrong.

**Verify:**
```sh
psql "$DATABASE_URL" -c "\d \"user\"" | grep -i phone
```
Expect to see `phoneNumber` (text, unique) and `phoneNumberVerified` (boolean).

---

## Step 2 — Confirm/create this environment's super-admin

Check first — don't create a duplicate:
```sh
psql "$DATABASE_URL" -c "SELECT email, \"phoneNumber\" FROM \"user\" WHERE \"isSuperAdmin\" = true;"
```

If none exists:
```sh
cd tools
pnpm exec tsx src/seed.ts superadmin --email <real-admin-email> --name "<Name>" --phoneNumber <+E.164>
```
**`--phoneNumber` is required in practice, not optional** — sign-in is phone-OTP only
(`emailAndPassword.enabled: false`), and `seed.ts`'s `upsertUser` never creates a password/`account`
row at all. A super-admin created without a phone number has **no way to log in** until one is
added.

This creates a real `user` row with `isSuperAdmin: true`. Once created, they log in the same way
everyone else does: enter their phone number in the app, receive a Twilio Verify OTP (assuming
prerequisite 6 above is actually satisfied on this environment), enter the code.

---

## Step 3 — Existing schools are migrated by the same boot

Nothing to run: `migrateAllSchoolSchemas()` (Step 1) brings every school that already exists up to
date, and a new school is provisioned at its current schema by the importer (Step 6). Check the boot
log's `startup.migrated` line reports the number of schools you expect.

---

## Step 4 — Dry-run the import

```sh
cd tools
pnpm exec tsx src/import-school.ts data --slug slmts --name "SLMTS"
```

Every imported track goes into one course, `vedam` by default (`--course <slug>` to change it; it is
created if missing). The dry run also rejects any student who would hold more than one **active**
seat in that course, naming each offender, since the database allows only one.

(No `--commit` — this only validates and reports. **Nothing is written in this step.**)

**Expect:**
```
Loaded 1054 users, 1212 profiles, 8 tracks, 74 chapters, 91 batches, 957 enrollments, 10396 evaluations, 1053 registration-metadata rows from ...
✅ All rows pass validation against the live API schemas.
Dry run only — pass --commit to write to the database. No rows were inserted.
```

If the counts differ from the above, or validation fails, **stop** — that means `seed-data/*.json`
in your checked-out `main` doesn't match what was verified when this runbook was last updated (check
`seed-data/_report.json`'s own numbers against the log line). Don't proceed on a mismatch; figure out
why first — most likely `tools/src/parse-excel-to-json.ts` hasn't been re-run against the current
`data/*.xlsx`, or the source spreadsheet changed since.

---

## Step 5 — Confirm the target org doesn't already exist

```sh
psql "$DATABASE_URL" -c "SELECT id, slug FROM organization WHERE slug = 'slmts';"
```
Expect zero rows. If a row already exists, **stop** — re-running the importer against an org that's
already been imported will not cleanly re-apply (see "Re-running this runbook" below).

---

## Step 6 — Commit the import

```sh
cd tools
pnpm exec tsx src/import-school.ts data --slug slmts --name "SLMTS" --commit
```

**Expect:**
```
✅ All rows pass validation against the live API schemas.
Importing into organization "slmts" (<uuid>)
✅ Imported 1054 new users (0 reused existing accounts) + 1054 org memberships.
✅ Import committed: 8 tracks, 74 chapters, 91 batches, 1212 profiles, 957 enrollments, 10396 evaluations.
```
The "reused existing accounts" count will be higher than 0 if this environment already has `user`
rows matching one of the roster's emails/phone numbers (e.g. this environment was used for earlier
testing) — that's expected and safe, not a sign of a problem; see `import-school.ts`'s own id-remap
logic if you want the detail.

This is the only step in this runbook that writes real, permanent data. Everything before it is
read-only or additive/idempotent (Steps 1 and 3 are safe to re-run; Step 2 checks before creating).

---

## Step 7 — Verify

```sh
SCHOOL_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM organization WHERE slug = 'slmts';" | xargs)
SCHEMA="school-$SCHOOL_ID"

# Row counts
psql "$DATABASE_URL" -c "
SELECT 'track' t, count(*) FROM \"$SCHEMA\".track
UNION ALL SELECT 'chapter', count(*) FROM \"$SCHEMA\".chapter
UNION ALL SELECT 'batch', count(*) FROM \"$SCHEMA\".batch
UNION ALL SELECT 'profile', count(*) FROM \"$SCHEMA\".profile
UNION ALL SELECT 'enrollment', count(*) FROM \"$SCHEMA\".enrollment
UNION ALL SELECT 'evaluation', count(*) FROM \"$SCHEMA\".evaluation;
"
# Expect: track 8, chapter 74, batch 91, profile 1212, enrollment 957, evaluation 10396

# Schema conformance
psql "$DATABASE_URL" -c "\d \"$SCHEMA\".enrollment"

# Spot-check one of the known merged/corrected identities (two registrations for the same real
# person, collapsed into one user+profile — see parse-excel-to-json.ts's KNOWN_DUPLICATE_PHONES)
psql "$DATABASE_URL" -c "
SELECT p.name, p.phone, u.email, u.\"phoneNumber\"
FROM \"$SCHEMA\".profile p JOIN \"user\" u ON u.id = p.\"userId\"
WHERE p.name = 'Sridhar Tadepalli';
"
# Expect exactly 1 row: phone 19591989895, phoneNumber +19591989895, email sridhartad@gmail.com
```

If any of these don't match, **stop and don't proceed to Step 8** — flag it before granting anyone
access to the school.

---

## Step 8 — Grant ownership

The import creates every person as an org `member` — **nobody has `owner` or `admin` access yet**.
Assign at least one real owner so the school is actually manageable through the app:

```sh
cd tools
pnpm exec tsx src/seed.ts user --email <real-owner-email> --name "<Name>" --role owner --schoolSlug slmts
```
Use an email that already exists among the imported users
if you want an existing person to be the owner (they'll log in with whatever phone number they were
imported with, if any — check first), or a new one otherwise (pass `--phoneNumber` so they can
actually log in).

---

## Known gap: some imported people can't log in yet

Every imported person gets a `user` row with whatever `phoneNumber` the spreadsheet gave them (a
valid E.164 number, since the importer refuses anything else — see `_report.json`'s
`invalidE164Phones`). **Sign-in is phone-OTP only, and there is no password fallback anymore**
(`emailAndPassword.enabled: false`; the old `import-school.ts grant-passwords` stopgap was retired
along with email/password when Twilio OTP shipped, and now unconditionally errors if invoked).

As of the current `seed-data`, **76 of 1054 imported users have no phone number on file at all** —
they have literally no way to sign in until one is collected. This isn't something this runbook or
its tooling can paper over; check `seed-data/_report.json`'s `invalidE164Phones` (currently empty —
every phone that *is* present is valid) and cross-reference `users.json` for `phoneNumber: null` to
get the current list, and get real phone numbers from those people some other way before they'll be
able to use the app.

---

## Re-running this runbook / partial failures

- **Steps 1–3** are idempotent — safe to re-run from a clean start at any point, in any environment.
- **Step 6 is not safely re-runnable against the same org.** `profile` and `evaluation` have no
  natural unique constraint (by design), so a second `--commit` against a school that already has
  profiles risks duplicating data rather than cleanly resuming. If Step 6 fails partway:
  - User/membership inserts (before the school-scoped transaction) use `ON CONFLICT DO NOTHING` on
    `id` — safe to leave as-is.
  - The `track`/`chapter`/`batch`/`profile`/`enrollment`/`evaluation` writes are
    one transaction — a failure there rolls back cleanly, so nothing partial persists at the
    school-schema level.
  - If it failed and rolled back: check `SELECT id FROM organization WHERE slug='slmts'` — if the org
    row exists but the school schema has no data, something is inconsistent; **stop and ask** rather
    than retrying blindly.
  - If it succeeded once and you need to run it again for any reason (e.g. corrected `seed-data`),
    the current tooling doesn't support a clean re-import into the same org — that needs a real
    decision (wipe and redo, or a proper upsert pass), not a runbook improvisation.

## What not to do

- Don't run `pnpm db:push` against staging or production — it's explicitly dev-only (diffs and
  applies directly, no reviewable migration file, no tracking).
- Don't skip Step 5 — re-importing into an already-imported org is the one scenario this tooling
  isn't built to handle safely.
- Don't use the shared `packages/env/.env.sops` file for any of this — it holds local dev config,
  not staging/production secrets.
- Don't pull `DATABASE_URL` from the Railway dashboard's public connection string, and don't run
  `railway connect` without `--ssh` — see Prerequisite 3. Everything in this runbook is meant to go
  through the local SSH tunnel, never the public proxy.
- Don't assume staging and production are in the same state — re-check Step 5 and the Step 2
  super-admin check independently in each environment; don't carry an assumption from one over to
  the other.
- Don't forget to close the tunnel (Ctrl+C in its terminal) once you're done with an environment —
  it's a live SSH session to a real database for as long as it's open.
- Don't run any `pnpm exec tsx ...` command in this runbook without `NODE_ENV=production` set in
  that same shell (Prerequisite 5) — without it, every one of those commands silently operates on
  your local dev database instead of staging/production, with no error printed. `psql` isn't
  affected by this, which is exactly what makes it easy to miss: your verification queries look
  right while the actual write command did nothing you intended.
