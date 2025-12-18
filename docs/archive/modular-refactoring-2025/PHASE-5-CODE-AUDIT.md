# Code Audit: Learn Pages API Calls & Backend Architecture

**Date:** December 18, 2025  
**Objective:** Map all API calls from Learn pages to backend routes/modules, identify what should be consolidated into learning-delivery module

---

## 1. Learn Pages & Their API Calls

### LearnTracks.tsx
**Purpose:** List all published tracks for student learning

**API Calls:**
- `GET /api/tracks` → Returns: `Track[]`
  - Route: `server/routes/content.routes.ts`
  - Module: `content-publishing`
  - Service: `contentService.listPublishedTracks()`

**Backend Flow:**
```
LearnTracks UI
  ↓
GET /api/tracks (content.routes.ts)
  ↓
contentService.listPublishedTracks()
  ↓
Database: tracks table
```

---

### LearnChapters.tsx
**Purpose:** List chapters in a specific track (published only)

**API Calls:**
1. `GET /api/tracks` (cached from previous page) → `Track[]`
2. `GET /api/chapters/{trackId}` → Returns: `Chapter[]`
   - Route: `server/routes/content.routes.ts`
   - Module: `content-publishing`
   - Service: `contentService.getChaptersByTrack(trackId)`

**Backend Flow:**
```
LearnChapters UI
  ↓
GET /api/chapters/{trackId} (content.routes.ts)
  ↓
contentService.getChaptersByTrack(trackId)
  ↓
Filter: status='published'
  ↓
Database: chapters table
```

---

### StudyChapter.tsx
**Purpose:** Interactive chapter learning with audio-text synchronization and learn mode toggle

**API Calls:**
1. `GET /api/chapters/{chapterId}/details` → Returns: `ChapterData` (content, status, metadata)
   - Route: `server/routes/content.routes.ts`
   - Module: `content-publishing`
   - Service: `contentService.getChapter(chapterId)`

2. `GET /api/segments/{chapterId}/{script}` → Returns: `TextSegment[]`
   - Route: `server/routes/content.routes.ts`
   - Module: `content-publishing`
   - Service: `contentService.getSegmentsByChapter(chapterId, script)`

3. `GET /api/audio-files/{chapterId}` → Returns: `AudioFile[]`
   - Route: `server/routes/media.routes.ts`
   - Module: `media-pipeline`
   - Service: `mediaService.getAudioFilesByChapter(chapterId)`

4. `GET /api/segment-mappings/{chapterId}` → Returns: `AudioTextMapping[]`
   - Route: `server/routes/media.routes.ts`
   - Module: `media-pipeline`
   - Service: `mediaService.getMappingsByChapter(chapterId)`

5. **Direct File Access:** `/uploads/{audioFile.filename}` (HTML audio tag)
   - Static file serving from `server/index.ts`

**Backend Flow:**
```
StudyChapter UI
  ├─ GET /api/chapters/{chapterId}/details → content module
  ├─ GET /api/segments/{chapterId}/{script} → content module
  ├─ GET /api/audio-files/{chapterId} → media module
  ├─ GET /api/segment-mappings/{chapterId} → media module
  └─ Direct: /uploads/{filename} → static file
```

**UI Features:**
- Script selector (te/hi/en) → filters segments dynamically
- Learn mode toggle (interactive segmented view vs. HTML view)
- Audio controls (play/pause/seek/volume/playback rate)
- Segment click → sync audio playback to segment timestamps

---

## 2. Current Architecture Problem

**Students currently call 3 different modules directly:**

```
Student (LearnTracks, LearnChapters, StudyChapter)
├─→ content-publishing module (tracks, chapters, segments)
├─→ media-pipeline module (audio files, mappings)
└─→ Static /uploads/ (audio files directly)
```

**Issues:**
- No single entry point for student content consumption
- No opportunity to track student progress automatically (when they access)
- No auth/permissions enforcement at student consumption level
- Direct module coupling in frontend logic
- If content/media API contracts change, frontend breaks

---

## 3. Learning-Delivery Module Should Be the Facade

**Proposed Architecture:**

```
Student (LearnTracks, LearnChapters, StudyChapter)
  ↓
learning-delivery module (NEW FACADE)
  ├─→ Orchestrates content-publishing calls
  ├─→ Orchestrates media-pipeline calls
  ├─→ Auto-tracks progress (lastAccessed)
  ├─→ Enforces auth/permissions
  └─→ Returns unified response (chapter + audio + segments + mappings)
```

---

## 4. Endpoints to Consolidate into Learning-Delivery

### Current separate calls:
- `GET /api/tracks` (content module)
- `GET /api/chapters/{trackId}` (content module)
- `GET /api/chapters/{chapterId}/details` (content module)
- `GET /api/segments/{chapterId}/{script}` (content module)
- `GET /api/audio-files/{chapterId}` (media module)
- `GET /api/segment-mappings/{chapterId}` (media module)

### Proposed learning-delivery endpoints:
1. **`GET /api/learning/tracks`** (NEW)
   - Returns: Published tracks for student
   - Calls internally: content module
   - Replaces: `GET /api/tracks`

2. **`GET /api/learning/tracks/{trackId}/chapters`** (NEW)
   - Returns: Published chapters in track
   - Calls internally: content module
   - Replaces: `GET /api/chapters/{trackId}`

3. **`GET /api/learning/chapter/{chapterId}`** (NEW) ⭐ **UNIFIED**
   - Returns: **Complete chapter learning package**
   ```json
   {
     "chapter": {...},
     "textSegments": [...],
     "audioFiles": [...],
     "segmentMappings": [...],
     "progress": {...}
   }
   ```
   - Calls internally:
     - content module: get chapter + segments
     - media module: get audio files + mappings
     - own module: get student progress
     - Own module: auto-track lastAccessed
   - Replaces: 4 separate calls

4. **`POST /api/learning/chapter/{chapterId}/access`** (KEEP)
   - Track chapter access (auto lastAccessed)
   - Already in learning-delivery

---

## 5. Phase 5 Scope Decision: Two Options

### **Option A: Minimal Phase 5** (Current)
- Progress tracking API only
- Learn pages keep calling content/media directly
- Status: Current implementation

### **Option B: Complete Phase 5** (Recommended)
- Add learning-delivery facade endpoints (3 new endpoints)
- Consolidate all student learning calls into learning-delivery
- Extend learning-delivery to orchestrate content + media modules
- Update Learn pages to use new unified endpoints
- Auto-track progress on chapter access
- Status: Requires extending Phase 5

**Effort for Option B:**
- Add 3 new endpoints to learning.routes.ts: ~4 hours
- Extend learningService to orchestrate: ~2 hours
- Update Learn pages (UI) to use new endpoints: ~2 hours
- Test all integrations: ~1 hour
- **Total: ~9 hours**

---

## 6. Recommendation

**I recommend Option B (Complete Phase 5)** because:
1. ✅ Aligns with roadmap objective: "modular, loosely-coupled architecture"
2. ✅ Creates proper facade pattern: learning-delivery = student's single entry point
3. ✅ Enables progress auto-tracking when student accesses chapter
4. ✅ Protects from future module API changes
5. ✅ Only ~9 additional hours (total Phase 5 still ~22 hours, manageable)
6. ✅ Future-proofs: if content/media change, frontend unaffected

**If we don't do this now:**
- Phase 5 is incomplete (progress tracking only, no content delivery facade)
- Future refactoring will be harder
- Learn pages remain tightly coupled to content/media modules
- Miss opportunity to auto-track chapter access

---

## Next Steps

1. **Your decision:** Proceed with Option A or Option B?
2. **If Option B:** Extend Phase 5 scope and replan effort
3. **Update roadmap** with your chosen direction
4. **Continue implementation**

