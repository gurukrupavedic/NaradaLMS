# TODO-Frontend Cleanup

**Created:** December 12, 2025  
**Updated:** December 16, 2025  
**Status:** Partially Complete  
**Priority:** High (clean slate before building new features)

---

## Overview

This document outlines deprecated, experimental, and unused frontend code that should be cleaned up. The cleanup is organized into 3 topics, designed to be tackled one at a time.

**Background:** During development, several experimental UIs and components were created but later replaced by better implementations. Instead of being removed, they were left in the codebase or hidden. This document catalogs all such code for systematic removal.

**Current Status:**
- **Topic 1:** ✅ Completed - Showcase pages removed
- **Topic 2:** ⚠️ Partially Complete - Dashboard components preserved as experiments with API stubs (documented for future cleanup)
- **Topic 3:** 🔲 Pending - Hidden Media Segmentation panel removal

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

## Topic 3: Hidden Media Segmentation Panel

### Description
In the **Segmentation tab** of ChapterEditor, there is a hidden "Media Segmentation" panel. This was an experimental workflow created before the Progressive Mapper was built. The panel is technically in the code but never renders because it requires "timeMarks" state that is never populated.

This represents the abandoned **NEW mapping system** that uses:
- `mediaSegments` table (database)
- `segmentMappings` table (database)
- Various frontend mutations and queries

The **LEGACY system** (which the Progressive Mapper actually uses) is:
- `audioMappings` table (database)

### Current Behavior
- User opens Segmentation tab
- User only sees Text Segmentation panel (right side)
- Left side "Media Segmentation" panel exists in code but never renders
- The panel would show if `timeMarks.length > 0`, but timeMarks are never created

### Files/Sections Affected

#### ChapterEditor.tsx - Hidden UI Block
**Location:** `client/src/pages/ChapterEditor.tsx`  
**Lines:** Approximately 2524-3356 (large block)

This section contains:
- Audio file selection UI
- Time marks timeline
- Media segment creation buttons
- Segment mapping grid (different from Progressive Mapper)

**Identification markers in the code:**
```typescript
// Look for these patterns:
<CardTitle className="flex items-center gap-2">
  <Music className="h-5 w-5" />
  Media Segmentation
</CardTitle>

// And:
handleCreateAudioSegments
createAudioSegmentsMutation
timeMarks
setTimeMarks
```

#### Related State Variables (in ChapterEditor)
These are used ONLY by the hidden panel and can be removed:

```typescript
// Time marks for audio segmentation (deprecated)
const [timeMarks, setTimeMarks] = useState<number[]>([]);

// Any mutations related to media segments
const createAudioSegmentsMutation = useMutation({...});
```

#### Backend Endpoints Status
The dual mapping system has been unified and cleaned up:

**Active endpoints** (unified system):
- `GET /api/segment-mappings/:chapterId` - Fetch mappings (used by StudyChapter.tsx)
- `POST /api/mappings` - Create mapping (unified system via progressiveMappingApi)
- `DELETE /api/mappings/:audioFileId/:segmentId` - Delete mapping

**Removed endpoints** (Dec 16, 2025):
- `POST /api/segment-mappings` - Removed (was dead code)
- `DELETE /api/segment-mappings/:id` - Removed (was dead code)
- `GET /api/segment-mappings/audio/:audioFileId` - Removed (was dead code)
- `POST /api/segment-mappings/with-media-segment` - Removed (now via unified `/api/mappings`)
- `DELETE /api/segment-mappings/by-text-segment/:textSegmentId/:audioFileId` - Removed (was dead code)

### Cleanup Checklist (Frontend Only)

- [ ] Locate the hidden Media Segmentation panel in ChapterEditor.tsx
- [ ] Identify the exact line range (starts around line 2524)
- [ ] Remove the entire `<Card>` block containing "Media Segmentation"
- [ ] Remove `timeMarks` state variable and setter
- [ ] Remove `createAudioSegmentsMutation` and related mutations
- [ ] Remove any imports only used by this panel
- [ ] Verify Segmentation tab still works correctly
- [ ] Verify Text Segmentation panel is unaffected
- [ ] Test creating/editing segments still works

### What Remains After Cleanup

**Segmentation Tab should only contain:**
1. Language Selection & Stats header
2. Two-Panel Layout:
   - LEFT: SegmentedTextDisplay (text with highlights)
   - RIGHT: SegmentPanel (list of created segments)

### Risk Assessment
**Risk Level:** MEDIUM  
**Reason:** Large code block removal in a complex component. Requires careful identification of boundaries. However, since the panel never rendered, actual functionality is unaffected.

### Important Notes

1. **Backend tables remain** - We're only cleaning frontend. The `mediaSegments` and `segmentMappings` tables stay until you decide on architecture.

2. **Progressive Mapper is unaffected** - The Mapping tab uses completely different code paths (`audioMappings` table, `ProgressiveMapper` component).

3. **useSegmentData hook** - May have code serving both systems. After frontend cleanup, audit this hook to remove deprecated code paths.

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
