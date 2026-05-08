# Schema Design: Multi-Tenancy Wave 2

This document translates Wave 1 decisions into concrete database/schema changes, based on the current `packages/types/src/schema.ts`.

---

## Objectives

1. Move from global user role/status to org-scoped membership model.
2. Add a global super-admin flag.
3. Introduce tenant identity (`organizations`) and membership junction (`user_organizations`).
4. Add `org_id` scoping across tenant-owned tables.
5. Keep implementation optimized for dev reset/reseed (no legacy data migration complexity).

---

## Current baseline (from code)

Today:

- `users.roles` (text[]) and `users.status` are global.
- No `organizations` table.
- No `user_organizations` table.
- No `org_id` columns on domain tables.

Key references:

- `packages/types/src/schema.ts`
- `docs/implementation/multi-tenancy/architecture-decisions.md`

---

## Target model

### 1) `users` table changes

#### Add

- `is_super_admin boolean not null default false`

#### Drop

- `roles` (text[])
- `status` (varchar)
- account-level status CHECK constraint tied to `users.status`

#### Keep

- identity fields (`id`, `email`, names, provider, provider_id, etc.)
- invitation/approval audit fields for now (can be revisited later)

Notes:

- `email` stays globally unique.
- `provider` CHECK remains (`local`/`google`).
- Super-admin is account-level capability, intentionally global.

---

### 2) New `organizations` table

Proposed shape:

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
- `rr` (initially active/inactive can be operationally decided in seed data)

---

### 3) New `user_organizations` table

Proposed shape:

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
- role values CHECK (optional now, recommended): roles subset of `('student','instructor','admin')`
- status CHECK: `('pending','active','inactive','rejected')`
- require student role invariant:
  - policy-level now
  - DB CHECK can be added later if desired

Indexes:

- `idx_user_org_user_id`
- `idx_user_org_org_id`
- `idx_user_org_status`
- optional: `idx_user_org_org_status` for pending approvals by org

---

## `org_id` rollout plan across existing tables

To reduce blast radius, rollout in two passes.

### Pass A (core flows first)

Add `org_id` to:

- `tracks`
- `chapters`
- `batches`
- `enrollments`

### Pass B (remaining scoped data)

Add `org_id` to:

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

As `org_id` lands, move uniqueness semantics from global to org-scoped where applicable.

Examples:

- `tracks.title` unique -> `UNIQUE (org_id, title)`
- `batches.batch_code` can become `UNIQUE (org_id, batch_code)` in tenancy phase
- progress/enrollment uniqueness should include org context where needed

These changes must be synchronized with API query scoping to avoid inconsistent constraints.

---

## Audit log schema direction

`audit_logs` gets `org_id` for org-scoped operations, but global super-admin user-governance actions remain platform-scoped.

Recommended approach:

- `org_id` nullable
- org action rows: `org_id` set
- platform action rows: `org_id` null + action namespace prefix (e.g. `USER_APPROVED`, `ROLE_ASSIGNED`)

This supports clear visibility partitioning without extra audit tables.

---

## Drizzle-level updates required

In `packages/types/src/schema.ts`:

1. Add new table declarations:
   - `organizations`
   - `userOrganizations`
2. Update `users` table definition:
   - add `isSuperAdmin`
   - remove `roles`, `status`, related CHECK
3. Add `orgId` columns and FKs on scoped tables.
4. Update indexes/uniques to include `orgId` where required.
5. Add relations:
   - users <-> userOrganizations
   - organizations <-> userOrganizations
   - organizations <-> scoped tables
6. Update insert/select Zod schemas and exported TS types.

---

## Migration strategy for this phase

Per product decision, skip legacy migration complexity:

- reset/purge dev database
- apply new migrations on clean DB
- reseed with:
  - org rows (`slmts`, `rr`)
  - super-admin user (Kashyap account in dev)
  - baseline memberships/roles for testing

No compatibility bridge for old `users.roles/status` is required.

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
