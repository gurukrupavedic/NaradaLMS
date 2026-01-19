# Architecture and NaradaLMS Module Contracts

**Why this shape (plain English):** We chose a modular monolith so everything stays in one deploy, but each domain has a clear boundary: one owner per table, thin public APIs between modules, and events for cross-module reactions. That keeps code changes safer now and lets us split services later without rewrites.

**What this doc covers:** Current module contracts: who owns which tables, what other modules may read, the public service surface, key events, and the few workflows that matter for integration.

---

## Module map

| Module | Owns (write) | Reads (examples) | Public surface (other modules call) |
|--------|--------------|------------------|-------------------------------------|
| Identity & Access | users, sessions | — | auth middleware, role checks, getUser |
| Content & Publishing | tracks, chapters, text_segments | users.id (audit) | getTracks/Chapters/Segments, publish rules |
| Media Pipeline | audio_files, media_segments, segment_mappings | chapters.id, users.id | getAudioFiles, getMediaSegments, getMappings |
| Batch & Cohort | batches, enrollments, batch_co_instructors | users, tracks | getBatch, getEnrollments, batch role checks |
| Learning Delivery | student_progress | chapters, segments, mappings, batches | getProgress, updateProgress (with batch guard) |
| System Admin | audit_logs, system_settings | everything (read-only) | audit queries, settings get/update |

**Rules that always apply:**
- Only the owning module writes to its tables; others consume via service APIs.
- Routes never touch DB directly; they call module services.
- Cross-module reactions happen via events; avoid direct coupling when possible.

---

## Module contracts

### Identity & Access
- **Owns:** users, sessions
- **Allows reads:** none outside its own tables
- **Public API (other modules call):** auth middleware, requireRole, getUser/getUserByEmail, hasRole/isAdmin/isInstructor/isContentManager/isStudent
- **Events emitted:** UserCreated, UserAccountApproved, UserRoleChanged
- **Key invariants:** user.status must be active; roles stored as array; every protected route uses auth middleware.

### Content & Publishing
- **Owns:** tracks, chapters, text_segments
- **Allows reads:** published chapters/segments to Learning; ids to Media/Batch for linkage
- **Public API:** getAllTracks, getTrack, getChaptersByTrack(publishedOnly?), getChapter, getSegmentsByChapter(script?), canDeleteChapter, publishChapter
- **Events emitted:** ChapterPublished, ChapterUnpublished, ContentUpdated
- **Key invariants:** published chapters cannot be deleted; segmentation is script-specific (te/hi/en).

### Media Pipeline
- **Owns:** audio_files, media_segments, segment_mappings
- **Allows reads:** chapter ids for lookups; user ids for attribution
- **Public API:** getAudioFilesByChapter, getMediaSegmentsByAudioFile, getMappingsByChapter, getMappingsByAudioFile
- **Events emitted:** AudioUploaded, MappingCreated, MappingDeleted
- **Key invariants:** mappings are created atomically with media segments; audio files belong to one chapter.

### Batch & Cohort
- **Owns:** batches, enrollments, batch_co_instructors
- **Allows reads:** users (role checks), tracks (batch-track association)
- **Public API:** getBatch, getBatchesByInstructor, getEnrollmentsByBatch, getEnrollmentsByStudent, isStudentEnrolledInBatch, isPrimaryInstructor, isCoInstructor, isAssignedToAnyBatch
- **Events emitted:** BatchCreated, StudentEnrolled, StudentUnenrolled, InstructorAssigned
- **Key invariants:** one track per batch; instructor actions must be batch-scoped.

### Learning Delivery
- **Owns:** student_progress
- **Allows reads:** published chapters/segments; audio mappings; batches/enrollments (for context); users.id for evaluatedBy
- **Public API:** getProgress(studentId/chapterId), updateStudentProgress(batchId, studentId, chapterId, level, evaluatedBy)
- **Events emitted:** ProgressUpdated, ChapterCompleted
- **Key invariants:** progress updates require active enrollment + instructor assigned to that batch; proficiency scale 0–4.

### System Admin
- **Owns:** audit_logs, system_settings
- **Allows reads:** all tables (read-only for context)
- **Public API:** getAllUsers(filters), searchUsers, getAuditLogs(filters), getAuditLogsForUser/Resource, getSetting/updateSetting, exportAuditLogs
- **Events emitted:** AdminActionLogged, SettingChanged (subscribes to all domain events for auditing)
- **Key invariants:** audit logs are append-only; settings are simple key-value.

---

## Allowed reads (summary)
- Identity: self only
- Content: self; user id for audit
- Media: self; chapter id, user id
- Batch: self; users, tracks
- Learning: self; published content, mappings, batches/enrollments, users.id
- Admin: everything (read-only)

---

## Critical workflows (cross-module guards)
1) **Account approval → login**: Admin approves user → Identity emits UserAccountApproved → user gets `student` role.
2) **Publish protection**: Content blocks delete of published chapters; publish/unpublish emits events for consumers (Learning cache invalidation, Admin audit).
3) **Audio mapping**: Media creates media_segment + segment_mapping atomically; Content provides text_segments; Learning reads mappings for playback only.
4) **Batch-scoped progress**: Batch verifies instructor/student enrollment; Learning updates student_progress; Admin logs via events.
5) **Access gating**: Frontend routes use auth middleware + requireRole; Learning only shows published chapters; track progression enforced in app logic.

---

## Event pattern
- Use in-process EventBus for cross-module reactions.
- Emit events for publishes, enrollments, progress updates, role changes, audio uploads/mappings.
- Subscribers (e.g., Admin audit, Learning cache invalidation) react without direct coupling.
