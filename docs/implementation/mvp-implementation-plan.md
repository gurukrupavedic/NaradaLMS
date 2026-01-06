# VedicLMS MVP Implementation Plan

**Last Updated:** January 6, 2026  
**Current Phase:** Phase 5 - Content Studio  
**Status:** Phases 0-4 + Phase 6 Complete | Phase 5 In Progress | MVP Completion Target: End of Phase 5

---

## Document Purpose

This is the **active implementation guide** for the final MVP phase. It focuses on:
- 🎯 Phase 5 - Content Studio (detailed goals, deliverables, timeline)
- 📊 Status dashboard (phases completed and remaining)
- 📋 Post-MVP roadmap (phases 7.4+)

**For completed phase details:** [mvp-completed-phases.md](mvp-completed-phases.md) — comprehensive archive of all finished work (Phases 0-4, 6)

---

## Quick Links

- **Completed Phases Archive:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope & Features:** [mvp-scope.md](mvp-scope.md)
- **Domain Requirements:** [../domain-requirements.md](../domain-requirements.md)
- **Product Guide:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

---

## 📊 Status Dashboard

### ✅ MVP Completion: Phases 0-4 + Phase 6 Complete

**All Completed Phases:**
- ✅ Phase 0: Planning & Setup (Dec 2025)
- ✅ Phase 1: Theme Infrastructure (Dec 22, 2025)
- ✅ Phase 2: New Route Namespace `/app/*` (Dec 2025)
- ✅ Phase 3: Admin Center (Dec 22-25, 2025)
- ✅ Phase 4: Batches & Progress (Dec 23-30, 2025 + Jan 2-5, 2026)
- ✅ Phase 7.1: Navigation Architecture (Dec 23, 2025)
- ✅ Phase 7.2: Shell Overhaul (Dec 23, 2025)
- ✅ Phase 7.3: Workflow Refinement (Dec 25-30, 2025)
- ✅ Phase D: Track-wise Progress Tracker (Jan 5, 2026)
- ✅ Phase 6: Learn - Student Workflow (Jan 4-5, 2026)

**See comprehensive history:** [mvp-completed-phases.md](mvp-completed-phases.md)

### 🎯 Current Phase: Phase 5 - Content Studio

**Target Completion:** End of Phase 5 = **MVP Feature Complete**

---

## 🎯 Phase 5 - Content Studio

**Goal:** Build professional content management interface for content creators to manage and publish educational content.

**Scope:**
1. **Content Studio Home** - Track list with metadata and statistics
2. **Track Detail Page** - Chapter management with publish status
3. **Edit Chapter** - Full 5-tab editor (Content, Audio, Segmentation, Mapping, Preview)
4. **Responsive Design** - Mobile, tablet, desktop equally polished

**Key Features:**
- ✅ Professional chapter editor (TipTap WYSIWYG, multilingual support)
- ✅ Audio management (upload, extract metadata, attribute reciter)
- ✅ Text segmentation (click-drag selection, visual feedback)
- ✅ Audio mapping (progressive click-when-heard interface)
- ✅ Live preview with Learn Mode toggle
- ✅ Publish/unpublish workflow with status indicators
- ✅ Permission checks (content manager can edit only their assigned tracks)

**Technical Requirements:**
- Type-safe (zero TypeScript errors)
- Real-time feedback for all mutations
- Responsive across all breakpoints
- Consistent with established design patterns (TanStack Table, loading states, etc.)

### Phase 5 - Detailed Deliverables

**Status:** Ready to begin  
**Timeline:** TBD  
**Dependencies:** All Phase 6 work complete, all admin/instructor workflows complete

#### Sub-Phase 5.1: Content Studio Home

**Goal:** Track list with metadata and quick stats.

**Deliverables:**
- Content Studio home page at `/app/content/studio`
- Track card grid showing:
  - Track code, name, description
  - Total chapters, published chapters
  - Last edited date, editor name
  - Click to navigate to Track Detail
- Loading skeleton (4-6 card preview)
- Empty state if no tracks assigned
- Responsive grid (1-3 columns by breakpoint)

**Backend:**
- `GET /api/content/tracks/assigned` - Get tracks assigned to user (content manager)
- Returns: Array of tracks with metadata

**Acceptance Criteria:**
- [ ] Track list displays with proper metadata
- [ ] Click track → navigates to Track Detail
- [ ] Loading/empty/error states work
- [ ] Responsive across all breakpoints
- [ ] Zero TypeScript errors

---

#### Sub-Phase 5.2: Track Detail Page

**Goal:** Chapter list with publish status and management options.

**Deliverables:**
- Track detail page at `/app/content/studio/tracks/:trackId`
- Chapter list table with columns:
  - CHAPTER CODE, CHAPTER NAME, STATUS (Published/Draft), LAST EDITED, ACTIONS
- Edit/Delete actions for each chapter
- Create new chapter button (modal form)
- Chapter list sorting by code
- Breadcrumb: Content Studio > [Track Name]

**Backend:**
- `GET /api/content/tracks/:trackId` - Get track with chapters
- Returns: Track with array of chapters

**Acceptance Criteria:**
- [ ] Chapter list displays correctly
- [ ] Click Edit → navigates to Edit Chapter
- [ ] Create new chapter modal works
- [ ] Delete chapter with confirmation
- [ ] Status indicator shows published/draft
- [ ] Responsive design works
- [ ] Zero TypeScript errors

---

#### Sub-Phase 5.3: Edit Chapter (5-Tab Interface)

**Goal:** Comprehensive chapter editor with content, audio, segmentation, mapping, and preview tabs.

**Deliverables:**

**Tab 1: Content Editor**
- HTML/Text toggle for editor type
- TipTap WYSIWYG rich text editor
- Script selector (Telugu, Hindi, English)
- Save and auto-save functionality

**Tab 2: Audio Management**
- Upload audio file (50MB max)
- Display: File name, duration, upload date
- Metadata extraction (duration, channels, sample rate)
- Reciter attribution dropdown
- Delete audio option
- Audio playback preview

**Tab 3: Text Segmentation**
- Segment editor: Click-drag to select text, create segments
- List of segments with start/end character counts
- Delete segment option
- Sticky note aesthetic (amber-50 background)
- Segment editor state colors (idle/hover/selected)

**Tab 4: Audio Mapping**
- Progressive interface: Click-when-heard button during playback
- Maps text segments to audio timestamps
- Visual feedback: Gray → Orange (recording) → Green (mapped)
- Display: Segment text, start time, end time
- Delete mapping option
- Playback preview with highlight synchronization

**Tab 5: Preview**
- Learn Mode toggle (interactive segments vs. read-only HTML)
- Display: Full chapter content with styling
- Audio playback with synchronized text highlight
- Mobile/tablet/desktop responsive preview

**Backend:**
- `GET /api/content/chapters/:chapterId` - Get full chapter with all segments/mappings
- `POST /api/content/chapters/:chapterId` - Save chapter (all tabs)
- `PUT /api/content/chapters/:chapterId` - Update chapter
- `DELETE /api/content/chapters/:chapterId` - Delete chapter

**Acceptance Criteria:**
- [ ] All 5 tabs display and function correctly
- [ ] Save/auto-save works across all tabs
- [ ] Script selector changes content language
- [ ] Audio upload and metadata extraction work
- [ ] Text segmentation visual feedback clear
- [ ] Audio mapping interface intuitive
- [ ] Preview accurately reflects content
- [ ] Responsive design across breakpoints
- [ ] Loading states during save
- [ ] Error handling for upload failures
- [ ] Zero TypeScript errors

---

### Timeline & Dependencies

**Phase 5.1: Content Studio Home**
- Start: Anytime
- Duration: 1 day
- Blockers: None

**Phase 5.2: Track Detail Page**
- Start: After 5.1
- Duration: 1-2 days
- Blockers: None

**Phase 5.3: Edit Chapter**
- Start: After 5.2
- Duration: 2-3 days
- Blockers: TipTap integration, audio upload setup

**Total Phase 5 Duration:** ~4-6 days estimated

---

### Success Metrics

- ✅ Content manager can view assigned tracks
- ✅ Content manager can create, edit, delete chapters
- ✅ All 5 editor tabs functional and smooth
- ✅ Audio upload reliable (50MB max)
- ✅ Text segmentation intuitive (visual feedback)
- ✅ Audio mapping maps to correct timestamps
- ✅ Preview matches live learning experience
- ✅ All workflows responsive on mobile/tablet/desktop
- ✅ Zero TypeScript errors
- ✅ Zero known bugs or blocking issues

---

## Post-MVP Roadmap (Phase 7.4+)

**Phase 7.4: Accessibility & Performance**
- WCAG 2.1 AA compliance audit
- Performance optimization (bundle size, API response times)
- Mobile browser testing (iOS Safari, Android Chrome)
- Lighthouse audit fixes

**Phase 7.5: Production Release**
- Final UAT with stakeholders
- Database production migration
- Deployment strategy (staging → production)
- User documentation
- Support workflow setup

**Phase 8: Post-MVP Features**
- Advanced content management (bulk operations, batch publishing)
- Analytics dashboard (usage, engagement, retention)
- Student portfolio/progress sharing
- Mobile app (React Native)

---

## References

- **Completed Phases Archive:** [mvp-completed-phases.md](mvp-completed-phases.md)
- **Scope:** [mvp-scope.md](mvp-scope.md)
- **Domain:** [../domain-requirements.md](../domain-requirements.md)
- **Product:** [../product-guide.md](../product-guide.md)
- **Architecture:** [../architecture/architecture.md](../architecture/architecture.md)

---

**Living Document:** Phase 5 details will evolve as implementation progresses. Update timeline and sub-phase statuses regularly. Once Phase 5 is complete, move all content to [mvp-completed-phases.md](mvp-completed-phases.md) and this file can be archived.
