# Narada LMS - Technical Specifications

**Version**: 2.0 (Post–Stage 1)
**Date**: February 19, 2026
**Status**: Active Reference

---

## 1. System Configuration

### 1.1 Environment Variables

**API (Express — root `server/`)**

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` | Yes |
| `HOST` | Bind address | `0.0.0.0` | No |
| `PORT` | API listener port | `5000` | No |
| `DATABASE_URL` | PostgreSQL connection string | — | Yes |
| `JWT_SECRET` | Secret for signing JWT | `change-me-in-production` | Yes (min 32 chars) |
| `JWT_EXPIRY` | Token lifespan | `7d` | No |
| `FRONTEND_URL` | Primary frontend URL (e.g. student portal) | `http://localhost:3000` | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,http://localhost:3001` | Yes |
| `UPLOAD_DIR` | Directory for file uploads | `uploads` | No |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `104857600` (100MB) | No |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | — | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | — | No |
| `SUPER_ADMIN_EMAIL` | Admin email (optional) | — | No |

**Student Portal & Admin Portal (Next.js)**

| Variable | Description | Required |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Full API base URL (e.g. `http://localhost:5000/api`) | Yes |
| `NEXT_PUBLIC_UPLOADS_URL` | URL for uploads (if different from API host) | No (Admin) |
| `API_SERVER_URL` | Backend URL for rewrites/proxy (e.g. `http://localhost:5000`) | No (Admin) |

See `docs/essentials/environment-variables.md` for full list and per-app notes.

### 1.2 Configuration Strategy

- **API**: `server/config.ts` — single config object: type coercion, defaults, production checks (e.g. strong `JWT_SECRET`). CORS uses `config.corsOrigins`.
- **Portals**: Next.js apps use `process.env.NEXT_PUBLIC_*` for client-visible config. `@narada/api-client` uses `NEXT_PUBLIC_API_URL` for all API calls and CSRF/cookie handling (including SSR via `next/headers`).

---

## 2. Database Schema

**Location**: `packages/types/src/schema.ts`. Drizzle config: `drizzle.config.ts` at repo root points `schema` to that file. The API imports schema via `@narada/types` in `server/db.ts`.

### 2.1 Core Entities

| Table | Purpose | Key Fields | Relationships |
| :--- | :--- | :--- | :--- |
| `users` | Identity & Auth | `id`, `email`, `passwordHash`, `roles`, `status` | - |
| `tracks` | Learning Paths | `id`, `title`, `order`, `createdBy` | Parent of `chapters` |
| `chapters` | Study Units | `id`, `trackId`, `title`, `status`, `content` | Belongs to `tracks` |
| `audio_files` | Media Assets | `chapterId`, `filename`, `duration` | Belongs to `chapters` |
| `text_segments` | Scriptural Spans | `chapterId`, `script`, `startPosition` | Mapped to `media_segments` |
| `media_segments` | Audio Spans | `audioFileId`, `start`, `end` | Mapped to `text_segments` |
| `batches` | Student Cohorts | `batchCode`, `trackId`, `instructorId` | Parent of `enrollments` |
| `enrollments` | Batch Membership | `batchId`, `studentId`, `status` | Link `users` to `batches` |
| `student_progress` | Proficiency | `studentId`, `chapterId`, `proficiencyLevel` | Tracks learning state |
| `audit_logs` | Security Trail | `userId`, `action`, `resource`, `timestamp` | System-wide logging |

### 2.2 Multi-Tenancy (Stage 3)

The following tables are expected to gain an `org_id` (or equivalent) for multi-tenancy:

- `tracks`, `chapters`
- `batches`, `enrollments`
- `audit_logs`
- `users` (e.g. via `user_organizations` bridge)

---

## 3. Module Contracts

Server domain modules live under `server/modules/`. Routes in `server/routes/` delegate to these modules; routes do not access the DB directly.

| Module | Owns (Write) | Route Mount | Events Emitted |
| :--- | :--- | :--- | :--- |
| **identity-access** | users, sessions | `/api/auth` | `UserCreated`, `UserRoleChanged` |
| **content-publishing** | tracks, chapters, text_segments | `/api/content` | `ChapterPublished`, `ContentUpdated` |
| **media-pipeline** | audio_files, media_segments | `/api` (audio-files, media-segments) | `AudioUploaded`, `MappingCreated` |
| **batch-cohort** | batches, enrollments, co-instructors | `/api/batches`, `/api/enrollments`, `/api/co-instructors` | `BatchCreated`, `StudentEnrolled` |
| **learning-delivery** | student_progress | `/api/learning`, `/api/students` | `ProgressUpdated`, `ChapterCompleted` |
| **system-admin** | audit_logs, systemSettings | `/api/admin` | `AdminActionLogged`, `SettingChanged` |

**Invariants**: Only the owning module writes to its tables; cross-module behavior uses `EventBus`; routes call module services only.

---

## 4. API Specification

Base URL: `/api`. All state-changing requests require a valid JWT (cookie or Bearer) and `X-CSRF-Token` header (client obtains token from `GET /api/csrf-token`). Public endpoints: login, register, Google OAuth.

### 4.1 CSRF & Static

- `GET /api/csrf-token` — Returns `{ csrfToken }`. Call before POST/PUT/PATCH/DELETE.
- `GET /uploads/*` — Static uploads (e.g. audio).

### 4.2 Identity (`/api/auth`)

- `POST /api/auth/register`, `POST /api/auth/login` (Public)
- `GET /api/auth/me` (JWT)
- `GET /api/auth/google`, `GET /api/auth/google/callback` (OAuth)
- `POST /api/auth/logout`
- `GET /api/auth/admin/users`, `POST /api/auth/admin/users/:userId/approve`, `.../roles`, `.../disable`, `.../enable`, `.../reject`, `GET /api/auth/admin/users/:userId`

### 4.3 Admin (`/api/admin`)

- `GET /api/admin/audit-logs`, `GET /api/admin/settings`, `GET /api/admin/settings/:key`, `PUT /api/admin/settings/:key`, `GET /api/admin/stats`

### 4.4 Content (`/api/content`)

- **Tracks**: `GET /api/content/tracks`, `GET /api/content/tracks/:id`, `POST/PUT/DELETE /api/content/tracks`, `POST /api/content/tracks/:id/move`
- **Chapters**: `GET /api/content/chapters/:chapterId/details`, `PATCH /api/content/chapters/:chapterId`, `PATCH /api/content/chapters/:chapterId/status`, `POST /api/content/chapters/:id/move`, `DELETE /api/content/chapters/:id`
- **Segments**: `GET /api/content/segments/:chapterId/:script`, `GET /api/content/segments/:chapterId`, `POST /api/content/segments`, `PATCH /api/content/segments/:segmentId`, `DELETE /api/content/segments/:segmentId`
- **Audio**: Chapter audio upload/list/delete are on content routes where applicable.

### 4.5 Media (mounted at `/api`)

- `PATCH /api/audio-files/:audioFileId`
- `GET /api/media-segments/:audioFileId`, `POST/PATCH/DELETE /api/media-segments/*` (and related)

### 4.6 Batches (mounted at `/api`)

- `GET /api/batches`, `GET /api/batches/my-batches`, `GET /api/batches/my-students`, `GET /api/batches/:id`
- `POST /api/batches`, `PATCH/DELETE /api/batches/:id`
- `POST /api/batches/:id/enrollments`, `PATCH /api/enrollments/:id/drop`, `GET /api/batches/:id/enrollments`, `GET /api/batches/:id/eligible-students`
- `POST /api/batches/:id/co-instructors`, `DELETE /api/co-instructors/:assignmentId`, `GET /api/batches/:id/co-instructors`
- `GET /api/batches/:id/progress`, `POST /api/batches/:batchId/students/:studentId/evaluate`

### 4.7 Students (mounted at `/api`)

- `GET /api/students/:studentId/progress`, `GET /api/students/:studentId/track-progress`

### 4.8 Learning (`/api/learning`)

- `GET /api/learning/my-progress`, `GET /api/learning/my-details`, `GET /api/learning/progress`, `GET /api/learning/chapters`, `POST /api/learning/chapters/:chapterId/access`
- `GET /api/learning/tracks`, `GET /api/learning/tracks/:trackId/chapters`, `GET /api/learning/chapter/:chapterId`

---

## 5. File Uploads

### 5.1 Current Implementation (Local)

- **Middleware**: `multer` for `multipart/form-data` (audio only in media routes).
- **Storage**: Local `./uploads`; served at `/uploads`.
- **Validation**: `music-metadata` for audio integrity and duration where used.

### 5.2 Future (Stage 2/3)

- **Stage 1**: Docker volumes can share `./uploads` across API and other services.
- **Stage 2/3**: Introduce `StorageProvider` interface, S3 driver, and signed URLs for client-to-cloud uploads where appropriate.
