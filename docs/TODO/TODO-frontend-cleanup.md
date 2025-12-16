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

## ~~Topic 2: Dashboard Components~~ ⚠️ PARTIALLY COMPLETED (Frontend Only)

**Status:** Frontend preserved; Backend cleaned up  
**Date Completed:** December 16, 2025 (frontend), December 16, 2025 (backend)  
**Decision:** Frontend ideation files preserved under `/experiments`; Backend API stubs removed for pristine codebase

### What Was Done

Multiple dashboard component iterations were found in the codebase. **Frontend components** were moved to experiment routes to preserve them as ideation references. **Backend stub endpoints** were removed to keep the API pristine and avoid confusion during future development.

### Frontend Components Preserved Under `/experiments`

| Component File | Experiment Route | Purpose | Lines |
|----------------|------------------|---------|-------|
| `client/src/components/AdminPanel.tsx` | `/experiments/admin-panel` | User management (invite, edit, status) | 612 |
| `client/src/components/InstructorPanel.tsx` | `/experiments/instructor-panel` | Student progress tracking | 312 |
| `client/src/components/StudentDashboard.tsx` | `/experiments/student-dashboard` | Student learning dashboard | 277 |
| `client/src/components/Dashboard.tsx` | `/experiments/dashboard` | Generic dashboard with stats | 303 |
| `client/src/components/RoleTabs.tsx` | `/experiments/role-tabs` | Tab switching using above panels | - |
| `client/src/components/RoleBasedTabs.tsx` | `/experiments/role-based-tabs` | Alternative role tab pattern | - |

### Backend Cleanup (December 16, 2025)

**Removed from `server/routes-simple.ts`:** 8 stub endpoints
- `GET /api/users`
- `POST /api/invite-user`
- `PUT /api/users/:id`
- `PUT /api/users/:id/status`
- `GET /api/instructor/student-progress`
- `PUT /api/instructor/student-progress`
- `GET /api/student-stats`
- `GET /api/student-progress`

**Rationale:**
- Keep API pristine—no dead code or confusing mocks
- Prevent accidental use of stubs by mistake during new API development
- Clear signal that experiments need real implementation (404 response)
- Clean foundation for future role-based auth implementation

### Active Dashboard (Production - DO NOT REMOVE)

| File | Imported In | Status |
|------|-------------|--------|
| `client/src/components/SimpleDashboard.tsx` | `App.tsx` (lines 14, 53-54) | ✅ PRODUCTION - This is the active dashboard |

### Why This Approach Works

**Frontend (preserved):**
- Ideation value: shows different UI patterns for role-based layouts
- Future reference: when implementing real auth, these provide design inspiration
- No risk: completely isolated under `/experiments` routes
- No confusion: accessing them gives 404 (or loads experiment page), not fake data

**Backend (cleaned):**
- Pristine codebase: no dead endpoints cluttering the API
- No confusion: future developers won't accidentally call deprecated stubs
- Clear intent: when experiments need real backing, build fresh endpoints
- Safe: experiment routes 404 naturally, which is the correct signal

### Complete Cleanup Checklist (For Future - When Real Auth Implemented)

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
- [ ] Implement real role-based endpoints in `server/routes-simple.ts`
- [ ] Search codebase for any remaining references to old components
- [ ] Test app compiles and runs
- [ ] Verify SimpleDashboard still works (production dashboard)

### Risk Assessment
**Risk Level:** ✅ LOW  
**Reason:** 
- Frontend components are completely isolated under `/experiments` routes
- SimpleDashboard (production) is completely separate and unaffected
- API is pristine—no dead stubs to confuse future development
- 404 responses on experiment endpoints provide clear signal

---

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
