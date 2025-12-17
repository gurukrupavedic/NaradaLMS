# Phase 3: Media Pipeline Module — Implementation Plan

Status: Draft
Owner: Content/Platform
Date: 2025-12-17

## Objective
Migrate audio file management, media segment editing, and text↔audio segment mappings into an isolated module with clear service/storage layers and dedicated routes.

## Scope
- Move endpoints from legacy `server/routes-simple.ts` to new router `server/routes/media.routes.ts`.
- Implement `server/modules/media-pipeline/` with `storage.ts`, `service.ts`, `types.ts`, `events.ts`.
- Preserve existing response shapes for Chapter Editor and Progressive Mapper.

## Endpoints To Migrate
- Audio Files
  - GET `/api/audio-files/:chapterId`
  - POST `/api/audio-files/:chapterId/upload` (multer + metadata parsing)
  - PATCH `/api/audio-files/:audioFileId`
  - DELETE `/api/audio-files/:audioFileId`
- Media Segments
  - GET `/api/media-segments/:audioFileId`
  - POST `/api/media-segments/bulk`
  - POST `/api/media-segments`
  - PATCH `/api/media-segments/:id`
  - DELETE `/api/media-segments/:id`
- Segment Mappings
  - GET `/api/segment-mappings/:chapterId`
  - GET `/api/mappings/chapter/:chapterId`
  - GET `/api/mappings/audio/:audioFileId`
  - GET `/api/mappings/audio/:audioFileId/count`
  - POST `/api/mappings`
  - DELETE `/api/mappings/:audioFileId/:segmentId`

## Module Structure
```
server/modules/media-pipeline/
  storage.ts   // drizzle queries for audioFiles, mediaSegments, segmentMappings
  service.ts   // validation, orchestration, cascade deletes, mapping integrity
  types.ts     // AudioFile, MediaSegment, MappingWithTimestamps
  events.ts    // AudioUploaded, MediaSegmentCreated, MappingCreated/Deleted
  index.ts     // exports
```

## Integration
- Static files: keep `/uploads` served from Express.
- Use shared EventBus for analytics/audit hooks.
- Mount router in `server/index.ts` as `app.use('/api', mediaRouter)`.

## Acceptance Criteria
- All routes return the same shapes as before (no UI break).
- `routes-simple.ts` no longer exposes any media/mapping endpoints.
- Manual tests: upload audio → create media segments → map segments → verify counts → delete.

## Risks & Mitigations
- Large uploads: keep multer limits (50MB) and MIME filter.
- Mapping integrity: check `textSegmentId` and audio/chapter consistency in service; reject invalid combos.

## Rollback
- Keep legacy routes in `routes-simple.ts` until new module is verified.
- Single-line router disable in `server/index.ts`.
