# Schema Design: Multi-Tenancy Wave 2

This document records the multi-tenancy schema that shipped from Wave 2, grounded in the live `packages/types/src/schema.ts`.

---

## Objectives

1. Move from global user role/status to org-scoped membership model.
2. Add a global super-admin flag.
3. Introduce tenant identity (`organizations`) and membership junction (`user_organizations`).
4. Add `org_id` scoping across tenant-owned tables.
5. Keep implementation optimized for dev reset/reseed (no legacy data migration complexity).

---

## Expand / contract rollout (historical)

Schema work landed in an expand/migrate/contract sequence so the integration branch never sat in a non-buildable state:

| Phase | When | What |
| ----- | ---- | ---- |
| **Expand** | Slice `slice-1.1-org-schema` | Added `organizations`, `user_organizations`, and `users.is_super_admin` while legacy `users.roles` / `users.status` (and `users_status_check`) still existed. |
| **Migrate** | Layer 2 | Application code moved to memberships plus `is_super_admin` instead of global role/status. The rollout was tracked in [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md). |
| **Contract** | Slice `slice-1.4-schema-contract` (after Layer 2) | Removed `users.roles`, `users.status`, and `users_status_check` once the cleanup tracker reached zero. |

Dev and CI apply versioned SQL from `./migrations/` via `drizzle-kit migrate` after a clean schema reset (see [implementation-checklist.md](./implementation-checklist.md) item 1.4).

---

## Current live baseline (from code)

Today:

- `users.roles`, `users.status`, and `users_status_check` are gone.
- `users.is_super_admin` is the only global authority flag.
- `organizations` and `user_organizations` are live tables in the shared schema.
- `org_id` is present on all tenant-owned tables already shipped in Layer 3:
  - core: `tracks`, `chapters`, `batches`, `enrollments`
  - media/content: `audio_files`, `text_segments`, `media_segments`, `segment_mappings`
  - progress/audit: `student_progress`, `proficiency_evaluation_log`, `audit_logs`
- `system_settings` remains global in the current design.

Key references:

- `packages/types/src/schema.ts`
- `docs/implementation/multi-tenancy/architecture-decisions.md`

---

## Live model

### 1) `users` table changes

#### Landed field

- `is_super_admin boolean not null default false`

#### Removed in slice 1.4 contract

- `roles` (text[])
- `status` (varchar)
- account-level status CHECK constraint tied to `users.status` (`users_status_check`)

#### Keep

- identity fields (`id`, `email`, names, provider, provider_id, etc.)
- invitation/approval audit fields for now (can be revisited later)

Notes:

- `email` stays globally unique.
- `provider` CHECK remains (`local`/`google`).
- Super-admin is account-level capability, intentionally global.

---

### 2) New `organizations` table

Current shape:

- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `status varchar not null default 'active'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints:

- `slug` unique
- `status` CHECK (recommended): `('active', 'inactive')`

Seeded initial rows:

- `slmts` (active)
- `rr` (active)

**Dev seeding:** after migrations (`npm run db:reset` or `npm run db:migrate`), run `npm run db:seed-orgs` to insert these rows idempotently. Implementation: [server/seed-organizations.ts](../../../server/seed-organizations.ts). Display names in the DB use **Pathasala** spelling; canonical API / tenant keys are the slugs `slmts` and `rr`.

**Dev bootstrap (super-admin + memberships):** after org seed, run `npm run db:seed-dev` ([server/seed-dev-bootstrap.ts](../../../server/seed-dev-bootstrap.ts)). Requires `ADMIN_EMAIL`; see [environment-setup.md](../../essentials/environment-setup.md) Phase 0b for `DEV_SUPERADMIN_PASSWORD` and related env vars.

---

### 3) New `user_organizations` table

Current shape:

- `id uuid pk default gen_random_uuid()` (or composite PK; UUID PK keeps API simpler)
- `user_id uuid/text fk -> users.id not null`
- `org_id uuid fk -> organizations.id not null`
- `roles text[] not null default ARRAY['student']::text[]`
- `status varchar not null default 'pending'`
- `requested_at timestamptz default now()`
- `approved_at timestamptz null`
- `approved_by uuid/text fk -> users.id null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints:

- unique membership per user/org: `UNIQUE (user_id, org_id)`
- role values are still policy-validated in application code; there is no DB-level role enum/check today
- status CHECK: `('pending','active','inactive','rejected')`
- student-role invariants remain policy-level rather than DB-enforced

Indexes:

- `idx_user_org_user_id`
- `idx_user_org_org_id`
- `idx_user_org_status`
- optional: `idx_user_org_org_status` for pending approvals by org

---

## `org_id` rollout (landed)

To reduce blast radius, the `org_id` rollout landed in two passes.

### Pass A (core flows first)

Added `org_id` to:

- `tracks`
- `chapters`
- `batches`
- `enrollments`

### Pass B (remaining scoped data)

Added `org_id` to:

- `audio_files`
- `text_segments`
- `media_segments`
- `segment_mappings`
- `student_progress`
- `proficiency_evaluation_log`
- `audit_logs`

Not scoped in this phase:

- `system_settings` (stays global)

---

## Org-scoped uniqueness updates

As `org_id` landed, uniqueness semantics moved from global to org-scoped where applicable.

Examples:

- `tracks.title` is now `UNIQUE (org_id, title)`
- `batches.batch_code` is now `UNIQUE (org_id, batch_code)`
- progress/enrollment uniqueness and indexes now carry org context where the live schema needs it

These constraints now ship together with org-scoped queries and guards in the live server code.

---

## Audit log schema direction (current)

`audit_logs.org_id` is live for org-scoped operations, while global super-admin user-governance actions remain platform-scoped with `org_id = null`.

Current approach:

- `org_id` nullable
- org action rows: `org_id` set
- platform action rows: `org_id` null

This supports clear visibility partitioning without extra audit tables.

---

## Drizzle implementation snapshot

In `packages/types/src/schema.ts`:

1. `organizations` and `userOrganizations` are live table declarations.
2. `users` now includes `isSuperAdmin`; legacy role/status columns are removed.
3. Scoped tables carry `orgId` foreign keys where the rollout required them.
4. Org-scoped indexes/uniques are in place for the core uniqueness boundaries that changed (`tracks`, `batches`, and related indexes).
5. Relations are wired across users, memberships, organizations, and scoped tables.
6. Insert/select Zod schemas and exported TS types reflect the org-scoped model.

---

## Migration strategy used for this phase

Per product decision, legacy backfill complexity was skipped in favor of clean dev resets/reseeds:

- reset/purge dev database (drop `public` schema, recreate empty `public`)
- apply **versioned** migrations on clean DB (`drizzle-kit generate` produces SQL under `./migrations/`; `drizzle-kit migrate` applies them in order — see dev reset script)
- reseed with:
  - org rows (`slmts`, `rr`)
  - super-admin user (Kashyap account in dev)
  - baseline memberships/roles for testing

During expand (slice 1.1), legacy `users.roles` / `users.status` remained temporarily; no dual-write bridge was introduced. After contract (slice 1.4), those columns are gone for the live schema.

---

## Guardrails

1. Every tenant-owned row must have non-null `org_id` after migration completes.
2. Every protected query path must include org filter.
3. `user_organizations` is the single source of truth for:
   - per-org status
   - per-org roles
4. `users.is_super_admin` is the only global authority flag.

---

## Deferred schema work

- questionnaire/application JSON fields
- email invitation tables/queues
- cross-org analytics aggregates
- content-sharing linkage tables
