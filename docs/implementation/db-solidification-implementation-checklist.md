# DB Solidification Implementation Checklist

Execution checklist for the pre-tenancy DB hardening work.  
Source of truth for decisions: `docs/implementation/db-solidification-checklist.md`.

---

## 0) Implementation setup

- [ ] **0.1** Create a dedicated branch for this work.
- [ ] **0.2** Confirm migrations are enabled as the primary workflow (schema + migration committed together).
- [ ] **0.3** Run a baseline typecheck/test pass before edits.

---

## 1) `users` table

- [ ] **1.1** Convert `users.email` to PostgreSQL `citext`.
- [ ] **1.1.a** Auto-normalize/dedupe case-colliding emails in dev migration path before enforcing `citext` uniqueness.
- [ ] **1.2** Keep/ensure unique constraint on `users.email` (case-insensitive via `citext`).
- [x] **1.3** Add/ensure CHECK on `users.status`:
  - `pending_approval`, `active`, `inactive`
- [x] **1.4** Add/ensure CHECK on `users.provider`:
  - `local`, `google`
- [x] **1.5** Add FK for `users.invited_by -> users.id` (nullable).
- [x] **1.6** Add FK for `users.approved_by -> users.id` (nullable).
- [ ] **1.7** Convert timestamps in `users` to `timestamptz`:
  - `invited_at`, `approved_at`, `last_login_at`, `created_at`, `updated_at`

---

## 2) `tracks` table

- [ ] **2.1** Remove DB default on `tracks.created_by`.
- [ ] **2.2** Keep `tracks.created_by` as `NOT NULL` + FK to `users.id`.
- [ ] **2.3** Update insert paths so `created_by` is always explicit:
  - seed/import scripts use seeded import user id
  - runtime uses authenticated user id
- [ ] **2.4** Rename `tracks.order` -> `tracks.sort_order`.
- [ ] **2.4.a** Switch clients immediately to new field naming (no temporary backward-compat alias for `order`).
- [ ] **2.5** Convert `tracks.created_at`, `tracks.updated_at` to `timestamptz`.

---

## 3) `chapters` table

- [ ] **3.1** Rename `chapters.order` -> `chapters.sort_order`.
- [x] **3.2** Add UNIQUE on `(track_id, title)`.
- [x] **3.3** Add CHECK on `status IN ('draft', 'published')`.
- [ ] **3.4** Convert `chapters.published_at`, `chapters.created_at`, `chapters.updated_at` to `timestamptz`.
- [ ] **3.5** Add soft-delete fields for chapter retention strategy:
  - `deleted_at` (`timestamptz`, nullable)
  - `deleted_by` (nullable FK to `users.id`) if implemented now
- [ ] **3.5.a** Keep existing chapter DELETE endpoint but change behavior to soft-delete (no routine hard delete via API).
- [ ] **3.6** Update reads to exclude soft-deleted chapters by default.
- [ ] **3.6.a** Do not add archived/restore UI now; keep archived visibility/restore as explicit DB-admin task.

---

## 4) `audio_files` table

- [ ] **4.1** Add index on `audio_files.chapter_id`.
- [ ] **4.2** Convert `audio_files.created_at` to `timestamptz`.

---

## 5) `text_segments` table

- [x] **5.1** Add CHECK: `start_position <= end_position`.
- [ ] **5.2** Add UNIQUE on `(chapter_id, script, sort/order column)`.
- [ ] **5.3** Convert `text_segments.created_at` to `timestamptz`.

---

## 6) `media_segments` table

- [x] **6.1** Replace `start_timestamp` / `end_timestamp` (`real`) with integer millisecond fields:
  - `start_ms`, `end_ms`
- [x] **6.2** Add CHECKs:
  - `start_ms >= 0`
  - `end_ms >= 0`
  - `start_ms < end_ms`
- [ ] **6.3** Convert `media_segments.created_at` to `timestamptz`.
- [x] **6.4** Update service/API/UI conversion boundary (`ms <-> seconds`) at player layer.
- [x] **6.4.a** Change API contract to milliseconds as well (`startMs`/`endMs`) for strong end-to-end consistency.

---

## 7) `segment_mappings` table

- [x] **7.1** Add UNIQUE on `(media_segment_id, text_segment_id)`.
- [ ] **7.2** Convert `segment_mappings.created_at` to `timestamptz`.

---

## 8) `batches` table

- [x] **8.1** Add global UNIQUE on `batch_code` (pre-tenancy).
- [ ] **8.2** Keep `cohort_type` flexible (no DB CHECK now).
- [ ] **8.3** Convert `batches.created_at`, `batches.updated_at` to `timestamptz`.

---

## 9) `enrollments` table

- [x] **9.1** Keep partial unique for one active enrollment per student.
- [x] **9.2** Add CHECK on `status IN ('active', 'dropped', 'completed')`.
- [ ] **9.3** Convert `enrollments.enrolled_at`, `dropped_at`, `updated_at` to `timestamptz`.

---

## 10) `batch_co_instructors` table

- [x] **10.1** Add UNIQUE on `(batch_id, instructor_id)`.
- [ ] **10.2** Convert `assigned_at` to `timestamptz`.

---

## 11) `student_progress` table

- [x] **11.1** Add UNIQUE on `(student_id, chapter_id)`.
- [x] **11.2** Add CHECK on `proficiency_level IN (0,1,2,3,4,8,9)`.
- [ ] **11.3** Convert `last_accessed`, `last_evaluated_at`, `created_at`, `updated_at` to `timestamptz`.
- [ ] **11.4** Update schema comment to match actual allowed proficiency set.

---

## 12) `proficiency_evaluation_log` table

- [ ] **12.1** Keep hard-delete avoidance by relying on chapter soft-delete strategy.
- [x] **12.2** Add CHECK on `new_proficiency_level IN (0,1,2,3,4,8,9)`.
- [x] **12.3** Add CHECK on `old_proficiency_level` with same allowed set when not null.
- [ ] **12.4** Add Drizzle `relations()` metadata for DX.
- [ ] **12.5** Convert `evaluated_at` to `timestamptz`.

---

## 13) `audit_logs` table

- [ ] **13.1** Add index `(timestamp DESC)`.
- [ ] **13.2** Add index `(user_id, timestamp DESC)`.
- [ ] **13.3** Add index `(resource_type, timestamp DESC)`.
- [ ] **13.4** Defer `(resource_type, resource_id)` until concrete query path requires it.
- [ ] **13.5** Convert `timestamp` to `timestamptz`.

---

## 14) `system_settings`

- [ ] **14.1** Keep global-only in this phase (no `org_id`).
- [ ] **14.2** Convert `updated_at` to `timestamptz`.
- [ ] **14.3** (Doc) Maintain key scope classification for tenancy planning:
  - `platform.*` -> global
  - `org.*` -> future tenant-scoped

---

## 15) Seed/import path updates

- [ ] **15.1** Ensure seeded import user exists before curriculum inserts.
- [ ] **15.2** Ensure all bootstrap rows with actor fields pass explicit creator/uploader ids.
- [ ] **15.3** Remove all insert assumptions that depended on `created_by` default `"system"`.

---

## 16) Verification and safeguards

- [x] **16.1** Add pre-migration data cleanup steps for new UNIQUE/CHECK constraints (if needed).
- [x] **16.1.a** In dev, prefer auto-fix cleanup scripts for duplicates/out-of-range values where safe; avoid manual cleanup unless needed.
- [ ] **16.2** Run migrations end-to-end on a fresh DB.
- [ ] **16.3** Run migrations on a DB with representative seeded data.
- [ ] **16.4** Run full typecheck/tests after schema + code updates.
- [ ] **16.5** Validate key flows manually:
  - auth/signup/login
  - content create/update/publish
  - batch/enrollment operations
  - student progress + proficiency updates
  - admin audit logs filtering

---

## 17) Out of scope (this checklist)

- [ ] **17.1** Do **not** add tenancy tables/columns here (`organizations`, `user_organizations`, `org_id`).
- [ ] **17.2** Do **not** implement org-scoped unique constraints yet (deferred to tenancy).

