# Unified Batch Matrix Implementation Plan

**Last Updated:** December 31, 2025  
**Status:** Phase 1 Complete → Ready for Phase 2 (Backend Wiring)  
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

### Phase 2: Backend Analysis & Design

**Duration:** ~3-5 days  
**Status:** ⏸️ **PAUSED** - Analysis documents archived, ready to resume  
**Goal:** Understand data requirements and API contracts

**Analysis Completed (Archived):**
- ✅ Backend analysis documented in `docs/archive/backend-analysis-unified-batch-matrix.md`
- ✅ Code review completed in `docs/archive/code-review-batch-matrix.md`
- ✅ Critical issues identified (chapterNumber vs order field mismatch, missing enrollmentId in response)
- ✅ Database schema reviewed (studentProgress table, relationships mapped)

**Next Steps (When Resuming):**

#### Remaining Tasks

1. **Fix Backend API Issues**
   - [ ] Fix `getBatchProgress` endpoint - replace `chapterNumber` with `order`
   - [ ] Add `enrollmentId` to response
   - [ ] Add `chapter.code` to response (or derive from order)
   - [ ] Compute `status` field from proficiencyLevel
   - [ ] Return separate `firstName`/`lastName` instead of concatenated

2. **Create/Verify TanStack Query Hooks**
   - [ ] `useBatchProgress(batchId)` - Fetch matrix data
   - [ ] Verify `useEnrollStudent(batchId)` works (already exists)
   - [ ] Verify `useDropEnrollment(batchId)` works (already exists)  
   - [ ] `useUpdateProficiency(batchId)` - Update level per student-chapter
   - [ ] Proper invalidation patterns

3. **Wire Matrix to Real Data**
   - [ ] Replace mock data in BatchDetails with API calls
   - [ ] Connect `onDropStudent` to `useDropEnrollment`
   - [ ] Connect `onUpdateProficiency` to proficiency mutation
   - [ ] Handle loading/error states
   - [ ] Test end-to-end flow

4. **Database Schema Updates (if needed)**
   - [ ] Add unique constraint on studentProgress (studentId, chapterId, batchId)
   - [ ] Add indexes for performance (batchId, studentId)
   - [ ] Add `chapter.code` column (if approach chosen)

5. **Testing**
   - [ ] Integration tests (UI → API → DB)
   - [ ] Error scenarios (network failures, validation errors)
   - [ ] Performance testing (30+ students × 12+ chapters)

---

### Phase 3: Backend Wiring & Integration

**Duration:** ~4-5 days  
**Goal:** Connect UI to real API, finalize backend implementation

#### Tasks

1. **Create TanStack Query Hooks**
   - `useBatchProgress(batchId)` - Fetch matrix data
   - `useAddEnrollment(batchId)` - Add student
   - `useDropEnrollment(batchId)` - Drop student
   - `useUpdateProficiency(batchId)` - Update level per student-chapter
   - Proper invalidation patterns

2. **Integrate into BatchDetails**
   - Replace mock data with real API calls
   - Wire callbacks to mutations
   - Add loading/error states
   - Add retry logic

3. **Implement Backend (if not done in Phase 2)**
   - `GET /api/batches/:id/progress` endpoint
   - `PUT /api/batches/:id/progress/:studentId/:chapterId` endpoint
   - Proper error handling, validation
   - Transaction safety for concurrent updates

4. **Testing**
   - Integration tests (UI → API → DB)
   - Error scenarios (network failures, validation errors)
   - Concurrent updates (two instructors editing simultaneously)
   - Performance testing (large batches)

5. **Deploy & Monitor**
   - Feature flag or gradual rollout
   - Monitor API performance
   - User feedback loop

#### Acceptance Criteria
- ✅ All hooks implemented
- ✅ BatchDetails uses real API data
- ✅ Add/drop/update work end-to-end
- ✅ Error handling complete
- ✅ Performance acceptable
- ✅ No console errors

#### Deliverables
- TanStack Query hooks
- Backend endpoints (if applicable)
- Integration tests
- Updated BatchDetails page

---

## Current Enrollment Table Status

### What's Happening

**Phase 1** (Now):
- Keep current enrollment table AS-IS
- It continues to work as before
- Add students, drop students normally
- Build new matrix component in parallel

**Why?**
- Risk mitigation: Don't break working feature while building new one
- Flexibility: Can iterate on matrix without affecting enrollments
- Gradual transition: Both coexist until matrix is ready

### Transition Timeline

**End of Phase 1:**
- Enrollment table: Still works
- Matrix component: Built but only with mock data
- Status: Ready for backend review

**End of Phase 2:**
- Enrollment table: Still works
- Backend APIs: Analyzed, spec created
- Status: Ready to wire

**End of Phase 3:**
- **Decision point:**
  - Option A: Replace enrollment table with matrix (recommended)
  - Option B: Keep both (matrix as separate "evaluation" view)
  - Option C: Keep enrollment table, embed matrix as tab (hybrid)

### Recommended Approach: Full Replacement

```
BEFORE (Phase 1):
┌─ BatchDetails
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

## Success Metrics

- ✅ Matrix renders without API calls (Phase 1)
- ✅ All cells clickable and interactive (Phase 1)
- ✅ Backend API defined and validated (Phase 2)
- ✅ End-to-end flow works (Phase 3)
- ✅ Performance acceptable with 30+ students × 12+ chapters (Phase 3)
- ✅ No regressions in existing batch/enrollment features (Phase 3)
- ✅ User feedback positive (Post-Phase 3)

---

## Questions for Review

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

