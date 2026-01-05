# VedicLMS MVP Implementation Plan

**Last Updated:** January 5, 2026  
**Current Phase:** Phase 5 - Content Studio (Ready to Start)  
**Status:** Phases 0-7.3.1 + Phase D Complete - Content Studio Next

---

## 🎉 Recent Accomplishments (January 4-5, 2026)

**Phase D - Track-wise Student Progress Tracker - COMPLETE ✅**

Completed in **1 day** with full implementation + bug fixes:

✅ **Backend Implementation**
- New endpoint: `GET /api/students/:studentId/track-progress`
- Service methods: `getStudentTrackProgress()`, `buildTrackProgress()`
- Shows ALL tracks in system (not just enrolled)
- Chapter completion count: L2-L4 only (excludes L0, L1, absent=8, not_started=9)
- Permission validation: Instructors can only view assigned students

✅ **Frontend Components** (Migrated from Prototype)
- TrackList.tsx - Accordion with smart defaults
- TrackCard.tsx - Progress bar + completion count
- ChapterList.tsx - Responsive grid (2-6 columns)
- ChapterItem.tsx - Color-coded proficiency cards
- 100% color consistency with batch matrix

✅ **Bug Fixes**
- Fixed nullish coalescing operator bug (0 vs 9)
- Fixed TanStack Query cache invalidation
- Fixed completion count logic (L2-L4 threshold)
- Fixed track filtering (show all, not just enrolled)
- Documented gotcha in `docs/common-gotchas.md`

✅ **Cleanup**
- Deleted temp-prototype folder
- Zero mock data in production
- All imports use @shared/types
- Deleted 4 Phase D design docs

**See detailed history:** [mvp-completed-phases.md](mvp-completed-phases.md#phase-d-track-wise-student-progress-tracker)

---

## Document Purpose

This is the **active implementation guide** for VedicLMS MVP v1.0. It shows:
- ✅ What's done (high-level summary)
- 🎯 What we're working on now (detailed)
- 📋 What's next (roadmap)

**For completed phase details, see:** [mvp-completed-phases.md](mvp-completed-phases.md)

---

## Quick Links

- **Completed Phases Archive:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope & Features:** [mvp-scope.md](mvp-scope.md)
- **Domain Requirements:** [../domain-requirements.md](../domain-requirements.md)
- **Product Guide:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

## 📊 Current Status Dashboard

### ✅ Completed (Phases 0-7.3)

**Foundation (Dec 2025):**
- ✅ Phase 0: Planning & Setup
- ✅ Phase 1: Theme Infrastructure (v0 shadcn theme + dark/light toggle)
- ✅ Phase 2: New Route Namespace (`/app/*` shell with feature flag)

**Feature Migration (Dec 2025):**
- ✅ Phase 3: Admin Center Complete
  - Dashboard, User Management, Batch Management, Audit Logs, System Settings
- ✅ Phase 4: Batches & Progress (Initial)
  - My Batches List, Batch Detail (basic)

**Navigation & Polish (Dec 2025):**
- ✅ Phase 7.1: Navigation Architecture (role-based taxonomy, breadcrumbs)
- ✅ Phase 7.2: Shell Overhaul (v0 sidebar, SidebarProvider)
- ✅ Phase 7.3: Workflow Refinement
  - ✅ Admin Center: All pages polished (Users, Batches, Batch Detail, Audit Logs, Settings)
  - ✅ Batches & Progress: My Batches List, Unified Batch Matrix (Jan 2-3, 2026)

**See detailed history:** [mvp-completed-phases.md](mvp-completed-phases.md)

---

### 🎯 In Progress (Phase 5 - Content Studio)

**Content Studio Migration** (Not started)
- [ ] Content Studio Home - Track list with statistics
- [ ] Track Detail - Chapter list with publish status
- [ ] Edit Chapter - 5-tab interface (Content, Audio, Segmentation, Mapping, Preview)
- [ ] Responsive design (mobile, tablet, desktop)

**Current Focus:** Phase D complete. Ready to start Phase 5 Content Studio.

---

### 🎯 In Progress (Phase 7.3.1 - Jan 4, 2026)

**My Students & Student Progress**
- [x] **Phase A:** My Students - Basic Table + Filters ✅ COMPLETE (Jan 4)
- [x] **Phase B:** Student Progress - Details Card + Placeholder ✅ COMPLETE (Jan 4)
- [x] **Refactoring:** Extracted StudentDetailsCard component ✅ COMPLETE (Jan 4)
- [x] **Phase C:** My Students - Advanced Features (Filters) ✅ COMPLETE (Jan 4)
- [x] **Phase D:** Track-wise Progress View ✅ COMPLETE (Jan 4)

**Current Focus:** Phase 5 - Content Studio (Track Detail, Edit Chapter).

**Final Polish:**
- [ ] **Phase 7.4:** A11y, Performance, Responsive Testing, Production Release

---

## 🎯 Active Phase: 7.3.1 - My Students & Student Progress

**Strategic Approach:**
- Start simple: Core functionality without advanced filters
- Incremental phases: Each phase delivers working features
- Defer enhancements: Filters and advanced UI decided after core is stable
- Clear separation: What's definite vs. what needs discussion

---

### Phase A: My Students - Basic Table ✅ COMPLETE (Jan 4, 2026)

**Goal:** Display all students from instructor's batches in a professional table.

**Delivered:** Completed in 1 day with bonus filters (originally planned for Phase C)

---

#### Frontend Deliverables

✅ **Delivered:** `MyStudentsPage.tsx` at `client/src/new-ui/instructor/pages/`

**TanStack React Table with columns:**
- Roll# (clickable) ✅
- Name (clickable) ✅
- Contact (email or phone) ✅
- Timezone ✅
- Type (Bramhachari/Grihasta) ✅
- Batch Code + Batch Name ✅
- Actions (kebab menu) ✅

**Features Delivered:**
- ✅ Pagination with rows-per-page selector (10, 25, 50, 100)
- ✅ Loading state: Professional skeleton loader
- ✅ Empty state: Helpful message with icon
- ✅ Error state: Retry button
- ✅ Click Roll# or Name → navigate to `/app/instructor/students/:studentId`
- ✅ Standard page header with breadcrumb
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ **Bonus:** Search filter (debounced 300ms)
- ✅ **Bonus:** Batch dropdown filter
- ✅ **Bonus:** Status dropdown filter

---

#### Backend Deliverables

✅ **Delivered:** `GET /api/batches/my-students`

**Endpoint supports filters:**
- `limit` & `offset` for pagination ✅
- `search` - filters by name or email ✅
- `batchId` - filters by specific batch ✅
- `status` - filters by enrollment status ✅

**Logic Implemented:**
- ✅ Query all enrollments where batch's primary instructor = user OR user in co-instructors
- ✅ Join: enrollments → students → batches
- ✅ Return: Array of students with batch context
- ✅ Permission check: Verify user is instructor

**Response Shape:**
```typescript
{
  students: [{
    id: number,
    rollNumber: string,  // Format: BATCH_CODE-XXX (generated)
    name: string,
    email: string,
    phone: string | null,
    timezone: string | null,  // Shows '-' in UI (schema field doesn't exist)
    type: 'bramhachari' | 'grihasta' | null,  // Shows '-' in UI (schema field doesn't exist)
    batchCode: string,
    batchName: string,
    enrolledAt: string  // ISO timestamp
  }],
  total: number  // Total count for pagination
}
```

---

#### Frontend Hooks

✅ **Delivered:** 
- `useMyStudents(filters)` - Fetches students with filter support, pagination, loading/error states
- `useInstructorBatches()` - Fetches batch list for dropdown filter

**Location:** `client/src/new-ui/instructor/hooks/`

---

#### Acceptance Criteria

✅ **All criteria met (Jan 4, 2026):**
- ✅ Table displays all students from instructor's batches
- ✅ Clicking Roll# or Name navigates to Student Progress page
- ✅ Pagination works with row selector
- ✅ Loading/empty/error states render correctly
- ✅ Responsive across all breakpoints
- ✅ No TypeScript errors
- ✅ **Bonus:** Filters (search, batch, status) implemented ahead of schedule

---
- Sorting by column headers
- Bulk actions

---

### Phase B: Student Progress - Details Card + Placeholder ✅ COMPLETE (Jan 4, 2026)

**Goal:** Display student details and placeholder for track progress.

**Delivered:** Completed in 1 day. Refactored to use StudentDetailsCard component.

---

#### Frontend Deliverables

**Page:** `StudentProgressPage.tsx` at `client/src/new-ui/instructor/pages/`

**Student Details Card** (collapsible, reuse BatchDetailsCard pattern):

**Collapsed state:**
```
┌─ Student Details ──────────────────────────────────────┐
│ [Avatar] Ramesh Kumar (#BR01-005)                  [▼] │
│ Bramhachari • Batch BR01 - Morning Vedic Recitation    │
└────────────────────────────────────────────────────────┘
```

**Expanded state:**
```
┌─ Student Details ──────────────────────────────────────┐
│ [Avatar] Ramesh Kumar (#BR01-005)                  [▲] │
├────────────────────────────────────────────────────────┤
│ Email:      ramesh.kumar@example.com                   │
│ Phone:      +91 98765 43210 (or '-' if null)           │
│ Timezone:   Asia/Kolkata (IST, UTC+5:30) (or '-')      │
│ Type:       Bramhachari (or '-')                       │
│ Batch:      BR01 - Morning Vedic Recitation            │
│ Enrolled:   Oct 15, 2025                               │
│ Progress:   45% complete (18/40 chapters)              │
└────────────────────────────────────────────────────────┘
```

**Track Progress Section:** Placeholder card
- Text: "Track-wise progress view - Design in progress"
- Gray background, centered text
- Emoji: 🚧 or 📊

**Features:**
- Breadcrumb: Batches & Progress > My Students > Student Progress
- Sidebar: Active state on "My Students" with "Student Progress" as contextual sub-item
- Loading state: Skeleton for details card + placeholder section
- Error state: Retry button with helpful message
- Standard page header

---

#### Backend Deliverables

**Endpoint:** `GET /api/students/:studentId/progress`

**Logic:**
- Query student by ID
- Join: students → enrollments → batches
- Join: studentProgress → chapters → tracks
- Permission check: Verify instructor is associated with student's batch (primary or co-instructor)
- Return `403 Forbidden` if not authorized

**Response Shape:**
```typescript
{
  student: {
    id: number,
    rollNumber: string,
    name: string,
    email: string,
    phone: string | null,
    timezone: string | null,
    type: 'bramhachari' | 'grihasta' | null,
    batchCode: string,
    batchName: string,
    batchId: number,
    enrolledAt: string
  },
  progress: {
    totalChapters: number,
    completedChapters: number,  // Count where proficiencyLevel >= 4
    percentComplete: number,
    tracks: [{
      trackId: number,
      trackName: string,
      trackCode: string,
      chapters: [{
        chapterId: number,
        chapterName: string,
        chapterCode: string,
        proficiencyLevel: number,  // 0-4, 8 (absent), 9 (not started)
        lastEvaluatedAt: string | null
      }]
    }]
  }
}
```

---

#### Frontend Hooks

**Hooks:**
- `useStudentProgress(studentId)` - Fetches student details + track progress
- `useAuth()` - Verify user has instructor role

---

#### Navigation

**Updates:**
- Update `navigation-config.ts` to add contextual "Student Progress" sub-item under "My Students"
- Update breadcrumb logic in `AppLayout.tsx` to handle `/app/instructor/students/:studentId`
- Back button behavior: Navigate to `/app/instructor/students` (no filter preservation yet)

---

#### Acceptance Criteria

✅ **All criteria met (Jan 4, 2026):**
- ✅ Student Details Card renders with all metadata
- ✅ Collapsible behavior works (extracted to StudentDetailsCard component)
- ✅ Placeholder for track progress visible ("Track-wise Progress Tracking — Coming Soon")
- ✅ Breadcrumb and sidebar navigation correct
- ✅ Permission check prevents unauthorized access (403 error)
- ✅ Loading/error states work
- ✅ No TypeScript errors

**Bonus:** Refactored to extract StudentDetailsCard component for reusability

---

#### Deferred to Phase D

- Track-wise progress UI (needs separate brainstorming)

---

### Phase C: My Students - Advanced Features ✅ COMPLETE (Jan 4, 2026)

**Goal:** Add advanced filtering, sorting, and search to My Students table.

**Status:** Filters fully implemented in Phase A, sorting & URL params deferred post-MVP

**What Was Delivered (Jan 4, 2026):**
- ✅ Search input (by name, email) - debounced 300ms
- ✅ Batch dropdown filter (filter by specific batch)
- ✅ Status dropdown filter (active/inactive/all)
- ✅ Client-side filtering logic
- ✅ Responsive filter layout
- ✅ All features integrated and tested

**What Was Deferred (Post-MVP):**
- ❌ Sortable column headers (click to sort by Roll#, Name, Batch, etc.)
- ❌ URL query param persistence:
  - Example: `/app/instructor/students?search=ramesh&status=active&batch=BR01`
  - Preserves filters on back navigation
  - Shareable URLs
- ❌ Type dropdown (Bramhachari/Grihasta) - schema field doesn't exist yet

**Why Deferred:**
- Filters are sufficient for MVP without sorting
- URL query params add implementation overhead
- Can add after MVP if user feedback indicates need
- Type field requires schema updates (Phase E)

**Decision Point:**
- MVP is stable with current filter set
- Sorting and URL params can be prioritized based on usage feedback

---

### Phase D: Track-wise Progress View ✅ COMPLETE (January 5, 2026)

**Goal:** Display detailed track-by-track chapter proficiency for individual students.

**Status:** Fully implemented and merged to main.

**See detailed documentation:** [mvp-completed-phases.md](mvp-completed-phases.md#phase-d-track-wise-student-progress-tracker)

**Quick Summary:**
- ✅ Backend: New `/api/students/:studentId/track-progress` endpoint
- ✅ Frontend: 4 components (TrackList, TrackCard, ChapterList, ChapterItem)
- ✅ Shows all tracks with chapter-level proficiency
- ✅ Color-coded cards matching batch matrix
- ✅ Responsive grid layout (2-6 columns)
- ✅ Bug fixes: Nullish coalescing, cache invalidation, completion logic
- ✅ Cleanup: Deleted prototype folder, removed mock data

**Outcome:** Instructors can now view comprehensive student progress history across all tracks.

---

### Phase E: Schema Updates & Data Completeness 🔮 FUTURE

**Goal:** Add missing fields to student schema based on real-world usage.

**Status:** Post-MVP (after Phases A & B are stable)

**Potential Schema Changes:**
- Add `timezone` field to users table (string, nullable)
- Add `cohortType` field to users table ('bramhachari' | 'grihasta', nullable)
- Add `phone` field to users table (string, nullable)
- Add `avatar` field to users table (string URL, nullable)

**Migration Strategy:**
- Update `shared/schema.ts` with new fields
- Run `npm run db:push` to apply changes
- Update API responses to include new fields
- Update UI to use real data instead of '-' placeholders
- Seed scripts: Generate realistic test data

**Decision Point:**
- After Phases A & B are stable
- Analyze which fields are actually needed vs. nice-to-have
- Prioritize based on instructor feedback

---

## Implementation Timeline

### ✅ Week 1 - January 4, 2026 (COMPLETE)

**Day 1 (Jan 4):** ✅ Phase A - My Students Table + Filters
- ✅ Backend: `GET /api/batches/my-students` endpoint with filter support
- ✅ Frontend: MyStudentsPage.tsx with TanStack Table
- ✅ Hooks: useMyStudents(), useInstructorBatches()
- ✅ Filters: Search (debounced), batch dropdown, status dropdown
- ✅ Testing: All breakpoints, loading/empty/error states
- **Bonus:** Implemented Phase C filters ahead of schedule

**Day 1 (Jan 4):** ✅ Phase B - Student Progress Page
- ✅ Backend: `GET /api/students/:studentId/progress` endpoint
- ✅ Frontend: StudentDetailsPage.tsx with inline profile/enrollment/matrix
- ✅ Hook: useStudentDetails(studentId)
- ✅ Navigation: Updated breadcrumbs, contextual sidebar navigation
- ✅ Testing: Permission checks (403 on unauthorized), all states
- ✅ Fixed Drizzle ORM schema bugs (3 issues resolved)

**Day 1 (Jan 4):** ✅ Refactoring
- ✅ Extracted StudentDetailsCard.tsx component
- ✅ Simplified StudentDetailsPage to use card + placeholder
- ✅ Removed all inline profile/enrollment code
- ✅ Removed proficiency matrix (deferred to Phase D)
- ✅ Added placeholder: "Track-wise Progress Tracking — Coming Soon"

**Accomplishments:**
- Completed Phases A & B in **1 day** (planned for 4 days)
- Implemented 50% of Phase C (filters) as bonus
- Refactored for better component architecture
- Resolved critical Drizzle ORM schema issues
- Zero TypeScript errors, all features working

### 📋 Week 2+ (January 5+, 2026)

**Next Steps:**
- Phase D: Design brainstorming session (user to provide requirements)
- Phase C remaining: Sortable columns, URL param persistence (if needed)
- Phase E: Schema updates (post-MVP)

**TBD:** Phase D Brainstorming Session
- Design track-wise progress UI
- Mockups or wireframes
- Decide on accordion vs. table vs. other

**TBD:** Phase D Implementation
- Build chosen track progress design
- Test across all devices

**TBD:** Phase C (Filters) - If Deemed Necessary
- Add filters, sorting, search
- Optional URL query params

**COMPLETE:** Phase D (Track-wise Progress View) - January 5, 2026
- Track-wise visualization with accordion layout
- Color-coded chapter proficiency cards
- Responsive grid (2-6 columns)
- All tracks shown regardless of enrollment

**DEFERRED TO SIGN-UP/ONBOARDING FLOW:** User Profile Fields
- Instead of Phase E (standalone schema updates), user profile field capture will be integrated into:
  - New user onboarding/sign-up flow refinement
  - User profile edit page
- Fields to capture: timezone, type (bramhachari/grihasta), phone, avatar, etc.
- Decision: Consolidate with upcoming onboarding work rather than separate phase

---

## Dependencies & Prerequisites

### Before Starting Phase A ✅ DONE
- ✅ Unified Batch Matrix complete (proficiency tracking working)
- ✅ Admin Center patterns established (table styling, pagination, kebab menus)
- ✅ TanStack Query hooks working
- ✅ Navigation config supports contextual sub-items

### Before Starting Phase B ✅ DONE
- ✅ Phase A complete (My Students table working)
- ✅ Backend can query student proficiency across all tracks
- ✅ Permission validation logic in place

### Before Starting Phase D ✅ DONE
- ✅ Phase B complete (Student Progress page with placeholder)
- ✅ Design brainstorming session completed
- ✅ UI mockups approved (accordion + grid layout)

---

## Success Metrics

### Phase A Success ✅ ACHIEVED
- ✅ Instructor can view all students from their batches
- ✅ Clicking student navigates to detail page
- ✅ Table is responsive and professional
- ✅ Loading/empty/error states work
- ✅ Bonus: Search and filters implemented

### Phase B Success ✅ ACHIEVED
- ✅ Instructor can view student details and overall progress
- ✅ Permission checks prevent unauthorized access
- ✅ Collapsible card works smoothly
- ✅ Extracted StudentDetailsCard for reusability

### Phase D Success ✅ ACHIEVED (January 5, 2026)
- ✅ Instructor can see detailed track-wise progress at a glance
- ✅ Proficiency levels are clear and color-coded
- ✅ Mobile experience is fully usable
- ✅ Design scales to all tracks × variable chapters
- ✅ Tooltips show evaluation details
- ✅ Smart accordion defaults (opens first incomplete track)

---

## Quick Reference

### Component Inventory

**Reuse from Existing Codebase:**
- SegmentedTextDisplay, ProgressiveMapper, AudioControls, ScriptSelector
- Badge, Switch, RichTextEditor
- EditChapter.tsx, StudyChapter.tsx

**New Components Built:**
- AppShell, TopNav, Sidebar (Phase 2)
- Admin Center: AdminDashboard, UserManagement, BatchManagement, AuditLogs (Phase 3)
- Batches & Progress: MyBatchesList, UnifiedBatchMatrix (Phase 4 + 7.3)

**To Be Built:**
- My Students: MyStudentsPage (Phase 7.3.1-A)
- Student Progress: StudentProgressPage (Phase 7.3.1-B)
- Content Studio: ContentStudio, TrackDetail (Phase 5)
- Learning: LearningBoard (Phase 6)

### Design Tokens

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640–1024px
- Desktop: 1024px+

**Touch Targets:**
- Minimum: 44px × 44px
- Ideal: 48px × 48px
- Large: 56px × 56px (primary actions)

**Typography (Responsive):**
- **Mobile:** Telugu/Devanagari 36px, English 18px, headers 28px
- **Tablet:** Telugu/Devanagari 32px, English 16px, headers 24px
- **Desktop:** Telugu/Devanagari 30px, English 16px, headers 24px

**Spacing:**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

**Fonts:**
- Telugu: JIMS font (fallback: Noto Sans Telugu)
- Devanagari: AdishilaSanVedic (fallback: Noto Sans Devanagari)
- English: AdishilaSan (fallback: Noto Sans)

---

## Established Patterns

### TanStack Table Pattern
- Column width styling: `style={{ width: '...' }}`
- Sticky headers with `sticky top-0 z-10`
- Pagination with rows-per-page selector
- Loading: Skeleton rows (4-6 rows preview)
- Empty: Icon + helpful message + CTA button
- Error: Alert + retry button

### Collapsible Card Pattern
- Collapsed: Key info only (1-2 lines)
- Expanded: Full metadata grid
- Chevron toggle in header
- Used in: Batch Details, Student Details (upcoming)

### Contextual Navigation Pattern
- Level 1: Sections (Admin Center, Batches & Progress)
- Level 2: Pages (Users, Batches, My Batches, My Students)
- Level 3: Sub-Pages (Batch Details, Student Progress) - shown only when active
- Breadcrumb follows same hierarchy

### Role-Based Routing
- Same component serves multiple roles via URL detection
- Context-aware data fetching (admin sees all, instructor sees assigned only)
- Permission checks in both frontend (UX) and backend (security)

### Toast Notification Pattern
- Success: Green toast, auto-dismiss 3s
- Error: Red toast, auto-dismiss 5s
- Background: Card background (not transparent)
- Consistent messaging across all mutations

---

## 🎯 Next Phase: Phase 5 - Content Studio

**Planned Scope:**
- Content Studio home (track list with metadata)
- Track detail page (chapter list, publish status)
- Edit chapter (5-tab interface: Content, Audio, Segmentation, Mapping, Preview)
- Responsive design (mobile/tablet/desktop)

**Timeline:** TBD - Ready to start

---

## ⚠️ Deferred Work

**Phase E - User Profile Fields** (Deferred to Sign-Up/Onboarding Flow)
- Not a standalone phase
- Will be integrated into upcoming user onboarding/sign-up refinement
- Fields to capture: timezone, type (bramhachari/grihasta), phone, avatar, etc.
- These fields will become available in student details pages once onboarding captures them

---

## References

- **Completed Phases:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope:** [mvp-scope.md](mvp-scope.md)
- **Domain:** [../domain-requirements.md](../domain-requirements.md)
- **Product:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

**Living Document:** This plan evolves as we progress. Update status dashboard and active phase sections regularly. Move completed work to [mvp-completed-phases.md](mvp-completed-phases.md).
