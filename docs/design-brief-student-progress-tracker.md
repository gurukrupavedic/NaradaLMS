# Design Brief: Student Track-wise Progress Visualization

**Project:** VedicLMS - Multilingual Learning Management System  
**Feature:** Student Progress Tracker (Instructor View)  
**Date:** January 4, 2026  
**Status:** Design Brainstorming Phase  
**Audience:** Senior UI Designer/Developer

---

## 🎯 Critical Requirements Summary

**MUST DO:**
1. ✅ Use **exact same color scheme** as batch matrix (see [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts))
   - DO NOT create new colors - reuse `getCellColor()` function
   - 7 proficiency levels: 0 (Amber), 1 (Light Green), 2 (Dark Green), 3 (Light Purple), 4 (Dark Purple), 8 (Gray), 9 (Light Gray)
   
2. ✅ Display tracks the student has studied (via batch enrollment history)
   - Not all 8 tracks - only tracks with progress data
   - Track order + title: "Track 2 - Rigveda Intermediate"
   - Variable data: 1-5 tracks typically, 5-50 chapters per track
   
3. ✅ Show chapter-level proficiency with last evaluation timestamp
   - Chapter order + title: "CH1: Introduction to Rigveda"
   - Proficiency badge with color coding
   - Last evaluated: "Dec 20, 2025 by Karan Dutta"
   
4. ✅ Mobile-first responsive design
   - Single column on mobile (< 640px)
   - Touch-friendly targets (min 44px)
   - No horizontal scroll hell

**MUST NOT DO:**
- ❌ Create custom colors (breaks consistency with batch matrix)
- ❌ Allow inline proficiency editing (use batch matrix for that)
- ❌ Display all 8 tracks if student hasn't studied them yet
- ❌ Use custom CSS files (Tailwind only)

**REFERENCE FILES (Read These First):**
- Color scheme: [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts)
- Proficiency constants: [constants.ts](../shared/constants.ts)
- Existing matrix: [UnifiedBatchMatrix.tsx](../client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx)
- Collapsible card pattern: [StudentDetailsCard.tsx](../client/src/new-ui/instructor/components/StudentDetailsCard.tsx)

---

## Executive Summary

We need to design a track-wise progress visualization that allows **instructors** to view detailed chapter-by-chapter proficiency for individual students across multiple tracks. This view must be information-dense yet scannable, mobile-responsive, and consistent with our existing design system.

---

## Project Context

### What is VedicLMS?

VedicLMS is a Learning Management System for Vedic education that syncs audio recitations with multilingual text (Telugu, Devanagari, English/IAST) using interactive segment-based learning.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite, TanStack Query v5, Radix UI + Tailwind CSS + shadcn/ui
- Backend: Express.js (modular monolith - 6 domain modules), Drizzle ORM, PostgreSQL
- Design: v0 shadcn theme (light/dark mode)

**Architecture (Modular Monolith):**
- 6 independent domain modules: identity-access, content-publishing, media-pipeline, batch-cohort, learning-delivery, system-admin
- Module pattern: Each has `service.ts` (business logic), `storage.ts` (DB access), `types.ts` (contracts)
- API route ownership: Learning-delivery module owns student progress endpoints
- Cross-module access: Via service APIs only (never direct DB queries)
- See [module-contracts.md](architecture/module-contracts.md) for boundaries

### User Personas

**Instructor** (primary user for this feature):
- Teaches 1-5 batches of students (8-15 students per batch)
- Needs to track each student's proficiency across multiple tracks
- Evaluates students chapter-by-chapter using a 5-level proficiency scale
- Uses desktop primarily, but occasionally mobile/tablet

**Student** (not primary for this view):
- Enrolled in 1 batch
- Studies 1-3 tracks concurrently
- Progresses through chapters sequentially

---

## Current State

### What We Have

**Student Progress Page** (`/app/instructor/students/:studentId`):
```
┌─ Student Details Card ──────────────────────────────┐
│ [Avatar] Ramesh Kumar (#BR01-005)              [▼] │
│ Profile info: Email, Phone, Batch, Enrollment       │
└────────────────────────────────────────────────────┘

┌─ Track-wise Progress ───────────────────────────────┐
│ 🚧 Track-wise Progress Tracking — Coming Soon       │
│    (Placeholder - needs design)                     │
└────────────────────────────────────────────────────┘
```

**Completed (January 4, 2026 - Phase 7.3.1):**
- ✅ StudentDetailsCard component (collapsible profile + enrollment info)
- ✅ Permission checks (instructors can only view their assigned students)
- ✅ Route: `/app/instructor/students/:studentId`
- ✅ Backend endpoint: `GET /api/students/:studentId/progress` with 403 protection
- ✅ My Students table with search/filters (search, batch filter, status filter)
- ✅ Responsive design foundation
- ✅ Loading/error states

**Missing (This Phase D):**
- ❌ Track-wise progress visualization (the entire feature we're designing)
- ❌ Backend endpoint: `GET /api/students/:studentId/track-progress` (needs implementation)
- ❌ Chapter-level proficiency display by track
- ❌ Progress summary per track (completion percentage)

**Database Schema (Already Exists):**
- ✅ `studentProgress` table with proficiencyLevel (0-4, 8, 9)
- ✅ Tracks with `order` field (sequential curriculum)
- ✅ Chapters with `order` field (within track)
- ✅ Enrollment data (one active batch per student)
- ✅ Batch assigned to track (current focus)

**Data Flow (Implemented):**
- Student enrolled in batch → Batch assigned to track → Progress tracked per chapter
- Progress preserved when batch changes tracks (cumulative learning)
- Evaluation context includes batchId (which instructor evaluated when)

**Existing Batch Matrix** (for reference - shows ALL students × ALL chapters):
- Used on `/app/instructor/batches/:batchId` and `/app/admin/batches/:batchId`
- Horizontal scroll table with students as rows, chapters as columns
- Component: `UnifiedBatchMatrix.tsx` using TanStack React Table
- Color-coded cells using `getCellColor()` utility from `matrix-utils.ts`:
  - Level 0: `bg-amber-50` (Practicing - Yellow/Amber)
  - Level 1: `bg-emerald-50` (50% - Light Green)
  - Level 2: `bg-green-500` text-white (70% - Dark Green)
  - Level 3: `bg-purple-100` (90% - Light Purple)
  - Level 4: `bg-purple-500` text-white (95% - Dark Purple)
  - Level 8: `bg-gray-200` (Absent - Gray)
  - Level 9: `bg-gray-50` (Not Evaluated - Very Light Gray)
- Clickable cells open proficiency update modal (`MatrixEvaluationModal.tsx`)
- Works well for batch-wide overview, but doesn't drill down into individual student
- **Critical:** Must use EXACT same color scheme for consistency

**Reference Implementation Files:**
- Color scheme: [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts) - `getCellColor()` function
- Matrix table: [UnifiedBatchMatrix.tsx](../client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx)
- Proficiency constants: [constants.ts](../shared/constants.ts) - `PROFICIENCY_LEVELS` object

---

## The Problem

### What We're Solving

**Instructor needs:**
1. **View detailed progress** for ONE student across ALL tracks in their batch
2. **Quickly scan** which chapters are mastered vs. in-progress vs. not started
3. **Identify patterns** (e.g., student struggles with Track 2 but excels in Track 1)
4. **Compare track completion** (e.g., Track 1: 80% done, Track 2: 20% done)
5. **Access recent activity** (when was each chapter last evaluated?)

**Design must:**
- Display **tracks assigned to the student's batch** with their chapters (variable: 1-8 tracks, 5-50 chapters per track)
- Show **proficiency level** (0-4, 8, 9) with existing color scheme
- Be **mobile-responsive** (stack/collapse on smaller screens)
- Maintain **visual consistency** with existing batch matrix color scheme
- Support **future enhancements** (notes, timestamps, filtering)

**Important Context:**
- Students are enrolled in ONE batch at a time
- Batch is assigned to ONE track (current focus)
- Student can see ALL tracks their batch has studied (historical + current)
- Progress is cumulative (preserved when batch changes tracks)
- Evaluation context is batch-scoped (which instructor evaluated when)

---

## Data Model

### Proficiency Scale

**7-Level Scale (0-4, 8, 9):**
- **Level 0:** Started / Practicing (Yellow/Amber)
  - `bg-amber-50`, `text-amber-900`, `border-amber-300`
  - Description: "Attended class, practicing"
  
- **Level 1:** 50% Proficiency (Light Green)
  - `bg-emerald-50`, `text-emerald-800`, `border-emerald-300`
  - Description: "Basic understanding"
  
- **Level 2:** 70% Proficiency (Dark Green)
  - `bg-green-500`, `text-white`
  - Description: "Good understanding"
  
- **Level 3:** 90% Proficiency (Light Purple)
  - `bg-purple-100`, `text-purple-800`, `border-purple-300`
  - Description: "Ready for certification"
  
- **Level 4:** 95% Proficiency / Certified (Dark Purple)
  - `bg-purple-500`, `text-white`
  - Description: "Certified/Mastered"

**Special Levels:**
- **Level 8:** Absent (Gray)
  - `bg-gray-200`, `text-gray-700`, `border-gray-400`
  - Description: "Student absent for class"
  
- **Level 9:** Not Started / Not Evaluated Yet (Very Light Gray)
  - `bg-gray-50`, `text-gray-400`, `border-gray-200`
  - Description: "Chapter not yet taught" (default for new enrollments)

**Color Reference:** See [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts) for exact Tailwind classes and hex codes used in batch matrix.

### API Response Shape

```typescript
{
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber: string;       // Format: BATCHCODE-XXX (e.g., "BR01-005")
    batchCode: string;
    batchName: string;
    enrolledAt: Date;
  },
  trackProgress: [
    {
      trackId: number;
      trackOrder: number;        // 1, 2, 3, etc. (sequential curriculum order)
      trackTitle: string;        // "Rigveda Foundation"
      trackDescription: string;
      completedChapters: number; // Count of chapters with proficiencyLevel >= 3
      totalChapters: number;     // Total chapters in track
      chapters: [
        {
          chapterId: number;
          chapterOrder: number;     // 1, 2, 3, etc. (within track)
          chapterTitle: string;     // "Introduction to Rigveda"
          proficiencyLevel: number; // 0-4, 8 (Absent), 9 (Not Evaluated)
          lastEvaluatedAt: Date | null;
          evaluatedBy: string | null; // Instructor name (firstName lastName)
          notes: string | null;        // Optional evaluation notes
        }
      ]
    }
  ]
}
```

**Note:** API endpoint to implement: `GET /api/students/:studentId/track-progress`

**Business Logic:**
- Only tracks with at least one chapter progress entry shown
- `completedChapters` counts proficiencyLevel >= 3 (competent or higher)
- Chapters ordered by `chapterOrder` (sequential within track)
- Tracks ordered by `trackOrder` (curriculum sequence)

### Example Data

**Student:** Ramesh Kumar (#BR01-005)  
**Batch:** BR01 - Morning Vedic Recitation  
**Current Track:** Track 2 (Rigveda Intermediate)

**Track 1: Rigveda Foundation** (4/10 chapters completed, 40%)
- CH1: Introduction (Level 3 - Proficient ✅, Last: Dec 20, 2025 by Karan Dutta)
- CH2: Basics (Level 2 - 70% Proficiency, Last: Dec 15, 2025 by Karan Dutta)
- CH3: Fundamentals (Level 1 - 50% Proficiency, Last: Dec 10, 2025 by Karan Dutta)
- CH4: Advanced Concepts (Level 0 - Practicing, Last: Dec 5, 2025 by Karan Dutta)
- CH5: Phonetics (Level 8 - Absent, Last: Nov 28, 2025 by Karan Dutta)
- CH6-CH10: Level 9 (Not Evaluated Yet)

**Track 2: Rigveda Intermediate** (0/8 chapters completed, 0%)
- CH1: Intermediate Recitation (Level 1 - 50% Proficiency, Last: Jan 2, 2026 by Karan Dutta)
- CH2-CH8: Level 9 (Not Evaluated Yet)

**Color Coding Reference:**
- Level 0: Amber/Yellow background (`bg-amber-50`)
- Level 1: Light emerald (`bg-emerald-50`)
- Level 2: Dark green with white text (`bg-green-500`)
- Level 3: Light purple (`bg-purple-100`)
- Level 4: Dark purple with white text (`bg-purple-500`)
- Level 8: Gray (`bg-gray-200`)
- Level 9: Very light gray (`bg-gray-50`)

---

## Design Requirements

### Functional Requirements

**Must Have:**
1. Display all tracks student is enrolled in (via batch assignment)
2. Show track metadata (title, order, completion %)
3. Display all chapters per track with proficiency levels
4. Use color coding matching batch matrix (Gray → Yellow → Orange → Green → Purple)
5. Show last evaluation date for each chapter
6. Collapse/expand tracks to manage screen space
7. Responsive design (mobile: stack vertically, tablet: 2 columns, desktop: full layout)

**Nice to Have:**
- Sort chapters by proficiency level
- Filter: Show only "in progress" or "not started"
- Visual progress bar per track
- Quick stats: "3 chapters completed this week"
- Link to chapter content (future feature)

**Won't Have (Post-MVP):**
- Inline proficiency editing (instructors use batch matrix for updates)
- Historical trend charts (proficiency over time)
- Comparison with batch average
- Filtering by proficiency level (defer until user feedback)

### Non-Functional Requirements

- **Performance:** Render 8 tracks × 10 chapters (80 items) in < 500ms
- **Accessibility:** Keyboard navigation, screen reader friendly
- **Consistency:** Match existing shadcn/ui components and batch matrix styling
- **Mobile:** Usable on 360px width screens

---

## Design Constraints

### Technical Constraints

1. **Must use shadcn/ui components** (Accordion, Card, Table, Badge, etc.)
   - Component library: https://ui.shadcn.com/docs/components
   - All components already installed in `@/components/ui/*`
   
2. **TanStack React Table v5** preferred for data-heavy layouts
   - Already used in batch matrix and student tables
   - See [UnifiedBatchMatrix.tsx](../client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx) for reference
   
3. **Tailwind CSS** for styling (no custom CSS files)
   - Use semantic tokens: `bg-card`, `text-foreground`, `border-border`
   - Custom colors in [tailwind.config.ts](../tailwind.config.ts)
   
4. **Dark mode support** required
   - Use `dark:` prefix for all color variants
   - Example: `bg-white dark:bg-gray-900`
   
5. **Color palette:** Must use existing batch matrix colors
   - **DO NOT invent new colors** - use `getCellColor()` from [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts)
   - Function returns all Tailwind classes and hex codes for consistency
   - Exact same visual language as batch matrix (critical for UX consistency)

6. **TanStack Query v5** for API calls
   - All data fetching via React Query hooks
   - See [useBatches.ts](../client/src/new-ui/batches/hooks/useBatches.ts) for pattern

### UX Constraints

1. **Information density:** Must show 40-80 chapters without excessive scrolling
2. **Cognitive load:** Should be scannable at a glance (not require drilling into each item)
3. **Pattern matching:** Instructors should recognize visual patterns (e.g., "this student is weak in early chapters")
4. **Consistency:** Should feel like natural extension of batch matrix, not entirely new UI

### Responsive Constraints

- **Mobile (< 640px):** Single column, minimal horizontal scroll
  - Consider accordion pattern (one track expanded at a time)
  - Chapter cards stacked vertically
  - Touch-friendly tap targets (min 44px)
  
- **Tablet (640-1024px):** 2 columns or stacked with good spacing
  - May show 2 tracks side-by-side
  - Hybrid layout patterns
  
- **Desktop (1024px+):** Full layout, leverage horizontal space
  - Can show multiple tracks simultaneously
  - Table or card grid layouts viable

**Performance Target:** < 500ms render for 100 chapter records (typical max)

---

## Open Questions for Discussion

### Layout Pattern

**Question 1:** What's the best high-level layout for displaying multiple tracks?

**Options to consider:**
- **A) Accordion (collapsible tracks):** Click to expand/collapse each track
  - Pro: Conserves vertical space, familiar pattern
  - Con: Requires interaction to see details, not "at a glance"
  
- **B) Vertical Stack (all expanded):** Each track shows all chapters by default
  - Pro: Everything visible, no clicking needed
  - Con: Lots of scrolling for 8 tracks
  
- **C) Tabs:** One track per tab
  - Pro: Clean, focused view
  - Con: Requires switching tabs to compare tracks
  
- **D) Horizontal Scroll Cards:** Swipeable cards on mobile
  - Pro: Mobile-friendly
  - Con: Desktop experience less optimal

**Your recommendation?**

---

### Chapter Display

**Question 2:** How much detail should each chapter show?

**Minimal (compact):**
```
CH1: Introduction        ████░░ Level 2  Last: Dec 15
```

**Detailed (expanded):**
```
┌─ Chapter 1: Introduction to Rigveda ──────────┐
│ Proficiency: Level 2 (Intermediate) 🟧       │
│ Last Evaluated: Dec 15, 2025 by Karan Dutta  │
│ Progress: 40% of students at this level      │
└───────────────────────────────────────────────┘
```

**Card-based:**
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ CH1             │  │ CH2             │  │ CH3             │
│ Introduction    │  │ Basics          │  │ Fundamentals    │
│ ████░░ Level 2  │  │ ██░░░░ Level 1  │  │ ░░░░░░ Level 0  │
│ Dec 15          │  │ Dec 10          │  │ Never           │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Your recommendation?**

---

### Mobile Responsiveness

**Question 3:** How should the layout adapt for mobile (360px width)?

**Options:**
- Single column, accordion per track
- Horizontal swipe cards (one track visible at a time)
- Simplified list view (hide some metadata)
- Use native mobile patterns (bottom sheet, drawer)

**Your recommendation?**

---

### Visual Hierarchy

**Question 4:** What should be the visual emphasis priority?

**Current thinking:**
1. **Primary:** Proficiency level (color-coded)
2. **Secondary:** Track completion % and chapter title
3. **Tertiary:** Last evaluation date

**Is this the right hierarchy? Should anything else be prominent?**

---

### Interaction Patterns

**Question 5:** Should chapters be interactive?

**Options:**
- **Read-only:** Just display, no clicks (instructors use batch matrix to edit)
- **Clickable:** Click chapter → view details modal
- **Inline editing:** Click proficiency → update inline (duplicates batch matrix functionality)
- **Context menu:** Right-click for actions (view details, view content, etc.)

**Your recommendation?**

---

## Success Metrics

**Design will be successful if:**
1. Instructor can scan all tracks and identify weak areas in < 10 seconds
2. No confusion about proficiency levels (color coding is intuitive)
3. Works smoothly on mobile (no horizontal scroll hell)
4. Consistent with existing batch matrix (feels like same app)
5. Scales to 10+ tracks without breaking

---

## Deliverables Requested

From you, we'd love to receive:

1. **Design Recommendation**
   - Preferred layout pattern (Accordion, Stack, Tabs, etc.)
   - Rationale for your choice
   - Mobile adaptation strategy

2. **Visual Mockups** (optional but appreciated)
   - Wireframe or screenshot showing your recommended approach
   - Desktop and mobile views
   - Can be low-fidelity (Figma, hand sketch, or even ASCII diagrams)

3. **Component Suggestions**
   - Which shadcn/ui components to use
   - Any custom components needed
   - Code snippets if you have time

4. **Interaction Patterns**
   - Expand/collapse behavior
   - Click/hover states
   - Keyboard navigation flow

5. **Edge Cases**
   - How to handle 15+ tracks (unusual but possible)
   - How to show "no tracks assigned" state
   - Loading states and skeletons

---

## References

### Existing Patterns in VedicLMS

**1. Batch Matrix (Color Scheme - MUST MATCH):**
- Route: `/app/instructor/batches/:batchId`
- File: [UnifiedBatchMatrix.tsx](../client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx)
- Color utility: [matrix-utils.ts](../client/src/new-ui/batches/utils/matrix-utils.ts) - **USE `getCellColor()` function**
- Constants: [constants.ts](../shared/constants.ts) - `PROFICIENCY_LEVELS` object
- Behavior: Horizontal scroll table, sticky column headers, clickable cells

**2. Student Details Card (Collapsible Pattern):**
- File: [StudentDetailsCard.tsx](../client/src/new-ui/instructor/components/StudentDetailsCard.tsx)
- Pattern we use for collapsible sections:

```tsx
┌─ Student Details ──────────────────────────────┐
│ [Avatar] Ramesh Kumar (#BR01-005)          [▼] │  ← Collapsed
│ Bramhachari • Batch BR01 - Morning Vedic        │
└────────────────────────────────────────────────┘

┌─ Student Details ──────────────────────────────┐
│ [Avatar] Ramesh Kumar (#BR01-005)          [▲] │  ← Expanded
├────────────────────────────────────────────────┤
│ Email:      ramesh.kumar@example.com           │
│ Phone:      +91 98765 43210                     │
│ Timezone:   Asia/Kolkata (IST, UTC+5:30)       │
│ ... (more fields)                               │
└────────────────────────────────────────────────┘
```

**3. My Batches Cards (Track Display Pattern):**
- File: [MyBatchesList.tsx](../client/src/new-ui/instructor/pages/MyBatchesList.tsx)
- Shows: "Track 2 - Rigveda Intermediate" format
- Full-width dividers using `-mx-4 px-4` pattern

**4. Badge Usage (Proficiency Indicators):**
- We use shadcn Badge component extensively
- Variant colors match proficiency levels
- See batch matrix for proficiency badge patterns

### Design System

- **Base:** v0 shadcn theme (shadcn.com)
- **Components:** https://ui.shadcn.com/docs/components
- **Colors:** Semantic tokens (bg-card, text-foreground, border-border, etc.)
- **Typography:** Variable font sizes, responsive headings
- **Spacing:** Tailwind scale (xs/sm/md/lg/xl)

---

## Timeline

- **Design Feedback:** By January 5-6, 2026 (1-2 days)
- **Implementation:** January 7-9, 2026 (3 days)
- **Testing:** January 10, 2026

---

## Questions?

If you need clarification on anything, please ask:
- Technical constraints
- User workflows
- Data structure
- Existing codebase patterns

We're looking forward to your creative solutions! 🚀

---

**Contact:** Kashyap Kuchipudi  
**Project Repo:** https://github.com/kashyapkuchipudi/VedicLMS  
**Documentation:** See `docs/product-guide.md` and `docs/implementation/mvp-implementation-plan.md`
