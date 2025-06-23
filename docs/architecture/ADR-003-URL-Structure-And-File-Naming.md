# ADR-003: URL Structure and File Naming Strategy

**Date:** January 21, 2025  
**Status:** Planning Document  
**Type:** Architecture Decision Record

## Executive Summary

This document captures the comprehensive analysis and decisions made regarding the URL structure and file naming conventions for the Vedic LMS content management system. While the current implementation works well, we identified opportunities for cleaner architecture that should be implemented during future code cleanup phases.

## Current State Analysis

### Current Working Structure
```
URLs:
/manage → ContentManagement.tsx (track list)
/manage/tracks/1 → TrackChapters.tsx (chapter list)
/manage/tracks/1/chapters/2 → ChapterEditor.tsx (content editing)

Files:
client/src/pages/ContentManagement.tsx
client/src/pages/TrackChapters.tsx  
client/src/pages/ChapterEditor.tsx
```

### Current Navigation Flow
```
Dashboard → Manage Content → /manage (track list)
Click track → /manage/tracks/1 (chapter list)
Click chapter → /manage/tracks/1/chapters/2 (content editing)
✓ Back buttons work at every level
✓ Clean routing without hard redirects
✓ Proper browser history support
```

## Proposed Improved Architecture

### Refined URL Structure
```
Management Flow:
/manage/tracks → ManageTrackList.tsx (reorder, delete, add)
/manage/tracks/1 → ManageChapterList.tsx (chapter CRUD)
/manage/tracks/1/chapters/2 → EditChapter.tsx (content editing)

Learning Flow (Future):
/learn/tracks → LearnTrackList.tsx (progress, recommendations)
/learn/tracks/1 → LearnChapterList.tsx (progress, study flow)
/learn/tracks/1/chapters/2 → LearnChapter.tsx (reading/study interface)
```

### Architectural Rationale

#### Explicit Context Separation
- `/manage/tracks` vs `/learn/tracks` - crystal clear context
- No ambiguity about which flow user is in
- Supports completely different feature sets

#### Consistent Naming Convention
- `ManageTrackList` / `LearnTrackList` - perfectly parallel
- `ManageChapterList` / `LearnChapterList` - same pattern
- Component names immediately describe both context and function

#### Future-Proof Design
- Management: Bulk operations, content analytics, SEO, publishing workflows
- Learning: Progress tracking, study streaks, difficulty adaptation, social features
- Performance optimization differs between flows
- User mental models are fundamentally different

## Technical Implementation Blockers

### Critical Breaking Points Identified

#### 1. Hardcoded Route Patterns
```typescript
// ChapterEditor.tsx line 96
const [, params] = useRoute("/manage/tracks/:trackId/chapters/:chapterId");
```
**Impact**: Changing URL structure breaks parameter extraction immediately
**Risk Level**: HIGH - causes undefined params, breaking entire editor

#### 2. Import Chain Dependencies
```typescript
// ChapterEditor.tsx lines 47-49
import { AnnotationLayer } from "@/components/text-segmentation/AnnotationLayer";
import { SegmentPanel } from "@/components/text-segmentation/SegmentPanel";
import { ProgressiveMapper } from "@/components/audio-mapping/ProgressiveMapper";
```
**Impact**: These experimental components must exist or editor breaks
**Risk Level**: MEDIUM - TypeScript compilation errors

#### 3. Shared Component Interfaces
```typescript
// /components/content-management/index.ts
export { TrackCard } from './TrackCard';
export { ChapterCard } from './ChapterCard';
export { ConfirmationModal } from './ConfirmationModal';
```
**Impact**: Interface changes to shared components break multiple pages
**Risk Level**: MEDIUM - cascading failures

#### 4. Navigation setLocation Calls
Multiple locations with hardcoded paths:
- `setLocation("/manage")` - in TrackChapters back button
- `setLocation("/manage/tracks/${trackId}")` - in ContentManagement
- `setLocation("/manage/tracks/${trackId}/chapters/${chapterId}")` - in TrackChapters

**Impact**: Navigation calls need minimal updates (mostly adding /tracks prefix)
**Risk Level**: VERY LOW - current URLs mostly match target structure

### Historical Migration Failure Analysis

Previous migration attempt failed because:
1. **Route pattern mismatches** - useRoute hooks stopped working
2. **Import resolution failures** - missing experimental components
3. **Incomplete reference updates** - some navigation calls not updated
4. **Testing gaps** - changes not verified incrementally

## Safe Migration Strategy (Future Implementation)

### Recommended Approach: Surgical URL Changes Only

#### Phase 1: URL Pattern Updates (No File Renames)
```
Current → Target (URLs only)
/manage → /manage/tracks (add explicit tracks path)
/manage/tracks/:trackId → /manage/tracks/:trackId (keep current)
/manage/tracks/:trackId/chapters/:chapterId → /manage/tracks/:trackId/chapters/:chapterId (keep current)
```

#### Implementation Steps
1. **App.tsx route updates** - update route patterns
2. **ChapterEditor useRoute update** - fix parameter extraction
3. **TrackChapters useRoute update** - fix parameter extraction  
4. **Navigation setLocation updates** - update all navigation calls
5. **Test each change individually** - verify no breakage

#### Phase 2: File Renames (Optional Later)
Only after URL changes work perfectly:
```
ContentManagement.tsx → ManageTrackList.tsx
TrackChapters.tsx → ManageChapterList.tsx
ChapterEditor.tsx → EditChapter.tsx
```

### Alternative Approach: Complete Restructure

#### Create New Components Strategy
1. Create new files with target names
2. Copy existing code with new route patterns
3. Add new routes alongside existing ones
4. Test new structure thoroughly
5. Update App.tsx to use new components
6. Remove old routes and files

**Risk Assessment**: LOWER risk but more work
**Benefit**: Easy rollback (delete new files)
**Drawback**: Temporary code duplication

## Dependencies That Must Be Resolved First

### 1. Experimental Component Migration
- Text segmentation components must be fully migrated to production
- Audio mapping components must be stable
- All import paths must resolve correctly

### 2. Shared Component Stability
- TrackCard, ChapterCard, ConfirmationModal interfaces locked
- No breaking changes to shared component APIs
- Proper TypeScript interface definitions

### 3. Backend API Consistency
- All endpoints return consistent data structures
- No breaking changes to API responses during migration
- Proper error handling for all data operations

### 4. Code Cleanup Prerequisites
Based on our conversation, these should be addressed first:
- Simplify ChapterEditor complexity (1400+ lines)
- Consolidate experimental vs production components
- Standardize component prop interfaces
- Remove deprecated/unused code paths

## Decision: Postponement Rationale

### Why We're Postponing This Change
1. **Current system works well** - no functional issues
2. **High risk, low immediate value** - architectural improvement, not feature addition
3. **Complex dependencies** - requires multiple other cleanups first
4. **Time investment** - better spent on core features and cleanup

### Future Implementation Prerequisites
Before attempting this migration:
- [ ] Complete experimental component integration
- [ ] Simplify ChapterEditor architecture
- [ ] Standardize shared component interfaces
- [ ] Create comprehensive test coverage
- [ ] Document all route dependencies
- [ ] Plan rollback procedures

## Future Learning Flow Specifications

### Separate Component Architecture
```
Management Components (Admin/Creator):
- ManageTrackList: Track CRUD, reordering, bulk operations
- ManageChapterList: Chapter CRUD, publishing workflow
- EditChapter: Content editing, segmentation, audio mapping

Learning Components (Student/Consumer):
- LearnTrackList: Discovery, progress overview, recommendations
- LearnChapterList: Study progression, bookmarks, notes
- LearnChapter: Reading interface, progress tracking, study tools
```

### Feature Divergence Patterns
```
Management Features:
- Content analytics and SEO metadata
- Bulk operations and batch processing
- Publishing workflows and approval processes
- Real-time collaboration tools

Learning Features:
- Progress tracking and study streaks
- Difficulty adaptation and personalization
- Social features and study groups
- Offline reading and mobile optimization
```

### URL Structure Benefits
```
Clear Context Separation:
/manage/tracks/* - Admin/creator mindset: "What needs work?"
/learn/tracks/* - Student mindset: "What should I study next?"

Consistent Patterns:
Both flows use identical URL patterns, different functionality
Easy to reason about and maintain
Supports role-based access control

Natural Language Feel:
"Browsing tracks" feels more natural than "browsing track"
Follows standard REST API conventions
Consistent with existing working URLs
```

## Implementation Timeline (Future)

### Prerequisites Phase (4-6 weeks)
- Complete experimental component migration
- Simplify ChapterEditor architecture  
- Standardize component interfaces
- Create comprehensive test coverage

### Migration Phase (1-2 weeks)
- URL pattern updates (surgical approach)
- Component renames (if desired)
- Navigation updates
- Legacy route cleanup

### Verification Phase (1 week)
- Comprehensive testing
- Performance validation
- User experience verification
- Documentation updates

## Conclusion

This architectural plan provides a clear roadmap for improving the URL structure and file naming conventions. The current implementation serves us well, and this improvement should be tackled as part of a broader code cleanup initiative when the prerequisites are met.

The key insight is that **same data structure, completely different user experiences** justifies the architectural separation, but the implementation must be done carefully with proper preparation.

---

*This document should be revisited when the application architecture is more stable and the experimental components are fully integrated.*