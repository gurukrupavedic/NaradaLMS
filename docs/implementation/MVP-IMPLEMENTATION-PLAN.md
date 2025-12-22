# VedicLMS MVP Implementation Plan

**Last Updated:** December 22, 2025  
**Status:** In Progress  
**Current Phase:** Planning (Phase 0)

---

## Document Purpose

This is a **living implementation guide** for VedicLMS MVP v1.0. It combines:
- Scope definition (see [MVP-SCOPE.md](MVP-SCOPE.md))
- Navigation & layout architecture
- Phase-by-phase breakdown
- Component inventory
- Development checklist

**This document evolves as we progress through phases. Update sections as decisions are made.**

---

## Quick Links

- **Scope & Features:** [MVP-SCOPE.md](MVP-SCOPE.md)
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
- ✅ MVP scope defined ([MVP-SCOPE.md](MVP-SCOPE.md))
- ✅ Navigation blueprint created (this document)
- ✅ Persona journeys mapped
- 🔜 **Next:** Phase 1 kickoff

### Phase 1: Student Learning Board + Study (2.5 weeks)
**Goal:** Students can browse curriculum and study chapters on any device.

**Components to Build:**
- [ ] Navigation shell (role-based tabs/hamburger)
- [ ] Learning Board dashboard
  - [ ] My Batch card component
  - [ ] Current Chapters (quick access cards)
  - [ ] Curriculum accordion (tracks & chapters)
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] StudyChapter.tsx responsive polish
  - [ ] Mobile: Bottom-sheet audio controls
  - [ ] Larger touch targets (48px segments)
  - [ ] Responsive fonts (36px mobile → 30px desktop)

**Existing Code to Leverage:**
- `StudyChapter.tsx` (student interface, mostly done)
- `SegmentedTextDisplay` (interactive segments)
- `AudioControls` (audio player UI)
- `Badge` (proficiency display)

**Routes:**
- `/` → Learning Board
- `/chapter/:chapterId` → Study Chapter

**Deliverable:** Demo-ready student experience on all devices.

---

### Phase 2: Instructor Batches & Progress (2 weeks)
**Goal:** Instructors can view batches and update student proficiency on any device.

**Components to Build:**
- [ ] My Batches list (cards/grid)
- [ ] Batch Detail screen
  - [ ] Batch info section
  - [ ] Student Progress:
    - [ ] Mobile: Expandable student cards
    - [ ] Desktop: shadcn DataTable
  - [ ] Inline proficiency editing (bottom sheet mobile, inline desktop)
- [ ] Responsive table/card toggling

**Existing Code to Leverage:**
- None yet (new section of app)

**Routes:**
- `/batches` → My Batches
- `/batches/:batchId` → Batch Detail

**Deliverable:** Demo-ready instructor workflow on all devices.

---

### Phase 3: Content Studio Responsive (2.5 weeks)
**Goal:** Content managers can publish chapters on any device.

**Components to Build:**
- [ ] Track management (CRUD)
- [ ] Chapter management (CRUD, publish/unpublish)
- [ ] EditChapter.tsx responsive polish
  - [ ] Mobile: Convert tabs → step wizard
  - [ ] Desktop: Keep tabs, polish styling
  - [ ] Progressive Mapper touch optimization
- [ ] Responsive step wizard (mobile) vs tabs (desktop)

**Existing Code to Leverage:**
- `EditChapter.tsx` (5-step flow, mostly done)
- `ProgressiveMapper` (mapping UX)
- `RichTextEditor` (content editing)
- `SegmentationTab`, `AudioMappingTab` (components)

**Routes:**
- `/content-studio` → Studio home
- `/content-studio/tracks/:trackId/chapters/:chapterId` → Edit Chapter

**Deliverable:** Demo-ready content creation workflow on all devices.

---

### Phase 4: Admin Center Core (1.5 weeks)
**Goal:** Admins can onboard users and manage batches on any device.

**Components to Build:**
- [ ] Admin dashboard overview
- [ ] User Management
  - [ ] Pending approvals (table/cards)
  - [ ] All users (table/cards with role editor)
- [ ] Batch Management
  - [ ] Batch CRUD (cards/table)
  - [ ] Create/edit batch form
  - [ ] Instructor/student assignment (search + multi-select)
- [ ] Audit Logs (basic)
  - [ ] Table/cards with filters
- [ ] System Settings (placeholder)

**Existing Code to Leverage:**
- shadcn components for tables, forms, dialogs
- Existing auth/role infrastructure

**Routes:**
- `/admin` → Admin dashboard
- `/admin/users` → User management
- `/admin/batches` → Batch management
- `/admin/audit-logs` → Audit logs
- `/admin/settings` → System settings

**Deliverable:** Demo-ready admin workflow on all devices.

---

### Phase 5: Design System + A11y + Polish (1.5 weeks)
**Goal:** Production-ready, polished, accessible MVP v1.0.

**Tasks:**
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

### Reuse from Existing Codebase

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `SegmentedTextDisplay` | `client/src/components/text-segmentation/` | ✅ Ready | Core learning UX |
| `ProgressiveMapper` | `client/src/components/audio-mapping/` | ✅ Ready | Innovative mapping UX |
| `AudioControls` | `client/src/components/design-system/` | ✅ Ready | Audio player |
| `ScriptSelector` | `client/src/components/common/` | ✅ Ready | Script switcher |
| `Badge` | `client/src/components/design-system/` | ✅ Ready | Proficiency display |
| `Switch` | `client/src/components/design-system/` | ✅ Ready | Learn mode toggle |
| `RichTextEditor` | `client/src/components/ui/` | ✅ Ready | Content editor |
| `EditChapter.tsx` | `client/src/features/content-management/pages/` | ✅ Ready | 5-step publishing |
| `StudyChapter.tsx` | `client/src/features/learning/pages/` | ✅ Ready | Student interface |

### New Components to Build

| Component | Purpose | Complexity | Phase | Notes |
|-----------|---------|-----------|-------|-------|
| `LearningBoard` | Student dashboard | Medium | 1 | Batch card + curriculum accordion |
| `MyBatchesList` | Instructor list view | Low | 2 | Card grid with filters |
| `BatchDetail` | Batch overview + progress | High | 2 | Dual UI (mobile cards, desktop table) |
| `StudentProgressTable` | Dense proficiency grid | High | 2 | shadcn DataTable with inline edits |
| `RoleBasedNav` | Navigation shell | Low | 1 | Hamburger (mobile), tabs (tablet), sidebar (desktop) |
| `AdminDashboard` | Admin overview | Low | 4 | Card grid + quick actions |
| `UserApprovalQueue` | Pending user reviews | Medium | 4 | Table/cards with actions |
| `BatchCRUDForm` | Create/edit batch | Medium | 4 | Form with multi-select (instructors/students) |
| `AuditLogTable` | Activity log viewer | Medium | 4 | Filterable table/cards |
| `StepWizard` | Mobile content editor | Medium | 3 | Step indicator + full-screen steps |

### Design System Components (shadcn/Radix)

| Component | Usage | Status |
|-----------|-------|--------|
| `Button` | All actions | ✅ Existing |
| `Card` | Container, layout | ✅ Existing |
| `Tabs` | Desktop navigation, step selector | ✅ Existing |
| `Dropdown` | Select, filters | ✅ Existing |
| `Table` | Dense data display | ✅ Existing |
| `Form` | Input fields, validation | ✅ Existing |
| `Dialog/Modal` | Confirmations, forms | ✅ Existing |
| `Input` | Text entry | ✅ Existing |
| `Textarea` | Multi-line text | ✅ Existing |
| `Badge` | Status, tags | ✅ Custom variant |
| `Accordion` | Expandable sections | ✅ Existing |

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

### Color Palette

**Proficiency Badges (0-4):**
```
0: Red/Pink       (#EF4444)
1: Orange         (#F97316)
2: Amber          (#EAB308)
3: Indigo/Blue    (#4F46E5)
4: Green          (#22C55E)
```

**Segment State Colors:**
```
Idle:      Amber-50   (#FFFBEB)
Hover:     Amber-100  (#FEF3C7)
Recording: Orange     (#FB923C)
Mapped:    Green      (#10B981)
Selected:  Indigo-200 (#C7D2FE) + border Indigo-400 (#818CF8)
```

**Fonts:**
```
Telugu:      JIMS font, fallback Noto Sans Telugu
Devanagari:  AdishilaSanVedic, fallback Noto Sans Devanagari
English:     AdishilaSan, fallback Noto Sans
```

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

- **Scope:** [MVP-SCOPE.md](MVP-SCOPE.md)
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
