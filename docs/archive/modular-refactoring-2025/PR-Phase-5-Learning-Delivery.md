# PR: Phase 5 — Learning Delivery Facade + Batch Evaluation

## Summary
Implements the Phase 5 scope:
- Learning Delivery module facade endpoints under `/api/learning/*`
- Minimal client refactor for Learn pages (Tracks/Chapters) to use facade
- StudyChapter: progress badge (read-only) and automatic access tracking
- Roadmap updates: scope expansion, completion status, and tech debt

## Changes
- Server
  - Mount router: `app.use('/api/learning', learningRouter)`
  - `server/routes/learning.routes.ts`
    - `GET /api/learning/progress`
    - `GET /api/learning/chapters`
    - `POST /api/learning/chapters/:chapterId/access`
    - `GET /api/learning/tracks` (facade → content)
    - `GET /api/learning/tracks/:trackId/chapters` (facade → content)
    - `GET /api/learning/chapter/:chapterId` (unified bundle with `include` + `script`)
  - `server/modules/learning-delivery/service.ts`
    - Orchestrates content + media + progress for chapter bundles
  - `server/modules/learning-delivery/types.ts`
    - Adds `ChapterBundleDTO`, `ChapterInclude`, `ChapterBundleQuery`

- Client
  - `client/src/pages/LearnTracks.tsx`
    - Fetch from `/api/learning/tracks`
    - JSX fix for map callback
  - `client/src/pages/LearnChapters.tsx`
    - Fetch from `/api/learning/tracks/:trackId/chapters`
  - `client/src/pages/StudyChapter.tsx`
    - Read-only progress query: `/api/learning/progress?chapterId=...`
    - Auto access tracking: `POST /api/learning/chapters/:id/access`
    - Badge shows `Progress: <level> • Last: <date>`
  - `client/src/App.tsx`
    - Add `/learning/*` route aliases to mirror existing `/tracks/*`

- Docs
  - `MASTER-OBJECTIVE-AND-ROADMAP.md`
    - Phase 5 marked complete (Dec 18, 2025), total hours adjusted to 108
    - Lists new endpoints, defaults, and facade rationale
    - Adds tech debt and next steps
  - `docs/PHASE-5-CODE-AUDIT.md`
    - Captures audit and facade design rationale

## Rationale
- Centralize student-facing reads under a stable facade (`/api/learning/*`)
- Keep payloads small by default via `include=chapter,progress` and `script` filter
- Maintain low risk by leaving StudyChapter heavy calls in place for now (tracked as tech debt to migrate later)

## Testing
Manual smoke checks:
- Tracks/Chapters UI renders via facade endpoints
- StudyChapter shows progress badge and tracks access on first open
- `/api/learning/chapter/:id?include=chapter,progress` returns minimal bundle
- `/api/learning/chapter/:id?include=segments,mappings&script=te` returns heavy parts
- `/api/learning/chapter/:id?include=audio` returns audio files
- Instructor batch endpoints (if applicable): grid + evaluate endpoints respond

## Backwards Compatibility
- Original content/media endpoints remain intact
- Frontend routes support both `/tracks/*` and `/learning/*`

## Tech Debt / Follow-ups
- Migrate StudyChapter to unified bundle with lazy `include` loads
- Add ETag/Cache-Control; consider gzip/brotli after payload measurement
- Optional UI: progress badges on lists; minimal integration tests for `/api/learning/*`

## Rollback
- Revert `server/index.ts` learning router mount
- Point LearnTracks/LearnChapters back to `/api/tracks` and `/api/chapters/:trackId`
- Remove progress badge and access POST from StudyChapter
