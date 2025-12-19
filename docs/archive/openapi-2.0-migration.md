# OpenAPI Spec 2.0 Migration Summary

**Date:** 2025-01-24  
**Git Commit:** d905efc  
**Previous Version:** 1.0.0 (1003 lines)  
**New Version:** 2.0.0 (1967 lines)

## Overview

Comprehensive update to align OpenAPI specification with current backend architecture after modular refactoring. Added 33 missing endpoints from 4 modules, updated Content and Media modules to match actual routes, and documented authentication/authorization patterns.

## Critical Changes

### 1. Added Missing Modules (33 endpoints)

#### Authentication & Identity (11 endpoints)
- `POST /api/auth/register` - User registration with approval workflow
- `POST /api/auth/login` - Local auth with Passport.js
- `GET /api/auth/google` - OAuth initiation
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/logout` - Session destruction
- `GET /api/auth/me` - Current user details
- `GET /api/auth/users` - List users (admin)
- `GET /api/auth/users/{userId}` - User details (admin)
- `POST /api/auth/admin/users/{userId}/approve` - Approve pending user
- `POST /api/auth/admin/users/{userId}/roles` - Assign roles
- `POST /api/auth/admin/users/{userId}/disable` - Disable account

#### Batch & Cohort (12 endpoints)
- `GET/POST /api/batches` - List/create batches
- `GET/PATCH /api/batches/{id}` - Batch details/update
- `GET/POST /api/batches/{id}/enrollments` - List/create enrollments
- `PATCH /api/enrollments/{enrollmentId}/drop` - Drop student with reason
- `GET/POST /api/batches/{id}/co-instructors` - Co-instructor management
- `DELETE /api/batches/{batchId}/co-instructors/{instructorId}` - Remove co-instructor
- `GET /api/batches/{batchId}/progress` - Excel-like progress grid
- `POST /api/batches/{batchId}/students/{studentId}/evaluate` - Record proficiency evaluation (0-4 scale)

#### Learning Delivery (6 endpoints)
- `GET /api/learning/progress` - Student progress with filters
- `GET /api/learning/chapters` - Accessible chapters based on enrollments
- `POST /api/learning/chapters/{chapterId}/access` - Track access timestamp
- `GET /api/learning/tracks` - Facade for student track browsing
- `GET /api/learning/tracks/{trackId}/chapters` - Facade for chapter browsing
- `GET /api/learning/chapters/{chapterId}/bundle` - Unified chapter data with opt-in includes

#### System Admin (4 endpoints)
- `GET /api/admin/audit-logs` - List audit logs with pagination/filters
- `GET /api/admin/settings` - All system settings
- `GET/PUT /api/admin/settings/{key}` - Single setting CRUD

### 2. Updated Content Module (21 endpoints)

**Path Changes:**
- ❌ Old: `/api/admin/tracks` → ✅ New: `/api/tracks`
- ❌ Old: `/api/admin/chapters` → ✅ New: `/api/chapters`
- ❌ Old: `/api/admin/segments` → ✅ New: `/api/segments`

**Reason:** Routes in `server/routes/content.routes.ts` are mounted at `/api` prefix, not `/api/admin`. Admin-only operations controlled via middleware, not URL prefix.

**New Endpoints:**
- `POST /api/tracks/{id}/move` - Reorder tracks (up/down)
- `PATCH /api/chapters/{chapterId}/status` - Publish/unpublish (draft/published)
- `POST /api/chapters/{chapterId}/move` - Reorder chapters
- `PATCH /api/segments/{chapterId}/reorder` - Bulk segment reordering

### 3. Refactored Media Module (12 endpoints)

**Old Pattern (Legacy):**
- "Audio Mappings" - Direct text-to-audio mapping with 2 tables

**New Pattern (3-Table Pipeline):**
1. **Audio Files** - Upload, metadata, duration extraction
2. **Media Segments** - Reusable timestamp ranges (startTime/endTime)
3. **Segment Mappings** - Links textSegment → audioFile with timestamps

**Endpoints:**
- `GET/POST /api/audio-files` - List/upload audio (50MB max, multer)
- `PATCH/DELETE /api/audio-files/{audioFileId}` - Update metadata/delete
- `GET/POST /api/media-segments` - List/create media segments
- `POST /api/media-segments/bulk` - Bulk segment creation
- `PATCH/DELETE /api/media-segments/{mediaSegmentId}` - Update/delete
- `GET/POST /api/mappings` - List/create mappings (by chapter or audioFile)
- `GET /api/mappings/count` - Count mappings for audio file
- `DELETE /api/mappings/{textSegmentId}/{audioFileId}` - Delete mapping

### 4. Security & Authorization

**Added Components:**
```yaml
security:
  - sessionAuth: []

securitySchemes:
  sessionAuth:
    type: apiKey
    in: cookie
    name: connect.sid
    description: PostgreSQL-backed session cookie (Passport.js)
```

**Role Requirements (Documented in descriptions):**
- **Public Access:** Track/chapter browsing (security: [])
- **Authenticated:** Learning APIs, progress tracking
- **Student Only:** Chapter access tracking, bundle API
- **Instructor/Admin:** Batch management, progress evaluation, co-instructor assignment
- **Instructor Only:** Student evaluation (POST evaluate endpoint)
- **Admin Only:** User management, system settings, audit logs, batch creation
- **Content Manager/Admin:** Track/chapter/segment/audio management

### 5. Schema Updates

**New Schemas:**
- `User` - With roles array and status enum (pending_approval/active/inactive)
- `Batch` - With leadInstructorId and date range
- `Enrollment` - With status (active/dropped) and dropReason
- `StudentProgress` - With proficiencyLevel (0-4), batchId, evaluatedBy
- `MediaSegment` - Separate from mapping
- `SegmentMapping` - Links textSegment + audioFile with timestamps
- `AuditLog` - System activity tracking
- `SystemSetting` - Key-value configuration
- `Pagination` - For list endpoints

**Updated Schemas:**
- `Chapter` - Changed createdBy/lastEditedBy from string to integer (user IDs)
- `Track` - Same ID reference update
- `TextSegment` - Removed textReferences, added script (te/hi/en) with startPosition/endPosition
- `AudioFile` - Removed legacy fields, added uploadedBy as integer

## Endpoint Coverage

**Total Endpoints:** 66
- Authentication: 11
- Batches: 12
- Content (Tracks/Chapters/Segments): 21
- Media (Audio/MediaSegments/Mappings): 12
- Learning: 6
- System Admin: 4

**HTTP Method Distribution:**
- GET: 29 endpoints
- POST: 19 endpoints
- PATCH: 9 endpoints
- DELETE: 6 endpoints
- PUT: 3 endpoints

## Notable Patterns

### Multilingual Support
All endpoints working with chapter content respect script keys: `te`, `hi`, `en`
- `MultilingualContent` schema with three optional properties
- Query parameter `?script=te` for filtering segments/bundle data

### Proficiency Scale
Student evaluation uses 5-level scale (0-4):
- 0: Not Started
- 1: Beginner
- 2: Intermediate
- 3: Advanced
- 4: Mastered

### Batch Context
Student progress evaluation requires batch assignment context - proficiency is tracked per (student, chapter, batch) triple, not globally.

### Chapter Protection
Published chapters cannot be deleted - must unpublish first (PATCH status to 'draft')

### Co-Instructor Model
Multiple instructors per batch with equal privileges (no hierarchy beyond lead instructor for batch creation)

## Breaking Changes

1. **Path prefixes removed:** `/api/admin/*` → `/api/*` for content operations
2. **Audio mapping structure:** Legacy flat mapping → 3-table pipeline (audioFiles, mediaSegments, segmentMappings)
3. **Text segment references:** Changed from textReferences object → script + startPosition/endPosition integers
4. **User ID types:** Changed from string → integer for createdBy, lastEditedBy, uploadedBy

## Migration Notes

If generating client SDKs from OpenAPI:
1. Regenerate all clients - paths changed significantly
2. Update authentication - now session-based, not token-based
3. Update text segment handling - new position-based model
4. Update audio mapping logic - 3-table structure
5. Add role checks - many endpoints now have stricter authorization

## Files Modified

- `openapi.yaml` - Complete rewrite (964 lines added, 0 lines removed - full replacement)
- Backup created: `openapi.yaml.backup` (v1.0.0 preserved)

## Testing Recommendations

1. Validate YAML syntax: `npx @apidevtools/swagger-cli validate openapi.yaml`
2. Generate mock server: `npx @stoplight/prism-cli mock openapi.yaml`
3. Test actual routes: Compare spec to `server/routes/*.routes.ts` endpoint implementations
4. Verify schemas: Cross-reference with `shared/schema.ts` Drizzle models
5. Check auth flows: Test session creation with Passport.js strategies

## Next Steps

- [ ] Generate TypeScript client SDK from OpenAPI spec
- [ ] Add request/response examples for complex endpoints (bundle, progress grid)
- [ ] Document rate limits and pagination patterns
- [ ] Add webhook documentation if implemented
- [ ] Create Postman/Insomnia collection from spec
