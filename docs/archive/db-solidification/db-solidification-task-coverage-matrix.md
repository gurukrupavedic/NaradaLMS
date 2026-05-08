# Archived: DB Solidification Task Coverage Matrix

> Moved from `docs/implementation/db-solidification-task-coverage-matrix.md` after multi-tenancy planning was completed. Content preserved for historical reference.

## Original content

# DB Solidification Task Coverage Matrix

This is the execution source of truth for solidification.  
It is intentionally self-sufficient: each row includes the task intent, entity, impact, sequencing, and execution mode.

---

## How to use this matrix

- **Sequencing:** Execute rows in ascending `Seq`.
- **Execution mode:**
  - **Individual** = do in isolation (higher regression risk).
  - **Parallel-safe** = can run with other rows in same sequence band if no file overlap.
- Mark a row done only when all impact columns are addressed.

---

## Task Coverage Matrix (sequenced)

| Seq | Task     | Primary table/entity         | Execution mode | Task detail                                                   | DB/Schema impact                           | Backend/API impact                           | Frontend impact                 | Seed/scripts impact                 | Verification focus              |
| --- | -------- | ---------------------------- | -------------- | ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- | ------------------------------- | ----------------------------------- | ------------------------------- |
| 1   | `0.1`    | Cross-cutting                | Individual     | Create dedicated branch                                       | None                                       | None                                         | None                            | None                                | Branch created                  |
| 2   | `0.2`    | Cross-cutting                | Individual     | Confirm migration workflow                                    | Process standardization                    | Ensure schema+migration committed together   | None                            | None                                | PR hygiene check                |
| 3   | `0.3`    | Cross-cutting                | Individual     | Run baseline checks                                           | None                                       | Baseline typecheck/tests                     | Baseline smoke                  | Optional baseline scripts           | Baseline captured               |
| 4   | `15.1`   | Seeding                      | Parallel-safe  | Ensure import actor exists first                              | None                                       | Dependency ordering                          | None                            | Seed ordering updates               | Bootstrap succeeds              |
| 5   | `15.2`   | Seeding                      | Parallel-safe  | Explicit actor IDs in bootstrap rows                          | None                                       | Actor fields required in insert paths        | None                            | Update bootstrap scripts            | No missing-actor failures       |
| 6   | `15.3`   | Seeding                      | Parallel-safe  | Remove `"system"` assumptions                                 | None                                       | Remove fallback usage                        | None                            | Update smoke/seed scripts           | No stale `"system"` literals    |
| 7   | `2.1`    | `tracks`                     | Individual     | Remove `created_by` default                                   | Drop default                               | Inserts must pass creator                    | None                            | Seeds/tests explicit actor          | Missing creator fails fast      |
| 8   | `2.2`    | `tracks`                     | Parallel-safe  | Keep `created_by` NOT NULL + FK                               | Constraint retention                       | Validate actor in create flow                | None                            | Seed creator exists                 | FK/null enforced                |
| 9   | `2.3`    | `tracks`                     | Parallel-safe  | Explicit `createdBy` in all insert paths                      | None                                       | Track/chapter/segment create paths           | None                            | Replace `"system"` literals         | End-to-end create success       |
| 10  | `2.4`    | `tracks`                     | Individual     | Rename `tracks.order` -> `sort_order`                         | Column rename                              | Update query/sort/select refs                | Clients switch field            | Seeds/tests update field            | No stale refs                   |
| 11  | `2.4.a`  | `tracks`                     | Individual     | Switch clients immediately (no alias)                         | Contract hard cut                          | DTO/route payload names update               | Admin/student clients update    | Tests update                        | Contract tests pass             |
| 12  | `3.1`    | `chapters`                   | Individual     | Rename `chapters.order` -> `sort_order`                       | Column rename                              | Update query/sort/reorder refs               | Chapter labels/lists update     | Seeds/tests update                  | No stale refs                   |
| 13  | `3.2`    | `chapters`                   | Parallel-safe  | UNIQUE `(track_id,title)`                                     | Add unique                                 | Handle duplicate-title DB errors             | Show conflict message           | Dedup seed data                     | Duplicate rejected              |
| 14  | `3.3`    | `chapters`                   | Parallel-safe  | CHECK chapter status                                          | Add CHECK                                  | Publish/unpublish aligned                    | Status toggles aligned          | Seeds valid                         | Invalid status rejected         |
| 15  | `3.5`    | `chapters`                   | Individual     | Add soft-delete fields                                        | Add `deleted_at` (+ optional `deleted_by`) | Delete behavior archive-oriented             | None directly                   | Optional purge scripts              | Soft-delete persists rows       |
| 16  | `3.5.a`  | `chapters`                   | Individual     | Keep DELETE endpoint, soft-delete behavior                    | None                                       | DELETE semantics change                      | Existing action still works     | Cleanup scripts for hard delete     | API archives successfully       |
| 17  | `3.6`    | `chapters`                   | Individual     | Exclude archived chapters by default                          | Query filters non-deleted                  | Update list/get/join filters                 | Archived hidden                 | None                                | Archived absent in normal views |
| 18  | `3.6.a`  | `chapters`                   | Parallel-safe  | No archived/restore UI now                                    | None                                       | No restore endpoint now                      | No archived UI                  | DB-admin-only restore/purge docs    | Hidden by default verified      |
| 19  | `5.1`    | `text_segments`              | Parallel-safe  | CHECK text segment range                                      | Add CHECK                                  | Validation aligned                           | Segmentation UX unchanged       | Auto-fix bad ranges if needed       | Invalid ranges rejected         |
| 20  | `5.2`    | `text_segments`              | **Individual** | UNIQUE `(chapter_id,script,order)` with safe reorder strategy | Add unique                                 | **Transactional reorder algorithm required** | Drag/drop must stay stable      | Cleanup duplicate orders first      | Reorder/create/delete pass      |
| 21  | `7.1`    | `segment_mappings`           | Parallel-safe  | UNIQUE mapping pair                                           | Add unique                                 | Duplicate-pair handling                      | Duplicate mapping feedback      | Cleanup duplicates                  | Duplicate pair rejected         |
| 22  | `8.1`    | `batches`                    | Parallel-safe  | UNIQUE global `batch_code`                                    | Add unique                                 | Conflict handling                            | Batch form conflict message     | Seed codes unique                   | Duplicate code rejected         |
| 23  | `9.1`    | `enrollments`                | Parallel-safe  | Keep partial unique enrollment                                | No change                                  | Logic still valid                            | No change                       | Preserve uniqueness in seeds        | No duplicate active enrollments |
| 24  | `9.2`    | `enrollments`                | Parallel-safe  | CHECK enrollment status                                       | Add CHECK                                  | Status mutations constrained                 | UI filters aligned              | Seed statuses valid                 | Invalid status rejected         |
| 25  | `10.1`   | `batch_co_instructors`       | Parallel-safe  | UNIQUE co-instructor pair                                     | Add unique                                 | Duplicate assignment handling                | Duplicate assignment feedback   | Dedup assignments in seeds          | Duplicate assignment rejected   |
| 26  | `11.1`   | `student_progress`           | Parallel-safe  | UNIQUE progress key                                           | Add unique                                 | Upsert/update single-row model               | Matrix assumes one row          | Cleanup duplicates                  | No duplicate progress rows      |
| 27  | `11.2`   | `student_progress`           | Parallel-safe  | CHECK proficiency values                                      | Add CHECK                                  | Proficiency writes aligned                   | UI labels already aligned       | Reset scripts valid                 | Invalid values rejected         |
| 28  | `12.2`   | `proficiency_evaluation_log` | Parallel-safe  | CHECK `new_proficiency_level`                                 | Add CHECK                                  | Evaluation writes valid                      | None                            | Scripts align                       | Invalid writes rejected         |
| 29  | `12.3`   | `proficiency_evaluation_log` | Parallel-safe  | CHECK `old_proficiency_level` nullable-safe                   | Add CHECK                                  | Writes with old value valid                  | None                            | Scripts align                       | Nullable old accepted           |
| 30  | `1.1`    | `users`                      | Individual     | Convert email to `citext`                                     | Type migration                             | Identity queries continue to work            | Auth forms unchanged            | Existing emails normalize first     | Migration succeeds              |
| 31  | `1.1.a`  | `users`                      | Individual     | Auto-normalize/dedupe case collisions                         | Pre-migration cleanup                      | Script/orchestration only                    | None                            | Dedupe/normalize script             | No collisions remain            |
| 32  | `1.2`    | `users`                      | Parallel-safe  | Keep unique email                                             | Unique constraint                          | Create/update conflict handling              | Show email conflict             | Seed duplicate prevention           | Duplicate insert fails          |
| 33  | `1.3`    | `users`                      | Parallel-safe  | CHECK users.status                                            | Add CHECK                                  | Status transitions valid set only            | Admin filters aligned           | Seed statuses valid                 | Invalid status rejected         |
| 34  | `1.4`    | `users`                      | Parallel-safe  | CHECK users.provider                                          | Add CHECK                                  | Local/Google valid set only                  | None                            | Seed providers valid                | Invalid provider rejected       |
| 35  | `1.5`    | `users`                      | Parallel-safe  | FK invited_by -> users.id                                     | Add FK                                     | Invite flow valid IDs                        | None                            | Seed refs valid/null                | FK integrity passes             |
| 36  | `1.6`    | `users`                      | Parallel-safe  | FK approved_by -> users.id                                    | Add FK                                     | Approval flow valid IDs                      | None                            | Seed refs valid/null                | FK integrity passes             |
| 37  | `6.1`    | `media_segments`             | Individual     | Replace timestamp fields with ms                              | Field replacement                          | Media types/storage migrate                  | Mapping/player hooks migrate    | Scripts/tests update fields         | CRUD + playback correct         |
| 38  | `6.2`    | `media_segments`             | Parallel-safe  | Add ms boundary CHECKs                                        | Add CHECKs                                 | Validation/errors aligned                    | UI validation aligned           | Seed data valid                     | Invalid ranges rejected         |
| 39  | `6.4`    | `media_segments`             | Individual     | Update conversion boundary                                    | None                                       | Boundary conversion where needed             | Player/seek conversion logic    | Payload conversion in tests/scripts | Playback boundaries correct     |
| 40  | `6.4.a`  | `media_segments`             | **Individual** | API contract to `startMs/endMs`                               | Contract migration                         | Routes/services/types update                 | Admin + student contract update | Smoke scripts updated               | API contract tests pass         |
| 41  | `4.1`    | `audio_files`                | Parallel-safe  | Add index `chapter_id`                                        | Add index                                  | Faster chapter-audio queries                 | None                            | None                                | Perf check/no behavior change   |
| 42  | `13.1`   | `audit_logs`                 | Parallel-safe  | Add index `(timestamp DESC)`                                  | Add index                                  | Log list perf                                | None                            | None                                | Query latency                   |
| 43  | `13.2`   | `audit_logs`                 | Parallel-safe  | Add index `(user_id,timestamp DESC)`                          | Add index                                  | User-filter perf                             | None                            | None                                | Filter latency                  |
| 44  | `13.3`   | `audit_logs`                 | Parallel-safe  | Add index `(resource_type,timestamp DESC)`                    | Add index                                  | Resource-type filter perf                    | None                            | None                                | Filter latency                  |
| 45  | `13.4`   | `audit_logs`                 | Parallel-safe  | Defer `(resource_type,resource_id)`                           | No change                                  | No code change now                           | None                            | None                                | Deferred decision noted         |
| 46  | `8.2`    | `batches`                    | Parallel-safe  | Keep `cohort_type` flexible                                   | No CHECK                                   | Keep API/UI dropdown guard                   | Continue dropdown guard         | Seeds can stay flexible             | Flexible storage preserved      |
| 47  | `12.1`   | `proficiency_evaluation_log` | Parallel-safe  | Retain history via chapter soft-delete                        | Depends on soft-delete strategy            | Ensure logs survive archive                  | None                            | None                                | Logs remain after archive       |
| 48  | `12.4`   | `proficiency_evaluation_log` | Parallel-safe  | Add Drizzle `relations()` metadata                            | No DB change                               | Better typed query ergonomics                | None                            | None                                | Compile-time ergonomics         |
| 49  | `11.4`   | `student_progress`           | Parallel-safe  | Update stale schema comment                                   | Comment/type alignment                     | Keep constants/schema aligned                | None                            | None                                | No stale docs/comments          |
| 50  | `14.1`   | `system_settings`            | Parallel-safe  | Keep global-only now                                          | No scope change                            | No org scope in APIs                         | Settings UI unchanged           | None                                | No accidental org scope         |
| 51  | `14.3`   | `system_settings`            | Parallel-safe  | Maintain key-scope docs                                       | Documentation only                         | Optional conventions later                   | None                            | docs/scripts only                   | Template maintained             |
| 52  | `1.7`    | `users`                      | Individual     | users timestamps -> `timestamptz`                             | Timestamp migration                        | Identity date serialization                  | Display stable                  | Seed dates consistent               | UTC-safe roundtrip              |
| 53  | `2.5`    | `tracks`                     | Individual     | tracks timestamps -> `timestamptz`                            | Timestamp migration                        | Content date handling                        | Display stable                  | Seed dates valid                    | Track CRUD stable               |
| 54  | `3.4`    | `chapters`                   | Individual     | chapters timestamps -> `timestamptz`                          | Timestamp migration                        | Content API serialization                    | Editor stable                   | Seed dates valid                    | Date parsing stable             |
| 55  | `4.2`    | `audio_files`                | Individual     | `audio_files.created_at` -> `timestamptz`                     | Timestamp migration                        | API date output stable                       | Display stable                  | None                                | Upload/list stable              |
| 56  | `5.3`    | `text_segments`              | Individual     | `text_segments.created_at` -> `timestamptz`                   | Timestamp migration                        | API serialization                            | Minor                           | None                                | Segment CRUD stable             |
| 57  | `6.3`    | `media_segments`             | Individual     | `media_segments.created_at` -> `timestamptz`                  | Timestamp migration                        | API serialization                            | Minor                           | None                                | No regressions                  |
| 58  | `7.2`    | `segment_mappings`           | Individual     | `segment_mappings.created_at` -> `timestamptz`                | Timestamp migration                        | API date output                              | None                            | None                                | Mapping stable                  |
| 59  | `8.3`    | `batches`                    | Individual     | batches timestamps -> `timestamptz`                           | Timestamp migration                        | API serialization                            | Display stable                  | None                                | Batch CRUD stable               |
| 60  | `9.3`    | `enrollments`                | Individual     | enrollments timestamps -> `timestamptz`                       | Timestamp migration                        | API date handling                            | Display stable                  | None                                | Enrollment stable               |
| 61  | `10.2`   | `batch_co_instructors`       | Individual     | `assigned_at` -> `timestamptz`                                | Timestamp migration                        | API serialization                            | None                            | None                                | No regressions                  |
| 62  | `11.3`   | `student_progress`           | Individual     | progress timestamps -> `timestamptz`                          | Timestamp migration                        | Learning date serialization                  | Display stable                  | None                                | Endpoints stable                |
| 63  | `12.5`   | `proficiency_evaluation_log` | Individual     | `evaluated_at` -> `timestamptz`                               | Timestamp migration                        | History serialization                        | Display stable                  | None                                | No regressions                  |
| 64  | `13.5`   | `audit_logs`                 | Individual     | audit timestamp -> `timestamptz`                              | Timestamp migration                        | Log API serialization                        | Logs timestamp rendering        | None                                | Logs page correctness           |
| 65  | `14.2`   | `system_settings`            | Individual     | settings `updated_at` -> `timestamptz`                        | Timestamp migration                        | Settings API serialization                   | Display stable                  | None                                | No regressions                  |
| 66  | `16.1`   | Cross-cutting (migrations)   | Individual     | Add pre-migration cleanup steps                               | Cleanup utilities                          | Orchestrate before migrations                | None                            | dedupe/range fix scripts            | Constraints apply cleanly       |
| 67  | `16.1.a` | Cross-cutting (migrations)   | Parallel-safe  | Auto-fix cleanup policy in dev                                | Auto-fix scripts                           | Runner/orchestration                         | None                            | scripts committed                   | Dev migration passes            |
| 68  | `16.2`   | Cross-cutting (verification) | Individual     | Run migrations on fresh DB                                    | Full-path validation                       | Backend compile with migrated schema         | Frontend smoke on migrated API  | Seeds on fresh DB                   | Full green bootstrap            |
| 69  | `16.3`   | Cross-cutting (verification) | Individual     | Run migrations on representative data                         | Compatibility validation                   | Constraint/rename compatibility              | UI against migrated data        | Seed fixture pass                   | No runtime errors               |
| 70  | `16.4`   | Cross-cutting (verification) | Parallel-safe  | Full typecheck/tests                                          | None                                       | Full server checks                           | Full app checks                 | optional script checks              | CI-equivalent pass              |
| 71  | `16.5`   | Cross-cutting (verification) | Individual     | Manual core-flow validation                                   | None                                       | API flow validation                          | Manual UI regressions           | smoke scripts                       | End-to-end acceptance           |
| 72  | `17.1`   | Scope guard                  | Individual     | Keep tenancy tables out of scope                              | Scope guard                                | Scope guard                                  | Scope guard                     | Scope guard                         | PR scope review                 |
| 73  | `17.2`   | Scope guard                  | Individual     | Keep org-scoped uniques deferred                              | Scope guard                                | Scope guard                                  | Scope guard                     | Scope guard                         | PR scope review                 |

---

## High-risk integration slices (recommended order)

### Slice 1 - Schema naming + actor discipline

Tasks: `2.x`, `3.1`, `15.x`

### Slice 2 - Segment ordering safety (separate)

Tasks: `5.2` + safe reorder transaction + regression tests

### Slice 3 - Media ms contract

Tasks: `6.x` (backend + API + UI contract together)

### Slice 4 - Constraint hardening

Tasks: `1.3/1.4`, `3.2/3.3`, `8.1`, `9.2`, `10.1`, `11.1/11.2`, `12.2/12.3`, `7.1`

### Slice 5 - Timestamp normalization

Tasks: `1.7`, `2.5`, `3.4`, `4.2`, `5.3`, `6.3`, `7.2`, `8.3`, `9.3`, `10.2`, `11.3`, `12.5`, `13.5`, `14.2`

### Slice 6 - Perf and docs + final verification

Tasks: `13.1-13.4`, `14.3`, `16.x`, `17.x`

---

## Parallel Bundles (safe execution plan)

Use these bundles after finishing all prior required bundles in order.  
Rule: tasks marked **Individual** still run alone, even inside a bundle.

### Bundle A - Foundations first (must complete before others)

- `0.1`, `0.2`, `0.3`
- `15.1`, `15.2`, `15.3`
- `2.1`, `2.2`, `2.3`

Why first: establishes migration discipline and removes `created_by` default dependency.

### Bundle B - Naming and chapter lifecycle (serial with caution)

- `2.4`, `2.4.a` (tracks field rename + client contract switch)
- `3.1` (chapters field rename)
- `3.5`, `3.5.a`, `3.6`, `3.6.a` (soft-delete behavior and filtering)

Why serial: contract and behavior changes touch many shared files/routes.

### Bundle C - Constraint hardening (parallel-safe group)

Run these in parallel **only if** different owners avoid same files:

- `1.3`, `1.4`, `1.5`, `1.6`
- `3.2`, `3.3`
- `5.1`, `7.1`, `8.1`, `9.1`, `9.2`, `10.1`, `11.1`, `11.2`, `12.2`, `12.3`

Note: include `16.1`/`16.1.a` cleanup scripts before applying new constraints.

### Bundle D - Segment ordering safety (isolated slice)

- `5.2` (**Individual**)

Why isolated: reorder algorithm + unique ordering is a known regression hotspot.

### Bundle E - Media milliseconds contract (isolated contract slice)

- `6.1`, `6.2`, `6.4`, `6.4.a` (treat `6.4.a` as hard contract cut)

Why isolated: API + backend + UI contract migration must land together.

### Bundle F - Timestamp normalization (mostly parallel-safe, one table owner each)

- `1.7`, `2.5`, `3.4`, `4.2`, `5.3`, `6.3`, `7.2`, `8.3`, `9.3`, `10.2`, `11.3`, `12.5`, `13.5`, `14.2`

Execution hint: split by table owners to parallelize safely.

### Bundle G - Performance/docs cleanup

- `4.1`, `13.1`, `13.2`, `13.3`, `13.4`, `11.4`, `12.4`, `14.1`, `14.3`

### Bundle H - Final validation and scope guard (must be last)

- `16.2`, `16.3`, `16.4`, `16.5`
- `17.1`, `17.2`

---

## Bundle-level Go/No-Go Gates

- **Gate 1 (after Bundle B):** no stale `order` field references, chapter delete path confirmed soft-delete.
- **Gate 2 (after Bundle D):** text segment reorder passes drag/drop + reorder regression checks.
- **Gate 3 (after Bundle E):** mapping/playback works with `startMs/endMs` end-to-end.
- **Gate 4 (after Bundle F):** timestamp serialization consistent and no timezone regressions.
- **Gate 5 (final):** all validation tasks green; scope guard respected.

---

## Open clarification (single remaining product choice)

- `3.5` soft-delete field `deleted_by`: keep in initial implementation or defer and use only `deleted_at` first.

