# Data Model

This document captures the multi-tenancy strategy, role system, and database schema for the Narada LMS backend.

## Multi-Tenancy

Narada supports multiple schools under a single deployment. Each school is fully isolated from every other school.

### Strategy: Schema-per-School

Each school gets its own Postgres schema (`school_<id>`) containing all domain tables. The `public` schema holds platform-wide data: user accounts, school registry, and BetterAuth-managed tables (including the organization plugin tables).

**Why schema-per-school over row-level isolation:**

- Isolation is enforced by Postgres, not application code. No risk of a missing `WHERE school_id =` leaking data across schools.
- A school can be cleanly deleted by dropping its schema.
- Per-school backups and restores are straightforward.
- Schema-level DDL locks mean migrations on one school don't block another.

**Schema provisioning:** Creating a new school means creating a BetterAuth organization (which populates the `organization` table), creating a new Postgres schema, and running the standard table creation SQL against it.

**Migrations:** Migrations are written once and applied to all school schemas in parallel. Each schema gets its own connection from the pool, and Postgres schema-level locks ensure no cross-school contention. Concurrency is capped to the connection pool size. Each school schema tracks its own migration state.

## BetterAuth Organization Plugin

The organization plugin provides the primitives for multi-tenancy, membership, and invitations. These map to Narada concepts as follows:

| BetterAuth Primitive | Narada Concept          | Notes                                                                                                                                                                       |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organization**     | **School**              | A school is an organization. `name`, `slug`, `logo`, and `metadata` are managed by BetterAuth. Replaces the custom school table.                                              |
| **Member**           | **School membership**   | A user's membership in a school with a school-level role. Replaces the custom `profile` table for membership and role tracking.                                             |
| **Member role**      | **School-level role**   | BetterAuth provides `owner`, `admin`, and `member` roles. These map to our school-level roles (see Roles section).                                                          |
| **Invitation**       | **School invitation**   | Invite-only onboarding. BetterAuth manages the full invitation lifecycle: pending, accepted, rejected, canceled. Invitations carry the school role to assign on acceptance. |
| **Session fields**   | **Active organization** | BetterAuth stores `activeOrganizationId` on the session. Narada resolves the active school from the request's school context.                                               |

### What BetterAuth handles

- Organization (school) CRUD, including slug uniqueness
- User membership in organizations, with role assignment (owner/admin/member)
- Invitation lifecycle (create, accept, reject, cancel) with expiry
- Active organization tracking on the session
- Permission checking via the `hasPermission` endpoint

### What we handle ourselves

- **Per-school Postgres schema provisioning** — triggered when an organization is created
- **Batches and batch-level roles** — batches, membership, and batch roles (instructor, ta, student) are stored in per-school tables
- **Profile data** — contact details (phone, city) beyond what BetterAuth's user model stores are kept on the per-school `enrollment` table
- **All domain tables** — tracks, chapters, evaluations, exams, etc. remain in per-school schemas

## Roles

There are five roles in the system, split across two levels:

**Platform-level** (on `public.user`):

- **Super Admin** — can perform any operation across any school. Represented by an `isSuperAdmin` flag on the user, not a school-scoped role.

**School-level** (on BetterAuth `member.role`):

BetterAuth's organization plugin provides three built-in roles: `owner`, `admin`, and `member`. These map to Narada's school-level roles:

- **Owner** — the user who created the school. Has full admin capabilities plus the ability to delete the school and transfer ownership. There is exactly one owner per school.
- **Admin** — can perform any operation within their school. This includes authoring and managing all content (tracks and chapters), managing batches, and managing users. Maps to BetterAuth's `admin` role.
- **Member** — a regular school member. Their capabilities are further scoped by batch enrollment. Maps to BetterAuth's `member` role.

**Batch-level** (on per-school `enrollment.role`):

- **Instructor** — can evaluate students, schedule exams, and manage enrollment in their batches.
- **TA** — same capabilities as instructor within their assigned batches.
- **Student** — can view content, see their own proficiency, and participate in exams.

A single person can belong to multiple schools with different roles (e.g., admin at one school, student at another). Within a school, they have one member record with one role. Within a batch, they have one enrollment with one role.

### Authorization Summary

| Action                             | Super Admin | Owner | Admin |  Instructor/TA  |      Student       |
| ---------------------------------- | :---------: | :---: | :---: | :-------------: | :----------------: |
| Manage schools                     |      X      |       |       |                 |                    |
| Delete school / transfer ownership |      X      |   X   |       |                 |                    |
| Author content (tracks, chapters)  |      X      |   X   |   X   |                 |                    |
| Create/manage batches              |      X      |   X   |   X   |                 |                    |
| Invite users to school             |      X      |   X   |   X   |                 |                    |
| Evaluate students                  |      X      |   X   |   X   | X (own batches) |                    |
| Schedule exams                     |      X      |   X   |   X   | X (own batches) |                    |
| Add/remove batch members           |      X      |   X   |   X   | X (own batches) |                    |
| View content                       |      X      |   X   |   X   |        X        | X (published only) |
| View own proficiency               |      X      |   X   |   X   |        X        |         X          |

### Permissions (Access Control)

BetterAuth's organization plugin is configured with a custom access control layer that defines resource-level permissions for each school-level role. Super admin access is handled at the application layer (bypasses AC entirely).

| Resource     | Actions                    | Owner |  Admin   | Member |
| ------------ | -------------------------- | :---: | :------: | :----: |
| `school`     | `update`, `delete`         |  all  | `update` |   —    |
| `content`    | `create`, `read`, `update` |  all  |   all    | `read` |
| `batch`      | `create`, `read`, `update` |  all  |   all    | `read` |
| `member`     | `create`, `read`, `remove` |  all  |   all    |   —    |
| `invitation` | `create`, `read`, `cancel` |  all  |   all    |   —    |
| `evaluation` | `create`, `read`           |  all  |   all    | `read` |
| `exam`       | `create`, `read`, `update` |  all  |   all    | `read` |

The only difference between `owner` and `admin` is `school.delete`. Batch-level scoping (instructor/TA can only act within their own batches) is enforced at the application layer using the `enrollment` table, not through BetterAuth's static AC.

---

## Public Schema

These tables live in the `public` schema and are shared across all schools. The BetterAuth-managed tables are created and maintained by BetterAuth's organization plugin.

### BetterAuth Core Tables

BetterAuth manages these tables for authentication state. They are not modified directly by application code.

#### `public.user`

User accounts. Extended with a super-admin flag.

| Column           | Type        | Constraints      |
| ---------------- | ----------- | ---------------- |
| `id`             | text        | PK               |
| `name`           | text        | NOT NULL         |
| `email`          | text        | UNIQUE, NOT NULL |
| `emailVerified`  | boolean     | DEFAULT false    |
| `image`          | text        |                  |
| `isSuperAdmin`   | boolean     | DEFAULT false    |
| `createdAt`      | timestamptz | NOT NULL         |
| `updatedAt`      | timestamptz | NOT NULL         |

#### `public.session`

Session state. BetterAuth manages creation and expiry. The organization plugin adds `activeOrganizationId` to track the user's active organization.

| Column                   | Type        | Constraints         |
| ------------------------ | ----------- | ------------------- |
| `id`                     | text        | PK                  |
| `userId`                 | text        | FK to `user.id`     |
| `token`                  | text        | UNIQUE, NOT NULL    |
| `expiresAt`              | timestamptz | NOT NULL            |
| `ipAddress`              | text        |                     |
| `userAgent`              | text        |                     |
| `activeOrganizationId`   | text        | Added by org plugin |
| `createdAt`              | timestamptz | NOT NULL            |
| `updatedAt`              | timestamptz | NOT NULL            |

#### `public.account`

OAuth providers and credential accounts.

| Column                     | Type        | Constraints     |
| -------------------------- | ----------- | --------------- |
| `id`                       | text        | PK              |
| `userId`                   | text        | FK to `user.id` |
| `accountId`                | text        | NOT NULL        |
| `providerId`               | text        | NOT NULL        |
| `accessToken`              | text        |                 |
| `refreshToken`             | text        |                 |
| `accessTokenExpiresAt`     | timestamptz |                 |
| `refreshTokenExpiresAt`    | timestamptz |                 |
| `scope`                    | text        |                 |
| `idToken`                  | text        |                 |
| `password`                 | text        |                 |
| `createdAt`                | timestamptz | NOT NULL        |
| `updatedAt`                | timestamptz | NOT NULL        |

#### `public.verification`

Email verification and password reset tokens.

| Column       | Type        | Constraints |
| ------------ | ----------- | ----------- |
| `id`         | text        | PK          |
| `identifier` | text        | NOT NULL    |
| `value`      | text        | NOT NULL    |
| `expiresAt`  | timestamptz | NOT NULL    |
| `createdAt`  | timestamptz | NOT NULL    |
| `updatedAt`  | timestamptz | NOT NULL    |

### BetterAuth Organization Plugin Tables

These tables are created by BetterAuth's organization plugin. They live in the public schema alongside the core auth tables.

#### `public.organization`

The registry of all schools. Each school is a BetterAuth organization. Replaces the previous custom school table.

| Column       | Type        | Constraints      |
| ------------ | ----------- | ---------------- |
| `id`         | text        | PK               |
| `name`       | text        | NOT NULL         |
| `slug`       | text        | UNIQUE, NOT NULL |
| `logo`       | text        |                  |
| `metadata`   | text        |                  |
| `createdAt`  | timestamptz | NOT NULL         |

The `metadata` field is BetterAuth-managed free-form text. Narada does not currently read it.

#### `public.member`

A user's membership in a school. One member record per user per school. The `role` field carries the school-level role. Replaces the previous custom `profile` table for membership tracking.

| Column            | Type        | Constraints                                                       |
| ----------------- | ----------- | ----------------------------------------------------------------- |
| `id`              | text        | PK                                                                |
| `organizationId`  | text        | FK to `organization.id`, NOT NULL                                 |
| `userId`          | text        | FK to `user.id`, NOT NULL                                         |
| `role`            | text        | NOT NULL; `'owner'`, `'admin'`, or `'member'`. DEFAULT `'member'` |
| `createdAt`       | timestamptz | NOT NULL                                                          |

#### `public.invitation`

Pending invitations to join a school. BetterAuth manages the full lifecycle.

| Column            | Type        | Constraints                                                                          |
| ----------------- | ----------- | ------------------------------------------------------------------------------------ |
| `id`              | text        | PK                                                                                   |
| `organizationId`  | text        | FK to `organization.id`, NOT NULL                                                    |
| `email`           | text        | NOT NULL                                                                             |
| `role`            | text        | role to assign on acceptance                                                         |
| `status`          | text        | NOT NULL; `'pending'`, `'accepted'`, `'rejected'`, `'canceled'`. DEFAULT `'pending'` |
| `inviterId`       | text        | FK to `user.id`, NOT NULL                                                            |
| `expiresAt`       | timestamptz | NOT NULL                                                                             |
| `createdAt`       | timestamptz | NOT NULL                                                                             |

---

## Per-School Schema

These tables are created in each `school_<id>` schema. All tables are identical across schools. References to `public.user.id` are stored as plain text IDs (logical references, not cross-schema foreign keys) and validated at the application layer.

### `course`

A school runs one or more courses (Vedam, Smartam, ...). A course owns its tracks, and through them its chapters, batches, exams and evaluations. Courses are seeded, not managed from the app. SLMTS has a single course today, `vedam`.

| Column | Type | Constraints                                                                          |
| ------ | ---- | ------------------------------------------------------------------------------------ |
| `id`   | uuid | PK                                                                                   |
| `slug` | text | NOT NULL, UNIQUE, URL-safe and not a reserved word — the course's path segment and `x-course-slug` (`vedam`) |
| `name` | text | NOT NULL                                                                             |

### `track`

An ordered curriculum belonging to one course. Tracks are authored by admins and assigned to batches.

| Column     | Type | Constraints                                       |
| ---------- | ---- | ------------------------------------------------- |
| `id`       | uuid | PK                                                |
| `courseId` | uuid | NOT NULL, FK to `course.id`                       |
| `name`     | text | NOT NULL                                          |
| `order`    | int  | NOT NULL, UNIQUE per course (`courseId`, `order`) |

### `chapter`

A single learnable unit within a track. Chapters hold metadata plus the current text script and R2 object key. API responses expose the resolved URL as `textUrl`.

| Column          | Type | Constraints                                         |
| --------------- | ---- | --------------------------------------------------- |
| `id`            | uuid | PK                                                  |
| `trackId`       | uuid | FK to `track.id`                                    |
| `code`          | text | UNIQUE                                              |
| `title`         | text | NOT NULL                                            |
| `status`        | enum | `'draft'`, `'published'`                            |
| `order`         | int  | NOT NULL                                            |
| `script`        | enum | `'te'`, `'sa'`, `'en'`; nullable                    |
| `textObjectKey` | text | nullable; R2 object key for the current text object |

### `segment`

A selected text range within the chapter's current text. Stored as byte offsets into the text. Ordered by `start` offset.

| Column       | Type | Constraints        |
| ------------ | ---- | ------------------ |
| `id`         | uuid | PK                 |
| `chapterId`  | uuid | FK to `chapter.id` |
| `start`      | int  | NOT NULL           |
| `end`        | int  | NOT NULL           |

### `audioAsset`

An audio file associated with a chapter (e.g., slow recitation, normal pace). Stored in R2.

| Column       | Type  | Constraints             |
| ------------ | ----- | ----------------------- |
| `id`         | uuid  | PK                      |
| `chapterId`  | uuid  | FK to `chapter.id`      |
| `label`      | text  |                         |
| `objectKey`  | text  | NOT NULL; R2 object key |
| `duration`   | float | NOT NULL; seconds       |

### `stagedUpload`

A pending direct-to-R2 upload created before the client receives a presigned URL. The presigned URL points at the final durable object key. Completion verifies the object exists, marks the upload completed, and then attaches the object to the domain record.

| Column            | Type      | Constraints                                             |
| ----------------- | --------- | ------------------------------------------------------- |
| `id`              | uuid      | PK                                                      |
| `schoolId`        | text      | Organization id used in R2 keys                         |
| `chapterId`       | uuid      | FK to `chapter.id`                                      |
| `purpose`         | enum      | `'chapterText'`, `'audio'`                              |
| `status`          | enum      | `'pending'`, `'completed'`, `'expired'`; default pending |
| `objectKey`       | text      | NOT NULL; durable R2 object key                         |
| `contentType`     | text      | NOT NULL                                                |
| `createdByUserId` | text      | NOT NULL                                                |
| `expiresAt`       | timestamp | NOT NULL                                                |
| `completedAt`     | timestamp | nullable                                                |
| `createdAt`       | timestamp | server timestamp                                        |

### `audioMapping`

Links a segment to a time range within an audio asset.

| Column           | Type  | Constraints                        |
| ---------------- | ----- | ---------------------------------- |
| `segmentId`      | uuid  | FK to `segment.id`                 |
| `audioAssetId`   | uuid  | FK to `audioAsset.id`              |
| `audioStart`     | float | NOT NULL; seconds                  |
| `audioEnd`       | float | NOT NULL; seconds                  |
|                  |       | PK(`segmentId`, `audioAssetId`)    |

### `batch`

Domain-specific data for a batch (cohort). Batch membership and batch-level roles are stored in the per-school `enrollment` table.

| Column         | Type        | Constraints                             |
| -------------- | ----------- | --------------------------------------- |
| `id`           | uuid        | PK                                      |
| `code`         | text        | UNIQUE                                  |
| `trackId`      | uuid        | FK to `track.id`                        |
| `courseId`     | uuid        | NOT NULL — always the track's course    |
| `startDate`    | date        |                                         |
| `status`       | enum        | `'active'`, `'completed'`, `'upcoming'` |
| `scheduledAt`  | timestamptz |                                         |
| `meetingUrl`   | text        |                                         |

### `enrollment`

A profile's place in a batch, with a role (instructor, ta, student) and a status. One row per profile per batch.

| Column      | Type      | Constraints                                                         |
| ----------- | --------- | ------------------------------------------------------------------- |
| `profileId` | uuid      | FK to `profile.id`                                                  |
| `batchId`   | uuid      | FK to `batch.id`                                                    |
| `courseId`  | uuid      | NOT NULL — always the batch's course                                |
| `role`      | enum      | `'instructor'`, `'ta'`, `'student'`                                 |
| `status`    | enum      | `'active'`, `'break'`, `'dropped'`, `'inactive'`                    |
| `joinedAt`  | timestamp |                                                                     |
| `leftDate`  | timestamp |                                                                     |
|             |           | PK(`profileId`, `batchId`)                                          |

**A student holds at most one live batch per course.** A partial unique index on (`profileId`, `courseId`) where `role = 'student'` and `status = 'active'` enforces it in the database, so two racing requests can't both win. Only an `active` student seat counts: `break`, `dropped` and `inactive` mean "not currently in any batch". Instructors and TAs are exempt and can teach several batches at once.

- Marking a batch `completed` moves its active student enrollments to `inactive`, which frees the seat; re-opening the batch does not bring them back.
- Putting a student back from a break is the same act as seating them, and takes the same 409 if they have since joined another batch in that course.
- A move between batches releases the old seat before taking the new one, in one transaction.

`batch.courseId` and `enrollment.courseId` are copies of what `track` and `batch` already imply, kept so the index can see the course on the row itself. Composite foreign keys (`batch(trackId, courseId)` → `track`, `enrollment(batchId, courseId)` → `batch`) make it impossible for a copy to disagree with its parent.

### `evaluation`

An instructor's assessment of a student's proficiency on a chapter. Evaluations are append-only; the most recent evaluation per (student, chapter) is the current proficiency.

| Column         | Type        | Constraints                                                                                |
| -------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `id`           | uuid        | PK                                                                                         |
| `studentId`    | text        | logical ref to `public.user.id`                                                            |
| `chapterId`    | uuid        | FK to `chapter.id`                                                                         |
| `level`        | enum        | `'notStarted'`, `'practicing'`, `'level0'`, `'level1'`, `'level2'`, `'level3'`, `'level4'`, `'absent'` |
| `notes`        | text        |                                                                                            |
| `evaluatorId`  | text        | logical ref to `public.user.id`                                                            |
| `evaluatedAt`  | timestamptz |                                                                                            |

### `exam`

A certification exam sitting: one student sitting one **track**, in the batch they are enrolled in for it. The sitting certifies the whole syllabus, not a single chapter.

| Column        | Type      | Constraints                                                 |
| ------------- | --------- | ----------------------------------------------------------- |
| `id`          | uuid      | PK                                                          |
| `trackId`     | uuid      | NOT NULL, FK to `track.id`                                  |
| `studentId`   | uuid      | NOT NULL, FK to `profile.id`                                |
| `batchId`     | uuid      | NOT NULL, FK to `batch.id` — resolved once at creation      |
| `scheduledAt` | timestamp | NOT NULL                                                    |
| `status`      | enum      | `'scheduled'`, `'inProgress'`, `'completed'`, `'cancelled'` |

### `examResult`

The marks for one completed exam — exactly one row per `completed` exam and none otherwise, so every column is mandatory (a scheduled exam simply has no row). A student's certification on a track is their latest `examResult` there; this table replaced the old `trackCertification`.

| Column                 | Type      | Constraints                                                |
| ---------------------- | --------- | ---------------------------------------------------------- |
| `examId`               | uuid      | PK, FK to `exam.id` (cascade)                              |
| `aksharaShuddhi`       | integer   | NOT NULL, 0–50                                             |
| `swaraShuddhi`         | integer   | NOT NULL, 0–30                                             |
| `niyantranaAnargalata` | integer   | NOT NULL, 0–20                                             |
| `shraavyata`           | integer   | NOT NULL, 0–5                                              |
| `pratishakyaGrammar`   | integer   | NOT NULL, 0–5                                              |
| `childrenBonus`        | integer   | NOT NULL, one of 0, 5, 10 — derived, never entered         |
| `total`                | integer   | NOT NULL, must equal the sum of the six marks above        |
| `outcome`              | enum      | NOT NULL — see below                                       |
| `notes`                | text      | nullable free text                                         |
| `evaluatorId`          | uuid      | NOT NULL, FK to `profile.id`                               |
| `evaluatedAt`          | timestamp | NOT NULL, default now                                      |

The children's bonus comes from the student's `yearOfBirth` and the year of the sitting: **+10** at age 11 or under, **+5** at 12–15, none from 16. The maximum total is 120. `total` and `outcome` are snapshots taken when the result is recorded, so changing the thresholds later never rewrites a past result.

| Total     | `outcome`       | Grants                    |
| --------- | --------------- | ------------------------- |
| ≥ 105     | `athiUttamam`   | L4 (with the distinction) |
| 95 – 104  | `prathamaSreni` | L4                        |
| 85 – 94   | `dwitiyaSreni`  | L3                        |
| 75 – 84   | `level2`        | L2                        |
| 65 – 74   | `level1`        | L1                        |
| < 65      | `reappear`      | nothing                   |

Recording a result that grants a level also writes that level as a new `evaluation` on every published, non-archived chapter of the track, replacing whatever grade was there (it can lower one). A `reappear` writes none. L3 and L4 count as certified.

---

## R2 Object Layout

All binary content (chapter text, audio files) is stored in Cloudflare R2. Objects are keyed by organization (school) to maintain the same isolation boundary as the database.

```
schools/
  {organizationId}/
    chapters/
      {chapterId}/
        text/
          {random_uuid}.txt
        audio/
          {random_uuid}.{ext}
```
