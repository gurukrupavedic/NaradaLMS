# Database solidification checklist (pre-tenancy)

**Purpose**: Proposed improvements to `packages/types/src/schema.ts` **before** introducing `organizations`, `user_organizations`, and `org_id`. Use this document to record decisions and feedback; implementation should follow a reviewed plan.

**Scope (this phase only)**:

- **In**: integrity (FKs, sensible uniques/CHECKs where they do not depend on `org_id`), types (`timestamptz`, safer numeric types), indexes, naming (`sort_order` vs `order`), migration discipline, seeded import user for `created_by`, and small DX fixes (e.g. Drizzle `relations`).
- **Out**: any column or constraint that assumes **tenancy** — those belong in the tenancy milestone ([roadmap.md](./roadmap.md)).

**Status**: Ready for implementation (solidification scope decisions recorded).

---

## Deferred to tenancy phase (do not implement during solidification)

Implement these when you add organizations and `org_id`; they are **not** part of foundation-only work:

- `**tracks.title`**: replace global `**UNIQUE (title)`** with `**UNIQUE (org_id, title)**` so each org can reuse display names.
- `**batches.batch_code**`: if codes must be unique **per org**, use `**UNIQUE (org_id, batch_code)`** (instead of or in addition to any global rule you choose later).
- `**enrollments`**: revisit partial unique **one active enrollment per student** — likely becomes **scoped per org** (or equivalent rule) once membership is org-aware.
- `**system_settings`**: split or scope keys **per org** where needed (design + schema).

---

## `users`

- Add **FKs** for `invited_by` and `approved_by` → `users.id` (nullable, same type as `id`) so orphaned IDs cannot be stored — **unless** you deliberately keep them loose (weak integrity today). K: agree with this.
- **Decision — agreed**: use PostgreSQL **`citext`** for `email` so uniqueness is case-insensitive at the DB layer (keep unique constraint).
- **Decision — agreed**: Add DB CHECK constraints for current fixed sets:
  - `status IN ('pending_approval', 'active', 'inactive')`
  - `provider IN ('local', 'google')`
  - Extend these sets later via migration when onboarding or identity-provider support expands.
- Consider **timestamptz** for `created_at`, `updated_at`, `last_login_at`, invitation/approval timestamps (policy: new columns or migrate existing). K: agree with this.

---

## `tracks`

- `**created_by` — agreed approach**
  - **Seed one dedicated user** before curriculum data (e.g. curriculum/import account, stable email like `curriculum-seed@internal`, **fixed UUID** committed in migration + seed code).
  - **Decision — agreed**: remove DB default on `created_by`. Keep `NOT NULL` + FK and set `created_by` explicitly in all insert paths (seed scripts + runtime) so missing actor assignment fails fast.
  - **Initial deployment**: DB seed / import scripts use that seeded user’s `id` for every bootstrap row (`tracks` and any related `created_by` / `uploaded_by` as applicable).
  - **Runtime (after launch)**: tracks created in the app use the **authenticated user’s** id.
  - Keep `**references(users.id)`** so FK integrity holds end-to-end.
- Column `**order`**: SQL keyword — optional rename to `**sort_order`** for safer raw SQL and clarity. K: agree with this.
- `**title**`: **No schema change in this solidification phase.** Keep current `**NOT NULL`** and global `**UNIQUE (title)`** until tenancy. When you implement multi-tenancy, replace with `**UNIQUE (org_id, title)`** (see [Deferred to tenancy phase](#deferred-to-tenancy-phase-do-not-implement-during-solidification) above).
- Consider **timestamptz** for `created_at` / `updated_at`.

---

## `chapters`

- **Decision — agreed**: Add `UNIQUE (track_id, title)` to prevent duplicate chapter titles within the same track.
- **Decision — agreed**: Add DB **CHECK** for `status` with current allowed values: `('draft', 'published')`.
- `**order`**: same optional rename as `tracks` → `**sort_order`**.
- Consider composite index `**(track_id, order)**` if you always list chapters ordered by track (often already covered by query patterns — **optional**).
- **timestamptz** for timestamps. K: agree with this.

---

## `audio_files`

- **timestamptz** for `created_at`. K: agree with this.
- Optional index `chapter_id` if not implied by heavy FK usage (often beneficial for “all audio for chapter”).  K: agree with this.

---

## `text_segments`

- **timestamptz** for `created_at`.  K: agree with this.
- Optional **CHECK** that `start_position <= end_position`.  K: agree with this.
- **Decision — agreed**: Add `UNIQUE (chapter_id, script, order)` so ordering cannot duplicate within the same chapter/script.

---

## `media_segments`

- **Decision — agreed**: Store segment boundaries as **integer milliseconds** (`start_ms`, `end_ms`), replacing `real` `**start_timestamp` / `end_timestamp`** (rename columns for clarity).
- Use `**integer`** (or `**bigint`** if you need very long assets); **NOT NULL** where applicable.
- Add **CHECK**: `start_ms >= 0`, `end_ms >= 0`, and `**start_ms < end_ms`** (adjust if you allow zero-length segments).
- **App boundary**: HTML `<audio>` uses **seconds** (`currentTime`); convert `**ms ↔ seconds`** only at the player / seek-bar layer (`seconds * 1000` going to DB/API, `/ 1000` going to the element).
- **timestamptz** for `created_at`. K: agree with this.

---

## `segment_mappings`

- Add `**UNIQUE (media_segment_id, text_segment_id)`** if duplicate links are invalid (recommended).  K: agree with this.
- **timestamptz** for `created_at`. K: agree with this.

---

## `batches`

- **Decision — agreed**: Add global `UNIQUE (batch_code)` in this pre-tenancy phase. Per-org uniqueness `**(org_id, batch_code)`** remains **deferred** to tenancy — see [Deferred to tenancy phase](#deferred-to-tenancy-phase-do-not-implement-during-solidification).
- `**cohort_type` — agreed**: No database **CHECK** for now; leave the column flexible until the allowed values are final. Use a **dropdown (and optional Zod/API validation)** in the UI to avoid stray values; add a DB constraint or lookup table later if the set becomes closed.
- **timestamptz** for `created_at` / `updated_at`. K: agree with this.

---

## `enrollments`

- Keep partial unique **one active enrollment per `student_id`** for now; **org-scoped** enrollment rules are **deferred** to tenancy ([Deferred to tenancy phase](#deferred-to-tenancy-phase-do-not-implement-during-solidification)).
- **Decision — agreed**: Add DB **CHECK** on `status` with allowed values: `('active', 'dropped', 'completed')`.
- **timestamptz** for `enrolled_at`, `dropped_at`, `updated_at`.

---

## `batch_co_instructors`

- Add `**UNIQUE (batch_id, instructor_id)`** if the same instructor must not be assigned twice to one batch (recommended). K: agree with this.
- **timestamptz** for `assigned_at`. K: agree with this.

---

## `student_progress`

- **Decision — agreed**: Add `**UNIQUE (student_id, chapter_id)`**. Progress reflects mastery of the chapter; `**batch_id`** is current cohort context and **updates when the student switches batches** — learning does not reset and does **not** require a second row for the same chapter.
- **Tenancy (later)**: when `org_id` is added, this unique will likely become `**UNIQUE (org_id, student_id, chapter_id)`** (or your chosen scoping) so the same person in two orgs can have separate progress per org if the product requires it — align with the roadmap.
- **Decision — agreed**: Add DB **CHECK** on `proficiency_level` using `VALID_PROFICIENCY_LEVELS` from `packages/types/src/constants.ts`: `IN (0, 1, 2, 3, 4, 8, 9)` (0–4 = scale, 8 = absent, 9 = not started). Update the Drizzle/schema comment (it currently says 0–4 only).
- **timestamptz** for `last_accessed`, `last_evaluated_at`, `created_at`, `updated_at`.  K: agree with this.

---

## `proficiency_evaluation_log`

- **Decision — agreed**: Use a **soft-delete** approach for chapters so proficiency history survives. Avoid routine hard-deletes of chapter rows.
- Keep `proficiency_evaluation_log` records durable for audit/history; if hard delete is ever required, gate it behind an explicit admin/archive flow.
- Add chapter soft-delete fields/pattern (e.g. `deleted_at`, optional `deleted_by`) and ensure normal reads exclude deleted chapters by default.
- **Decision — agreed**: Add DB **CHECK** for `old_proficiency_level` / `new_proficiency_level` to use the same allowed set as `student_progress` where values are present: `IN (0, 1, 2, 3, 4, 8, 9)`.
- **timestamptz** for `evaluated_at`. K: agree with this.
- Add Drizzle `**relations()`** for this table (DX only, not DB). K: agree with this.

---

## `audit_logs`

- **Decision — agreed**: Add indexes aligned to current admin-log queries:
  - `**(timestamp DESC)`** for default/recent log listing and date-range scans.
  - `**(user_id, timestamp DESC)`** for user-filtered audit views sorted by latest first.
  - `**(resource_type, timestamp DESC)**` for resource-type filtered views sorted by latest first.
- Defer `**(resource_type, resource_id)**` until a concrete query path filters by specific `resource_id`.
- Consider **timestamptz** for `timestamp`. K: agree with this.

---

## `system_settings`

- **Decision — agreed**: Keep `system_settings` **global-only** in this solidification phase (no `org_id` here yet).
- For tenancy, create a dedicated `**org_settings`** table (or equivalent) for tenant-scoped configuration instead of overloading `system_settings` with mixed semantics.
- Document key scope now using this rule:
  - **Platform/infrastructure behavior** → global (`system_settings`)
  - **Org-facing behavior** (branding, policy, experience) → per-org later (`org_settings`)
- Optional naming convention for clarity: `platform.*` keys for global settings, `org.*` keys for future org-scoped settings.
- **timestamptz** for `updated_at`. K: agree with this.

### Key classification template (fill as needed)


| key | current purpose | target scope (`global` / `per-org`) | notes / migration hint |
| --- | --------------- | ----------------------------------- | ---------------------- |
|     |                 |                                     |                        |


---

## Cross-cutting (not one table)

- **Decision — agreed**: Use **versioned generated migrations committed to the repo** from this phase onward.
- For each schema change: update Drizzle schema, generate migration SQL, apply locally, and commit schema + migration together.
- Keep dev reset scripts only as a fallback utility, **not** as the primary schema-change workflow.
- **Reserved word**: rename `**order`** → `**sort_order`** on `tracks` and `chapters` if you want zero quoting risk in ad-hoc SQL.  K: agree with this.
- **timestamptz**: apply with a **single policy** (e.g. all `created_at`/`updated_at`/audit times) to avoid mixed semantics.  K: agree with this.
- **Decision — agreed**: Convert **all existing timestamp columns** in this phase to align with the `timestamptz` policy (not just newly added/edited columns).

---

## Explicitly out of scope for this checklist

- Adding `**organizations`**, `**user_organizations`**, or `**org_id**` columns (next phase per [roadmap.md](./roadmap.md)).
- **RLS** policies (optional later).

---

## Feedback / decisions log

*Use this section when responding with approvals, rejections, or alternatives.*


| Table / area                             | Your decision                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tracks` / `created_by`                  | Seeded import user (fixed UUID) for bootstrap data; app uses real user at runtime; remove invalid `"system"` default; keep FK. *(see `tracks` section above)*  |
| `tracks` / `created_by default`          | No DB default; require explicit `created_by` on all inserts (seed + runtime). Keep `NOT NULL` + FK so missed assignment fails fast.                         |
| `tracks` / `title`                       | No change during solidification; `**UNIQUE (org_id, title)`** when tenancy is implemented.                                                                     |
| `users` / `email`                        | Use PostgreSQL **`citext`** for case-insensitive uniqueness at DB layer (retain unique constraint).                                                          |
| `users` / `status` + `provider`          | Add DB CHECK sets: `status IN ('pending_approval','active','inactive')` and `provider IN ('local','google')`; expand later by migration as needed.         |
| `chapters` / constraints                 | Add `UNIQUE (track_id, title)` and CHECK `status IN ('draft','published')`.                                                                                   |
| `text_segments` / ordering key           | Add `UNIQUE (chapter_id, script, order)` to prevent duplicate ordering positions within a chapter/script.                                                     |
| `media_segments` / time                  | Integer `**start_ms`** / `**end_ms`** (replace `**real`** timestamps); CHECK bounds & `**start_ms < end_ms**`; convert seconds only at audio player / seek UI. |
| `batches` / `cohort_type`                | No DB CHECK yet; flexible column; validate via UI dropdown (and optional API/Zod) until list is final.                                                         |
| `batches` / `batch_code`                 | Add global `UNIQUE (batch_code)` now (single-tenant phase); revisit as per-org unique in tenancy phase.                                                      |
| `enrollments` / `status`                 | Add DB CHECK: `status IN ('active','dropped','completed')`.                                                                                                    |
| `student_progress` / keys                | `**UNIQUE (student_id, chapter_id)**` — one row per student per chapter; update `**batch_id**` on batch transfer; mastery persists across cohorts.             |
| `student_progress` / `proficiency_level` | Enforce DB CHECK with allowed values `**0–4, 8, 9**` (`VALID_PROFICIENCY_LEVELS`) and fix outdated schema comment.                                            |
| `proficiency_evaluation_log` / retention | Soft-delete chapters so evaluation history survives; avoid routine hard deletes; use explicit admin/archive flow for exceptional purges.                       |
| `proficiency_evaluation_log` / levels    | Enforce same DB CHECK set for `old_proficiency_level` / `new_proficiency_level`: `IN (0,1,2,3,4,8,9)` (with nullable handling for `old`).                     |
| `audit_logs` / indexes                   | Add `**(timestamp DESC)**`, `**(user_id, timestamp DESC)**`, `**(resource_type, timestamp DESC)**` now; defer `**(resource_type, resource_id)**` until needed. |
| `system_settings` / scope                | Keep global-only now; add dedicated `org_settings` in tenancy phase; classify keys as `platform.*` (global) vs `org.*` (future tenant-scoped).                 |
| `migration workflow`                     | Commit versioned generated migrations for every schema change; apply locally and commit schema + migration together.                                           |
| `timestamps` / policy scope              | Convert all existing timestamp columns to `timestamptz` in this solidification phase for consistency.                                                          |


