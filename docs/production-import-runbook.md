# Production runbook: apply the school-schema conformance work + import real registration data

**Audience:** whoever has production database credentials (Railway → the API service → Variables tab). Written to be followed step-by-step; each step says what to run, what you should see, and how to check it actually worked before moving on.

**Covers:** landing PRs #95–#100 in production — the `user.phoneNumber` column, the `enrollment.status`/`leftDate` migration, and importing the real SLMTS registration data (1069 users / 1145 profiles / 90 batches / 10,166 evaluations) into a new `slmts` school.

**Does not cover:** anything from `feat/whatsapp-otp-auth` (OTP send flow, disabling email/password) — deliberately out of scope, per the earlier plan to decouple phone-number schema work from the full OTP feature.

---

## ⚠️ Do this part first, urgently

If PRs #95–#100 are already merged to `main` and Railway auto-deploys on merge to `main`, **production may already be running API code that expects `user.phoneNumber` to exist**, even though nothing has added that column to the live database yet. Nothing in this codebase currently applies public-schema migrations automatically (no migration step in `apps/api/Dockerfile`, `pnpm db:push` is dev-only per the README) — that gap is exactly what PR #100 fixes.

Every request that touches auth (sign-in, session checks) goes through better-auth's Drizzle adapter, which reads/writes the full `user` row shape. If the column is missing, this fails with a Postgres "column does not exist" error — i.e. **auth-wide breakage**, not a contained issue.

**So: confirm PR #100 is merged, then run Step 1 below immediately** — before working through the rest of this runbook in order.

---

## Prerequisites

1. **PR #100 merged** (`feat/production-migration-tooling`) — this runbook depends on `pnpm db:migrate:public` and `pnpm schools:migrate`, which don't exist before it.
2. **Production credentials**, obtained from Railway (Project → API service → Variables tab), not from `packages/env/.env.sops` — that file only holds the team's shared *local dev* config (`DATABASE_URL` pointing at `localhost`), not production secrets.
3. Save those values to a **separate, local-only file** — e.g. `.env.production` at the repo root. Do **not** overwrite your regular `.env` (used for local dev) and do **not** commit this file. Every command below loads it explicitly into the shell rather than relying on the default `.env`:
   ```sh
   set -a && source .env.production && set +a
   ```
   Run that once per new terminal session before any command in this runbook. (On fish: `set -gx (cat .env.production | grep -v '^#' | xargs -L1 echo)` is fussier — easiest is to temporarily use `bash` for this runbook.)
4. Latest `main` checked out locally, `pnpm install` run.
5. Read access to run verification `psql` queries against production (the `DATABASE_URL` from step 2 already grants this).

---

## Step 1 — Apply the public-schema migration (do this first)

```sh
cd tools
pnpm exec tsx src/migrate-public.ts
```

**Expect:** `Public schema migrations applied.` and exit code 0.

**If it fails with `column "phoneNumber" of relation "user" already exists`:** stop — this means the column exists but drizzle's tracking table doesn't know about it (exactly the state I found and fixed in local dev while testing this same tool). `migrate()` runs in one transaction, so this failure is safe (no partial state), but don't just re-run it — first check why the column already exists (was it added by hand?) and reconcile the tracking table before retrying. Ask me if this happens; don't guess at the fix under time pressure.

**Verify:**
```sh
psql "$DATABASE_URL" -c "\d \"user\"" | grep -i phone
```
Expect to see `phoneNumber` (text, unique) and `phoneNumberVerified` (boolean).

---

## Step 2 — Confirm/create a production super-admin

Check first — don't create a duplicate:
```sh
psql "$DATABASE_URL" -c "SELECT email, \"phoneNumber\" FROM \"user\" WHERE \"isSuperAdmin\" = true;"
```

If none exists:
```sh
cd tools
pnpm exec tsx src/seed.ts superadmin --email <real-admin-email> --name "<Name>" --phoneNumber <+E.164 if you have one>
```
`--phoneNumber` is optional but recommended — `schools:migrate` and `schools:create`'s operator check is phone-based, and you'll want this account usable for those without re-running this step.

**This creates a real, usable production login** (email/password, password `testing123` by default — pass `--password` to set your own). Treat it accordingly.

---

## Step 3 — Bring any existing schools up to date

Safe to run even if you're not sure whether production has other schools yet — it's a no-op for anything already current, and only touches schools that already exist (doesn't create anything new):
```sh
cd tools
pnpm exec tsx src/schools.ts migrate
```
Prompts for the super-admin phone from Step 2. Omitting `--slug` migrates every school; output is a JSON list of what was migrated.

---

## Step 4 — Dry-run the import

```sh
cd tools
pnpm exec tsx src/import-excel-seed.ts --slug slmts --name "SLMTS"
```

(No `--commit` — this only validates and reports. **Nothing is written in this step.**)

**Expect:**
```
Loaded 1069 users, 1145 profiles, 9 tracks, 113 chapters, 90 batches, 952 enrollments, 10166 evaluations from ...
✅ All rows pass validation against the live API schemas.
Dry run only — pass --commit to write to the database. No rows were inserted.
```

If the counts differ from the above, or validation fails, **stop** — that means `seed-data/*.json` in your checked-out `main` doesn't match what was verified in PRs #95–#99. Don't proceed on a mismatch; figure out why first.

---

## Step 5 — Confirm the target org doesn't already exist

```sh
psql "$DATABASE_URL" -c "SELECT id, slug FROM organization WHERE slug = 'slmts';"
```
Expect zero rows. If a row already exists, **stop** — re-running the importer against an org that's already been imported will not cleanly re-apply (see "Re-running this runbook" below).

---

## Step 6 — Commit the import

```sh
cd tools
pnpm exec tsx src/import-excel-seed.ts --slug slmts --name "SLMTS" --commit
```

**Expect:**
```
✅ All rows pass validation against the live API schemas.
Importing into organization "slmts" (<uuid>)
✅ Imported 1069 users + org memberships.
✅ Import committed: 9 tracks, 113 chapters, 90 batches, 1145 profiles, 952 enrollments, 10166 evaluations.
```

This is the only step in this runbook that writes real, permanent data. Everything before it is read-only or additive/idempotent (Steps 1 and 3 are safe to re-run; Step 2 checks before creating).

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
# Expect: track 9, chapter 113, batch 90, profile 1145, enrollment 952, evaluation 10166

# Schema conformance (should exist from the enrollment.status migration + batchClassSlot)
psql "$DATABASE_URL" -c "\d \"$SCHEMA\".enrollment"

# Spot-check one of the known merged/corrected cases from PR #99
psql "$DATABASE_URL" -c "
SELECT p.name, p.phone, u.email, u.\"phoneNumber\"
FROM \"$SCHEMA\".profile p JOIN \"user\" u ON u.id = p.\"userId\"
WHERE p.name = 'Sridhar Tadepalli';
"
# Expect exactly 1 row: phone 19591989895, phoneNumber +19591989895, email sridhartad@gmail.com
```

If any of these don't match, **stop and don't proceed to Step 8** — flag it before granting anyone access to the school.

---

## Step 8 — Grant ownership

The import creates every person as an org `member` — **nobody has `owner` or `admin` access yet**. Assign at least one real owner so the school is actually manageable through the app:

```sh
cd tools
pnpm exec tsx src/seed.ts user --email <real-owner-email> --name "<Name>" --role owner --schoolSlug slmts
```
Prompts for the Step 2 super-admin phone. Use an email that already exists among the imported users if you want an existing person to be the owner, or a new one otherwise.

---

## Re-running this runbook / partial failures

- **Steps 1–3** are idempotent — safe to re-run from a clean start at any point.
- **Step 6 is not safely re-runnable against the same org.** `profile` and `evaluation` have no natural unique constraint (by design), so a second `--commit` against a school that already has profiles risks duplicating data rather than cleanly resuming. If Step 6 fails partway:
  - User/membership inserts (before the school-scoped transaction) use `ON CONFLICT DO NOTHING` on `id` — safe to leave as-is.
  - The `track`/`chapter`/`batch`/`profile`/`enrollment`/`evaluation` writes are one transaction — a failure there rolls back cleanly, so nothing partial persists at the school-schema level.
  - If it failed and rolled back: check `SELECT id FROM organization WHERE slug='slmts'` — if the org row exists but the school schema has no data, something is inconsistent; **stop and ask** rather than retrying blindly.
  - If it succeeded once and you need to run it again for any reason (e.g. corrected `seed-data`), the current tooling doesn't support a clean re-import into the same org — that needs a real decision (wipe and redo, or a proper upsert pass), not a runbook improvisation.

## What not to do

- Don't run `pnpm db:push` against production — it's explicitly dev-only (diffs and applies directly, no reviewable migration file, no tracking).
- Don't skip Step 5 — re-importing into an already-imported org is the one scenario this tooling isn't built to handle safely.
- Don't use the shared `packages/env/.env.sops` file for any of this — it holds local dev config, not production secrets.
