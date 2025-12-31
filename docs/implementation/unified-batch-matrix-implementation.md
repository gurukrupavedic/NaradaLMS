# Unified Batch Matrix Implementation Plan

**Last Updated:** December 31, 2025  
**Status:** Planning → Phase 1 (UI Structure)  
**Scope:** Replace enrollment table with unified matrix for proficiency evaluation

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
**Goal:** Build production-ready matrix component with placeholder data

#### Tasks

1. **Add Page-Level Controls to BatchDetails**
   - Update `client/src/new-ui/batches/pages/BatchDetails.tsx` header section:
     - Add **Batch Selector** dropdown
       - Shows all batches user can manage
       - Controls matrix rows (which students appear)
       - Resets Track selector when changed (to batch's currentTrackId)
     - Add **Track Selector** dropdown
       - Shows all tracks in system
       - Controls matrix columns (which chapters appear)
       - Independent of batch selection
       - Default: batch's currentTrackId
     - Add **Current Track** field to BatchDetailsCard
       - Static text display: "Current Track: Track 1 - Shankara's Upanishads"
       - Informational only (read-only)
   
   - State management in BatchDetails:
     ```typescript
     const [batchId, setBatchId] = useState(initialBatchId);
     const [trackId, setTrackId] = useState(batch?.currentTrackId);
     ```
   
   - Fetch dropdowns data:
     - `useQuery` to fetch all batches (filter by user role)
     - `useQuery` to fetch all tracks
     - `useQuery` for batch details (batch info, currentTrackId)

2. **Extract Types & Utils from Prototype**
   - Create `client/src/new-ui/batches/types/matrix.ts`
     - `ProficiencyLevel` (-1 | 0 | 1 | 2 | 3 | 4)
     - `StudentMatrixRow` (id, firstName, lastName, email, enrollmentId)
     - `Chapter` (id, code, title)
     - `StudentProgress` (studentId, chapterId, proficiencyLevel, status, lastUpdated)
   
   - Create `client/src/new-ui/batches/utils/matrix-utils.ts`
     - `getCellColor(level, status)` - Color mapping
     - `getProficiencyLabel(level, status)` - Label formatting
     - Helper functions for color/status logic

3. **Build UnifiedBatchMatrix Component**
   - Create `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx`
   - Props-based architecture (no internal data fetching):
     ```typescript
     interface UnifiedBatchMatrixProps {
       students: StudentMatrixRow[];
       chapters: Chapter[];  // Only chapters from selected track
       progress: StudentProgress[];
       onAddStudent: (studentId: string) => Promise<void>;
       onDropStudent: (enrollmentId: number) => Promise<void>;
       onUpdateProficiency: (studentId, chapterId, level) => Promise<void>;
       isLoading?: boolean;
       isUpdating?: boolean;
     }
     ```
   - Use TanStack Table from prototype (MatrixTableTanStack.tsx)
   - Features:
     - Sticky STUDENT column (left)
     - Kebab menu [⋮] inline with name, aligned right
     - Chapter columns (scrollable, filtered by track)
     - Color-coded proficiency cells
     - Pinned input row for adding students
     - Loading states, empty states, error handling

4. **Build Evaluation Modal**
   - Create `client/src/new-ui/batches/components/MatrixEvaluationModal.tsx`
   - Modal shows when proficiency cell clicked
   - Options: Absent, Practicing, L1, L2, L3, L4
   - Extracted from prototype (clean, reusable)

5. **Test with Mock Data**
   - Create mock data generator
   - Pass as props to UnifiedBatchMatrix
   - Verify UI, colors, interactions work correctly
   - No API calls yet
   - Test page-level dropdowns with mock batch/track data

#### Acceptance Criteria
- ✅ Page-level Batch dropdown renders and changes matrix rows
- ✅ Page-level Track dropdown renders and changes matrix columns
- ✅ Track dropdown resets when batch changes (to batch's currentTrackId)
- ✅ BatchDetailsCard shows "Current Track" field (static)
- ✅ Types extracted and organized
- ✅ UnifiedBatchMatrix component renders correctly
- ✅ Matrix only shows chapters from selected track
- ✅ Modal opens/closes on cell click
- ✅ Colors render correctly per proficiency level
- ✅ Kebab menu works (callbacks fire, but no-op for now)
- ✅ Responsive design works on desktop (mobile = future)
- ✅ Zero TypeScript errors
- ✅ Mock data proves UI works with multiple tracks

#### Deliverables
- `client/src/new-ui/batches/types/matrix.ts` (types only)
- `client/src/new-ui/batches/utils/matrix-utils.ts` (utilities)
- `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx` (main component)
- `client/src/new-ui/batches/components/MatrixEvaluationModal.tsx` (modal)
- Updated enrollment table (simplified, temporary)
- Storybook/demo page with mock data (optional)

---

### Phase 2: Backend Analysis & Design

**Duration:** ~3-5 days  
**Goal:** Understand data requirements and API contracts

#### Tasks

1. **API Audit**
   - Review existing endpoints:
     - `GET /api/batches/:id` (batch detail)
     - `GET /api/batches/:id/chapters` (track chapters)
     - `GET /api/batches/:id/enrollments` (student list)
     - `POST /api/batches/:id/enrollments` (add student)
     - `DELETE /api/enrollments/:id` (drop student)
   - Identify gaps for progress tracking
   - Document what's needed vs. what exists

2. **Database Schema Review**
   - `studentProgress` table structure
   - How proficiency is currently stored
   - Batch-student-chapter relationships
   - Any existing queries for progress data

3. **Design Progress Query**
   - What does `GET /api/batches/:id/progress` return?
   - Structure: Students × Chapters matrix
   - Include: proficiencyLevel, status, lastUpdated per cell
   - Performance: Is it efficient for 30 students × 50 chapters?

4. **Design Mutation Endpoints**
   - `PUT /api/batches/:id/progress/:studentId/:chapterId`
   - Payload: `{ proficiencyLevel: 0-4, status: string }`
   - Response: Updated progress record + toast message

5. **Document Requirements**
   - Create `/docs/implementation/batch-matrix-api-spec.md`
   - List all endpoints needed
   - Input/output schemas
   - Error handling patterns

#### Acceptance Criteria
- ✅ All APIs identified (gaps documented)
- ✅ DB schema understood
- ✅ Performance concerns noted
- ✅ API spec drafted
- ✅ Team alignment on backend approach

#### Deliverables
- API audit document
- Database schema diagram/notes
- API contract spec
- Progress query design
- Implementation roadmap for backend

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

