# Narada LMS - Technical Specifications

**Version**: 1.0 (Consolidated)
**Date**: February 12, 2026
**Status**: Active Reference

---

## 1. System Configuration

### 1.1 Environment Variables (.env)

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | Yes |
| `PORT` | Server listener port | `5000` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret for signing tokens | `change-me...` | Yes (Min 32 chars) |
| `JWT_EXPIRY` | Token lifespan | `7d` | No |
| `FRONTEND_URL` | Base URL of the client | `http://localhost:5000` | Yes |
| `UPLOAD_DIR` | Directory for file uploads | `uploads` | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | `104857600` (100MB) | No |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | - | No (Optional) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | - | No (Optional) |

### 1.2 Configuration Strategy

- **Server (`server/config.ts`)**: Centralized config object that performs type conversion, defaults, and production security checks (e.g., weak `JWT_SECRET`).
- **Client (`client/src/lib/config.ts`)**: Uses `import.meta.env` (Vite) or `process.env` (Next.js) for build-time variables.

---

## 2. Database Schema

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

The following tables require an `org_id` foreign key for multi-tenancy:

- `tracks`, `chapters`
- `batches`, `enrollments`
- `audit_logs`
- `users` (via `user_organizations` bridge table)

---

## 3. Module Contracts

The modular monolith architecture enforces clear boundaries between domains.

| Module | Owns (Write) | Public API Surface | Events Emitted |
| :--- | :--- | :--- | :--- |
| **Identity** | `users`, `sessions` | Auth middleware, `getUser`, `hasRole` | `UserCreated`, `UserRoleChanged` |
| **Content** | `tracks`, `chapters`, `text_segments` | `getTracks`, `getChapter`, `publishChapter` | `ChapterPublished`, `ContentUpdated` |
| **Media** | `audio`, `segments` | `getAudioFiles`, `getSegments` | `AudioUploaded`, `MappingCreated` |
| **Batch** | `batches`, `enrollments` | `getBatch`, `enrollStudent`, `isEnrolled` | `BatchCreated`, `StudentEnrolled` |
| **Learning** | `student_progress` | `elementProgress`, `updateProgress` | `ProgressUpdated`, `ChapterCompleted` |
| **Admin** | `settings`, `audit_logs` | `getSettings`, `searchUsers`, `getLogs` | `AdminActionLogged`, `SettingChanged` |

**Key Invariants**:

- Only owning modules write to their tables.
- Cross-module reactions happen via `EventBus`.
- Routes never touch DB directly; they call Module Services.

---

## 4. API Specification

All endpoints are prefixed with `/api`. Auth requires JWT Bearer token unless marked Public.

### 4.1 Identity (`/api/auth`)

- `POST /register`, `POST /login` (Public)
- `GET /me` (JWT Protected)
- `GET /google`, `/google/callback` (OAuth)

### 4.2 Content Studio (`/api/content`)

- `GET /tracks`, `/tracks/:id` (Read)
- `POST/PUT/DELETE /tracks` (Content Mgr)
- `GET /chapters/:id/details` (Read)
- `POST/PUT/PATCH /chapters` (Content Mgr)
- `POST /chapters/:id/audio` (Upload)

### 4.3 Management

- **Batches** (`/api/batches`): CRUD for instructor cohorts.
- **Students** (`/api/students`): Admin view of student lists and details.
- **Admin** (`/api/admin`): Audit logs and system settings.

### 4.4 Learning (`/api/learning`)

- `GET /my-progress`: Current user's progress.
- `POST /progress`: Update proficiency level.

---

## 5. Feature Specs: File Uploads

### 5.1 Current Implementation (Local)

- **Middleware**: `multer` handling `multipart/form-data`.
- **Storage**: Local `./uploads` directory.
- **Validation**: `music-metadata` checks audio integrity and duration.

### 5.2 Multi-Container Strategy

- **Stage 1**: Use Docker Volumes to share `./uploads` between API and other containers.
- **Stage 2/3 (Cloud)**:
  - Introduce `StorageProvider` interface.
  - Implement S3 driver.
  - Switch to Signed URLs for direct client-to-cloud uploads.
