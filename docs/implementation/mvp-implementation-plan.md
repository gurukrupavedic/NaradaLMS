# VedicLMS MVP Implementation Plan

**Last Updated:** January 6, 2026  
**Current Phase:** Phase 5 - Content Studio  
**Status:** Phases 0-4 + Phase 6 Complete | Phase 5.1 ✅ Complete | Phase 5.2-5.4 In Progress | MVP Completion Target: End of Phase 5

---

## Document Purpose

This is the **active implementation guide** for the final MVP phase. It focuses on:
- 🎯 Phase 5 - Content Studio (detailed goals, deliverables, timeline)
- 📊 Status dashboard (phases completed and remaining)
- 📋 Post-MVP roadmap (phases 7.4+)

**For completed phase details:** [mvp-completed-phases.md](mvp-completed-phases.md) — comprehensive archive of all finished work (Phases 0-4, 6)

---

## Quick Links

- **Completed Phases Archive:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope & Features:** [mvp-scope.md](mvp-scope.md)
- **Domain Requirements:** [../domain-requirements.md](../domain-requirements.md)
- **Product Guide:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

---

## 📊 Status Dashboard

### ✅ MVP Completion: Phases 0-4 + Phase 6 Complete

**All Completed Phases:**
- ✅ Phase 0: Planning & Setup (Dec 2025)
- ✅ Phase 1: Theme Infrastructure (Dec 22, 2025)
- ✅ Phase 2: New Route Namespace `/app/*` (Dec 2025)
- ✅ Phase 3: Admin Center (Dec 22-25, 2025)
- ✅ Phase 4: Batches & Progress (Dec 23-30, 2025 + Jan 2-5, 2026)
- ✅ Phase 7.1: Navigation Architecture (Dec 23, 2025)
- ✅ Phase 7.2: Shell Overhaul (Dec 23, 2025)
- ✅ Phase 7.3: Workflow Refinement (Dec 25-30, 2025)
- ✅ Phase D: Track-wise Progress Tracker (Jan 5, 2026)
- ✅ Phase 6: Learn - Student Workflow (Jan 4-5, 2026)

**See comprehensive history:** [mvp-completed-phases.md](mvp-completed-phases.md)

### 🎯 Current Phase: Phase 5 - Content Studio

**Target Completion:** End of Phase 5 = **MVP Feature Complete**

---

## 🎯 Phase 5 - Content Studio

**Goal:** Build professional content management interface for content creators to manage tracks, chapters, and publish educational content.

**Scope:**
1. **Tracks & Chapters Page** - Single unified page for track/chapter management
2. **Chapter Content Editor** - Full 5-tab editor (Content, Audio, Segmentation, Mapping, Preview)
3. **Backend API Refactoring** - Clean `/api/content/*` namespace following modular architecture
4. **Auth & Permissions** - Content manager role enforcement

**Key Principles:**
- **Clean foundation**: New namespaced endpoints, structured query keys, consistent conventions
- **Parallel operation**: Keep legacy UI working while building new-ui
- **Role-based access**: Only `content_manager` role (no admin access to content creation)
- **Zero regressions**: Copy/adapt existing editor, don't rewrite proven workflows

**Technical Requirements:**
- Type-safe (zero TypeScript errors)
- Real-time feedback for all mutations
- Responsive across all breakpoints (mobile/tablet/desktop)
- Consistent with new-ui patterns (shadcn components, TanStack Query v5)

---

### Phase 5 Architecture Decisions

#### 1. Backend API Structure

**New Namespaced Endpoints:**
```
/api/content/tracks                          → List/create tracks
/api/content/tracks/:trackId                 → Get/update/delete track
/api/content/tracks/:trackId/chapters        → List/create chapters for track
/api/content/chapters/:chapterId             → Get/update/delete chapter
/api/content/chapters/:chapterId/segments    → Manage text segments (add ?script=te)
/api/content/chapters/:chapterId/mappings    → Manage audio-text mappings
/api/content/chapters/:chapterId/audio       → Upload/manage audio files
```

**Why:**
- Clear module ownership (content-publishing module)
- Follows modular monolith architecture
- Future-proof namespacing
- Easier to add middleware/auth at module level

**Migration Strategy:**
- Keep legacy endpoints (`/api/tracks`, `/api/chapters`) for legacy UI
- New-ui uses only `/api/content/*` endpoints
- Backend routes can share service layer (avoid duplication)

#### 2. React Query Keys

**Structured Array Keys:**
```typescript
['content', 'tracks']                                      → All tracks
['content', 'tracks', trackId, 'chapters']                → Chapters in track
['content', 'chapters', chapterId, 'details']             → Chapter details
['content', 'chapters', chapterId, 'segments', script]    → Segments for script
['content', 'chapters', chapterId, 'mappings', audioFileId] → Mappings for audio
```

**Why:**
- Easy cache invalidation (clear all with `['content']`)
- Clear hierarchy and relationships
- Type-safe with TypeScript
- Matches batches/students pattern from Phases 3-4

#### 3. Frontend Routing

**New Routes:**
```
/app/content                                              → Tracks & Chapters page
/app/content/tracks/:trackId/chapters/:chapterId          → Chapter Content editor
```

**Why:**
- Track context in URL helps breadcrumbs and prefetching
- Matches mental model (track → chapter hierarchy)
- Clean separation from legacy `/manage/*` routes

**Legacy Routes (preserved):**
```
/manage                                   → Legacy tracks page
/manage/tracks/:trackId                   → Legacy chapters page
/manage/tracks/:trackId/chapters/:chapterId → Legacy chapter editor
```

#### 4. Authorization

**Content Studio Access:**
- Only users with `content_manager` role
- Check: `user.roles.includes('content_manager')`
- Multi-role support: `['admin', 'content_manager']` gets access

**No Admin Access:**
- Admin role does NOT get Content Studio access
- Follows separation of duties principle
- If needed, assign both roles to user

---

### Phase 5 - Detailed Implementation Plan

**Status:** Ready to begin  
**Timeline:** 5-7 days estimated  
**Dependencies:** Phases 0-4 and 6 complete

---

#### Sub-Phase 5.1: Backend API Refactoring ✅ COMPLETE

**Status:** COMPLETE (Jan 6, 2026)  
**Duration:** 1 day (ahead of schedule)

**Goal:** Create clean `/api/content/*` endpoints for new-ui.

**Completed Implementation:**

1. ✅ **Content routes module** (`server/routes/content.routes.ts`)
   - `GET /api/content/tracks` - List all tracks (ordered)
   - `POST /api/content/tracks` - Create track (title + description)
   - `PUT /api/content/tracks/:trackId` - Update track
   - `DELETE /api/content/tracks/:trackId` - Delete track
   - `POST /api/content/tracks/:trackId/move` - Reorder track (up/down)

2. ✅ **Chapter routes**
   - `GET /api/content/tracks/:trackId/chapters` - List chapters for track
   - `POST /api/content/tracks/:trackId/chapters` - Create chapter
   - `GET /api/content/chapters/:chapterId` - Get chapter details (includes track context)
   - `PUT /api/content/chapters/:chapterId` - Update chapter
   - `DELETE /api/content/chapters/:chapterId` - Delete chapter (blocks if published)
   - `PATCH /api/content/chapters/:chapterId/status` - Publish/unpublish
   - `POST /api/content/chapters/:chapterId/move` - Reorder chapter (up/down OR move to track via toTrackId)

3. ✅ **Segment & mapping routes**
   - `GET /api/content/chapters/:chapterId/segments?script=te` - Get segments by script
   - `POST /api/content/chapters/:chapterId/segments` - Create segment
   - `PUT /api/content/chapters/:chapterId/segments/:segmentId` - Update segment
   - `DELETE /api/content/chapters/:chapterId/segments/:segmentId` - Delete segment
   - `POST /api/content/chapters/:chapterId/segments/reorder` - Reorder segments
   - `GET /api/content/chapters/:chapterId/mappings?audioFileId=123` - Get mappings
   - `POST /api/content/chapters/:chapterId/mappings` - Create mapping
   - `PUT /api/content/chapters/:chapterId/mappings/:mappingId` - Update mapping timestamps
   - `DELETE /api/content/chapters/:chapterId/mappings/:mappingId` - Delete mapping

4. ✅ **Audio routes**
   - `POST /api/content/chapters/:chapterId/audio` - Upload audio file with metadata extraction
   - `GET /api/content/chapters/:chapterId/audio` - List audio files
   - `PUT /api/content/chapters/:chapterId/audio/:audioFileId` - Update filename
   - `DELETE /api/content/chapters/:chapterId/audio/:audioFileId` - Delete audio

5. ✅ **Auth middleware**
   - Applied `requireContentManager` guard to all routes
   - Returns 403 Forbidden for unauthorized access

**Implementation Details:**
- Mounted router at both `/api` and `/api/content` for backward compatibility with legacy UI
- Updated content-publishing module types: `Track` now uses `title` + `description` (aligned with schema)
- Enhanced `moveChapter()` service method to support moving chapters between tracks via `toTrackId` parameter
- Integrated multer for audio uploads with automatic metadata extraction (duration via music-metadata)
- Consistent error responses using `createErrorResponse()` format with timestamps and request IDs
- Chapter details endpoint returns embedded track context (id, title) to support breadcrumbs with minimal API calls
- All routes properly typed with TypeScript (zero type errors)

**Testing & Validation:**
- Created comprehensive smoke test: `scripts/test/content-smoke.ts`
- Validates end-to-end operations: track CRUD, chapter CRUD, segments, audio upload, mappings, reorder, cleanup
- Test execution confirms all operations work correctly

**Code Changes:**
- New file: [server/routes/content.routes.ts](../../../server/routes/content.routes.ts) (400+ lines)
- Updated: [server/modules/content-publishing/types.ts](../../../server/modules/content-publishing/types.ts) - Track interface
- Updated: [server/modules/content-publishing/service.ts](../../../server/modules/content-publishing/service.ts) - createTrack() and moveChapterToTrack()
- Updated: [server/index.ts](../../../server/index.ts) - mount content router
- New file: [scripts/test/content-smoke.ts](../../../scripts/test/content-smoke.ts)
- Fixed: [client/src/new-ui/batches/components/BatchDetailsCard.tsx](../../../client/src/new-ui/batches/components/BatchDetailsCard.tsx) - JSX syntax

**Acceptance Criteria:**
- ✅ All endpoints return correct data
- ✅ Auth checks enforce content_manager role (403 for non-managers)
- ✅ Error responses follow standard format with timestamps and request IDs
- ✅ Legacy routes still work (no breaking changes to existing API)
- ✅ Zero TypeScript errors on new code

**Next:** Phase 5.2 deferred pending prototype UI refinement

---

#### Sub-Phase 5.2: Tracks & Chapters Page

**Status:** PENDING (prototype refinement phase before implementation)

**Goal:** Port the working prototype into new-ui and fully integrate with the backend to manage tracks and chapters from the Content Studio.

**Component:** `client/src/new-ui/content/pages/TracksAndChapters.tsx`

**Prototype Port Plan:**
1. Refine prototype UI first (localStorage, defaults, dialog UX) - in progress
2. Move/port UI from `client/src/temp-prototype/TracksAndChaptersColumn.tsx` into the new page component.
3. Fit within the new-ui AppShell (sidebar/top-nav), keeping spacing consistent with design system.
4. Replace all local state operations with TanStack Query hooks and mutations.
5. Wire navigation: "Open Chapter" → `/app/content/tracks/:trackId/chapters/:chapterId`.
6. Enforce role guard on route: `content_manager` only.

**API Integration Map:**
- Tracks
   - List: `GET /api/content/tracks` → Query key `['content', 'tracks']`
   - Create: `POST /api/content/tracks` → invalidate `['content', 'tracks']`
   - Update: `PUT /api/content/tracks/:trackId` → update cache or invalidate
   - Delete: `DELETE /api/content/tracks/:trackId` → invalidate
   - Reorder: `POST /api/content/tracks/:trackId/move` → optimistic update then reconcile
- Chapters
   - List (by track): `GET /api/content/tracks/:trackId/chapters` → `['content', 'tracks', trackId, 'chapters']`
   - Create: `POST /api/content/tracks/:trackId/chapters` → invalidate chapters key
   - Update: `PUT /api/content/chapters/:chapterId` → update cache or invalidate
   - Delete: `DELETE /api/content/chapters/:chapterId` → invalidate
   - Publish/Unpublish: `PATCH /api/content/chapters/:chapterId/status` → update status badge
   - Reorder: `POST /api/content/chapters/:chapterId/move` → optimistic update then reconcile

**React Query Keys:**
- Tracks: `['content', 'tracks']`
- Chapters in track: `['content', 'tracks', trackId, 'chapters']`
- Derived detail prefetch (hover or selection): `['content', 'chapters', chapterId, 'details']`

**UI Functionality To Port & Integrate:**
- Track Management:
   - Create/edit/delete tracks with dialogs (shadcn `Dialog`, `AlertDialog`).
   - Reorder with up/down actions (optimistic updates + toast feedback).
   - Display order, title, description, chapter count.
- Chapter Management:
   - Create/edit/delete chapters with dialogs.
   - Reorder with up/down actions (optimistic updates).
   - Status badge for `draft` vs `published` (warn before delete when published).
   - "Open Chapter" navigates to editor.
- States & UX:
   - Loading skeletons, empty states, and error toasts.
   - Responsive layout (mobile/tablet/desktop) with resizable columns.
   - Type-safe across queries and mutations; zero `any`.

**Route & Navigation:**
- Add route in AppShell: `/app/content` → `TracksAndChapters`.
- Breadcrumbs: `['Content Studio', 'Tracks & Chapters']`.
- Guard access via role check (`content_manager`); redirect unauthorized.

**Acceptance Criteria:**
- [ ] Prototype UI ported into `client/src/new-ui/content/pages/TracksAndChapters.tsx`.
- [ ] All CRUD operations work against `/api/content/*` endpoints with optimistic updates for reorder.
- [ ] Status badges reflect publish state; delete warns for published chapters.
- [ ] "Open Chapter" navigates to `/app/content/tracks/:trackId/chapters/:chapterId`.
- [ ] Loading/empty/error states implemented; toasts show mutation outcomes.
- [ ] Responsive and resizable columns; consistent with shadcn design system.
- [ ] Route is guarded by `content_manager` role both frontend and backend.
- [ ] Zero TypeScript errors; no regressions in legacy UI.

**Duration:** 2 days (prototype complete; focused on integration and polish)

---

#### Sub-Phase 5.3: Chapter Content Editor

**Goal:** Port legacy chapter editor to new-ui with clean endpoints/routing.

**Component:** `client/src/new-ui/content/pages/ChapterContent.tsx`

**Migration Strategy:**

1. **Copy, don't move:**
   - Copy `client/src/features/content-management/pages/EditChapter.tsx`
   - Paste as `client/src/new-ui/content/pages/ChapterContent.tsx`
   - Keep legacy file intact (no breaking changes to legacy UI)

2. **Adapt imports and routing:**
   - Update `setLocation()` calls to use `/app/content/*` paths
   - Update breadcrumb "Back" button to return to `/app/content`
   - Fit component within new-ui AppShell (sidebar/top-nav already present)

3. **Update API endpoints:**
   - Replace `/api/chapters/:id/details` → `/api/content/chapters/:chapterId`
   - Replace `/api/segments/:chapterId/:script` → `/api/content/chapters/:chapterId/segments?script=te`
   - Replace `/api/mappings` → `/api/content/chapters/:chapterId/mappings`
   - Update audio upload/delete endpoints

4. **Update React Query keys:**
   - Replace `["/api/chapters/${chapterId}/details"]` → `['content', 'chapters', chapterId, 'details']`
   - Replace `["/api/segments/${chapterId}/${script}"]` → `['content', 'chapters', chapterId, 'segments', script]`
   - Update all other query keys to structured arrays

5. **Keep all features intact:**
   - Five tabs: Chapter Text, Chapter Audio, Segmentation, Mapping, Preview
   - TipTap editor with autosave
   - Script selector (te/hi/en)
   - Audio upload/metadata extraction
   - Text segmentation UI (AnnotationLayer, SegmentPanel)
   - Progressive mapping (ProgressiveMapper)
   - Preview with Learn Mode toggle
   - Publish/unpublish workflow
   - Published chapter read-only enforcement

6. **Reuse existing components:**
   - Import from `components/chapter-editor/*`
   - Import from `components/text-segmentation/*`
   - Import from `components/audio-mapping/*`
   - No need to rewrite proven components

**Tab Breakdown:**

**Tab 1: Chapter Text**
- TipTap rich text editor (multilingual)
- Script selector (Telugu/Hindi/English)
- Auto-save with status indicator (dirty/saving/saved/clean)
- Publish lock (read-only when published)

**Tab 2: Chapter Audio**
- Upload audio files (drag-drop or browse)
- Display uploaded files (name, duration, file size)
- Edit filename (inline edit)
- Delete audio (confirmation)
- Audio playback preview

**Tab 3: Segmentation**
- Left panel: Text content with selection tool
- Right panel: Segment list
- Click-drag text selection creates segments
- Segment cards show script, position, order
- Delete segments (if not mapped)
- Reorder segments

**Tab 4: Mapping**
- Audio file selector dropdown
- Left panel: Audio player with controls
- Right panel: Segment mapping grid
- Progressive mapping session (click-when-heard)
- Visual states: unmapped (gray) → recording (orange) → mapped (green)
- Edit/delete mappings
- Playback preview with segment highlight

**Tab 5: Preview**
- Learn Mode toggle (interactive vs HTML view)
- Audio file selector
- Audio controls (play/pause/stop/seek/volume/speed)
- Script selector
- Segmented text display with click-to-play
- Mapping count badges

**Acceptance Criteria:**
- [ ] All 5 tabs function identically to legacy editor
- [ ] New endpoints work (`/api/content/*`)
- [ ] New query keys cache correctly
- [ ] Navigation works (back to Tracks & Chapters)
- [ ] Breadcrumbs show correct context
- [ ] Publish/unpublish workflow works
- [ ] Published chapters are read-only
- [ ] Audio upload works (50MB max)
- [ ] Text segmentation UI works
- [ ] Progressive mapping works
- [ ] Preview matches learn page
- [ ] Responsive across breakpoints
- [ ] Zero TypeScript errors
- [ ] Legacy UI still works (no regressions)

**Duration:** 2-3 days

---

#### Sub-Phase 5.4: Navigation & Auth Integration

**Goal:** Wire Content Studio into new-ui navigation with proper auth.

**Tasks:**

1. **Update AppShell routes** (`client/src/new-ui/AppShell.tsx`)
   ```typescript
   <Route path="/app/content" component={TracksAndChapters} />
   <Route path="/app/content/tracks/:trackId/chapters/:chapterId" component={ChapterContent} />
   ```

2. **Update navigation config** (`client/src/new-ui/lib/navigation-config.ts`)
   - Remove Content Studio from admin role
   - Keep only for content_manager
   - Update section items if needed

3. **Update top-nav breadcrumbs** (`client/src/new-ui/components/top-nav.tsx`)
   ```
   /app/content                                   → ['Content Studio', 'Tracks & Chapters']
   /app/content/tracks/:trackId/chapters/:chapterId → ['Content Studio', 'Track Name', 'Chapter Name']
   ```

4. **Add route guards**
   - Verify `user.roles.includes('content_manager')` before rendering
   - Redirect unauthorized users to `/app/learning`
   - Show error message if access denied

5. **Backend auth**
   - All `/api/content/*` routes check for `content_manager` role
   - Return 403 Forbidden if not authorized

**Acceptance Criteria:**
- [ ] Content Studio shows in sidebar for content_manager only
- [ ] Routes protected with role checks
- [ ] Breadcrumbs show correct context
- [ ] Unauthorized users can't access
- [ ] Backend enforces role checks
- [ ] Zero TypeScript errors

**Duration:** 0.5 day

---

### Timeline & Dependencies

| Sub-Phase | Duration | Blockers | Start After |
|-----------|----------|----------|-------------|
| 5.1: Backend API | 2 days | None | Anytime |
| 5.2: Tracks & Chapters | 2-3 days | 5.1 complete | 5.1 |
| 5.3: Chapter Content | 2-3 days | 5.1 complete | 5.1 (parallel with 5.2) |
| 5.4: Nav & Auth | 0.5 day | 5.2, 5.3 complete | 5.2, 5.3 |

**Total Phase 5 Duration:** 5-7 days estimated (some parallel work possible)

---

### Success Metrics

- ✅ Content manager can view assigned tracks
- ✅ Content manager can create, edit, delete chapters
- ✅ All 5 editor tabs functional and smooth
- ✅ Audio upload reliable (50MB max)
- ✅ Text segmentation intuitive (visual feedback)
- ✅ Audio mapping maps to correct timestamps
- ✅ Preview matches live learning experience
- ✅ All workflows responsive on mobile/tablet/desktop
- ✅ Zero TypeScript errors
- ✅ Zero known bugs or blocking issues

---

## Post-MVP Roadmap (Phase 7.4+)

**Phase 7.4: Accessibility & Performance**
- WCAG 2.1 AA compliance audit
- Performance optimization (bundle size, API response times)
- Mobile browser testing (iOS Safari, Android Chrome)
- Lighthouse audit fixes

**Phase 7.5: Production Release**
- Final UAT with stakeholders
- Database production migration
- Deployment strategy (staging → production)
- User documentation
- Support workflow setup

**Phase 8: Post-MVP Features**
- Advanced content management (bulk operations, batch publishing)
- Analytics dashboard (usage, engagement, retention)
- Student portfolio/progress sharing
- Mobile app (React Native)

---

## References

- **Completed Phases Archive:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope:** [mvp-scope.md](mvp-scope.md)
- **Domain:** [../domain-requirements.md](../domain-requirements.md)
- **Product:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

**Living Document:** Phase 5 details will evolve as implementation progresses. Update timeline and sub-phase statuses regularly. Once Phase 5 is complete, move all content to [mvp-completed-phases.md](mvp-completed-phases.md) and this file can be archived.
