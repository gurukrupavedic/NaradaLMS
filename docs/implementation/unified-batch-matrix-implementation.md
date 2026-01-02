# Unified Batch Matrix Implementation Plan

**Last Updated:** January 2, 2026  
**Status:** ✅ **Phases 1-3 COMPLETED** - Full End-to-End Wiring Live  
**Scope:** Replace enrollment table with unified matrix for proficiency evaluation

---

## Progress Summary

### ✅ Phase 1: UI Structure - COMPLETED (Dec 31, 2025)

**What We Built:**
1. ✅ **UnifiedBatchMatrix Component** - Pure presentation component
   - Renders student × chapter matrix with TanStack Table
   - Sticky student column with initials badges
   - Kebab menu for dropping students
   - Color-coded proficiency cells (clickable for evaluation)
   - Loading and empty states
   - MatrixEvaluationModal for proficiency updates
   - **Note:** Enrollment controls moved to parent (BatchDetails)

2. ✅ **Enrollment Controls in BatchDetails**
   - Multi-select student enrollment with pills/badges
   - Typeahead search with debounced API calls
   - Bulk enrollment with individual error tracking
   - Success/failure/partial success toast notifications
   - Proper separation: BatchDetails orchestrates, Matrix displays

3. ✅ **Type System & Architecture**
   - Created `client/src/new-ui/batches/types/matrix.ts`
     - `ProficiencyLevel`, `StudentMatrixRow`, `Chapter`, `StudentProgress`
     - `UnifiedBatchMatrixProps` (simplified - no enrollment props)
   - Created `client/src/new-ui/batches/hooks/useTracks.ts`
   - Updated copilot-instructions.md to enforce shadcn components

4. ✅ **Page-Level Controls** (Partial)
   - Batch selector dropdown (shadcn Select)
   - Track selector dropdown with "Current Track" badge
   - Matrix/Table view toggle buttons
   - Current track display in BatchDetailsCard

5. ✅ **Development Utilities**
   - Created 30 test students seed script (`scripts/seed/create-30-students.ts`)
   - All students have password: `welcome123`
   - Full data populated (firstName, lastName, email, phone, timezone, etc.)

**Key Architectural Decisions:**
- ✅ UnifiedBatchMatrix is **pure presentation** - no data fetching, no enrollment logic
- ✅ BatchDetails acts as **orchestrator** - manages all state, data fetching, mutations
- ✅ Enrollment controls at page level (not in matrix component)
- ✅ Separation enables matrix reusability in read-only contexts

**Files Created/Modified:**
```
✅ client/src/new-ui/batches/types/matrix.ts (NEW)
✅ client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx (NEW)
✅ client/src/new-ui/batches/hooks/useTracks.ts (NEW)
✅ client/src/new-ui/batches/pages/BatchDetails.tsx (MODIFIED - enrollment controls)
✅ scripts/seed/create-30-students.ts (NEW)
✅ .github/copilot-instructions.md (UPDATED - shadcn enforcement)
```

---

## Overview

This document outlines the phased implementation of the **Unified Batch Matrix** feature, which combines enrollment management and proficiency evaluation into a single, cohesive interface.

**Key Principle:** Separation of concerns - Build clean UI first, wire backend later.

---

## Vision

### Current State
```
BatchDetails Page
├─ Batch Info Card
└─ Enrollments Table (STUDENT | CONTACT | TIMEZONE | LAST ACTIVE | PROGRESS | ACTIONS)
    └─ Add students via input row
    └─ Drop via kebab menu
```

### Future State
```
BatchDetails Page
├─ Batch Info Card
└─ Unified Batch Matrix (STUDENT [⋮] | CHAPTER1 | CHAPTER2 | ... | CHAPTERN)
    ├─ Add students via pinned input row
    ├─ Update proficiency per student per chapter (clickable cells)
    ├─ Drop students via kebab menu
    └─ Pure UI, no local state, no API calls (until Phase 3)
```

---

## Implementation Phases

### Phase 1: UI Structure (Clean, No Data Wiring)

**Duration:** ~2-3 days  
**Status:** ✅ **COMPLETED** (Dec 31, 2025)  
**Goal:** Build production-ready matrix component with placeholder data

#### Completed Tasks

1. ✅ **Page-Level Controls Added to BatchDetails**
   - Batch Selector dropdown implemented (shadcn Select)
   - Track Selector dropdown implemented with "Current Track" badge
   - Matrix/Table view toggle buttons
   - Current Track field in BatchDetailsCard (static display)
   - State management: `selectedTrackId`, `showMatrixView`
   - Track resets to batch's currentTrackId when batch changes

2. ✅ **Types & Utils Extracted**
   - Created `client/src/new-ui/batches/types/matrix.ts`
     - `ProficiencyLevel` (-1 | 0 | 1 | 2 | 3 | 4)
     - `StudentMatrixRow` (id, firstName, lastName, email, enrollmentId)
     - `Chapter` (id, code, title, trackId)
     - `StudentProgress` (studentId, chapterId, proficiencyLevel, status, lastUpdated)
     - `UnifiedBatchMatrixProps` (simplified interface - no enrollment props)
   - Matrix utility functions in component (getCellColor, getProficiencyShortLabel)

3. ✅ **UnifiedBatchMatrix Component Built**
   - Location: `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx`
   - Architecture: Props-based, no internal data fetching
   - Props: `students`, `chapters`, `progress`, `onDropStudent`, `onUpdateProficiency`
   - Features implemented:
     - TanStack Table with sticky STUDENT column
     - Student initials badges with color coding
     - Kebab menu [⋮] inline with student names
     - Dynamic chapter columns (filtered by track)
     - Color-coded proficiency cells
     - MatrixEvaluationModal integration
     - Loading states, empty states
   - **Key Change:** Enrollment controls moved to BatchDetails (parent)

4. ✅ **Enrollment Controls in BatchDetails**
   - Multi-select student enrollment with pills/badges
   - Typeahead search with `useEligibleStudents` hook
   - Debounced search (300ms via hook)
   - Selected students display as removable badges
   - Bulk enrollment with error tracking per student
   - Toast notifications: success/failure/partial success
   - Add button shows count: "Add (n)"

5. ✅ **MatrixEvaluationModal Component**
   - Location: Extracted from matrix component
   - Modal opens on proficiency cell click
   - Options: Absent (-1), Practicing (0), L1-L4 (1-4)
   - Color-coded buttons matching cell colors
   - Handles proficiency updates via callback

6. ✅ **Development Infrastructure**
   - Created `scripts/seed/create-30-students.ts`
   - 30 test students with realistic Indian names
   - Password: `welcome123` for all test users
   - Full data: firstName, lastName, email, phone, timezone, preferredLanguage
   - Status: 'active', roles: ['student']

7. ✅ **Testing with Mock Data**
   - Mock students, chapters, progress in BatchDetails
   - Verified UI rendering, colors, interactions
   - No API calls yet (Phase 2)
   - Matrix view toggle working
   - Enrollment flow working with real API

#### Acceptance Criteria - All Met ✅

- ✅ Batch dropdown renders and controls matrix context
- ✅ Track dropdown renders and filters matrix columns
- ✅ Track dropdown resets when batch changes
- ✅ BatchDetailsCard shows "Current Track" field
- ✅ Types extracted and organized
- ✅ UnifiedBatchMatrix component renders correctly
- ✅ Matrix only shows mock chapters (track filtering ready)
- ✅ Modal opens/closes on cell click
- ✅ Colors render correctly per proficiency level
- ✅ Kebab menu works (drop student callback ready)
- ✅ Responsive design works on desktop
- ✅ Zero TypeScript errors
- ✅ Multi-select enrollment working with real API

#### Deliverables - All Complete ✅

- ✅ `client/src/new-ui/batches/types/matrix.ts`
- ✅ `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx`
- ✅ `client/src/new-ui/batches/hooks/useTracks.ts`
- ✅ Updated `client/src/new-ui/batches/pages/BatchDetails.tsx`
- ✅ Enrollment controls at page level (not in matrix)
- ✅ Mock data proving UI works
- ✅ 30 test students seed script

---

### ✅ Phase 2: Backend Analysis & Wiring - COMPLETED (Jan 1-2, 2026)

**Duration:** 2 days  
**Status:** ✅ **COMPLETED**  
**Goal:** Understand data requirements and wire API contracts

**Analysis & Fixes Completed:**
- ✅ Backend analysis documented in `docs/archive/backend-analysis-unified-batch-matrix.md`
- ✅ Code review completed in `docs/archive/code-review-batch-matrix.md`
- ✅ Proficiency data flow analysis completed in `docs/archive/proficiency-data-flow-analysis.md` (9 issues identified and fixed)

**Critical Issues Fixed (Jan 1-2):**
1. ✅ **Backend Import Confusion** - Removed dynamic imports from `evaluateStudent()` and `chapterExists()` methods
2. ✅ **Frontend Type Mismatch** - Updated `StudentProgress` interface (lastUpdated → lastEvaluatedAt, added evaluatedBy, notes)
3. ✅ **Data Transformation Error** - Fixed BatchDetails to access `.rows` and `.cells` instead of `.students`
4. ✅ **Missing Hook Fields** - Added `evaluatedBy` to ChapterProgressCell interface and transformation
5. ✅ **Duplicate Toasts** - Removed success toast from parent callback to show single notification
6. ✅ **Critical Field Name Bug** - Fixed `chapters.chapterNumber` → `chapters.order` in getBatchProgress query

**Backend API Working:**
- ✅ `GET /api/batches/:id/progress` - Returns proper data structure with chapters and student progress
- ✅ `POST /api/batches/:batchId/students/:studentId/evaluate` - Updates proficiency with evaluatedBy tracking
- ✅ Database schema verified (studentProgress table with proper relationships)

**TanStack Query Hooks Created:**
- ✅ `useBatchProgress(batchId)` - Fetches matrix data with transform to UI shape
- ✅ `useUpdateProficiency()` - Mutation for proficiency updates with query invalidation
- ✅ `useEnrollStudent()` - Multi-student enrollment (existing)
- ✅ `useDropEnrollment()` - Drop student from batch (existing)
- ✅ `useChaptersByTrack()` - Fetch chapters for track selection

---

### ✅ Phase 3: Frontend Integration & End-to-End Wiring - COMPLETED (Jan 2, 2026)

**Duration:** 1 day  
**Status:** ✅ **COMPLETED**  
**Goal:** Connect UI to real API and achieve end-to-end functionality

**Frontend Integration Completed:**
- ✅ **BatchDetails Page** - Full refactor with real API integration
  - Batch selector dropdown with state management
  - Track selector dropdown with "Current Track" badge
  - Matrix/Table view toggle
  - Real data fetching via `useBatchProgress()`
  - Multi-select student enrollment with pills/badges
  - Typeahead search with debounced API calls

- ✅ **UnifiedBatchMatrix Component** - Connected to real data
  - Renders student × chapter matrix from API response
  - Sticky student column with initials badges
  - Color-coded proficiency cells (clickable)
  - MatrixEvaluationModal integration
  - Loading and empty states
  - Kebab menu for dropping students

- ✅ **Data Flow**
  - `useBatchProgress()` fetches chapters + student progress from `GET /api/batches/:id/progress`
  - `useUpdateProficiency()` mutation sends `POST /api/batches/:id/students/:id/evaluate`
  - Query invalidation on mutation success triggers automatic matrix refresh
  - No duplicate toasts (single success notification)
  - Error handling with descriptive messages

- ✅ **Enrollment Controls** (Page Level)
  - Multi-select student enrollment via `useEnrollStudent()`
  - Bulk enrollment with individual error tracking
  - Selected students display as removable badges
  - Drop student via kebab menu with `useDropEnrollment()`

- ✅ **Track Filtering** (Works Correctly)
  - Chapters filtered by selected track
  - Matrix updates when track changes
  - Track resets to batch's currentTrackId when batch changes
  - All chapters visible when no track selected

#### Acceptance Criteria - All Met ✅
- ✅ Batch dropdown controls matrix data
- ✅ Track dropdown filters chapter columns
- ✅ Matrix renders real data from API
- ✅ Clicking cell opens evaluation modal
- ✅ Selecting proficiency level updates database
- ✅ Matrix refreshes immediately after update
- ✅ Cell colors update on page
- ✅ Refresh page → colors persist (data saved)
- ✅ Can add/drop students
- ✅ All mutations include error handling
- ✅Transition from Enrollment Table to Matrix - COMPLETED ✅

### What We Did

**Replaced old enrollment table entirely:**
- ✅ Old enrollments table removed from BatchDetails
- ✅ Matrix now handles both enrollment AND proficiency evaluation
- ✅ Single source of truth for student-chapter state

**New Architecture (Phase 3 Complete):**

```
BatchDetails Page
├─ Batch Info Card (name, status, instructor, currentTrackId)
├─ Page-Level Controls
│  ├─ Batch Selector (dropdown)
│  ├─ Track Selector (dropdown with "Current Track" badge)
│  └─ View Toggle (Matrix/Table buttons)
├─ Enrollment Controls (Multi-select)
│  ├─ Student typeahead with search
│  ├─ Selected students as removable badges
│  └─ "Add (n)" button for bulk enrollment
└─ Unified Batch Matrix
   ├─ Student Column (sticky, with kebab menu for drop)
   ├─ Chapter Columns (filtered by selected track)
   ├─ Proficiency Cells (color-coded, clickable)
   ├─ MatrixEvaluationModal (on cell click)
   └─ Loading/empty states
```

**Kept (Repurposed):**
- ✅ `useEnrollStudent()` - Now feeds students into matrix
- ✅ `useDropEnrollment()` - Removes row from matrix
- ✅ `useBatchProgress()` - New hook, fetches matrix data
- ✅ `useUpdateProficiency()` - New hook, updates proficiency cells

**Deleted:**
- ✅ Old enrollment table rendering code
- ✅ Old enrollment-specific types (merged into matrix types)
├─ Batch Info
└─ Enrollments Table (old)

AFTER (Phase 3):
┌─ BatchDetails
├─ Batch Info
└─ Unified Batch Matrix (new) ← REPLACES enrollments table
```

**Delete:**
- `client/src/new-ui/batches/pages/BatchDetails.tsx` (old enrollment table code)
- Old enrollment-related types

**Keep:**
- `useEnrollments`, `useDropEnrollment`, `useEnrollStudent` hooks (repurposed for matrix)
- Batch detail fetching logic

---

## File Structure (End State)

```
client/src/new-ui/batches/
├─ pages/
│  ├─ MyBatchesList.tsx (existing)
│  └─ BatchDetails.tsx (refactored - uses UnifiedBatchMatrix)
├─ components/
│  ├─ UnifiedBatchMatrix.tsx (NEW - main component)
│  ├─ MatrixEvaluationModal.tsx (NEW - modal)
│  ├─ StudentCombobox.tsx (existing - reused)
│  └─ ... other components
├─ hooks/
│  ├─ useBatches.ts (existing)
│  ├─ useBatchProgress.ts (NEW - fetches matrix data)
│  ├─ useUpdateProficiency.ts (NEW - updates cell)
│  └─ ... other hooks
├─ types/
│  └─ matrix.ts (NEW - unified types)
└─ utils/
   └─ matrix-utils.ts (NEW - color, label helpers)
```

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking enrollments during refactor | Keep old table, build new component in parallel |
| API design mismatch with UI | Design API in Phase 2 before building in Phase 3 |
| Performance issues (large batches) | Test with mock data first, analyze queries in Phase 2 |
| Concurrent update conflicts | Implement optimistic updates, server-side validation |
| Accessibility | Use semantic HTML, keyboard nav, ARIA labels from start |

---
 - ALL MET ✅

- ✅ Matrix renders without API calls (Phase 1)
- ✅ All cells clickable and interactive (Phase 1)
- ✅ Backend API defined and validated (Phase 2)
- ✅ End-to-end flow works (Phase 3)
- ✅ Performance acceptable with 30+ students × 12+ chapters (Phase 3)
- ✅ No regressions in existing batch/enrollment features (Phase 3)
- ✅ Proficiency updates persist to database
- ✅ Matrix refreshes immediately after updates
- ✅ All TypeScript types correct
- ✅ No console errors or warnings
- ✅Known Limitations & Future Improvements

1. **No track validation on evaluate** - Instructor can evaluate chapters from any track (intentional design)
2. **Mobile view** - Matrix may not be optimal on small screens (consider card layout later)
3. **Bulk operations** - No bulk proficiency update (would be nice-to-have)
4. **Audit logging** - Basic tracking works, could enhance with detailed audit trails
5. **Student visibility** - Progress not visible in student learning view (separate concern)
6. **Performance** - Tested and working well, consider pagination for batches >100 students
7. **Concurrent edits** - Last-write-wins; could add optimistic updates for better UX

## Related Documents

- [../architecture/module-contracts.md](../architecture/module-contracts.md) - Batch & learning module APIs
- [../product-guide.md](../product-guide.md) - Feature context
- [../domain-requirements.md](../domain-requirements.md) - User workflows
- [./mvp-implementation-plan.md](./mvp-implementation-plan.md) - Overall MVP roadmap
- [../archive/proficiency-data-flow-analysis.md](../archive/proficiency-data-flow-analysis.md) - Complete issue analysis
1. Should mobile view use card layout or sticky matrix?
2. Should we version the API endpoint separately?
3. Any performance concerns with large batches?
4. Do we need audit logging for proficiency changes?
5. Should student progress be visible to students in learning view?

---

## Related Documents

- [../architecture/module-contracts.md](../architecture/module-contracts.md) - Batch & learning module APIs
- [../product-guide.md](../product-guide.md) - Feature context
- [../domain-requirements.md](../domain-requirements.md) - User workflows
- [./mvp-implementation-plan.md](./mvp-implementation-plan.md) - Overall MVP roadmap

