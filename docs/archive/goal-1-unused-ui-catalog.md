# Goal 1: Catalog and Remove Unused UI Pages

## Objective
Remove all experiment/legacy pages and components not used in main workflows (Learning, Manage Content, Batches, Manage Users) to enable fresh UI/UX redesign.

## Current Status
**Phase:** Planning Complete → Ready for Execution

---

## Cleanup Plan

### Files to DELETE

#### 1. Legacy Experiment Pages (client/src/legacy/) - 11 files
- [ ] `AdminPanelExperiment.tsx` - Admin user management demo
- [ ] `ChapterExperiment.tsx` - Chapter study prototype with audio sync
- [ ] `ChapterViewExperiment.tsx` - Interactive chapter reader with segments
- [ ] `DashboardExperiment.tsx` - Alternative student dashboard
- [ ] `DashboardOldExperiment.tsx` - Original dashboard prototype
- [ ] `ExperimentsShowcase.tsx` - Navigation hub for all experiments
- [ ] `InstructorPanelExperiment.tsx` - Instructor progress tracking demo
- [ ] `RoleBasedTabsExperiment.tsx` - Role switching UI mockup
- [ ] `RoleTabsExperiment.tsx` - Combined role tabs wrapper
- [ ] `StudentDashboardExperiment.tsx` - Student stats dashboard
- [ ] `TrackViewExperiment.tsx` - Legacy track detail page

#### 2. Experiment-Only Components (client/src/features/shared-features/components/) - 6 files
- [ ] `AdminPanel.tsx` - User CRUD/invite/roles prototype (24KB)
- [ ] `Dashboard.tsx` - Alternative student dashboard (11KB)
- [ ] `InstructorPanel.tsx` - Student progress table with inline edits (12KB)
- [ ] `LanguageSwitcher.tsx` - Language toggle control (1.5KB)
- [ ] `RoleTabs.tsx` - Role switcher combining admin/instructor/student (3.8KB)
- [ ] `StudentDashboard.tsx` - Student stats/tracks dashboard (9KB)

#### 3. Experiment-Only Learning Components (client/src/features/learning/components/) - 3 files
- [ ] `AudioPlayer.tsx` - Audio playback control (only used by chapter experiments)
- [ ] `InteractiveSegment.tsx` - Individual segment highlight wrapper
- [ ] `InteractiveSegments.tsx` - Text highlighting for audio mapping

#### 4. Empty Folders
- [ ] `client/src/design-system/components/` - Empty directory
- [ ] `experiments/` - Root folder with empty subfolders (bootstrap5-integration, design-systems)

#### 5. App.tsx Route Cleanup
- [ ] Remove 11 experiment route imports (keep DesignSystemExperiment)
- [ ] Remove 12 /experiments/* routes (keep /experiments/design-system)

#### 6. Server Route Cleanup
- [ ] Remove static `/experiments` route from `server/index.ts` (lines 53-59)

---

### Files to KEEP

#### Live Components (In Use)
- ✅ `client/src/features/shared-features/components/SimpleDashboard.tsx` - **LIVE** dashboard at / and /dashboard routes
- ✅ `client/src/features/learning/components/TrackCard.tsx` - Used in learning track listings
- ✅ `client/src/design-system/DesignSystemExperiment.tsx` - Design system showcase (reference tool)
- ✅ `client/src/components/design-system/*` - All 26 design system components (Button, Card, Badge, etc.)

---

## Execution Steps

### Pre-Cleanup (Avoid Windows File Lock Issues)
1. **Stop all running processes** - Kill dev server, build processes, any terminal watching files
2. **Close files in VS Code** - Close all open files from folders being deleted (legacy/, experiments/)
3. **Close File Explorer** - Close any Windows Explorer windows viewing those directories
4. **Use PowerShell deletion** - Use `Remove-Item -Recurse -Force` to bypass locks

### Main Cleanup
5. **Update App.tsx** - Remove experiment imports and routes
6. **Delete client/src/legacy/** - Remove all 11 experiment pages
7. **Delete experiment components** - Remove 6 shared-features + 3 learning components
8. **Delete empty folders** - Remove client/src/design-system/components/ and experiments/
9. **Update server/index.ts** - Remove static /experiments route
10. **Verify build** - Run `npm run build` to confirm no broken imports
11. **Git staging** - Run `git add -A` to stage all deletions
12. **Archive this document** - Move to docs/archive/

---

## Impact Assessment

### Routes Removed
- `/experiments` (hub)
- `/experiments/admin-panel`
- `/experiments/instructor-panel`
- `/experiments/student-dashboard`
- `/experiments/dashboard`
- `/experiments/role-tabs`
- `/experiments/role-based-tabs`
- `/experiments/track-view/:trackId`
- `/experiments/chapter-view/:id`
- `/experiments/chapter/:id`
- `/experiments/dashboard-old`

### Routes Retained
- All `/manage/*` routes (content management)
- All `/tracks/*` and `/chapter/*` routes (learning)
- `/experiments/design-system` (showcase)
- `/` and `/dashboard` (SimpleDashboard)
Deletions
- 11 pages + 9 components + 2 folders + 1 server route = **23
- 11 pages + 9 components + 1 folder = **21 deletions**

---

## Progress Tracking

- [x] Task 1: Update goal-1 doc with accurate cleanup plan
- [x] **PRE-CLEANUP:** Stop dev server, close files/folders in VS Code and File Explorer
- [x] Task 2: Remove experiment routes from App.tsx
- [x] Task 3: Delete legacy experiment pages (11 files)
- [x] Task 4: Delete experiment-only components (6 files)
- [x] Task 5: Delete experiment-only learning helpers (3 files)
- [x] Task 6: Delete empty design-system/components folder
- [x] Task 7: Delete root experiments folder
- [x] Task 8: Remove experiments static route from server
- [ ] Task 9: Verify build and stage git changes
- [ ] Task 10: Archive goal-1 document to docs/archive/
