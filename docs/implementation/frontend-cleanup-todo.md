# Frontend Cleanup TODO

**Created:** December 12, 2025  
**Status:** Ready for Implementation  
**Priority:** High (clean slate before building new features)

---

## Overview

This document outlines deprecated, experimental, and unused frontend code that should be removed to clean up the codebase. The cleanup is organized into 3 main topics, designed to be tackled one at a time.

**Background:** During development, several experimental UIs and components were created but later replaced by better implementations. Instead of being removed, they were left in the codebase or hidden. This document catalogs all such code for systematic removal.

---

## Topic 1: Experimental Showcase Pages

### Description
Four experimental/showcase pages exist in the codebase. These were created for component testing and design experimentation during development. They are accessible via routes but serve no production purpose.

### Files to Remove

| File | Route | Purpose | Dependencies |
|------|-------|---------|--------------|
| `client/src/pages/DaisyUI5Showcase.tsx` | `/experiments/daisyui-5` | DaisyUI v5 component testing | None |
| `client/src/pages/ExperimentsShowcase.tsx` | `/experiments` | Hub page linking to experiments | None |
| `client/src/pages/DesignSystemExperiment.tsx` | `/experiments/design-system` | Wrapper for DesignSystemShowcase | DesignSystemShowcase |
| `client/src/components/design-system/DesignSystemShowcase.tsx` | `/design-system-showcase` | Full design system component gallery | ComponentInspector |
| `client/src/components/design-system/ComponentInspector.tsx` | - | Interactive component prop inspector | None |

### Routes to Remove (in App.tsx)

```typescript
// Lines ~67-70 in client/src/App.tsx - REMOVE these routes:
<Route path="/experiments" component={ExperimentsShowcase} />
<Route path="/experiments/design-system" component={DesignSystemExperiment} />
<Route path="/design-system-showcase" component={DesignSystemShowcase} />
<Route path="/experiments/daisyui-5" component={DaisyUI5Showcase} />
```

### Lazy Imports to Remove (in App.tsx)

```typescript
// Lines ~22-26 in client/src/App.tsx - REMOVE these imports:
const DaisyUI5Showcase = lazy(() => import("@/pages/DaisyUI5Showcase")...);
const ExperimentsShowcase = lazy(() => import("@/pages/ExperimentsShowcase")...);
const DesignSystemShowcase = lazy(() => import("@/components/design-system/DesignSystemShowcase")...);
const DesignSystemExperiment = lazy(() => import("@/pages/DesignSystemExperiment"));
```

### Exports to Update

**File:** `client/src/components/design-system/index.ts`
- Remove: `export * from './ComponentInspector';`
- Remove: `export { DesignSystemShowcase } from './DesignSystemShowcase';`

### Cleanup Checklist

- [ ] Delete `client/src/pages/DaisyUI5Showcase.tsx`
- [ ] Delete `client/src/pages/ExperimentsShowcase.tsx`
- [ ] Delete `client/src/pages/DesignSystemExperiment.tsx`
- [ ] Delete `client/src/components/design-system/DesignSystemShowcase.tsx`
- [ ] Delete `client/src/components/design-system/ComponentInspector.tsx`
- [ ] Remove 4 routes from `client/src/App.tsx`
- [ ] Remove 4 lazy imports from `client/src/App.tsx`
- [ ] Update exports in `client/src/components/design-system/index.ts`
- [ ] Verify app compiles without errors
- [ ] Test navigation still works

### Risk Assessment
**Risk Level:** LOW  
**Reason:** These are standalone pages with no dependencies from core application features. Pure development/testing tools.

---

## Topic 2: Unused Dashboard Components

### Description
Multiple dashboard component iterations exist in the codebase. Only `SimpleDashboard.tsx` is actively used (imported in App.tsx for the root route). The others appear to be older iterations or role-based dashboard experiments that were never integrated.

### Files to Remove

| File | Imported Anywhere? | Purpose |
|------|--------------------|---------|
| `client/src/components/AdminPanel.tsx` | ❌ No | Admin user management panel |
| `client/src/components/InstructorPanel.tsx` | ❌ No | Instructor view of student progress |
| `client/src/components/StudentDashboard.tsx` | ❌ No | Student learning progress dashboard |
| `client/src/components/Dashboard.tsx` | ❌ No | Generic dashboard component |
| `client/src/components/RoleTabs.tsx` | ❌ No | Tab switching based on user roles |
| `client/src/components/RoleBasedTabs.tsx` | ❌ No | Another role-based tab implementation |

### Active Dashboard (KEEP)

| File | Imported In | Status |
|------|-------------|--------|
| `client/src/components/SimpleDashboard.tsx` | `App.tsx` (lines 14, 53-54) | ✅ KEEP - This is the production dashboard |

### Verification Steps

Before deleting, confirm no imports exist:

```bash
# Run these searches to confirm files are unused
grep -r "AdminPanel" client/src --include="*.tsx" --include="*.ts"
grep -r "InstructorPanel" client/src --include="*.tsx" --include="*.ts"
grep -r "StudentDashboard" client/src --include="*.tsx" --include="*.ts"
grep -r "from.*Dashboard" client/src --include="*.tsx" --include="*.ts"
grep -r "RoleTabs" client/src --include="*.tsx" --include="*.ts"
grep -r "RoleBasedTabs" client/src --include="*.tsx" --include="*.ts"
```

### Cleanup Checklist

- [ ] Verify `AdminPanel` has no imports (search codebase)
- [ ] Verify `InstructorPanel` has no imports
- [ ] Verify `StudentDashboard` has no imports
- [ ] Verify `Dashboard` has no imports (excluding SimpleDashboard)
- [ ] Verify `RoleTabs` has no imports
- [ ] Verify `RoleBasedTabs` has no imports
- [ ] Delete `client/src/components/AdminPanel.tsx`
- [ ] Delete `client/src/components/InstructorPanel.tsx`
- [ ] Delete `client/src/components/StudentDashboard.tsx`
- [ ] Delete `client/src/components/Dashboard.tsx`
- [ ] Delete `client/src/components/RoleTabs.tsx`
- [ ] Delete `client/src/components/RoleBasedTabs.tsx`
- [ ] Verify app compiles without errors
- [ ] Test dashboard still displays correctly

### Risk Assessment
**Risk Level:** LOW  
**Reason:** Components are not imported anywhere. SimpleDashboard (the active one) remains untouched.

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

#### Backend Endpoints (Document Only - Don't Remove Yet)
These support the hidden UI but are tied to backend architecture decision:

```
POST /api/chapters/:chapterId/media-segments
GET /api/chapters/:chapterId/media-segments
DELETE /api/media-segments/:id
POST /api/segment-mappings
GET /api/segment-mappings/chapter/:chapterId
DELETE /api/segment-mappings/:id
```

**Note:** Backend cleanup is deferred until you decide on mapping system consolidation.

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

1. **Start with Topic 1** (Experimental Pages) - Lowest risk, quick wins, builds confidence
2. **Then Topic 2** (Unused Dashboards) - Also low risk, straightforward deletions
3. **Finally Topic 3** (Media Segmentation) - Most complex, requires careful code surgery

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
