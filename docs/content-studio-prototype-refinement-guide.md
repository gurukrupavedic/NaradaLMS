# Content Studio Prototype Refinement Guide

**Document Purpose:** Technical briefing for UI/UX design refinement of the TracksAndChaptersColumn prototype  
**Audience:** Senior UI/UX Developer  
**Date:** January 6, 2026  
**Phase:** Phase 5.2 Preparation (Backend Complete, Frontend Pending)

---

## 1. Current Prototype Architecture

### Location & Purpose
- **File:** `client/src/temp-prototype/TracksAndChaptersColumn.tsx` (565 lines)
- **Status:** Working prototype with mock data
- **Purpose:** Exploration of master/detail column layout for unified track and chapter management

### Current Implementation Details

**Layout Pattern:**
- **Two-column resizable layout** using shadcn `ResizablePanelGroup`
- Left panel (40% default): Track list with selection state
- Right panel (60% default): Chapter list for selected track
- User-adjustable column widths with resizable handle (minSize: 25%, maxSize: 75%)

**State Management:**
```typescript
// Local React state (will be replaced with TanStack Query)
const [tracks, setTracks] = useState<MockTrack[]>(MOCK_TRACKS);
const [selectedTrackId, setSelectedTrackId] = useState<number | null>();
const [dialogState, setDialogState] = useState<DialogState>({...});
const [deleteState, setDeleteState] = useState<DeleteState>({...});
const [formData, setFormData] = useState({ title: '', description: '' });
```

**Current Features:**

*Track Management:*
- ✅ List all tracks with order, title, description, chapter count
- ✅ Create new track via dialog (title + description)
- ✅ Edit track inline via dialog (reuses same dialog component)
- ✅ Delete track with confirmation (warns about cascade to chapters)
- ✅ Reorder tracks up/down with visual feedback (disabled at boundaries)
- ✅ Selection state with visual highlighting (ring-2 ring-blue-500)

*Chapter Management:*
- ✅ List chapters for selected track
- ✅ Create chapter in selected track
- ✅ Edit chapter inline
- ✅ Delete chapter with confirmation
- ✅ Reorder chapters up/down
- ✅ Status badge (draft/published) with color coding
- ✅ "Open" button navigates to Chapter Content Editor (currently alert placeholder)

*UX Patterns:*
- Dialog reuse: Single dialog for both create/edit operations (type: 'create' | 'edit')
- Optimistic rendering: Immediate state updates without server round-trip
- Empty states: "No tracks yet" and "Select a track to manage chapters"
- Action buttons: Edit, Move Up/Down, Delete on each card
- Boundary-aware: Up/down buttons disabled at list edges

**Component Dependencies:**
- shadcn/ui: Button, Card, Input, Textarea, Badge, Dialog, AlertDialog, ResizablePanel
- Lucide icons: Plus, Edit2, Trash2, ArrowUp, ArrowDown
- Mock data: `mock-tracks-data.ts` (15 sample tracks with generated chapters)

---

## 2. Requirements & Legacy Implementation Context

### Product Requirements

**User Story:**
> As a **content manager**, I need a **unified interface** to manage all tracks and their chapters in one view, so I can efficiently organize educational content without navigating between multiple pages.

**Core Requirements:**
1. **Single-page management** for both tracks AND chapters (replaces two-page legacy flow)
2. **Visual hierarchy** showing track → chapter relationship clearly
3. **Quick operations** for create, edit, delete, reorder without page transitions
4. **Status awareness** for published vs draft chapters (protect published from deletion)
5. **Efficient navigation** to Chapter Content Editor (5-tab editor) for detailed work

### Legacy Implementation Analysis

**Current Production Flow (3 Separate Pages):**

1. **ManageTracks.tsx** (`/manage`)
   - Lists all tracks in vertical card layout
   - Each track shows: title, description, order, chapter count
   - Actions: Create, Edit, Delete, Reorder (up/down buttons)
   - Click track → Navigate to `/manage/tracks/:trackId` (separate page)

2. **ManageChapters.tsx** (`/manage/tracks/:trackId`)
   - Lists chapters for ONE track (selected via route param)
   - Breadcrumb: "Content Management > [Track Title]"
   - Shows: title, description, order, status badge (draft/published)
   - Actions: Create, Edit, Delete, Reorder, Open Editor
   - Click "Open" → Navigate to `/manage/tracks/:trackId/chapters/:chapterId` (separate page)

3. **EditChapter.tsx** (`/manage/tracks/:trackId/chapters/:chapterId`)
   - Full-page 5-tab editor: Content, Audio, Segmentation, Mapping, Preview
   - Complex workflow for audio-text synchronization
   - Returns to ManageChapters on "Back"

**Legacy Pain Points:**
- ❌ **Context switching:** Need to navigate back/forth between tracks and chapters pages
- ❌ **No overview:** Can't see all tracks + chapters at once
- ❌ **Navigation overhead:** 3 clicks minimum to edit a chapter (Tracks page → Chapters page → Editor)
- ❌ **Cognitive load:** Hard to remember track structure when buried in chapters
- ❌ **Inefficient reordering:** Moving chapters between tracks requires delete + recreate

**Legacy API Endpoints (being phased out):**
```
GET  /api/tracks                    → List all tracks
POST /api/tracks                    → Create track
PUT  /api/tracks/:id                → Update track
DELETE /api/tracks/:id              → Delete track
POST /api/tracks/:id/move           → Reorder track

GET  /api/chapters/:trackId         → List chapters for track (note: path param, not query)
POST /api/chapters                  → Create chapter
PUT  /api/chapters/:id              → Update chapter
DELETE /api/chapters/:id            → Delete chapter
PATCH /api/chapters/:id/publish     → Change status
POST /api/chapters/:id/move         → Reorder chapter
```

**Legacy Tech Stack:**
- TanStack Query with simple string keys: `["/api/tracks"]`, `["/api/chapters/${trackId}"]`
- Direct mutations with `queryClient.invalidateQueries()`
- Modal components from `@/components/content-management` (custom modals, not dialogs)
- Separate TrackCard and ChapterCard components

---

## 3. Next Steps: Prototype Refinement Phase

### Why Refine Before Porting?

**Strategic Decision (Jan 6, 2026):**
- Phase 5.1 backend is **complete and tested** (25+ endpoints, smoke test passing)
- Prototype demonstrates the concept but has **UX decisions to finalize**
- **Better to refine the prototype NOW** than port half-baked UX and rework later

**Refinement Goals:**
1. **Finalize interaction patterns** (inline edit vs dialog, keyboard shortcuts, etc.)
2. **Define localStorage persistence** for user preferences (column widths, selected track)
3. **Establish default behaviors** (what to show on first load, empty state handling)
4. **Validate responsiveness** across mobile/tablet/desktop breakpoints
5. **Polish visual hierarchy** (spacing, colors, typography, focus states)
6. **Document component patterns** for consistent reuse in Phase 5.3+ (Chapter Editor port)

### Specific Decisions Needed

**Column Layout:**
- Should column widths persist in localStorage? (Current: resets to 40/60 on refresh)
- Should selected track persist across sessions?
- Mobile strategy: Stack columns vertically or use tabbed interface?

**Track Editing:**
- Keep dialog approach OR switch to inline editing (contentEditable)?
- Should edit mode lock the track from selection changes?

**Chapter Operations:**
- "Open" button: Should it open in same page OR new tab/modal?
- Moving chapter to another track: Show in Phase 5.2 or defer to Phase 7+?
- Keyboard shortcuts for power users (arrow keys for navigation, etc.)?

**Validation Rules:**
- What's the max title length? Description length?
- Should we show character counts?
- Real-time validation vs submit-time validation?

**Visual Polish:**
- Hover states: Current hover is subtle (hover:shadow-sm) — intensify?
- Focus indicators for keyboard navigation (currently lacking)
- Loading states: Skeleton loaders vs spinners?
- Empty state improvements (add illustration or call-to-action?)

---

## 4. Backend Integration Plan (Phase 5.1 → 5.2)

### New Backend Structure (Completed Jan 6, 2026)

**Namespaced Endpoints:** `/api/content/*`

All endpoints enforced with `requireContentManager` middleware (role-based access control).

**Track Operations:**
```typescript
GET    /api/content/tracks                     → List all tracks (ordered)
POST   /api/content/tracks                     → Create track {title, description}
PUT    /api/content/tracks/:trackId            → Update track
DELETE /api/content/tracks/:trackId            → Delete track
POST   /api/content/tracks/:trackId/move       → Reorder {direction: 'up' | 'down'}
```

**Chapter Operations:**
```typescript
GET    /api/content/tracks/:trackId/chapters   → List chapters for track
POST   /api/content/tracks/:trackId/chapters   → Create chapter {title, description}
GET    /api/content/chapters/:chapterId        → Get chapter details (includes track context)
PUT    /api/content/chapters/:chapterId        → Update chapter
DELETE /api/content/chapters/:chapterId        → Delete chapter (403 if published)
PATCH  /api/content/chapters/:chapterId/status → Publish/unpublish {status: 'draft' | 'published'}
POST   /api/content/chapters/:chapterId/move   → Reorder {direction: 'up' | 'down'} OR move to track {toTrackId: number}
```

**Additional Routes (for Phase 5.3 - Chapter Editor):**
- Segments: `/api/content/chapters/:id/segments?script=te`
- Audio: `/api/content/chapters/:id/audio`
- Mappings: `/api/content/chapters/:id/mappings`

**Response Formats:**

*Track List Response:*
```typescript
{
  id: number;
  title: string;
  description: string;
  order: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  chapterCount?: number;  // Aggregated count
}[]
```

*Chapter List Response:*
```typescript
{
  id: number;
  trackId: number;
  title: string;
  content: { te?: string; hi?: string; en?: string }; // JSONB multilingual
  status: 'draft' | 'published';
  order: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  hasContent?: boolean;
  audioFileCount?: number;
  segmentCount?: number;
}[]
```

### Port Plan: Prototype → Production (`new-ui`)

**Target Location:** `client/src/new-ui/content/pages/TracksAndChapters.tsx`

**Step-by-Step Migration:**

1. **Copy refined prototype UI structure**
   - Maintain ResizablePanel layout
   - Keep dialog patterns (create/edit reuse)
   - Preserve action button layouts

2. **Replace mock state with TanStack Query v5**
   ```typescript
   // Structured query keys (matches Phase 3-4 patterns)
   const { data: tracks = [] } = useQuery({
     queryKey: ['content', 'tracks'],
     queryFn: () => fetch('/api/content/tracks').then(r => r.json())
   });

   const { data: chapters = [] } = useQuery({
     queryKey: ['content', 'tracks', selectedTrackId, 'chapters'],
     queryFn: () => fetch(`/api/content/tracks/${selectedTrackId}/chapters`).then(r => r.json()),
     enabled: !!selectedTrackId
   });
   ```

3. **Implement mutations with optimistic updates**
   ```typescript
   const createTrackMutation = useMutation({
     mutationFn: (data) => fetch('/api/content/tracks', {method: 'POST', body: JSON.stringify(data)}),
     onMutate: async (newTrack) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries({ queryKey: ['content', 'tracks'] });
       
       // Snapshot previous value
       const previous = queryClient.getQueryData(['content', 'tracks']);
       
       // Optimistically update
       queryClient.setQueryData(['content', 'tracks'], old => [...old, {...newTrack, id: 'temp'}]);
       
       return { previous };
     },
     onError: (err, newTrack, context) => {
       // Rollback on error
       queryClient.setQueryData(['content', 'tracks'], context.previous);
     },
     onSettled: () => {
       // Refetch after success or error
       queryClient.invalidateQueries({ queryKey: ['content', 'tracks'] });
     }
   });
   ```

4. **Wire navigation to Chapter Editor**
   ```typescript
   // "Open Chapter" button
   onClick={() => setLocation(`/app/content/tracks/${trackId}/chapters/${chapterId}`)}
   ```

5. **Add auth guard to route**
   ```typescript
   // In AppShell route config
   <Route path="/app/content" component={() => {
     const { user } = useAuth();
     if (!user?.roles.includes('content_manager')) {
       return <Redirect to="/app" />;
     }
     return <TracksAndChapters />;
   }} />
   ```

6. **Integrate with AppShell layout**
   - Remove prototype's standalone header
   - Use AppShell's sidebar + topnav
   - Add breadcrumbs: `['Content Studio', 'Tracks & Chapters']`
   - Maintain responsive padding/spacing from design system

7. **Add error boundaries and loading states**
   - Skeleton loaders for initial fetch
   - Error toast notifications (via useToast hook)
   - Retry logic for failed mutations

8. **Persist user preferences**
   ```typescript
   // Column widths
   const [columnSizes, setColumnSizes] = useLocalStorage('content-studio-columns', {left: 40, right: 60});
   
   // Last selected track
   const [lastSelectedTrackId, setLastSelectedTrackId] = useLocalStorage('content-studio-selected-track', null);
   ```

**Key Differences from Legacy:**
- ✅ **Namespaced endpoints:** `/api/content/*` instead of `/api/tracks`, `/api/chapters`
- ✅ **Structured query keys:** `['content', 'tracks']` array format for hierarchy
- ✅ **Optimistic updates:** Instant feedback for reorder operations
- ✅ **Unified route:** Single page at `/app/content` (not `/manage` → `/manage/tracks/:id`)
- ✅ **Role enforcement:** `content_manager` only (admin doesn't get access)
- ✅ **Enhanced move:** Chapter can move between tracks (new `toTrackId` parameter)

---

## 5. Refinement Suggestions

### High Priority

**1. Persistent User Preferences**
- **Issue:** Column widths and selected track reset on refresh
- **Suggestion:** 
  - Store column ratios in localStorage (`content-studio-layout`)
  - Persist last selected track ID
  - On mount: Restore layout → validate track exists → fallback to first track

**2. Keyboard Navigation**
- **Issue:** No keyboard shortcuts, mouse-only interaction
- **Suggestion:**
  - Arrow Up/Down: Navigate tracks or chapters (context-aware based on focus)
  - Enter: Open selected chapter
  - Cmd/Ctrl + N: New track/chapter (context-aware)
  - Escape: Close dialogs
  - Tab: Move between track/chapter lists

**3. Mobile Responsiveness**
- **Issue:** ResizablePanel doesn't work well on mobile (< 768px)
- **Suggestion:**
  - Breakpoint detection: `useMediaQuery('(max-width: 768px)')`
  - Mobile: Stack vertically OR use tabs (Tracks tab | Chapters tab)
  - Tablet: Keep resizable but with better touch targets

**4. Visual Hierarchy Improvements**
- **Issue:** Selected track indicator is subtle, easy to miss
- **Suggestion:**
  - Selected track: Stronger border (ring-4 instead of ring-2) + subtle background tint
  - Hover states: More pronounced shadow (hover:shadow-md)
  - Focus states: Add outline-offset for keyboard users
  - Status badges: Use semantic colors (green for published, yellow for draft)

**5. Empty State Enhancements**
- **Issue:** "No tracks yet" is plain text, not engaging
- **Suggestion:**
  - Add illustration or icon
  - Call-to-action: "Get started by creating your first track"
  - Quick-start guide: "Tracks organize your content into chapters..."

### Medium Priority

**6. Inline Editing for Tracks**
- **Issue:** Dialog for track edit feels heavy for quick title changes
- **Suggestion:**
  - Double-click track title → contentEditable mode
  - Blur or Enter → save
  - Escape → cancel
  - Keep dialog for description edits (more space needed)

**7. Batch Operations**
- **Issue:** Can only delete one track/chapter at a time
- **Suggestion:**
  - Checkbox selection mode (optional, toggle via toolbar button)
  - Bulk delete with single confirmation
  - Bulk status change (publish/unpublish multiple chapters)

**8. Search & Filter**
- **Issue:** No way to find specific track/chapter in large lists
- **Suggestion:**
  - Search bar at top of each column (filters by title)
  - Filter chapters by status (All | Draft | Published)
  - Clear filter indicator

**9. Drag & Drop Reordering**
- **Issue:** Up/down buttons work but feel tedious for large moves
- **Suggestion:**
  - Implement drag handles (@dnd-kit/core library)
  - Allow dragging tracks within track list
  - Allow dragging chapters within chapter list
  - Visual drop zones with blue highlight

**10. Confirmation Patterns**
- **Issue:** Delete confirmation is generic
- **Suggestion:**
  - Show impact: "Delete track 'Rigveda Mantras'? This will also delete 12 chapters."
  - Published chapter deletion: Show stronger warning (red badge)
  - Type-to-confirm for destructive actions: "Type 'DELETE' to confirm"

### Low Priority (Nice to Have)

**11. Undo/Redo Stack**
- Local history for last 10 actions
- Toast with "Undo" button after delete

**12. Preview Pane**
- Third column (optional, collapsible) showing chapter preview
- Shows content snippet, audio count, segment count

**13. Keyboard Shortcuts Help**
- `?` key → show keyboard shortcuts overlay
- Tooltips on buttons with keyboard hints

**14. Quick Actions Menu**
- Right-click context menu on tracks/chapters
- Faster access to Edit, Delete, Move

**15. Analytics Indicators**
- Track engagement: "12 students enrolled"
- Chapter completion rate: "78% completion"

---

## Conclusion

**Current State:** Working prototype with solid UX foundation, ready for design refinement.

**Immediate Next Steps:**
1. Review refinement suggestions with UI/UX developer
2. Prioritize which features to implement in refined prototype
3. Iterate on prototype until UX feels polished
4. Document finalized patterns (component API, interaction model)
5. Port refined prototype to `new-ui` with backend integration (Phase 5.2)

**Success Criteria for Refinement:**
- ✅ Column layout feels intuitive and responsive across devices
- ✅ User preferences persist across sessions
- ✅ Keyboard navigation works smoothly
- ✅ Visual hierarchy clearly shows track → chapter relationship
- ✅ Create/edit/delete flows are frictionless
- ✅ Edge cases handled gracefully (empty states, errors, loading)

**Timeline:**
- Refinement: 1-2 days (UI/UX collaboration)
- Port to new-ui: 1-2 days (Phase 5.2 implementation)
- **Total:** Phase 5.2 completion by Jan 8-9, 2026

---

**Questions for UI/UX Developer:**
1. Column layout: Prefer resizable or fixed ratio? Mobile: stacked or tabs?
2. Track editing: Dialog or inline editing?
3. Chapter "Open": Same page or new tab?
4. Priority order for suggested refinements?
5. Any additional UX patterns from your experience with similar interfaces?
