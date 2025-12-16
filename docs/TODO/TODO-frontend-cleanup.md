# TODO-Frontend Cleanup

**Created:** December 12, 2025  
**Updated:** December 16, 2025  
**Status:** Mostly Complete  
**Priority:** High (clean slate before building new features)

---

## Overview

This document outlines deprecated, experimental, and unused frontend code that should be cleaned up. The cleanup is organized into 3 topics, designed to be tackled one at a time.

**Background:** During development, several experimental UIs and components were created but later replaced by better implementations. Instead of being removed, they were left in the codebase or hidden. This document catalogs all such code for systematic removal.

**Current Status:**
- **Topic 1:** ✅ Completed - Showcase pages removed
- **Topic 2:** ⚠️ Partially Complete - Dashboard components preserved as experiments with API stubs (documented for future cleanup)
- **Topic 3:** ✅ Completed - Hidden Media Segmentation panel removed

---

## ~~Topic 1: Experimental Showcase Pages~~ ✅ COMPLETED

All experimental showcase pages have been removed (DaisyUI5Showcase, ExperimentsShowcase, DesignSystemExperiment, DesignSystemShowcase, ComponentInspector).

---

## ~~Topic 2: Dashboard Components~~ ⚠️ PARTIALLY COMPLETED (Preserved as Experiments)

**Status:** Preserved under `/experiments` routes instead of deletion  
**Date Completed:** December 16, 2025  
**Decision:** Keep as ideation references for future role-based UI development

### What Was Done

Multiple dashboard component iterations were found in the codebase. Instead of deleting them, they were moved to experiment routes with API stubs to preserve them for future reference.

### Components Preserved Under `/experiments`

| Component File | Experiment Route | Purpose | Lines |
|----------------|------------------|---------|-------|
| `client/src/components/AdminPanel.tsx` | `/experiments/admin-panel` | User management (invite, edit, status) | 612 |
| `client/src/components/InstructorPanel.tsx` | `/experiments/instructor-panel` | Student progress tracking | 312 |
| `client/src/components/StudentDashboard.tsx` | `/experiments/student-dashboard` | Student learning dashboard | 277 |
| `client/src/components/Dashboard.tsx` | `/experiments/dashboard` | Generic dashboard with stats | 303 |
| `client/src/components/RoleTabs.tsx` | `/experiments/role-tabs` | Tab switching using above panels | - |
| `client/src/components/RoleBasedTabs.tsx` | `/experiments/role-based-tabs` | Alternative role tab pattern | - |

### Active Dashboard (Production - DO NOT REMOVE)

| File | Imported In | Status |
|------|-------------|--------|
| `client/src/components/SimpleDashboard.tsx` | `App.tsx` (lines 14, 53-54) | ✅ PRODUCTION - This is the active dashboard |

### API Stub Endpoints Added

To prevent 404 errors when visiting experiment routes, the following stub endpoints were added to `server/routes-simple.ts` (lines 673-725):

#### User Management Endpoints (AdminPanel)
```typescript
GET    /api/users                  → Returns []
POST   /api/invite-user            → Returns {success: true, message: "..."}
PUT    /api/users/:id              → Returns {success: true, user: {...}}
PUT    /api/users/:id/status       → Returns {success: true, user: {...}}
```

#### Instructor Endpoints (InstructorPanel)
```typescript
GET    /api/instructor/student-progress   → Returns []
PUT    /api/instructor/student-progress   → Returns {success: true}
```

#### Student Dashboard Endpoints
```typescript
GET    /api/student-stats          → Returns {totalStudyTime: 0, chaptersCompleted: 0, currentStreak: 0, highestLevel: 1}
GET    /api/student-progress       → Returns []
```

**⚠️ WARNING:** These are STUB endpoints only. They return mock data and have no database operations. Do NOT use them in production code.

### Files Modified
- `client/src/App.tsx` - Added lazy import and route for RoleBasedTabsExperiment
- `client/src/pages/RoleBasedTabsExperiment.tsx` - Created new experiment page
- `server/routes-simple.ts` - Added 11 stub endpoints (lines 673-725)

### Git Commits
- Commit: `7e13505` - "Add experiment routes for orphaned dashboard components with API stubs"

### When to Clean This Up (Future TODO)

These components and stubs should be removed when:
1. **Role-based authentication is fully implemented** and you decide on final dashboard architecture
2. **User roles are finalized** (currently: student/instructor/admin in schema, but no auth)
3. **You've extracted any useful UI patterns** from these experiments into production components

### Complete Cleanup Checklist (For Future)

- [ ] Review each experiment component for reusable UI patterns
- [ ] Extract any useful code into production components
- [ ] Delete all experiment dashboard components:
  - [ ] `client/src/components/AdminPanel.tsx`
  - [ ] `client/src/components/InstructorPanel.tsx`
  - [ ] `client/src/components/StudentDashboard.tsx`
  - [ ] `client/src/components/Dashboard.tsx`
  - [ ] `client/src/components/RoleTabs.tsx`
  - [ ] `client/src/components/RoleBasedTabs.tsx`
  - [ ] `client/src/pages/RoleBasedTabsExperiment.tsx`
- [ ] Remove experiment routes from `client/src/App.tsx`:
  - [ ] AdminPanelExperiment route
  - [ ] InstructorPanelExperiment route
  - [ ] StudentDashboardExperiment route
  - [ ] DashboardExperiment route
  - [ ] RoleTabsExperiment route
  - [ ] RoleBasedTabsExperiment route
- [ ] Remove ALL stub endpoints from `server/routes-simple.ts`:
  - [ ] User management endpoints (GET/POST /api/users, etc.)
  - [ ] Instructor endpoints (/api/instructor/student-progress)
  - [ ] Student stats endpoints (/api/student-stats, /api/student-progress)
- [ ] Search codebase for any remaining references
- [ ] Test app compiles and runs
- [ ] Verify SimpleDashboard still works (production dashboard)

### Risk Assessment
**Risk Level:** LOW (for future cleanup)  
**Reason:** All components are isolated under `/experiments` routes. SimpleDashboard (production) is completely separate and unaffected. Stub endpoints are clearly marked and don't interfere with real API routes.

### Why Preserved Instead of Deleted

1. **Ideation Value:** These components show different iterations of role-based UI patterns
2. **Future Reference:** When implementing real auth system, these provide UI inspiration
3. **User Management UI:** AdminPanel has sophisticated invite/edit/status workflows
4. **Progress Tracking:** InstructorPanel has good patterns for student progress visualization
5. **Dashboard Layouts:** Various card and stat layouts can be referenced

**Note:** If you decide you'll never use these patterns, simply execute the "Complete Cleanup Checklist" above to fully remove them.

---

## ~~Topic 3: Hidden Media Segmentation Panel~~ ✅ COMPLETED

### Completion Summary
**Status:** ✅ COMPLETED  
**Date:** December 16, 2025  
**Branch:** `topic3-cleanup` (merged to main)  
**Related PR:** #1

### What Was Done

Removed the deprecated "Media Segmentation" UI and related state/handlers from the Segmentation tab in the chapter editor (`client/src/pages/EditChapter.tsx`).

**Deletions:**
- Removed LEFT Media Segmentation panel UI (~800 lines: grid layout, Card component, and all nested controls)
- Deleted unused state variables: `timeMarks`, `selectedMark`, `isDragging`, `editingTimestamp`
- Removed dragging effect and event listeners for time-based segmentation
- Removed handlers: `handleMarkTime`, `handleClearMark`, `handleClearAllMarks`, `createAudioSegmentsMutation`, `updateMarkTimestamp`
- Removed duplicate `formatTime` function declaration
- Cleaned up `hookData` references to removed state fields

**Verification:**
- Text Segmentation panel works perfectly (create, edit, delete segments)
- Progressive Mapper works perfectly (map segments to audio timestamps, playback controls)
- Preview tab works perfectly (click segment to play mapped audio)
- No regressions detected

### Why This Cleanup Mattered

The panel was:
- Hidden in the UI (never displayed)
- Completely unused (timeMarks never populated)
- Dead code taking up significant space (~800 lines)
- Preventing type clarity in the component
- Representing an abandoned mapping architecture

The **LEGACY mapping system** (which works) is:
- `audioMappings` table (database)
- `progressiveMappingApi` (frontend)
- Progressive Mapper component (interactive UI)
- `segmentMappings` table (deprecated, kept for reference)

### Type Safety Follow-Up

After Topic 3 cleanup, a follow-up branch (`type-fixes-editchapter`) was created to fix TypeScript type warnings that surfaced. Changes included:

**Type Annotations Added:**
- `textSegments` query typed as `TextSegment[]`
- `allChapterMappings` query typed as `SimplifiedMapping[]`
- `audioFiles` typed with proper interface: `Array<{ id, filename, duration, url }>`
- Parameter types added to `.filter()`, `.map()`, `.forEach()` callbacks
- Explicit type guards and casts to eliminate "unknown" type inference

**Result:** All defensive improvements with zero behavioral changes. Dev server verified running without regressions.

### Remaining Items

**Backend tables (not deleted, kept for reference):**
- `mediaSegments` table
- `segmentMappings` table
- Related API endpoints (dead code, can be removed later)

**Future cleanup (deferred):**
- Remove deprecated mapping endpoints from API
- Audit `useSegmentData` hook for deprecated code paths
- Remove `mediaSegments` and `segmentMappings` tables if/when you finalize mapping architecture

### Risk Assessment
**Risk Level:** ✅ LOW (completed)  
**Reason:** Feature was completely hidden and unused; Progressive Mapper (active system) completely separate; tested with real data

---

## Execution Order Recommendation

1. ~~**Start with Topic 1** (Experimental Pages)~~ ✅ COMPLETED
2. **Topic 2** (Unused Dashboards) - Low risk, straightforward deletions
3. **Topic 3** (Media Segmentation) - Most complex, requires careful code surgery

---

## Post-Cleanup Verification

After completing all 3 topics:

1. **Build Check:** Run `npm run build` - no errors
2. **Route Test:** Navigate through all main routes
3. **Feature Test:** 
   - Create a track
   - Create a chapter
   - Edit content in all 3 scripts
   - Create text segments
   - Use Progressive Mapper to map audio
   - Preview chapter
4. **LSP Check:** Run LSP diagnostics - errors should decrease

---

## Future Considerations

### Backend Cleanup (Deferred)
Once you decide on mapping system consolidation:
- Remove `mediaSegments` table
- Remove `segmentMappings` table  
- Remove related API endpoints
- Remove storage methods
- Update schema.ts

### Hook Cleanup
After frontend is clean, audit these files:
- `client/src/hooks/useSegmentData.ts` - May have dead code paths
- `client/src/services/progressiveMappingApi.ts` - Verify only uses legacy system

---

## Document History

| Date | Change |
|------|--------|
| Dec 12, 2025 | Initial creation based on comprehensive frontend audit |
| Dec 16, 2025 | Topic 1 marked complete - experimental showcase pages already removed |
| Dec 16, 2025 | Topic 2 updated - Dashboard components preserved under `/experiments` with API stubs instead of deletion. Added comprehensive stub endpoint documentation. |
