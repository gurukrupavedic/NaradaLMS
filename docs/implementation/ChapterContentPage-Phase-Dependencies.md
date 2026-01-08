# Phase Dependency Matrix - ChapterContentPage Migration

## Quick Reference Guide

This matrix shows what each phase provides and what it depends on from previous phases.

---

## Phase 0: Foundation ✅

### Provides:
- ✅ File structure (folders for components, hooks, context, utils)
- ✅ Role guard implementation (`useRoleGuard(['content_manager'])`)
- ✅ React Query setup with chapter data fetching
- ✅ Toast notifications setup (`useToast()`)
- ✅ Loading states (Skeleton UI)
- ✅ Error states (Alert component)
- ✅ Dark mode support
- ✅ Route parameters (`chapterId`, `trackId`)
- ✅ Proper overflow management
- ✅ 5-tab skeleton structure

### Deliverables:
- `ChapterContentPage.tsx` (~150 lines)
- `ChapterContentPage.legacy.tsx` (renamed, reference only)
- Empty folder structure

### Don't Start Phase 1 Until:
- [ ] All 5 tabs render with placeholders
- [ ] Loading skeleton appears on initial load
- [ ] Error alert appears for invalid chapter ID
- [ ] Role guard redirects non-content-managers

---

## Phase 1: Chapter Header & Metadata

### Depends On (from Phase 0):
- ✅ Role guard
- ✅ React Query setup
- ✅ Toast notifications
- ✅ Route parameters

### Provides:
- ✅ `ChapterEditorContext` (moves query from Phase 0, adds `refetch`)
- ✅ `useChapterEditor()` hook
- ✅ `useChapterMetadata()` custom hook
- ✅ `ChapterHeader` component (replaces Phase 0 placeholder)
- ✅ Inline metadata editing
- ✅ Publish/Unpublish with confirmation dialog
- ✅ Status badge display

### Migration Notes:
- **Move** `useQuery` from `ChapterContentPage.tsx` (Phase 0) → `ChapterEditorContext.tsx`
- **Replace** placeholder header div → `<ChapterHeader />` component
- **Wrap** ChapterContentPage with `<ChapterEditorProvider>`

### Don't Start Phase 2 Until:
- [ ] Context provider wraps the app and provides chapter data
- [ ] Header shows chapter title dynamically
- [ ] Edit button enables inline editing
- [ ] Publish/unpublish workflow works with confirmation dialog

---

## Phase 2: Content Tab (Step 1)

### Depends On (from Phase 0 & 1):
- ✅ `ChapterEditorContext` (provides `chapter`, `isPublished`)
- ✅ Toast notifications
- ✅ Dark mode support

### Provides:
- ✅ `useContentEditor` custom hook
- ✅ `ContentTab` component
- ✅ `ScriptSwitcher` component
- ✅ `AutoSaveIndicator` component
- ✅ `ContentEditor` wrapper around RichTextEditor
- ✅ Auto-save with 15-second debounce
- ✅ Multi-language support (te/hi/en)
- ✅ Read-only mode when published

### Migration Notes:
- **Replace** Phase 0 "Content Tab - Coming in Phase 2" placeholder → `<ContentTab />` component
- **Import** `RichTextEditor` from existing codebase
- **Use** `chapter.content` from context (don't re-fetch)

### Don't Start Phase 3 Until:
- [ ] Can edit text in all 3 languages
- [ ] Auto-save triggers after 15 seconds of inactivity
- [ ] Script switcher changes editor content
- [ ] Editor becomes read-only when chapter is published

---

## Phase 3: Media Tab (Step 2)

### Depends On (from Phase 0 & 1):
- ✅ `ChapterEditorContext` (provides `isPublished`, `chapterId`)
- ✅ Toast notifications
- ✅ React Query for mutations

### Provides:
- ✅ `useAudioManagement` custom hook
- ✅ `MediaTab` component
- ✅ `AudioUploader` component (drag-drop + file input)
- ✅ `AudioFileList` component
- ✅ `AudioFileItem` component
- ✅ File upload mutation
- ✅ File delete mutation
- ✅ Filename edit mutation

### Migration Notes:
- **Replace** Phase 0 "Media Tab - Coming in Phase 3" placeholder → `<MediaTab />` component
- **Use** `isPublished` from context to disable uploads

### Don't Start Phase 4 Until:
- [ ] Can upload audio files (drag-drop and button)
- [ ] Files appear in list with correct metadata
- [ ] Can edit filename inline
- [ ] Can delete files
- [ ] Upload is disabled when chapter is published

---

## Phase 4: Preview Tab (Step 5)

### Depends On (from Phase 0, 1, & 2-3):
- ✅ Audio files (from Phase 3)
- ✅ Text segments (will exist after Phase 6)
- ✅ Mappings (will exist after Phase 7)

### Provides:
- ✅ `AudioPlayerContext` (NEW - shared audio player)
- ✅ `usePreviewPlayer` custom hook
- ✅ `PreviewTab` component
- ✅ `PreviewPlayer` component
- ✅ Segmented playback logic
- ✅ Learn mode toggle

### Migration Notes:
- **Replace** Phase 0 "Preview Tab - Coming in Phase 4" placeholder → `<PreviewTab />` component
- **Reuse** existing `SegmentedTextDisplay` component
- **Create** `AudioPlayerContext` for shared audio state

### Don't Start Phase 5 Until:
- [ ] Preview tab renders
- [ ] Audio player loads (even without mappings yet)
- [ ] Context provides audio player to other tabs

---

## Phase 5: Audio Player Context

### Depends On (from Phase 4):
- ✅ `AudioPlayerContext` created in Phase 4

### Provides:
- ✅ Shared audio player instance across all tabs
- ✅ `useAudioPlayer()` hook
- ✅ Playback controls (play, pause, seek)
- ✅ Segment boundary enforcement

### Migration Notes:
- **Wrap** ChapterContentPage with both:
  - `<ChapterEditorProvider>` (Phase 1)
  - `<AudioPlayerProvider>` (Phase 5)
- **Update** MediaTab, MappingTab, PreviewTab to use shared player

### Don't Start Phase 6 Until:
- [ ] Audio player context is accessible from all tabs
- [ ] Multiple tabs can control the same audio instance
- [ ] Playback state persists across tab switches

---

## Phase 6: Text Segmentation Tab (Step 3) ⚠️ CRITICAL

### Depends On (from Phase 0, 1, 2):
- ✅ `ChapterEditorContext` (provides `chapter.content`, `isPublished`)
- ✅ Content from Phase 2 (text must exist to segment)
- ✅ Toast notifications
- ✅ React Query

### Provides:
- ✅ `useTextSegmentation` custom hook
- ✅ `SegmentationTab` component
- ✅ `TextSelectionPanel` component
- ✅ `SegmentCreator` component
- ✅ `SegmentList` component
- ✅ `SegmentItem` component
- ✅ Text selection logic
- ✅ Overlap detection
- ✅ Segment CRUD operations

### Migration Notes:
- **Replace** Phase 0 "Segmentation Tab - Coming in Phase 6" placeholder → `<SegmentationTab />` component
- **Port carefully** from legacy EditChapter.tsx lines 2100-2300
- **Test extensively** - this is critical functionality

### Don't Start Phase 7 Until:
- [ ] Can select text with mouse
- [ ] Can create segment from selection
- [ ] Segments appear in list
- [ ] Can edit segment positions
- [ ] Can delete segments
- [ ] Overlap validation prevents bad segments
- [ ] Works in all 3 languages (te/hi/en)

---

## Phase 7: Audio Mapping Tab (Step 4) ⚠️ CRITICAL

### Depends On (from Phase 3, 5, 6):
- ✅ Audio files (Phase 3)
- ✅ `AudioPlayerContext` (Phase 5)
- ✅ Text segments (Phase 6)
- ✅ `ChapterEditorContext`

### Provides:
- ✅ `useAudioMapping` custom hook
- ✅ `MappingTab` component
- ✅ `MappingControls` component
- ✅ `MappingGrid` component
- ✅ Reuse existing `ProgressiveMapper` component
- ✅ Mapping CRUD operations
- ✅ Segment-to-timestamp association

### Migration Notes:
- **Replace** Phase 0 "Mapping Tab - Coming in Phase 7" placeholder → `<MappingTab />` component
- **Reuse** `ProgressiveMapper.tsx` if it exists
- **Port carefully** from legacy EditChapter.tsx lines 2300-2500
- **Test extensively** - this is critical functionality

### Don't Start Phase 8 Until:
- [ ] Can see list of text segments
- [ ] Can map segment to audio timestamp
- [ ] Audio plays only within mapped boundaries
- [ ] Can edit mapping timestamps
- [ ] Can delete mappings
- [ ] Progressive mapper workflow functions correctly

---

## Phase 8: Side-by-Side Validation

### Depends On (ALL previous phases):
- ✅ All 5 tabs implemented
- ✅ All functionality working

### Provides:
- ✅ Comparison testing results
- ✅ Parity checklist
- ✅ Bug fixes for gaps

### Tasks:
- Compare old vs new page feature-by-feature
- Test all user workflows
- Fix any discrepancies
- Document differences (if any)

### Don't Start Phase 9 Until:
- [ ] All features from legacy page work in new page
- [ ] User acceptance testing complete
- [ ] No critical bugs

---

## Phase 9: Final Testing & Switchover

### Depends On (Phase 8):
- ✅ Parity confirmed
- ✅ All bugs fixed

### Provides:
- ✅ Production-ready ChapterContentPage
- ✅ Legacy file deleted
- ✅ Routes finalized

### Tasks:
- Final production testing
- Switch route to new page
- Monitor for issues (1 week)
- Delete legacy file

---

## Critical Handoffs

### Phase 0 → Phase 1:
- **Query migration:** Move `useQuery` from page → context
- **Header replacement:** Replace div → `<ChapterHeader />`

### Phase 1 → Phase 2:
- **Context usage:** Use `chapter.content` from context
- **Published state:** Use `isPublished` from context

### Phase 2 → Phase 6:
- **Content dependency:** Segmentation needs text from Phase 2

### Phase 3 → Phase 7:
- **Audio dependency:** Mapping needs audio files from Phase 3

### Phase 6 → Phase 7:
- **Segment dependency:** Mapping needs segments from Phase 6

### Phase 5 → (6 & 7):
- **Player context:** Both use shared audio player

---

## Quick Start Checklist

**Before ANY phase:**
1. [ ] Review phase prerequisites
2. [ ] Verify previous phase deliverables are complete
3. [ ] Read "Migration Notes" for the phase
4. [ ] Check "Don't Start Until" checklist

**After EVERY phase:**
1. [ ] Run all tests from phase checklist
2. [ ] Git commit with phase name
3. [ ] Update artifact task.md
4. [ ] Mark phase complete in this document

---

**End of Dependency Matrix**
