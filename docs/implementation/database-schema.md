# Narada LMS - Database Schema

This document provides a baseline overview of the Narada LMS database schema as of Stage 0 completion.

## Tables

### 1. `users`

- **Purpose**: Core user identity and authentication.
- **Key Fields**: `id` (UUID), `email`, `passwordHash`, `roles` (array), `status`.
- **Notes**: Supports local and social (Google) providers.

### 2. `tracks`

- **Purpose**: High-level learning paths (Vedic Tracks).
- **Key Fields**: `id` (Serial), `title`, `order`, `createdBy`.
- **Relationships**: Parent of `chapters`.

### 3. `chapters`

- **Purpose**: Individual units of study within a track.
- **Key Fields**: `id` (Serial), `trackId`, `title`, `order`, `status` (draft/published), `content` (JSONB).
- **Relationships**: Belongs to `tracks`, parent of `audio_files` and `text_segments`.

### 4. `audio_files`

- **Purpose**: Media assets associated with chapters.
- **Key Fields**: `chapterId`, `filename`, `duration`.
- **Relationships**: Belongs to `chapters`, parent of `media_segments`.

### 5. `text_segments`

- **Purpose**: Specific scriptural spans within a chapter's text.
- **Key Fields**: `chapterId`, `script` (te/hi/en), `startPosition`, `endPosition`.
- **Relationships**: Belongs to `chapters`, mapped to `media_segments`.

### 6. `media_segments`

- **Purpose**: Audio time spans within an `audio_file`.
- **Key Fields**: `audioFileId`, `startTimestamp`, `endTimestamp`.
- **Relationships**: Belongs to `audio_files`, mapped to `text_segments`.

### 7. `segment_mappings`

- **Purpose**: Join table bridging `text_segments` and `media_segments`.
- **Key Fields**: `mediaSegmentId`, `textSegmentId`.

### 8. `batches`

- **Purpose**: Cohorts of students under instructors.
- **Key Fields**: `batchCode`, `batchName`, `trackId`, `primaryInstructorId`.
- **Relationships**: Parent of `enrollments`, linked to `tracks`.

### 9. `enrollments`

- **Purpose**: Student membership in batches.
- **Key Fields**: `batchId`, `studentId`, `status`.
- **Constraints**: Enforces one active enrollment per student via partial unique index.

### 10. `student_progress`

- **Purpose**: Proficiency tracking for individual students.
- **Key Fields**: `studentId`, `chapterId`, `batchId`, `proficiencyLevel` (0-4).

### 11. `audit_logs`

- **Purpose**: System-wide audit trail for sensitive actions.

### 12. `system_settings`

- **Purpose**: Global key-value configuration.

## Future Multi-Tenancy (Stage 3)

The following tables are identified as requiring an `org_id` foreign key when transitioning to a multi-tenant architecture:

- `tracks`
- `chapters`
- `batches`
- `users` (or a bridge table)
- `audit_logs`
