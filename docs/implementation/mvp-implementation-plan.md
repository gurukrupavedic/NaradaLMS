# VedicLMS MVP Implementation Plan

**Last Updated:** December 22, 2025  
**Status:** In Progress  
**Current Phase:** Phase 3 – Admin Center (Complete) → Phase 4 – Batches & Progress

---

## Document Purpose

This is a **living implementation guide** for VedicLMS MVP v1.0. It combines:
- Scope definition (see [mvp-scope](mvp-scope.md))
- Navigation & layout architecture
- Phase-by-phase breakdown
- Component inventory
- Development checklist

**This document evolves as we progress through phases. Update sections as decisions are made.**

---

## Quick Links

- **Scope & Features:** [mvp-scope](mvp-scope.md)
- **Domain Requirements:** [../domain-requirements.md](../domain-requirements.md)
- **Product Guide:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

## App Architecture Overview

### Role-Based Tab Navigation

All users see **one or more tabs** based on their role:

```
All Users:
├─ 📚 Learning (default)        [Student experience]

Instructors see:
├─ 📚 Learning
└─ 👨‍🏫 Batches & Progress        [Instructor features]

Content Managers see:
├─ 📚 Learning
└─ ✏️ Content Studio            [Publishing workflow]

Admins see:
├─ 📚 Learning
└─ ⚙️ Admin Center              [System management]
```

**Navigation Responsive Behavior:**
- **Mobile (< 640px):** Hamburger drawer
- **Tablet (640–1024px):** Horizontal tabs with icons
- **Desktop (1024px+):** Persistent left sidebar (240px)

---

## Navigation & Layout Blueprint

### Mobile (< 640px)

```
┌─────────────────────────────────────┐
│ [☰] VedicLMS    [Profile 👤]        │  ← Sticky header
└─────────────────────────────────────┘

Hamburger Menu (overlay):
├─ 📚 Learning
├─ 👨‍🏫 Batches & Progress*
├─ ✏️ Content Studio*
├─ ⚙️ Admin Center*
├─ ─────────────────
├─ [Profile Settings]
└─ [Logout]

Main Content (full-width, scrollable)
┌─────────────────────────────────────┐
│ [Active Tab Content]                │
│ (Single column, touch-optimized)    │
└─────────────────────────────────────┘
```

**Key Principles:**
- 44px minimum touch targets
- Single column layout
- Larger fonts (36px Telugu/Devanagari)
- Sticky controls (audio, navigation)

---

### Tablet (640–1024px)

```
┌──────────────────────────────────────────────────┐
│ VedicLMS | Learning | Batches* | Content* | ⚙️* │ 👤 │
└──────────────────────────────────────────────────┘

Main Content (adaptive 2-column or single)
┌──────────────────────────────────────────────────┐
│ [Active Tab Content]                             │
│ (Optimized for medium screens)                   │
└──────────────────────────────────────────────────┘
```

**Key Principles:**
- Horizontal tab navigation
- Adaptive grids (2 columns where logical)
- Table-to-card fallback for dense data

---

### Desktop (1024px+)

```
┌──────────┬────────────────────────────────────────┐
│ Sidebar  │ Content Area                           │
│ 240px    │                                        │
├──────────┼────────────────────────────────────────┤
│ VedicLMS │ [Breadcrumb / Header]                 │
│          ├────────────────────────────────────────┤
│ 📚 Learn │ [Tab Content - Optimized for width]   │
│ 📖 Curr  │                                        │
│ 📊 Prog  │ - Wide tables                         │
│          │ - Multi-panel layouts                  │
│ 👨‍🏫 Batch │ - Rich information density            │
│ 📈 Prog  │                                        │
│          │                                        │
│ ✏️ Contn │                                        │
│ 🎵 Media │                                        │
│          │                                        │
│ ⚙️ Admin │                                        │
│ 👥 Users │                                        │
│ 🏫 Batch │                                        │
│ 📋 Logs  │                                        │
│          │                                        │
│ ─────────│                                        │
│ [👤 Pro] │                                        │
│ [🔓 Log] │                                        │
└──────────┴────────────────────────────────────────┘
```

**Key Principles:**
- Persistent navigation (always visible)
- Wider content area (efficient use of space)
- Dense tables and admin dashboards
- Multi-panel layouts possible

---

## Screen Hierarchy per Persona

### STUDENT - Learning Tab

**Key Screens:**
1. **Learning Board (Dashboard)**
   - My Batch card
   - Current Chapters (auto-highlighted, proficiency 0-1)
   - Curriculum Overview (expandable accordion)
   - Quick actions (Resume, Browse all)

2. **Study Chapter**
   - Header: Back, Chapter title, proficiency badge, menu
   - Controls: Script selector, audio file selector, learn mode toggle
   - Audio controls (play/pause/seek/volume/speed)
   - Content: Interactive segments (Learn Mode) or HTML prose (Read Mode)

### INSTRUCTOR - Batches & Progress Tab

**Key Screens:**
1. **My Batches List**
   - Batch cards: name, current track, role indicator (primary/secondary)
   - Click → Batch Detail

2. **Batch Detail**
   - Header: Batch name, current track selector
   - Batch info: Description, instructors, created date
   - Student Progress:
     - Mobile: Expandable student cards with per-chapter proficiency
     - Desktop: Dense DataTable with inline proficiency dropdowns
   - Filters: By track, by proficiency range

### CONTENT MANAGER - Content Studio Tab

**Key Screens:**
1. **Content Studio Home**
   - Track list (cards or table)
   - Create track button

2. **Track Detail - Chapter List**
   - Chapter list (with status badge: Published/Draft)
   - Create chapter button
   - Reorder chapters (drag handles)

3. **Edit Chapter (5-Step Flow)**
   - Mobile: Step wizard (progress dots, full-screen steps, footer buttons)
   - Desktop: Horizontal tabs (Content, Media, Segmentation, Mapping, Preview)
   - All steps with script-aware functionality (te/hi/en)

   **Steps:**
   1. Content: Rich text editor (TipTap), script selector, auto-save
   2. Media: Upload audio (drag-drop), list with edit/delete
   3. Text Segmentation: Tap-to-segment, reorder, delete (per-script)
   4. Audio Mapping: Progressive Mapper (click-when-heard, state colors)
   5. Preview: Student view with Learn Mode toggle, Publish button

### ADMIN - Admin Center Tab

**Key Screens:**
1. **Admin Dashboard**
   - Overview cards (pending approvals, active batches, user count, recent activity)
   - Quick action buttons

2. **User Management**
   - Pending Approvals: Table/cards with approve/reject
   - All Users: Table/cards with role editor and enable/disable

3. **Batch Management**
   - Batch list: Cards/table with actions (edit, close, deprecate)
   - Create/Edit Batch form: Name, description, current track, instructor/student assignment

4. **Audit Logs**
   - Filters: Date range, user, action type
   - Table/cards: Timestamp, user, action, resource, details

5. **System Settings**
   - Key-value settings (placeholder for MVP, expandable post-release)

---

## Phase Breakdown

### Phase 0: Planning & Setup (Done)
- ✅ MVP scope defined ([mvp-scope](mvp-scope.md))
- ✅ Navigation blueprint created (this document)
- ✅ Persona journeys mapped
- ✅ v0 shadcn theme selected for new UI
- ✅ Phase 1 kickoff completed

---

### Phase 1: Theme Infrastructure (Done)
**Goal:** Set up v0 theme colors and dark/light toggle. No breaking changes to existing UI.

**Key Decision:** We use the v0 theme's colors **as-is**. No custom palette creation. Later (Phase 7+), we can tweak specific colors if needed.

**Tasks:**
- [x] Extract v0 theme CSS variables into `client/src/index.css`
- [x] Install `next-themes` (Vite-compatible)
- [x] Create `ThemeProvider` wrapper component
- [x] Add theme toggle button to header (SimpleDashboard)
- [x] Map v0 colors to Tailwind tokens in `tailwind.config.ts`
- [x] Test dark/light mode across entire app (old UI should work instantly)

**Deliverables:**
- Entire app respects v0 color palette (light & dark)
- Theme toggle works globally
- No breaking changes to existing routes (`/`, `/manage/*`, `/learning/*`)

**Note:** Completed on branch `phase-1-theme-infrastructure` and merged into `daily/2025-12-22`.

---

### Phase 2: New Route Namespace (`/app/*`) – Shell Scaffolding (Done)
**Goal:** Build a parallel `/app/*` shell using the v0 theme behind a feature flag, leaving legacy routes unchanged.

**What shipped:**
- `/app` shell with TopNav + Sidebar + section placeholders (Learning, Batches, Content, Admin)
- Feature flag `VITE_NEW_UI_ENABLED` documented in `.env.example`; defaults off
- v0 theme tokens applied; light/dark toggle works in the shell
- Legacy routes remain untouched

**Tasks:**
- [x] Create `client/src/new-ui/` structure (AppShell, TopNav, Sidebar)
- [x] Build `AppShell.tsx` with section placeholders and Wouter routing
- [x] Adapt imports for Vite + Wouter (no Next.js APIs)
- [x] Wire `/app/*` routes into `App.tsx` under a feature flag
- [x] Add `VITE_NEW_UI_ENABLED` flag + document in `.env.example`
- [x] Test coexistence: `/app/*` (flag on) and legacy routes (always)

**Deliverables:**
- `/app/*` preview shell available when the flag is true
- Legacy UI unaffected when the flag is false
- Ready to start Phase 3 feature migration inside the shell

---

### Phase 3: Feature Migration – Admin Center ✅ COMPLETE (Dec 22, 2025)
**Goal:** Build fully functional new Admin Center using v0 components.

**Completed Work:**
- ✅ Admin dashboard with stats cards and quick navigation
- ✅ User Management with pending approvals, role assignment, and disable/enable toggle
- ✅ Batch Management with CRUD, track selector, and pagination
- ✅ Audit Logs with filters and pagination
- ✅ System Settings placeholder
- ✅ Deep links from dashboard to detail pages
- ✅ Unified toast notifications
- ✅ Compact UI refinements (small uppercase headers, normalized button sizes)
- ✅ Design system alignment with shadcn/studio
- ✅ Responsive testing completed

**Backend Additions:**
- ✅ `GET /api/admin/stats` (aggregated counts)
- ✅ `POST /api/auth/admin/users/:userId/enable` (toggle user status)
- ✅ `POST /api/auth/admin/users/:userId/reject` (delete pending user)
- ✅ Pagination support across admin endpoints

**Branch:** `phase-3-admin-center` (pushed to origin)  
**Status:** Ready to merge to main

**Future Refinements (deferred):**
- Inline validation for duplicate batch codes
- Filter batches by track
- Advanced audit log search
- System settings implementation

---

### Phase 4: Feature Migration – Batches & Progress (1 week) 🔜 NEXT
**Goal:** Build fully functional new Admin Center using v0 components.

**Approach (Clean, Backend-First Hybrid):**
- Define frontend data needs and screens.
- Inventory existing admin APIs; identify mismatches.
- Spec and add minimal backend endpoints (aggregated stats).
- Wire frontend directly to real APIs (no placeholder state).
- Iterate consciously; backend changes only for purposeful additions.
 - Defer navigation and visual polish to Phase 7 (Global Polish).

**Screens:**
- Admin dashboard (overview cards + quick actions)
- User Management (pending approvals + user list)
- Batch Management (CRUD forms)
- Audit Logs (basic table with filters)
- System Settings (placeholder)

**Tasks:**
- [ ] Define frontend data needs per screen (fields, filters, pagination)
- [ ] Map needs → existing APIs; list gaps
- [ ] Spec `GET /api/admin/stats` (counts + recent activity)
- [ ] Implement `GET /api/admin/stats` in server
- [ ] Build `new-ui/admin/pages/AdminDashboard.tsx` (wired to stats)
- [ ] Build `new-ui/admin/pages/UserManagement.tsx` (wired to auth-admin users)
- [ ] Build `new-ui/admin/pages/BatchManagement.tsx` (wired to batch routes)
- [ ] Build `new-ui/admin/pages/AuditLogs.tsx` (wired to admin audit logs)
- [ ] Test both old (`/manage/users`) and new (`/app/admin`) side-by-side
- [ ] Responsive testing (mobile/tablet/desktop)

**Deliverables:**
- `/app/admin/*` fully functional with v0 styling
- Old `/manage/users` still works
- Feature flag lets admins toggle between old/new

---

### Phase 4: Feature Migration – Batches & Progress (1 week) 🔜 NEXT
**Goal:** Build instructor batch management using v0 components.

**Screens:**
- My Batches list (v0 card grid)
- Batch Detail (v0 table for desktop, cards for mobile)

**Tasks:**
- [ ] Build `new-ui/batches/pages/MyBatchesList.tsx` (v0 card grid)
- [ ] Build `new-ui/batches/pages/BatchDetail.tsx` (v0 table + mobile cards)
- [ ] Implement inline proficiency editing (bottom sheet mobile, inline desktop)
- [ ] Connect to APIs (`/api/batches`, `/api/students`, `/api/proficiency`)
- [ ] Test both old and new side-by-side
- [ ] Responsive testing (all devices)

**Deliverables:**
- `/app/batches/*` fully functional with v0 styling
- Old `/manage/batches` still works

---

### Phase 5: Feature Migration – Content Studio (1 week)
**Goal:** Polish content management for new UI using v0 components.

**Screens:**
- Content Studio home (v0 card grid for tracks)
- Track Detail (v0 table/cards for chapters)
- Edit Chapter (desktop tabs OR mobile step wizard, both v0 styled)

**Tasks:**
- [ ] Build `new-ui/content/pages/ContentStudio.tsx` (v0 card grid)
- [ ] Build `new-ui/content/pages/TrackDetail.tsx` (v0 table/cards)
- [ ] Adapt existing `EditChapter.tsx` to work in new UI (wrap with v0 styling)
- [ ] Mobile: Convert tabs → step wizard (v0 styling)
- [ ] Desktop: Keep tabs, apply v0 styling
- [ ] Connect to APIs
- [ ] Responsive testing

**Deliverables:**
- `/app/content/*` fully functional with v0 styling
- Old `/manage/tracks` still works

---

### Phase 6: Feature Migration – Learning Board (1 week)
**Goal:** Polish student learning experience using v0 components.

**Screens:**
- Learning Board (v0 card grid dashboard)
- Study Chapter (interactive learning, reuse existing components)

**Tasks:**
- [ ] Build `new-ui/learning/pages/LearningBoard.tsx` (v0 card grid)
- [ ] Wrap existing `StudyChapter.tsx` with new UI shell (v0 styling)
- [ ] Reuse `SegmentedTextDisplay`, `AudioControls`, `ProgressiveMapper` (no changes)
- [ ] Mobile: Bottom-sheet audio controls
- [ ] Desktop: Sidebar layout
- [ ] Connect to APIs
- [ ] Responsive testing

**Deliverables:**
- `/app/learning/*` fully functional with v0 styling
- Old `/learning/*` still works

---

### Phase 7: Global Polish (Navigation + UI/UX), A11y, Testing, & Cutover Decision (1–2 weeks)
**Goal:** Production-ready new UI. You decide when to cutover.

**Tasks:**
- [ ] A11y audit (keyboard nav, screen reader, focus, contrast)
- [ ] Responsive testing (all breakpoints, all devices)
- [ ] Dark/light mode testing (v0 theme)
- [ ] Performance optimization (code splitting, prefetch, images)
- [ ] Error states & edge cases
- [ ] Bug fixes & refinements

**Then You Decide:**

**Option A: Keep Both UIs (Recommended for now)**
- Both `/` and `/app/*` routes continue working
- Feature flag lets users toggle between old/new
- Gradual deprecation of old UI later

**Option B: Cutover to New UI (Future)**
- Delete old routes (`/`, `/manage/*`)
- Rename `/app/*` → `/` (simple folder rename)
- Deprecate old UI completely
- This becomes a separate implementation task

**Deliverables:**
- **MVP v2.0 – New UI Production Release** (v0 theme)
- Both UIs stable, tested, A11y compliant
- Clear decision on cutover timing

**Tasks:**
- [ ] Navigation refinement
  - [ ] Sidebar taxonomy & grouping (Learning, Batches, Content, Admin)
  - [ ] Admin sub-navigation (Overview, Users, Batches, Logs, Settings)
  - [ ] Breadcrumbs & page headers with consistent actions
  - [ ] Hover/active states, spacing, and focus consistency
- [ ] Consolidate design system tokens (tailwind.config.ts)
  - [ ] Spacing scale (device-aware)
  - [ ] Typography scale (responsive)
  - [ ] Color palette (proficiency badges, segment states)
  - [ ] Touch target sizes (44px, 48px, 56px)
- [ ] A11y audit & fixes
  - [ ] Keyboard navigation (all screens)
  - [ ] Screen reader support (aria labels)
  - [ ] Focus indicators (visible on all elements)
  - [ ] Color contrast (WCAG AA)
- [ ] Performance optimization
  - [ ] Bundle analysis & code splitting
  - [ ] Image optimization
  - [ ] TanStack Query prefetching
  - [ ] Lazy-load routes
- [ ] Bug fixes & refinements
  - [ ] Error state testing
  - [ ] Edge cases (empty states, loading states, error boundaries)
  - [ ] Responsive testing (all breakpoints, all devices)
- [ ] Documentation
  - [ ] Component library (Storybook, optional)
  - [ ] API documentation (OpenAPI, optional)
  - [ ] User guide (optional)

**Deliverable:** **MVP v1.0 - Production Release**

---

## Component Inventory

### Strategy: Reuse Existing + Build New UI Parallel

**Existing Core Components (Keep Unchanged):**
- Learning, content management, and audio components work in both old UI and new UI
- `/app/*` routes wrap these components with new v0 theme styling
- No API changes, no business logic changes—just visual refresh

### Reuse from Existing Codebase (Shared Across Both UIs)

| Component | Location | Status | New UI Usage |
|-----------|----------|--------|--------------|
| `SegmentedTextDisplay` | `client/src/components/text-segmentation/` | ✅ Ready | Study Chapter |
| `ProgressiveMapper` | `client/src/components/audio-mapping/` | ✅ Ready | Content Studio Edit |
| `AudioControls` | `client/src/components/design-system/` | ✅ Ready | Study Chapter |
| `ScriptSelector` | `client/src/components/common/` | ✅ Ready | Study + Content |
| `Badge` | `client/src/components/design-system/` | ✅ Ready | Proficiency display |
| `Switch` | `client/src/components/design-system/` | ✅ Ready | Learn mode toggle |
| `RichTextEditor` | `client/src/components/ui/` | ✅ Ready | Content editor |
| `EditChapter.tsx` | `client/src/features/content-management/pages/` | ✅ Ready | Wrapped in new UI |
| `StudyChapter.tsx` | `client/src/features/learning/pages/` | ✅ Ready | Wrapped in new UI |

### New Components for New UI (`client/src/new-ui/`)

| Component | Purpose | Phase | UI Style |
|-----------|---------|-------|----------|
| `AppShell.tsx` | Header + Sidebar layout | 2 | v0 theme |
| `TopNav.tsx` | Header navigation | 2 | v0 theme |
| `Sidebar.tsx` | Sidebar navigation | 2 | v0 theme |
| `LearningBoard.tsx` | Student dashboard | 6 | v0 card grid |
| `MyBatchesList.tsx` | Instructor batch list | 4 | v0 card grid |
| `BatchDetail.tsx` | Batch overview + student progress | 4 | v0 table + mobile cards |
| `StudentProgressTable.tsx` | Proficiency grid (desktop) | 4 | v0 DataTable |
| `StudentProgressCards.tsx` | Proficiency cards (mobile) | 4 | v0 expandable cards |
| `AdminDashboard.tsx` | Admin overview | 3 | v0 card grid |
| `UserApprovalQueue.tsx` | Pending user reviews | 3 | v0 table/cards |
| `UserManagement.tsx` | User list + role editor | 3 | v0 table |
| `BatchCRUDForm.tsx` | Create/edit batch | 3 | v0 form |
| `ContentStudio.tsx` | Track management | 5 | v0 card grid |
| `TrackDetail.tsx` | Chapter list | 5 | v0 table/cards |
| `AuditLogTable.tsx` | Activity log viewer | 3 | v0 table |

### Design System Components (shadcn/Radix – Already in Codebase)

| Component | Usage | Status | Notes |
|-----------|-------|--------|-------|
| `Button` | All actions | ✅ Existing | v0 theme colors |
| `Card` | Container, layout | ✅ Existing | v0 theme colors |
| `Tabs` | Desktop navigation, step selector | ✅ Existing | v0 styling |
| `Dropdown` | Select, filters | ✅ Existing | v0 styling |
| `Table` | Dense data display | ✅ Existing | v0 styling |
| `Form` | Input fields, validation | ✅ Existing | v0 styling |
| `Dialog/Modal` | Confirmations, forms | ✅ Existing | v0 styling |
| `Input` | Text entry | ✅ Existing | v0 styling |
| `Textarea` | Multi-line text | ✅ Existing | v0 styling |
| `Badge` | Status, tags | ✅ Custom variant | v0 colors |
| `Accordion` | Expandable sections | ✅ Existing | v0 styling |

---

## Responsive Design Tokens

### Breakpoints (Tailwind)

```
Mobile:  < 640px   (sm)
Tablet:  640–1024px (sm–lg)
Desktop: 1024px+   (lg+)
```

### Touch Targets

```
Minimum: 44px × 44px
Ideal:   48px × 48px
Large:   56px × 56px (primary actions)
```

### Typography Scale

```
Mobile:
  - Telugu/Devanagari body: 36px, line-height 2.0
  - English body: 18px, line-height 1.8
  - Headers: 28px
  - Small: 14px

Tablet:
  - Telugu/Devanagari body: 32px, line-height 1.8
  - English body: 16px, line-height 1.6
  - Headers: 24px
  - Small: 13px

Desktop:
  - Telugu/Devanagari body: 30px, line-height 1.6
  - English body: 16px, line-height 1.6
  - Headers: 24px
  - Small: 12px
```

### Spacing Scale

```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
```

## Color Palette & Design Tokens

### v0 Theme Colors (Used As-Is)

We extract the v0 shadcn theme's color palette directly into our CSS variables. **No custom palette creation.** The v0 theme already has:
- Light mode colors
- Dark mode colors
- Semantic colors (primary, secondary, accent, destructive, etc.)

**If we need adjustments later (Phase 7+):**
- Tweak specific hues/shades in `tailwind.config.ts`
- Or extend v0 tokens with custom additions
- But we start with v0 unchanged

### CSS Variables (Extracted from v0)

All colors in `client/src/index.css`:
```css
:root {
  --background: /* v0 light background */
  --foreground: /* v0 light foreground */
  --primary: /* v0 primary */
  --primary-foreground: /* v0 primary foreground */
  --secondary: /* v0 secondary */
  --accent: /* v0 accent */
  --destructive: /* v0 destructive */
  --border: /* v0 border */
  --ring: /* v0 ring */
  --chart-1 through --chart-5: /* v0 chart colors */
  /* ... etc */
}

.dark {
  /* v0 dark mode overrides */
}
```

### Design Tokens (Responsive)

#### Breakpoints
- Mobile: < 640px
- Tablet: 640–1024px
- Desktop: 1024px+

#### Touch Targets
- Minimum: 44px × 44px
- Ideal: 48px × 48px
- Large (primary actions): 56px × 56px

#### Typography (Responsive Scale)
- **Mobile:** Telugu/Devanagari 36px, English 18px, headers 28px
- **Tablet:** Telugu/Devanagari 32px, English 16px, headers 24px
- **Desktop:** Telugu/Devanagari 30px, English 16px, headers 24px

#### Spacing
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

#### Fonts (Existing)
- Telugu: JIMS font, fallback Noto Sans Telugu
- Devanagari: AdishilaSanVedic, fallback Noto Sans Devanagari
- English: AdishilaSan, fallback Noto Sans

---

## Development Checklist

### Pre-Phase 1: Setup
- [ ] Create navigation shell component
- [ ] Set up responsive layout system
- [ ] Define tailwind tokens (spacing, typography, colors)
- [ ] Update routes structure
- [ ] Set up TanStack Query hooks for batches/students/chapters

### Phase 1: Student Learning
- [ ] Build Learning Board dashboard
  - [ ] My Batch card
  - [ ] Current Chapters section
  - [ ] Curriculum accordion
  - [ ] Responsive variants (mobile/tablet/desktop)
- [ ] Polish StudyChapter.tsx
  - [ ] Mobile: Bottom-sheet audio, larger segments
  - [ ] Tablet: Split view (audio left, content right)
  - [ ] Desktop: Current layout, optimize
  - [ ] Responsive font sizes
  - [ ] 44px+ touch targets
- [ ] Test across devices
  - [ ] iPhone SE, iPhone 14, Android 360/414px
  - [ ] iPad, iPad Pro
  - [ ] Desktop 1440px, 2560px
- [ ] Accessibility check (keyboard nav, screen reader, focus)

### Phase 2: Instructor Features
- [ ] Build My Batches list
  - [ ] Card grid layout
  - [ ] Batch card component
  - [ ] Navigation to batch detail
  - [ ] Responsive variants
- [ ] Build Batch Detail screen
  - [ ] Batch info section
  - [ ] Mobile: Expandable student cards
  - [ ] Desktop: shadcn DataTable
  - [ ] Inline proficiency editing
  - [ ] Filters (track, proficiency)
- [ ] API integration (fetch batches, students, update proficiency)
- [ ] Test across devices
- [ ] Accessibility check

### Phase 3: Content Manager Polish
- [ ] Build Track/Chapter management
  - [ ] CRUD screens
  - [ ] Reorder functionality
  - [ ] Publish/unpublish logic
  - [ ] Status badges
- [ ] Responsive EditChapter.tsx
  - [ ] Mobile: Convert tabs to step wizard
  - [ ] Progress indicator (dots)
  - [ ] Full-screen steps
  - [ ] Footer buttons (Back/Save/Next)
  - [ ] Desktop: Keep tabs, polish
- [ ] Touch-optimize Progressive Mapper
  - [ ] Larger segments (48px+)
  - [ ] Better mobile state colors
- [ ] Test across devices
- [ ] Accessibility check

### Phase 4: Admin Features
- [ ] Build Admin dashboard
  - [ ] Overview cards
  - [ ] Quick action buttons
- [ ] User Management
  - [ ] Pending approvals queue
  - [ ] User list with role editor
  - [ ] Enable/disable toggle
- [ ] Batch Management
  - [ ] Batch CRUD forms
  - [ ] Instructor/student assignment
  - [ ] Multi-select UI
- [ ] Audit Logs (basic)
  - [ ] Table/cards with filters
- [ ] System Settings (placeholder)
- [ ] Test across devices
- [ ] Accessibility check

### Phase 5: Polish & Release
- [ ] A11y audit
  - [ ] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
  - [ ] Screen reader testing (VoiceOver, TalkBack)
  - [ ] Focus indicators (all interactive elements)
  - [ ] WCAG AA color contrast
- [ ] Performance optimization
  - [ ] Bundle analysis
  - [ ] Code splitting
  - [ ] Image optimization
  - [ ] TanStack Query prefetch
- [ ] Responsive testing
  - [ ] All breakpoints (sm, md, lg, xl)
  - [ ] All device orientations (portrait, landscape)
  - [ ] All browsers (Chrome, Safari, Firefox, Edge)
- [ ] Bug fixes
  - [ ] Error states
  - [ ] Loading states
  - [ ] Edge cases (empty, long names, etc.)
  - [ ] Error boundaries
- [ ] Documentation (optional)
  - [ ] Component library (Storybook)
  - [ ] API docs (OpenAPI)
- [ ] Release preparation
  - [ ] Version bump
  - [ ] Changelog
  - [ ] Deployment guide

---

## Known Issues & Decisions

### Issues to Resolve

| Issue | Impact | Phase | Status |
|-------|--------|-------|--------|
| Proficiency visibility (batch-specific vs global) | Student confusion | 1 | ✅ Decided: Global (not batch-specific) |
| Audio file default selection | UX friction | 1 | ✅ Decided: First file in list |
| Publish gates (validation checks) | CM workflow | 3 | ✅ Decided: No gates for MVP |
| Instructor edit permissions on chapters | Role clarity | 3 | ✅ Decided: View-only for instructors |
| Deprecate batch behavior | Admin workflow | 4 | ✅ Decided: Read-only, prevent assignments |

### Design Decisions to Lock In

- [ ] Confirm color palette (proficiency badges, segment states)
- [ ] Confirm font sizes (responsive scale)
- [ ] Confirm touch target sizes (44px min)
- [ ] Confirm breakpoints (sm 640, md 1024)
- [ ] Confirm segment state animations (if any)

---

## Communication & Feedback

### Demo Schedule (Proposed)

| Date | Phase | Demo Focus | Audience |
|------|-------|-----------|----------|
| Week 3 | Phase 1 | Student Learning Board + Study | Internal review |
| Week 5 | Phase 2 | Instructor Batches | Internal review |
| Week 7.5 | Phase 3 | Content Studio (responsive) | Internal review |
| Week 9 | Phase 4 | Admin Center | Internal review |
| Week 10.5 | Phase 5 | MVP v1.0 (production) | Stakeholders |

### Feedback Collection

- [ ] Create feedback template (what works, what's confusing, what breaks)
- [ ] Schedule debrief after each phase demo
- [ ] Track bugs/improvements in backlog
- [ ] Iterate quickly based on feedback

---

## References

- **Scope:** [mvp-scope](mvp-scope.md)
- **Domain:** [../domain-requirements.md](../domain-requirements.md)
- **Product:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

## Notes

- **Build Philosophy:** Responsive-first (mobile & desktop equally polished).
- **Existing Code:** Preserve StudyChapter.tsx, EditChapter.tsx, ProgressiveMapper — they're MVP-ready.
- **Design System:** Use shadcn/Radix foundation + custom edu-layer (Badge, Switch, SegmentedTextDisplay).
- **Accessibility:** Built-in from day 1, not bolted on post-MVP.
- **Incremental Demos:** After each phase, demo to gather feedback and adjust.

---

**Living Document:** This plan will evolve. Update as we progress, lock in decisions, and discover new requirements.
