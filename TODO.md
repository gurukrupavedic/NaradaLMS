# Narada LMS — Remaining Work

## 1. Infrastructure & Middleware

- [x] **School context middleware** — resolve `X-School-Id` header to an organization record; attach school to `req`; set Postgres `search_path` to `school_<id>` for per-school queries; return `404` if school not found
- [x] **Auth middleware** — validate BetterAuth session on every non-auth route; attach `session` to `req`; return `401` if no valid session
- [x] **Fix error response envelope** — `AppError` currently only sends `message`; the spec requires `{ ok: false, error: { code, message } }`; add `code` field to `AppError` and update the error handler in `server.ts`
- [x] **Input validation** — pick and wire up a validation library (Zod already used in `@narada/env`); validate request body/params in each route; throw `400 VALIDATION_ERROR` on failure
- [x] **Cursor-based pagination helper** — shared utility for encoding/decoding opaque cursors and building `nextCursor` on list responses

## 2. School Schema Provisioning

- [x] **Schema creation on org creation** — hook into BetterAuth's organization creation event (or wrap the POST /schools route) to: create a `school_<id>` Postgres schema, run per-school DDL (all tables in `packages/db/src/schema/school.ts`)
- [x] **Per-school DB connection** — utility that returns a Drizzle instance scoped to a given school schema (set `search_path`); used by all school-scoped route handlers
- [x] **R2 env vars** — add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_CUSTOM_DOMAIN` (optional, for public URLs) to `@narada/env`; these map directly to Pushduck's R2 provider config
- [x] **R2 delete helper** — thin wrapper around `@aws-sdk/client-s3` `DeleteObjectCommand` for the audio delete route (Pushduck does not handle deletions); reuse the same credentials from env
- [ ] **R2 CORS** — configure the R2 bucket CORS policy to allow `PUT`/`POST`/`GET`/`HEAD` from the app origin; required for direct client-to-R2 presigned uploads

## 3. API Routes

All routes below are missing — only `/health` exists. Group them by file in `apps/api/src/routes/`.

### Profile (`routes/profile.ts`)
- [x] `GET /profile` — return active batch enrollment + school role + isSuperAdmin for the current user
- [x] `PATCH /profile` — update `phone` / `city` on the active batch enrollment

### Schools (`routes/schools.ts`)
- [x] `GET /schools` — list all organizations; super-admin only
- [x] `POST /schools` — create BetterAuth organization + provision per-school Postgres schema; super-admin only
- [x] `PATCH /schools/:schoolId` — update org name/slug; super-admin only

### Tracks (`routes/tracks.ts`)
- [x] `GET /tracks` — list tracks with chapters; students see only published chapters
- [x] `GET /tracks/:trackId` — single track with chapters (same student filtering)
- [x] `POST /tracks` — create track; auto-assign order; admin access
- [x] `PATCH /tracks/:trackId` — update name or order; admin access

### Chapters (`routes/chapters.ts`)
- [x] `GET /chapters/:chapterId` — full chapter with current revision, segments, audio assets, audio mappings; students blocked from draft chapters
- [x] `POST /chapters` — create chapter in a track; starts as draft; auto-assign order; admin access
- [x] `PATCH /chapters/:chapterId` — update title, code, status, order, trackId; admin access

### Chapter Script (`routes/chapters.ts`)
- [x] `POST /chapters/:chapterId/script` — accept `multipart/form-data` (`script` enum + text file); upload file to a versioned R2 key under `schools/{orgId}/chapters/{chapterId}/text/`; update `chapter.script` and `chapter.textUrl`; delete all existing segments (cascades to audio mappings); admin access

### Segments (`routes/segments.ts`)
- [x] `GET /chapters/:chapterId/segments` — list segments ordered by start; all school members
- [x] `PUT /chapters/:chapterId/segments` — full replacement; validate no overlaps and within text bounds; cascade-delete old audio mappings via DB constraint; admin access

### Audio (`routes/audio.ts`)
- [x] `POST /chapters/:chapterId/audio/upload-url` — generate presigned R2 PUT URL for `schools/{orgId}/chapters/{chapterId}/audio/{uuid}.{ext}`; return `uploadUrl` + opaque `uploadId`; admin access
- [x] `POST /chapters/:chapterId/audio` — register uploaded audio asset (uploadId, label?, duration); verify object exists; insert `audioAsset` row; admin access
- [x] `DELETE /chapters/:chapterId/audio/:audioId` — delete `audioAsset` row (cascades to `audioMapping`); delete R2 object; admin access

### Audio Mappings (`routes/audioMappings.ts`)
- [x] `PUT /audio/:audioId/mappings` — full replacement of mappings for an audio asset; validate all segment IDs exist; validate no overlapping time ranges; admin access

### Batches (`routes/batches.ts`)
- [x] `GET /batches` — list batches; admins see all, users see enrolled batches only; supports `?status=` filter and cursor pagination
- [x] `GET /batches/:batchId` — batch detail with enrolled members; admin or enrolled member access
- [x] `POST /batches` — insert `batch` row into per-school schema; starts as upcoming; admin access
- [x] `PATCH /batches/:batchId` — update code, status, startDate, scheduledAt, meetingUrl; admin access

### Enrollment (`routes/enrollment.ts`)
- [x] `POST /batches/:batchId/members` — insert `enrollment` row; return `409` if already enrolled; admin or instructor/TA access
- [x] `DELETE /batches/:batchId/members/:userId` — delete `enrollment` row; admin or instructor/TA access

### Evaluations (`routes/evaluations.ts`)
- [x] `POST /evaluations` — create evaluation row; admin or instructor/TA scoped to student's batch; set `evaluatorId` and `evaluatedAt` server-side
- [x] `GET /evaluations` — paginated history; supports `?studentId=` and `?chapterId=`; admin sees all, instructor/TA sees their batches' students, student sees own only

### Exams (`routes/exams.ts`)
- [x] `GET /batches/:batchId/exams` — list exams; students see only their own; supports `?status=` filter and cursor pagination
- [x] `POST /batches/:batchId/exams` — schedule exam for a student with chapter list; admin or instructor/TA access
- [x] `PATCH /exams/:examId` — reschedule or update status; admin or instructor/TA access
- [x] `POST /exams/:examId/results` — record per-chapter results; create one evaluation per chapter; create `examResult` rows; admin or instructor/TA access

### Student Dashboard (`routes/student.ts`)
- [x] `GET /student/chapters/:chapterId` — chapter content with text URL, segments, audio, audio mappings, and `currentLevel`; published chapters only; student must be enrolled in a batch whose track contains this chapter

## 4. Wire Up All Routes

- [x] Register all new routers in `apps/api/src/routes/index.ts`

## 5. BetterAuth / Auth Integration

- [ ] **Email provider** — configure an email transport in `@narada/auth` for BetterAuth to send verification emails and school invitations (currently no email provider is configured)
- [ ] **Invitation flow** — expose BetterAuth's invitation endpoints or document that they are handled via `/auth/*`

## 6. Database Helpers (`packages/db/src/index.ts`)

- [ ] Add query helpers needed by route handlers (currently only `getEnrollment` exists); examples:
  - `getActiveBatchEnrollment(userId, schoolId)` — find active batch enrollment for profile
  - `getLatestEvaluation(studentId, chapterId)` — current proficiency for a student-chapter pair
  - `getBatchMembers(batchId)` — members with user names (join with BetterAuth user table)
  - `getExamChapters(examId)` — chapters linked to an exam via `examResult`

## 7. Drizzle Migrations

- [ ] **Run initial migration** — generate and apply the first migration for the per-school schema tables (the schema is defined but no migration file exists yet in `drizzle/`)
- [ ] **Migration runner for new schools** — script/utility that applies all school schema migrations when a new school is provisioned

---

## 8. Frontend — Project Setup (`apps/web` in `@../test`)

The playground (`apps/playground`) has a complete UI kit and domain logic library. The production web app (`apps/web`) needs to pull those components in and connect to the real API.

- [ ] **Move shared components into `apps/web`** — copy/migrate LMS components from `apps/playground/components/lms/` and the domain library from `apps/playground/lib/lms/` into `apps/web` (or extract into a shared `packages/ui` / `packages/lms` workspace package)
- [ ] **BetterAuth client setup** — install and configure `better-auth/client` with the organization plugin in `apps/web`; expose a typed `authClient` singleton
- [ ] **API client** — create a typed fetch wrapper in `apps/web/lib/api.ts` that: attaches session cookies, reads the base URL from env, maps the `{ ok, data }` / `{ ok, error }` envelope, and throws on non-ok responses
- [ ] **Auth middleware (Next.js)** — add a `middleware.ts` at the `apps/web` root that redirects unauthenticated users to sign-in and authenticated users away from the sign-in page
- [ ] **Environment config** — add `NEXT_PUBLIC_API_URL` (already in `@narada/env` client schema) and any other needed vars to `apps/web`'s env setup

## 9. Frontend — Auth & Onboarding Pages

The playground has auth components (`sign-in.tsx`, `register.tsx`, `profile-selector.tsx`) built against a fake API. Wire them to BetterAuth.

- [ ] **Sign-in page (`/sign-in`)** — email + Google OAuth via `authClient.signIn.*`; redirect to dashboard on success
- [ ] **Registration / profile page** — collect name and any required fields after first sign-in; create school member record
- [ ] **Profile selector** — when a user belongs to multiple schools, let them pick the active organization (sets `activeOrganizationId` on the session)
- [ ] **Sign-out** — call `authClient.signOut()` from the user menu in `AppShell`; clear session and redirect to sign-in

## 10. Frontend — Student Pages

The student dashboard (`/(student)/page.tsx`) currently renders hardcoded data. Replace with real API calls and add the missing pages.

- [ ] **Student dashboard (`/`)** — fetch from `GET /v1/student/dashboard`; replace all hardcoded `STUDENT`, `NEXT_CLASS`, `RECENT_EVALUATIONS`, `UPCOMING_EXAMS` constants with live data; persist the "continue chapter" cookie against a real chapter ID
- [ ] **Student chapter view (`/chapters/:chapterId`)** — new page; fetch from `GET /v1/student/chapters/:chapterId`; render `SelectableText` with segments highlighted; wire audio player to `AudioMapping` so clicking a segment seeks and plays the mapped range; show `currentLevel` proficiency badge
- [ ] **Batches list page (`/batches`)** — fetch enrolled batches from `GET /v1/batches`; link each to its detail
- [ ] **Batch detail page (`/batches/:batchId`)** — show batch metadata, class schedule, and the student's chapter list with proficiency levels

## 11. Frontend — Admin Pages

The admin page (`/admin/page.tsx`) is an empty shell. Build out the full admin surface using components already built in the playground.

- [ ] **Admin dashboard (`/admin`)** — summary stats: active batches, total students, recent evaluations
- [ ] **Tracks & chapters list (`/admin/content`)** — fetch `GET /v1/tracks`; render sortable chapter list (drag-and-drop reorder already built); link to chapter detail
- [ ] **Chapter detail / editor (`/admin/content/chapters/:chapterId`)** — 4-step authoring workflow already built in `apps/playground/app/editor/page.tsx`; wire each step to real API calls:
  - Step 1 (Content): `POST /v1/chapters` to create, `PATCH /v1/chapters/:id` for title/code/status
  - Step 2 (Segments): `PUT /v1/revisions/:revisionId/segments`
  - Step 3 (Audio Map): `POST /v1/chapters/:id/audio/upload-url` → upload to R2 → `POST /v1/chapters/:id/audio`; then `PUT /v1/audio/:audioId/mappings`
  - Step 4 (Preview): read-only; sourced from data already in state
- [ ] **New chapter flow** — `POST /v1/chapters/revisions` to upload text and create a revision before entering the editor
- [ ] **Batch list (`/admin/batches`)** — fetch `GET /v1/batches`; create batch button → `POST /v1/batches`
- [ ] **Batch detail (`/admin/batches/:batchId`)** — show batch metadata (editable via `PATCH /v1/batches/:batchId`); member roster with add/remove; link to matrix
- [ ] **Batch matrix (`/admin/batches/:batchId/matrix`)** — fetch `GET /v1/batches/:batchId/matrix`; render `BatchMatrix` component; clicking a cell opens `EvaluationModal` → `POST /v1/evaluations`
- [ ] **Exam scheduling** — from batch detail or matrix, schedule an exam via `POST /v1/batches/:batchId/exams`; record results via `POST /v1/exams/:examId/results`
- [ ] **School settings (`/admin/settings`)** — update school name/slug via `PATCH /v1/schools/:schoolId`; manage member invitations

## 12. Frontend — Navigation & Routing

- [ ] **Active nav item highlighting** — `AppShell` nav items are static labels; wire them to Next.js `usePathname()` to highlight the current route
- [ ] **Breadcrumb wiring** — add breadcrumbs to chapter and batch detail pages using the `Breadcrumb` component already in `apps/web/components/ui/breadcrumb.tsx`
- [ ] **Route protection** — ensure all `/admin/*` routes check for school `owner` or `admin` role; redirect `member`-role users to the student dashboard

## 13. Frontend — Infrastructure & Quality

- [ ] **Docker Compose dev environment** — add `docker-compose.yml` at the monorepo root with Postgres and (optionally) a local R2-compatible store (e.g. MinIO); document `pnpm dev` startup sequence
- [ ] **Error boundaries** — add Next.js `error.tsx` files for student and admin route groups; surface API error codes as readable messages
- [ ] **Loading skeletons** — replace spinner-only loading states with skeleton screens for dashboard, chapter view, and batch matrix
- [ ] **Optimistic updates** — evaluations and chapter reordering should update the UI immediately and reconcile on server response (contracts and reducer already support this in `lib/lms/chapter-authoring.ts`)
- [ ] **Component tests** — add Vitest + Testing Library; cover `BatchMatrix`, `EvaluationModal`, `SelectableText`, and the `chapterAuthoringReducer` (segmentation and audio-mapping logic already has unit tests)
- [ ] **E2E tests** — add Playwright covering: sign-in → dashboard, admin creates chapter → student views chapter, instructor records evaluation → matrix updates
