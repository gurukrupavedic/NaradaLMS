# Chapter Content Page - Phased Development Plan

**Document Version:** 2.0  
**Last Updated:** January 9, 2026  
**Status:** Active Development  
**Current Phase:** Phase 7 - Audio/Mapping Enhancements

---

## Document Purpose

This is the **master phased plan** for Chapter Content Page development. It consolidates:
- ✅ Completed phases (Phases 1-6)
- 🎯 Active phase with recent scope additions (Phase 7 Extended)
- 📋 Future phases (Phases 8+)

All changes to scope or implementation approach should be reflected here as the **single source of truth**.

---

## Quick Navigation

- [Phase Status Summary](#phase-status-summary)
- [Completed Phases (1-6)](#completed-phases-1-6)
- [Active Phase: Phase 7 Extended](#phase-7-extended-audiomapping-enhancements)
- [Future Phases (8+)](#future-phases-8)
-[Related Documentation](#related-documentation)

---

## Phase Status Summary

| Phase | Name | Status | Duration | Completion Date |
|-------|------|--------|----------|-----------------|
| Phase 1 | Foundation & Context | ✅ Complete | 1 day | Jan 8, 2026 |
| Phase 2 | Content Tab | ✅ Complete | 1 day | Jan 8, 2026 |
| Phase 3 | Media Tab | ✅ Complete | 0.5 days | Jan 8, 2026 |
| Phase 4 | Segmentation Tab | ✅ Complete | 1 day | Jan 8, 2026 |
| Phase 5 | Mapping Tab | ✅ Complete | 1 day | Jan 9, 2026 |
| Phase 6 | Preview Tab | ✅ Complete | 0.5 days | Jan 9, 2026 |
| **Phase 7** | **Audio/Mapping Enhancements** | 🎯 **In Progress** | 3-4 days | **Est. Jan 13** |
| Phase 8 | Components & Cleanup | 📋 Planned | 2 days | TBD |
| Phase 9 | Final Testing & Verification | 📋 Planned | 1 day | TBD |

**Overall Progress:** 6 / 9 phases complete (66%)

---

## Completed Phases (1-6)

### Phase 1: Foundation & Context ✅

**Completed:** January 8, 2026  
**Duration:** 1 day

**Deliverables:**
- Created `ChapterEditorContext` provider
- Created `AudioPlayerContext` provider
- Implemented `useChapterEditor` hook
- Implemented `useAudioPlayer` hook
- Set up context structure for cross-tab state sharing

**Files Created:**
- `client/src/new-ui/content/context/ChapterEditorContext.tsx`
- `client/src/new-ui/content/context/AudioPlayerContext.tsx`

---

### Phase 2: Content Tab ✅

**Completed:** January 8, 2026  
**Duration:** 1 day

**Deliverables:**
- Migrated TipTap rich text editor
- Implemented script switcher (Telugu/Hindi/English)
- Added auto-save with debounce
- Created save status indicator
- Enforced publish lock (read-only when published)

**Files Created:**
- `client/src/new-ui/content/components/ContentTab/index.tsx`
- `client/src/new-ui/content/hooks/useContentEditor.ts`

---

### Phase 3: Media Tab ✅

**Completed:** January 8, 2026  
**Duration:** 0.5 days

**Deliverables:**
- Audio file upload (drag-drop + browse)
- File list with metadata display
- Inline filename editing
- File deletion with confirmation
- Audio playback preview

**Files Created:**
- `client/src/new-ui/content/components/MediaTab/index.tsx`
- `client/src/new-ui/content/hooks/useAudioManagement.ts`

---

### Phase 4: Segmentation Tab ✅

**Completed:** January 8, 2026  
**Duration:** 1 day

**Deliverables:**
- Text selection panel with annotation layer
- Segment creation via click-drag
- Segment list with reordering
- Delete segments (with mapping check)
- Script-specific segmentation

**Files Created:**
- `client/src/new-ui/content/components/SegmentationTab/SegmentationTab.tsx`
- `client/src/new-ui/content/hooks/useTextSegmentationEditor.ts`

**Known Issues:**
- DnD reordering caused React Hooks violation (deferred to Phase 7.1)

---

### Phase 5: Mapping Tab ✅

**Completed:** January 9, 2026  
**Duration:** 1 day

**Deliverables:**
- Progressive mapping session (click-when-heard)
- Audio file selector
- Audio player controls
- Segment mapping grid with visual states
- Create/edit/delete mappings
- Segment playback preview

**Files Created:**
- `client/src/new-ui/content/components/MappingTab/MappingTab.tsx`
- `client/src/new-ui/content/hooks/useAudioMapping.ts`

**Components Reused:**
- `ProgressiveMapper` (from legacy)
- `SegmentMappingGrid` (from legacy)

---

### Phase 6: Preview Tab ✅

**Completed:** January 9, 2026  
**Duration:** 0.5 days

**Deliverables:**
- Learn Mode toggle (interactive vs HTML view)
- Audio file selector
- Audio player controls
- Script selector
- Segmented text display with click-to-play
- Matching badge counts

**Files Created:**
- `client/src/new-ui/content/components/PreviewTab/index.tsx`

**Components Reused:**
- `SegmentedTextDisplay` (from legacy)
- `AudioPlayerControls` (from new-ui)

---

## Phase 7 Extended: Audio/Mapping Enhancements

**Status:** 🎯 Active Development  
**Started:** January 9, 2026  
**Estimated Completion:** January 13, 2026  
**Duration:** 3-4 days

### Overview

Phase 7 has been **significantly expanded** based on iterative planning and user feedback. The original scope (cleanup + bug fixes) has evolved into a comprehensive enhancement of the audio management and mapping workflow.

---

### Sub-Phase 7.1: Segmentation Tab Bug Fixes ✅

**Status:** COMPLETE (January 9, 2026)

**Objective:** Fix React Hooks violation in `SegmentList.tsx` that caused tab crashes.

**Problem:**
- `useSortable` hook was called inside a `.map()` loop
- Violated React's "Rules of Hooks" (hooks must be called in same order)
- Caused application crash when opening Segmentation Tab

**Solution:**
- Extracted `SortableSegmentItem` as separate component
- Moved `useSortable` call inside component (outside loop)
- Preserved all DnD functionality

**Files Modified:**
- `client/src/new-ui/content/components/SegmentationTab/SegmentationTab.tsx`

---

### Sub-Phase 7.2: Typography & Layout Refinements ✅

**Status:** COMPLETE (January 9, 2026)

**Objective:** Polish UI consistency across all tabs.

**Changes:**
1. Applied JIMS Telugu font to segment cards
2. Matched segment card font size to main content (16px)
3. Equalized left/right panel header heights
4. Set default panel split to 50/50
5. Fixed text color in segment cards (neutral-800)

**Files Modified:**
- `client/src/new-ui/content/components/SegmentationTab/SegmentationTab.tsx`
- `client/src/components/design-system/MappingSegmentCard.tsx`

---

### Sub-Phase 7.3: File Upload Integration (Mapping Tab)

**Status:** 🎯 **IN PROGRESS** - Planning Complete  
**Estimated Duration:** 2 days

#### Objective

Add full audio file management (upload, rename, delete) directly in the Mapping Tab left column, eliminating the need for users to switch to Media Tab (Step 2) for most workflows.

#### Strategic Impact

**Current Workflow (5 steps):**
1. Content → Write text
2. **Audio** → Upload & manage files ← Requires tab switch
3. Segmentation → Break text into segments
4. **Mapping** → Connect segments to audio ← Back to audio work
5. Preview → Review

**Future Workflow (4 steps):**
1. Content → Write text
2. Segmentation → Break text into segments
3. **Mapping** → Upload, manage, AND map audio ← All audio work in one place
4. Preview → Review

#### Technical Architecture

**New Component:**  
`AudioFileManager` - Composite component that encapsulates all audio management

**Component Structure:**
```
AudioFileManager
├── File Selection & Upload Section
│   ├── Audio file dropdown (when files exist)
│   ├── "+" button for additional uploads
│   └── Empty state with upload prompt (when no files)
├── File Details Card (compact)
│   ├── Filename with inline rename
│   ├── Metadata (duration, file size)
│   └── Delete button
├── Audio Player Controls
│   └── AudioPlayerControls (existing, unchanged)
└── Additional Controls Slot
    └── Mapping session controls (passed via prop)
```

**Key Design Decisions:**
1. **Compact File Details Card (~80px height)**
   - Inline rename with keyboard shortcuts (Enter/Escape)
   - Single-line metadata display
   - Small delete button with confirmation
   
2. **Vertical Space Budget:**
   - File selector: ~50px
   - File details: ~80px
   - Audio player: ~150px
   - Session controls: ~120px
   - **Total: ~400px** (comfortable fit in left panel)

3. **Upload UX:**
   - **Empty state:** Full dropzone with large "Upload" button
   - **Has files:** Compact "+" icon button next to dropdown
   - Auto-select newly uploaded file
   - Loading indicator during upload

4. **Separation of Concerns:**
   - `AudioPlayerControls` remains pure (no changes needed!)
   - File management wraps around player
   - `useAudioManagement` hook handles all CRUD (already built!)

#### Implementation Plan

**Files to Create:**
1. `client/src/new-ui/content/components/AudioFileManager/AudioFileManager.tsx`
2. `client/src/new-ui/content/components/AudioFileManager/index.ts`

**Files to Modify:**
1. `client/src/new-ui/content/components/MappingTab/MappingTab.tsx`
   - Replace standalone file selector + player
   - Integrate `<AudioFileManager>` component
   - Pass session controls as additional slot

**No Changes Needed:**
- ✅ `AudioPlayerControls.tsx` - Already decoupled from file selection
- ✅ `useAudioManagement.ts` - Already has upload/delete/rename logic
- ✅ `useAudioMapping.ts` - No changes required

#### Feature Checklist

**Upload:**
- [ ] Upload audio file when no files exist (empty state)
- [ ] Upload additional files when files exist (+ button)
- [ ] Auto-select newly uploaded file
- [ ] Show upload progress indicator
- [ ] Validate file type and size (100MB max)

**Rename:**
- [ ] Click pencil icon to enter edit mode
- [ ] Inline text input with auto-focus
- [ ] Save on Enter key
- [ ] Cancel on Escape key
- [ ] Update backend via `useAudioManagement`

**Delete:**
- [ ] Show delete button in file details card
- [ ] Confirm deletion with dialog
- [ ] Warn about associated mappings removal
- [ ] Reset file selection after delete
- [ ] Handle deleting last file (return to empty state)

**UI/UX:**
- [ ] Layout is compact (no overflow)
- [ ] Metadata displays correctly (duration, size)
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Published chapters disable all operations

#### Testing Plan

**Functional Tests:**
- Test upload in empty state
- Test upload with existing files
- Test file switching via dropdown
- Test rename with keyboard shortcuts
- Test delete confirmation
- Test delete last file
- Test published chapter restrictions

**Edge Cases:**
- Upload while mapping session active
- Delete currently playing file
- Rename with empty string
- Network error during upload
- Invalid file type
- File size exceeds 100MB

#### Success Criteria

1. ✅ Users can upload files without leaving Mapping tab
2. ✅ Users can rename files inline without dialogs
3. ✅ Users can delete files with proper confirmation
4. ✅ File metadata is visible and accurate
5. ✅ Layout fits comfortably in left panel
6. ✅ All existing functionality preserved
7. ✅ Published chapter protection works

#### Documentation

**Implementation Plan:**  
[phase7_extended_implementation_plan.md](file:///C:/Users/kashy/.gemini/antigravity/brain/e795736b-453e-4935-a0dd-286b387bdd06/phase7_extended_implementation_plan.md)

---

### Sub-Phase 7.4: Component Extraction & Cleanup

**Status:** 📋 Planned

**Objective:** Extract reusable components and clean up technical debt.

**Planned Work:**
1. Extract `ContentTab` into modular components
2. Create `useContentEditor` custom hook
3. Extract `MediaTab` file management components
4. Standardize error handling across tabs
5. Add loading skeletons where missing
6. Improve TypeScript types (remove `any`)

---

## Future Phases (8+)

### Phase 8: Advanced Features

**Planned Enhancements:**
- Bulk audio file upload
- Audio trimming/editing tools
- Waveform visualization
- Keyboard shortcuts for power users
- Batch segment operations
- Export/import functionality

### Phase 9: Final Testing & Release

**Testing Checklist:**
- End-to-end workflow testing
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility audit (WCAG 2.1 AA)
- Performance optimization
- User acceptance testing

---

## Technical Decisions Log

### Decision: Keep AudioPlayerControls Pure

**Date:** January 9, 2026  
**Context:** Planning file upload integration  
**Decision:** Do NOT modify `AudioPlayerControls` component  
**Rationale:**
- Already properly decoupled from file selection
- Reused in 3 places (Mapping, Preview, LearnChapterPage)
- Props-based design is clean and testable
- Changes would create regression risk

**Impact:** New `AudioFileManager` component wraps existing player

---

### Decision: useAudioManagement Hook Reuse

**Date:** January 9, 2026  
**Context:** Planning file upload integration  
**Decision:** Reuse existing `useAudioManagement` hook without modifications  
**Rationale:**
- Already has upload/delete/rename functionality
- Already battle-tested in Media Tab
- Proper validation and error handling built-in
- Query invalidation logic works correctly

**Impact:** Zero changes needed to hook; just wire in new UI

---

### Decision: Modular Architecture Over Monolith

**Date:** January 8, 2026  
**Context:** Chapter Content Page refactoring approach  
**Decision:** Split 2,700-line component into 15-20 focused components  
**Rationale:**
- Improved maintainability
- Better testability
- Clearer ownership
- Easier onboarding for new developers

**Impact:** Longer initial development, but much faster iteration

**Reference:** [ChapterContentPage-Migration-Architecture.md](ChapterContentPage-Migration-Architecture.md)

---

## Dependencies & Blockers

### Current Blockers

*None - Phase 7.3 implementation can proceed*

### Dependencies

| Phase | Depends On | Reason |
|-------|------------|--------|
| Phase 7.3 | Phase 7.1, 7.2 complete | Need stable tab before adding features |
| Phase 7.4 | Phase 7.3 complete | Need all features before refactoring |
| Phase 8 | Phase 7 complete | Advanced features build on stable foundation |

---

## Success Metrics

### Phase-Level Metrics

**Phase 7 Success Criteria:**
- ✅ All tabs functional and responsive
- ✅ Zero React Hooks violations
- ✅ UI polish complete (typography, layout, spacing)
- 🎯 File upload in Mapping tab working
- 📋 Component extraction complete
- 📋 Zero TypeScript errors

**Overall Project Metrics:**
- Code reduction: 2,700 lines → ~300 main + 15-20 focused components
- Maintainability: Hours → minutes for tab changes
- Test coverage: 0% → 80%+ (goal)
- Performance: No regressions from legacy

---

## Related Documentation

### Architecture & Planning
- [ChapterContentPage-Migration-Architecture.md](ChapterContentPage-Migration-Architecture.md) - Detailed technical architecture
- [ChapterContentPage-Phase-Dependencies.md](ChapterContentPage-Phase-Dependencies.md) - Dependency graph
- [mvp-implementation-plan.md](mvp-implementation-plan.md) - Overall MVP status

### Implementation Details
- [phase7_extended_implementation_plan.md](../../.gemini/antigravity/brain/e795736b-453e-4935-a0dd-286b387bdd06/phase7_extended_implementation_plan.md) - Phase 7.3 technical spec

### Reference
- [product-guide.md](../product-guide.md) - Product requirements
- [domain-requirements.md](../domain-requirements.md) - Domain model

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| Jan 9, 2026 | 2.0 | Consolidated phased plan with Phase 7 extended scope | AI Technical Architect |
| Jan 9, 2026 | 1.2 | Added Phase 7.3 (File Upload Integration) | AI Technical Architect |
| Jan 9, 2026 | 1.1 | Completed Phase 7.1 (Segmentation fixes) and 7.2 (UI polish) | AI Technical Architect |
| Jan 8, 2026 | 1.0 | Initial phased plan created | AI Technical Architect |

---

**Living Document:** This plan evolves as implementation progresses. All scope changes, architectural decisions, and progress updates should be reflected here immediately to maintain accuracy.
