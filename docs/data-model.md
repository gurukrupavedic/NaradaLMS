# Data Model

This document captures the multi-tenancy strategy, role system, and database schema for the Narada LMS backend.

## Multi-Tenancy

Narada supports multiple schools under a single deployment. Each school is fully isolated from every other school.

### Strategy: Schema-per-School

Each school gets its own Postgres schema (`school_<id>`) containing all domain tables. A single `shared` schema holds platform-wide data: user accounts, school registry, and BetterAuth-managed tables (including the organization plugin tables).

**Why schema-per-school over row-level isolation:**

- Isolation is enforced by Postgres, not application code. No risk of a missing `WHERE school_id =` leaking data across schools.
- A school can be cleanly deleted by dropping its schema.
- Per-school backups and restores are straightforward.
- Schema-level DDL locks mean migrations on one school don't block another.

**Schema provisioning:** Creating a new school means creating a BetterAuth organization (which populates the `organization` table), creating a new Postgres schema, and running the standard table creation SQL against it.

**Migrations:** Migrations are written once and applied to all school schemas in parallel. Each schema gets its own connection from the pool, and Postgres schema-level locks ensure no cross-school contention. Concurrency is capped to the connection pool size. Each school schema tracks its own migration state.

## BetterAuth Organization Plugin

The organization plugin provides the primitives for multi-tenancy, membership, invitations, and teams. These map to Narada concepts as follows:

| BetterAuth Primitive | Narada Concept | Notes |
|----------------------|----------------|-------|
| **Organization** | **School** | A school is an organization. `name`, `slug`, `logo`, and `metadata` are managed by BetterAuth. Replaces the custom `shared.school` table. |
| **Member** | **School membership** | A user's membership in a school with a school-level role. Replaces the custom `profile` table for membership and role tracking. |
| **Member role** | **School-level role** | BetterAuth provides `owner`, `admin`, and `member` roles. These map to our school-level roles (see Roles section). |
| **Invitation** | **School invitation** | Invite-only onboarding. BetterAuth manages the full invitation lifecycle: pending, accepted, rejected, canceled. Invitations carry a role and optional team assignment. |
| **Team** | **Batch** | A team within an organization maps to a batch (cohort) within a school. BetterAuth manages team CRUD and the `activeTeamId` session field. |
| **Team Member** | **Batch enrollment** | A user's membership in a batch. BetterAuth's `teamMember` has no role field, so batch-level roles (instructor, ta, student) are tracked in a custom `enrollment` table in the per-school schema. |
| **Session fields** | **Active context** | BetterAuth adds `activeOrganizationId` and `activeTeamId` to the session, providing server-side context for which school and batch the user is currently operating in. |

### What BetterAuth handles

- Organization (school) CRUD, including slug uniqueness
- User membership in organizations, with role assignment (owner/admin/member)
- Invitation lifecycle (create, accept, reject, cancel) with expiry
- Team (batch) CRUD within an organization
- Team membership management
- Active organization/team tracking on the session
- Permission checking via the `hasPermission` endpoint

### What we handle ourselves

- **Per-school Postgres schema provisioning** — triggered when an organization is created
- **Batch-level roles** — BetterAuth's `teamMember` has no `role` field; batch roles (instructor, ta, student) are stored in the per-school `enrollment` table
- **Profile data** — contact details (phone, city) beyond what BetterAuth's user model stores are kept in a per-school `profile` table
- **All domain tables** — tracks, chapters, evaluations, exams, etc. remain in per-school schemas

## Roles

There are five roles in the system, split across two levels:

**Platform-level** (on `shared.user`):

- **Super Admin** — can perform any operation across any school. Represented by an `is_super_admin` flag on the user, not a school-scoped role.

**School-level** (on BetterAuth `member.role`):

BetterAuth's organization plugin provides three built-in roles: `owner`, `admin`, and `member`. These map to Narada's school-level roles:

- **Owner** — the user who created the school. Has full admin capabilities plus the ability to delete the school and transfer ownership. There is exactly one owner per school.
- **Admin** — can perform any operation within their school. This includes authoring and managing all content (tracks, chapters, revisions), managing batches, and managing users. Maps to BetterAuth's `admin` role.
- **Member** — a regular school member. Their capabilities are further scoped by batch enrollment. Maps to BetterAuth's `member` role.

**Batch-level** (on per-school `enrollment.role`):

- **Instructor** — can evaluate students, schedule exams, and manage enrollment in their batches.
- **TA** — same capabilities as instructor within their assigned batches.
- **Student** — can view content, see their own proficiency, and participate in exams.

A single person can belong to multiple schools with different roles (e.g., admin at one school, student at another). Within a school, they have one member record with one role. Within a batch, they have one enrollment with one role.

### Authorization Summary

| Action | Super Admin | Owner | Admin | Instructor/TA | Student |
|--------|:-----------:|:-----:|:-----:|:--------------:|:-------:|
| Manage schools | X | | | | |
| Delete school / transfer ownership | X | X | | | |
| Author content (tracks, chapters) | X | X | X | | |
| Create/manage batches | X | X | X | | |
| Invite users to school | X | X | X | | |
| Evaluate students | X | X | X | X (own batches) | |
| Schedule exams | X | X | X | X (own batches) | |
| Add/remove batch members | X | X | X | X (own batches) | |
| View content | X | X | X | X | X (published only) |
| View own proficiency | X | X | X | X | X |

---

## Shared Schema

These tables live in the `shared` schema and are shared across all schools. The BetterAuth-managed tables are created and maintained by BetterAuth's organization plugin.

### BetterAuth Core Tables

BetterAuth manages these tables for authentication state. They are not modified directly by application code.

#### `shared.user`

User accounts. Extended with a super-admin flag.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `name` | text | NOT NULL |
| `email` | text | UNIQUE, NOT NULL |
| `email_verified` | boolean | DEFAULT false |
| `image` | text | |
| `role` | text | DEFAULT 'user' |
| `is_super_admin` | boolean | DEFAULT false |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

#### `shared.session`

Session state. BetterAuth manages creation and expiry. The organization plugin adds `active_organization_id` and `active_team_id` to track the user's current school and batch context.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `user_id` | text | FK to `user.id` |
| `token` | text | UNIQUE, NOT NULL |
| `expires_at` | timestamptz | NOT NULL |
| `ip_address` | text | |
| `user_agent` | text | |
| `active_organization_id` | text | Added by org plugin |
| `active_team_id` | text | Added by org plugin (teams enabled) |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

#### `shared.account`

OAuth providers and credential accounts.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `user_id` | text | FK to `user.id` |
| `account_id` | text | NOT NULL |
| `provider_id` | text | NOT NULL |
| `access_token` | text | |
| `refresh_token` | text | |
| `access_token_expires_at` | timestamptz | |
| `refresh_token_expires_at` | timestamptz | |
| `scope` | text | |
| `id_token` | text | |
| `password` | text | |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

#### `shared.verification`

Email verification and password reset tokens.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `identifier` | text | NOT NULL |
| `value` | text | NOT NULL |
| `expires_at` | timestamptz | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

### BetterAuth Organization Plugin Tables

These tables are created by BetterAuth's organization plugin. They live in the shared schema alongside the core auth tables.

#### `shared.organization`

The registry of all schools. Each school is a BetterAuth organization. Replaces the previous custom `shared.school` table.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `name` | text | NOT NULL |
| `slug` | text | UNIQUE, NOT NULL |
| `logo` | text | |
| `metadata` | text | JSON string |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | |

The `metadata` field stores school-specific configuration as a JSON string (e.g., feature flags, branding settings).

#### `shared.member`

A user's membership in a school. One member record per user per school. The `role` field carries the school-level role. Replaces the previous custom `profile` table for membership tracking.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `organization_id` | text | FK to `organization.id`, NOT NULL |
| `user_id` | text | FK to `user.id`, NOT NULL |
| `role` | text | NOT NULL; `'owner'`, `'admin'`, or `'member'`. DEFAULT `'member'` |
| `created_at` | timestamptz | NOT NULL |

#### `shared.invitation`

Pending invitations to join a school. BetterAuth manages the full lifecycle. Invitations can optionally target a specific team (batch).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `organization_id` | text | FK to `organization.id`, NOT NULL |
| `email` | text | NOT NULL |
| `role` | text | NOT NULL; role to assign on acceptance |
| `status` | text | NOT NULL; `'pending'`, `'accepted'`, `'rejected'`, `'canceled'`. DEFAULT `'pending'` |
| `team_id` | text | Optional; FK to `team.id`. Auto-adds to this batch on acceptance |
| `inviter_id` | text | FK to `user.id`, NOT NULL |
| `expires_at` | timestamptz | NOT NULL |
| `created_at` | timestamptz | NOT NULL |

#### `shared.team`

A batch (cohort) within a school. Each team belongs to one organization. BetterAuth manages team CRUD.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `name` | text | NOT NULL |
| `organization_id` | text | FK to `organization.id`, NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | |

#### `shared.team_member`

A user's membership in a batch. BetterAuth tracks team membership but does not assign batch-level roles — those are in the per-school `enrollment` table.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | text | PK |
| `team_id` | text | FK to `team.id`, NOT NULL |
| `user_id` | text | FK to `user.id`, NOT NULL |
| `created_at` | timestamptz | NOT NULL |

---

## Per-School Schema

These tables are created in each `school_<id>` schema. All tables are identical across schools. References to `shared.user.id` are stored as plain text IDs (logical references, not cross-schema foreign keys) and validated at the application layer.

### `profile`

Extended user information within this school. Contact details and other school-specific profile data that BetterAuth's user model does not cover. One profile per user per school.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `user_id` | text | UNIQUE; logical ref to `shared.user.id` |
| `phone` | text | |
| `city` | text | |

Note: The user's `name` comes from `shared.user.name`. The user's school-level role comes from `shared.member.role`. This table only holds supplementary profile data.

### `track`

An ordered curriculum. Tracks are authored by admins and assigned to batches.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `name` | text | NOT NULL |
| `order` | int | NOT NULL |

### `chapter`

A single learnable unit within a track. Chapters hold metadata; the actual text content lives in R2 via `chapter_revision`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `track_id` | uuid | FK to `track.id` |
| `code` | text | UNIQUE |
| `title` | text | NOT NULL |
| `status` | enum | `'draft'`, `'published'` |
| `order` | int | NOT NULL |

### `chapter_revision`

A versioned snapshot of a chapter's text content. Segments are authored against a specific revision. When text is re-uploaded, a new revision is created; old segments remain valid against their revision.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `chapter_id` | uuid | FK to `chapter.id` |
| `script` | enum | `'te'`, `'sa'`, `'en'` |
| `text_url` | text | NOT NULL; R2 object key |
| `revision` | int | NOT NULL; monotonic per chapter |
| `created_at` | timestamptz | |
| | | UNIQUE(`chapter_id`, `revision`) |

### `segment`

A selected text range within a chapter revision. Stored as byte offsets into the revision's text. Ordered by `start` offset.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `revision_id` | uuid | FK to `chapter_revision.id` |
| `start` | int | NOT NULL |
| `end` | int | NOT NULL |

### `audio_asset`

An audio file associated with a chapter (e.g., slow recitation, normal pace). Stored in R2.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `chapter_id` | uuid | FK to `chapter.id` |
| `label` | text | |
| `url` | text | NOT NULL; R2 object key |
| `duration` | float | NOT NULL; seconds |

### `audio_mapping`

Links a segment to a time range within an audio asset.

| Column | Type | Constraints |
|--------|------|-------------|
| `segment_id` | uuid | FK to `segment.id` |
| `audio_asset_id` | uuid | FK to `audio_asset.id` |
| `audio_start` | float | NOT NULL; seconds |
| `audio_end` | float | NOT NULL; seconds |
| | | PK(`segment_id`, `audio_asset_id`) |

### `batch`

Domain-specific data for a batch (cohort). Each batch corresponds to a BetterAuth team in `shared.team`. The `team_id` links back to the shared team record. BetterAuth manages membership via `shared.team_member`; this table holds the LMS-specific fields that BetterAuth's team model does not cover.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `team_id` | text | UNIQUE; logical ref to `shared.team.id` |
| `code` | text | UNIQUE |
| `track_id` | uuid | FK to `track.id` |
| `start_date` | date | |
| `status` | enum | `'active'`, `'completed'`, `'upcoming'` |
| `scheduled_at` | timestamptz | |
| `meeting_url` | text | |

### `enrollment`

Batch-level role assignment. BetterAuth's `team_member` tracks that a user belongs to a batch, but does not carry a role. This table adds the batch-level role (instructor, ta, student) and status. One enrollment per user per batch, kept in sync with `shared.team_member`.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | text | logical ref to `shared.user.id` |
| `batch_id` | uuid | FK to `batch.id` |
| `role` | enum | `'instructor'`, `'ta'`, `'student'` |
| `status` | enum | `'active'`, `'inactive'`, `'completed'` |
| `joined_at` | timestamptz | |
| | | PK(`user_id`, `batch_id`) |

### `evaluation`

An instructor's assessment of a student's proficiency on a chapter. Evaluations are append-only; the most recent evaluation per (student, chapter) is the current proficiency.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `student_id` | text | logical ref to `shared.user.id` |
| `chapter_id` | uuid | FK to `chapter.id` |
| `level` | enum | `'notStarted'`, `'practicing'`, `'level1'`, `'level2'`, `'level3'`, `'level4'`, `'absent'` |
| `notes` | text | |
| `evaluator_id` | text | logical ref to `shared.user.id` |
| `evaluated_at` | timestamptz | |

### `exam`

A scheduled exam for a specific student in a batch.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `batch_id` | uuid | FK to `batch.id` |
| `student_id` | text | logical ref to `shared.user.id` |
| `scheduled_at` | timestamptz | NOT NULL |
| `status` | enum | `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'` |

### `exam_result`

Links an exam to the evaluation produced for a specific chapter.

| Column | Type | Constraints |
|--------|------|-------------|
| `exam_id` | uuid | FK to `exam.id` |
| `chapter_id` | uuid | FK to `chapter.id` |
| `evaluation_id` | uuid | FK to `evaluation.id` |
| | | PK(`exam_id`, `chapter_id`) |

---

## R2 Object Layout

All binary content (chapter text, audio files) is stored in Cloudflare R2. Objects are keyed by organization (school) to maintain the same isolation boundary as the database.

```
schools/
  {organization_id}/
    chapters/
      {chapter_id}/
        revisions/
          {revision}/
            text.txt
        audio/
          {audio_asset_id}.mp3
```
