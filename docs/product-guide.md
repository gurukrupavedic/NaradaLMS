# VedicLMS Product Guide

**Version:** 2.0  
**Last Updated:** January 13, 2026  
**Status:** Production - Modular Architecture + New UI

> This is the single source of truth for understanding VedicLMS: what we're building, why we built it this way, and how it works. Feed this to any LLM to get complete product context.

---

## Table of Contents

1. [Vision & Problems We Solve](#1-vision--problems-we-solve)
2. [Solution Overview](#2-solution-overview)
3. [User Roles & Workflows](#3-user-roles--workflows)
4. [Features & Implementation](#4-features--implementation)
5. [Design Philosophy](#5-design-philosophy)
6. [Technical Architecture](#6-technical-architecture)
7. [Current State & Roadmap](#7-current-state--roadmap)

---

## 1. Vision & Problems We Solve

### 1.1 Core Mission

Create a modern, multilingual Learning Management System specifically designed for Vedic education that bridges ancient wisdom with contemporary technology. We enable instructors to create rich, interactive content with synchronized audio-text experiences across three scripts: Telugu, Devanagari (Hindi/Sanskrit), and IAST (English transliteration).

### 1.2 Problems We Address

**For Content Creators (Instructors):**
- **Problem:** No existing LMS properly supports multilingual Vedic content with accurate typography for diacritical marks
- **Solution:** Custom font system (JIMS, AdishilaSanVedic) with 30px standardized display optimized for readability

- **Problem:** Difficult to synchronize audio recitations with specific text portions for pronunciation learning
- **Solution:** Progressive audio-text mapping with click-when-heard interface

- **Problem:** Content management systems force rigid structures unsuitable for Vedic texts
- **Solution:** Flexible rich text editor with reversed Enter/Shift+Enter behavior optimized for verse line breaks

- **Problem:** Publishing workflows lack protection against accidental deletion of live content
- **Solution:** Draft/published status with automatic protection rules

**For Students:**
- **Problem:** Hard to learn proper pronunciation from static text alone
- **Solution:** Interactive segment playback - click any text segment to hear its pronunciation

- **Problem:** Existing systems force either interactive OR reading mode, not both
- **Solution:** Dual learning modes (Interactive segments vs. Rich article view) with localStorage persistence

- **Problem:** Progress tracking doesn't reflect actual proficiency, just completion
- **Solution:** 5-level proficiency scale (0-4) with instructor evaluation

**For Administrators:**
- **Problem:** No support for batch-based cohort learning with multiple instructors
- **Solution:** Flexible batch system with primary + co-instructors, student enrollment management

### 1.3 Design Philosophy

**Why Modern & Colorful (Not Traditional Brown/Gold):**
- Vedic education deserves contemporary aesthetics to attract younger generations
- Bootstrap 5-inspired professional design with vibrant palette
- Colors serve semantic purposes: blue=learning, green=success, orange=audio, indigo=selection

**Why Sticky Note Aesthetic for Segmentation:**
- Amber-50/100 background feels like annotated manuscripts
- Softer than bright yellow, easier on eyes for extended sessions
- Natural "paper" feeling connects to traditional study methods

**Why Indigo for Selection:**
- More refined than generic blue
- Consistent across all selection contexts (tabs, segments, highlights)
- Professional and sophisticated

---

## 2. Solution Overview

### 2.1 What We Offer

VedicLMS is a full-stack web application with three integrated subsystems:

1. **Content Management System**: Create and organize learning tracks, chapters, audio, and text segments
2. **Interactive Learning Platform**: Students access synchronized audio-text content with dual learning modes
3. **Batch Management System**: Instructors manage cohorts, enrollments, and student progress

### 2.2 Core Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Script Support** | Three scripts with proper typography: Telugu, Devanagari, IAST |
| **Audio-Text Sync** | Progressive mapper workflow for linking audio timestamps to text segments |
| **Rich Text Editing** | TipTap WYSIWYG with custom keyboard behavior for mantras |
| **Dual Learning Modes** | Toggle between interactive segments (Learn Mode) and formatted articles |
| **Progress Tracking** | 5-level proficiency scale with instructor evaluation |
| **Batch Management** | Cohort-based learning with primary + co-instructors |
| **User Management** | Multi-role system (student, instructor, content_manager, admin) with approval workflow |
| **Modern UI Shell** | Role-based AppShell with sidebar navigation, dark mode, responsive layout |
| **Design System** | 26 custom components with 12-color variant system |

### 2.3 Value Proposition

- **For Vedic Schools:** Complete digital curriculum management with batch-based instruction
- **For Instructors:** Powerful content creation tools with audio synchronization
- **For Students:** Interactive pronunciation learning with progress tracking
- **For Organizations:** Scalable LMS with modular architecture ready for future growth

---

## 3. User Roles & Workflows

### 3.1 User Roles

| Role | Capabilities | Access Level |
|------|--------------|--------------|
| **Student** | View published content, track progress, access assigned batches | Read-only on content |
| **Instructor** | Evaluate student progress in assigned batches | Write access to progress |
| **Content Manager** | Create/edit/publish tracks, chapters, audio, segments | Write access to content |
| **Admin** | Full system access: users, batches, settings, audit logs | Full access |

**Note:** Users can have multiple roles (e.g., student + instructor)

### 3.2 Registration & Approval Workflow

**Why:** Prevent spam, ensure only vetted students/instructors access the system

**How It Works:**
1. User registers via `/register` with email/password
2. Account created with `status: 'pending_approval'`
3. Login blocked until admin approves
4. Admin reviews via `/manage/users` and approves/rejects
5. Approval automatically assigns `student` role and sets `status: 'active'`
6. User can now log in and access content

### 3.3 Content Creation Workflow (Instructors/Admins)

```
1. Create Track (/manage)
   ↓
2. Create Chapter within Track (/manage/tracks/:trackId)
   ↓
3. Edit Chapter Content (/app/content/tracks/:trackId/chapters/:chapterId)
   ├─ Tab 1: Content - Write content in 3 scripts using rich text editor
   ├─ Tab 2: Segmentation - Create text segments by selecting text
   ├─ Tab 3: Audio & Mapping - Upload audio files and map to timestamps (progressive mapper)
   └─ Tab 4: Preview - Preview learning experience
   ↓
4. Publish Chapter (status: draft → published)
   ↓
5. Published chapters protected from deletion
```

### 3.4 Learning Workflow (Students)

```
1. Login → Dashboard (/)
   ↓
2. Browse Tracks (/tracks)
   ↓
3. Select Track → View Chapters (/tracks/:trackId)
   ↓
4. Study Chapter (/chapter/:chapterId)
   ├─ Learn Mode ON: Click segments to hear audio
   └─ Learn Mode OFF: Read formatted article
```

### 3.5 Batch Management Workflow (Admins)

```
1. Create Batch (/manage/batches)
   - Assign track
   - Assign primary instructor
   ↓
2. Enroll Students
   - Select students from user list
   - Batch assignment required for content access
   ↓
3. Add Co-Instructors (optional)
   - Multiple instructors per batch
   - Equal evaluation privileges
   ↓
4. Instructors Evaluate Progress
   - Set proficiency level (0-4) per chapter
   - Add notes
```

---

## 4. Features & Implementation

### 4.1 Content Hierarchy

```
Track (Curriculum Level)
  └── Chapter (Lesson Level)
        ├── Content (3 scripts: te, hi, en) - JSONB stored HTML
        ├── Audio Files (multiple per chapter)
        ├── Text Segments (script-specific ranges)
        ├── Media Segments (audio timestamp ranges)
        └── Segment Mappings (links text ↔ audio)
```

**Why This Structure:**
- Tracks organize sequential curriculum (8 tracks planned)
- Chapters are self-contained lessons
- Script-specific segmentation allows different segment boundaries per language
- Separation of text segments and media segments enables many-to-many mapping flexibility

### 4.2 Typography System

**Problem:** Standard fonts don't render Vedic diacritical marks correctly

**Solution:** Custom font system with fallbacks

| Script | Primary Font | Fallback | Font Size | Weight | Rationale |
|--------|--------------|----------|-----------|--------|-----------|
| Telugu (te) | JIMS | Noto Sans Telugu | 30px | 400 | Custom glyphs for Telugu Vedic marks |
| Devanagari (hi) | AdishilaSanVedic | Noto Sans Devanagari | 30px | 600 | Semi-bold needed (AdishilaSan appears lighter) |
| IAST (en) | AdishilaSan | Noto Sans | 30px | 400 | Accurate IAST diacritics |

**Implementation:**
- Fonts loaded from `/public/fonts/`
- CSS classes: `font-telugu`, `font-devanagari`, `font-iast`
- 30px standardized for readability in learning contexts
- 28px in segmentation tab for precise text selection

### 4.3 Rich Text Editor

**Problem:** Standard Enter/Shift+Enter behavior doesn't work for verse-based content

**Solution:** TipTap editor with reversed keyboard behavior

| Component | Technology | Key Feature |
|-----------|------------|-------------|
| Editor | TipTap (Prosemirror) | Full WYSIWYG with extensions |
| Keyboard | Reversed | Enter = line break, Shift+Enter = paragraph |
| Toolbar | Bi-directional sync | Cursor position updates toolbar state |
| Font Control | Custom extension | Inline fontSize attribute |

**Why Reversed Keyboard:**
- Mantras require frequent line breaks without paragraph spacing
- Shift+Enter harder to reach; Enter most common for verse lines
- More ergonomic for rapid content entry

**Toolbar Controls:**

*Inline Formatting (selection-based):*
- Bold, Italic, Underline
- Font Family (JIMS, AdishilaSanVedic, AdishilaSan, Inter)
- Font Size (12-48px, 11 options)
- Text Color (Black, Red, Blue, Green)
- Links

*Block Formatting (paragraph-based):*
- Headings (H1-H6)
- Lists (ordered, unordered)
- Alignment (left, center, right, justify)

*Insert:*
- Images (via URL)
- Horizontal rules

**Implementation Details:**
- Focus preservation via `onMouseDown={(e) => e.preventDefault()}`
- Auto-save on content change
- HTML/Text mode toggle for segmentation workflow
- Script selector switches between `content.te`, `content.hi`, `content.en`

### 4.4 Text Segmentation

**Problem:** Need to break text into meaningful chunks for audio synchronization

**Solution:** Interactive text selection with sticky note aesthetic

**How It Works:**
1. Switch to Text mode (plain text, no formatting)
2. Select script (te/hi/en) - segmentation is script-specific
3. Click and drag to select text range
4. System calculates character positions (startPosition, endPosition)
5. Segment appears in right panel as amber card
6. Hover highlights segment in left text display
7. Click segment card to auto-scroll and select in text

**Visual Design:**
- **Idle state:** amber-50 background (soft cream)
- **Hover state:** amber-100 background (warm yellow)
- **Selected state:** indigo-200 background + indigo-400 border
- **Segment cards:** Sticky note aesthetic with numbered pills

**Why Amber Colors:**
- Tried bright yellow first (too harsh, warning-like)
- Amber-50/100 easier on eyes for extended sessions
- Feels like annotated manuscript
- Natural "paper" texture

**Implementation:**
- Resizable two-panel layout (PanelGroup from react-resizable-panels)
- SegmentedTextDisplay component (left panel)
- TextSegment design system component (right panel)
- Auto-scroll using scrollIntoView API with `{behavior: 'smooth', block: 'center'}`
- Data-segment-id attributes for precise targeting

### 4.5 Audio-Text Mapping (Progressive Mapper)

**Problem:** Traditional timestamp entry is error-prone and slow

**Solution:** Click-when-heard progressive workflow

**How It Works:**
1. Select audio file from dropdown
2. Play audio
3. Click segment button when you hear that segment's text begin
4. System records start timestamp
5. Segment card turns orange ("Recording")
6. Click again when segment ends (or next segment begins)
7. System records end timestamp, creates media segment + mapping atomically
8. Segment card turns green ("Mapped") with timestamp badge
9. Auto-advances to next segment
10. Repeat until all segments mapped

**Visual States:**
| State | Card Color | Badge | Meaning |
|-------|------------|-------|---------|
| Ready | White | Gray | Awaiting mapping |
| Recording | Orange | Orange | Start captured, awaiting end |
| Mapped | Green | Green | Fully mapped with timestamps |
| Selected | Indigo border | - | Currently active |

**Why This Workflow:**
- Faster than manual timestamp entry
- Real-time feedback reduces errors
- Natural flow matches listening experience
- Auto-advance maintains momentum

**Implementation:**
- Three-panel layout: Audio player (left) | Instructions (center) | Segments (right)
- MappingSegmentCard design system component with CVA status variants
- Atomic database insertion: creates mediaSegment + segmentMapping in one transaction
- Audio player with play/pause, seek, current time display

### 4.6 Learning Experience (Dual Modes)

**Problem:** Students need both interactive practice AND distraction-free reading

**Solution:** Toggle between Learn Mode ON and OFF

**Learn Mode ON (Interactive):**
- Segments displayed as clickable amber-highlighted blocks
- Click segment → plays audio from startTime to endTime
- Auto-scroll to currently playing segment
- Hover highlights segment
- Progress tracked per segment

**Learn Mode OFF (Article/Recitation):**
- Full HTML content with all formatting preserved
- All font sizes, colors, alignments, custom styles intact
- Traditional reading experience
- No interactive elements

**Why Both Modes:**
- Interactive mode: for learning pronunciation, active practice
- Article mode: for review, recitation practice, distraction-free reading
- Toggle persists via localStorage for user preference

**Implementation:**
- StudyChapter component with mode state
- Learn Mode ON: renders segmented view with click handlers
- Learn Mode OFF: dangerouslySetInnerHTML with HTML content
- Audio element with timestamp seeking
- Font classes applied based on selected script

### 4.7 Batch System

**Problem:** Need to organize students into instructor-led cohorts without breaking progress tracking

**Solution:** Flexible batch system with cumulative progress

**Data Model:**
```
Batch {
  id, batchCode, batchName, trackId, primaryInstructorId, status, ...
}

Enrollment {
  id, batchId, studentId, status (active/dropped/completed), ...
}

BatchCoInstructor {
  id, batchId, instructorId, role (co_instructor/ta), ...
}

StudentProgress {
  id, studentId, chapterId, batchId, proficiencyLevel (0-4), evaluatedBy, notes, ...
}
```

**Key Features:**
- One track per batch
- Primary instructor + unlimited co-instructors (equal privileges)
- Students can switch batches (progress preserved)
- Batch assignment required before content access
- Progress cumulative (not batch-scoped), but evaluation context is batch-scoped

**Why This Design:**
- Flexible scheduling (students can move batches)
- Multiple instructors without permission complexity
- Progress preserved across batch changes (cumulative learning)
- Batch context for instructor accountability (who evaluated when)

**Implementation:**
- Batch routes: `/api/batches` (CRUD, enrollment, co-instructors)
- ManageBatches component for admin
- Instructor dashboards (experimental, in `/experiments`)
- Progress evaluation requires batch context

### 4.8 Progress Tracking

**Problem:** Binary completion doesn't reflect actual proficiency

**Solution:** 5-level proficiency scale with instructor evaluation

**Proficiency Levels:**
- **0:** Not started / no exposure
- **1:** Introduced / basic familiarity
- **2:** Developing / can recite with errors
- **3:** Competent / accurate recitation
- **4:** Proficient / fluent, teaching-ready

**Why 5 Levels:**
- More granular than pass/fail
- Aligns with teaching progression
- Clear expectations per level
- Motivates incremental improvement

**Implementation:**
- StudentProgress table with proficiencyLevel column
- Instructors set via `/api/batches/:batchId/students/:studentId/evaluate`
- Only instructors assigned to batch can evaluate
- Progress displayed in track/chapter views
- Future: gating (Track N+1 requires Track N chapters ≥ level 2)

### 4.9 Authentication & Authorization (Defense in Depth)

**Problem:** Need robust security to protect content, student data, and administrative functions

**Solution:** Multi-layer authentication with role-based access control

**Architecture:**
- **Backend:** Passport.js + Express middleware (authMiddleware + requireRole)
- **Frontend:** Component-level route guards (useRoleGuard hook)
- **Defense in depth:** Both layers enforce authorization independently

**Backend Protection:**
```typescript
// All learning routes require authentication
router.use(authMiddleware);

// Admin routes require admin role
router.use(authMiddleware, requireRole('admin'));

// Multi-role support (instructor OR admin)
router.use(authMiddleware, requireRole('instructor', 'admin'));
```

**Frontend Protection (MANDATORY for all protected pages):**
```typescript
// Standard pattern - use at top of every protected page component
import { useRoleGuard } from '@/new-ui/hooks/useRoleGuard';

export default function ProtectedPage() {
  // Route guard - only specified roles can access
  const isAuthorized = useRoleGuard(['required_role']);
  if (!isAuthorized) return null;

  // Rest of component logic...
}
```

**Role-Based Access Examples:**
| Page | Roles Allowed | Pattern |
|------|--------------|---------|
| Admin pages | `['admin']` | Single role |
| Content Studio | `['content_manager']` | Single role |
| Instructor pages | `['instructor', 'admin']` | Multi-role |
| Learning pages | All roles | No guard needed |

**Why Both Layers:**
- Backend prevents API bypass attempts
- Frontend provides instant UX feedback
- Prevents accidental security holes
- Standard pattern reduces human error

**Implementation Details:**
- `useRoleGuard` hook location: `client/src/new-ui/hooks/useRoleGuard.ts`
- Redirects unauthorized users to `/app/learning`
- Shows descriptive toast notification
- Supports multi-role access (OR logic)
- Waits for auth state to load before checking

**Critical Rule:**
> **ALWAYS** use `useRoleGuard` at the start of protected page components. Never implement custom auth checks or create alternative patterns.

### 4.10 Batch System

**Purpose:** Unified view for batch management and progress evaluation with role-based permissions

**Dual Interface:**

*For Admins (Batch Details):*
- ✅ **Can enroll/unenroll students** in batch (student roster management)
- ❌ **Cannot evaluate proficiency** (disabled cells, read-only view of progress data)
- Rationale: Admins handle logistics, instructors own evaluation
- View proficiency data for reporting/oversight without editing capabilities

*For Instructors (Batch Progress):*
- ❌ **Cannot enroll/unenroll students** (enrollment section hidden)
- ✅ **Can evaluate proficiency** (clickable cells, interactive proficiency modal)
- Rationale: Instructors manage teaching and assessment, admins handle enrollment
- Full control over evaluating student mastery per chapter

**Technical Implementation:**

*Frontend (UX Prevention):*
- Determined by route context: `/app/admin/batches/:id` vs `/app/instructor/batches/:id`
- `canEditProficiency` prop disables proficiency cells for admins
- Disabled cells show tooltip: "Only instructors can update proficiency"
- Only cursor style changes (cursor-not-allowed); cells remain visually vibrant for data readability

*Backend (Security Enforcement):*
- Evaluation endpoint validates user is assigned to batch (primary or co-instructor)
- Admins with instructor role still blocked if not assigned to batch
- Returns 403 FORBIDDEN_NOT_ASSIGNED for unauthorized attempts
- Prevents API bypass attacks even if admin manipulates frontend

**Key Behaviors:**

| Action | Admin | Instructor |
|--------|-------|-----------|
| View batch roster | ✅ Yes | ✅ Yes |
| Enroll students | ✅ Yes | ❌ No |
| Unenroll students | ✅ Yes | ❌ No |
| View proficiency matrix | ✅ Yes (read-only) | ✅ Yes (read/write) |
| Update proficiency level | ❌ No | ✅ Yes |
| View student notes | ✅ Yes | ✅ Yes |
| Add evaluation notes | ❌ No | ✅ Yes |

**Page Title Context:**
- Admin context: "Batch Details" (administrative overview)
- Instructor context: "Batch Progress" (teaching/evaluation focus)

### 4.9 User Management & Authentication

**Technology:** Passport.js with local strategy + social OAuth

**Registration Flow:**
1. User registers via `/register` (email + password)
2. Account created with `status: 'pending_approval'`, `roles: []`
3. Login blocked by authentication middleware
4. User sees "pending approval" message
5. Admin reviews via `/manage/users`
6. Admin approves → sets `status: 'active'`, adds `'student'` role
7. User can now log in

**Multi-Role System:**
- Roles stored as array: `roles: ['student', 'instructor']`
- Role checks via middleware: `requireRole('admin')`, `requireRole('instructor', 'admin')`
- Users can have multiple roles
- Admin has all permissions

**Session Management:**
- PostgreSQL-backed sessions (connect-pg-simple)
- 7-day expiration
- HttpOnly cookies
- Passport serialization/deserialization

**Implementation:**
- Identity module: `/server/modules/identity-access/`
- Routes: `/api/auth/*` (register, login, logout, me)
- Admin routes: `/api/auth/admin/users` (list, approve, role assignment)

### 4.10 Design System (26 Components)

**Problem:** Need consistent, semantic, colorful components across the app

**Solution:** Custom design system built on shadcn/ui with CVA (Class Variance Authority)

**Component Categories:**

*Core UI (12 components):*
- Card, Button, Input, Tabs, Badge, Switch
- Select, Checkbox, Radio, Slider, Progress, Avatar

*Educational Semantics (Color variants):*
- Lesson (blue), Content (green), Progress (purple)
- Audio (orange), Assessment (pink), Feature (indigo)
- Description (teal), Communication (cyan), Highlight (amber)
- Growth (lime), Error (rose), Success (emerald)

*Specialized Components:*
- TextSegment: Segment cards with dynamic pill colors
- MappingSegmentCard: Audio mapping cards with status-based colors
- AudioControls: Audio playback interface
- RichTextEditor: TipTap integration wrapper
- ComponentInspector: Development tool for component inspection

**Color Philosophy:**
- 12 primary colors + 12 variants = 24 total
- Each color has semantic meaning in educational context
- Indigo as universal selection accent
- Vibrant, modern, professional (not traditional brown/gold)

**Implementation:**
- Location: `/client/src/components/design-system/`
- CVA for variant management
- Tailwind CSS with custom config
- Storybook-ready (showcase at `/experiments/design-system`)

---

## 5. Design Philosophy

### 5.1 Why Modern & Colorful

**Rationale:**
Traditional Vedic LMS designs use brown/gold/saffron colors to evoke ancient manuscripts. We intentionally rejected this:

- **Target younger generations:** Modern aesthetics attract students accustomed to contemporary UIs
- **Professional credibility:** Bootstrap 5-inspired design signals seriousness
- **Semantic colors:** Each color communicates meaning (blue=learning, green=success, orange=media)
- **Accessibility:** Higher contrast, better readability

**Inspiration:** Bootstrap 5 color system, GitHub design language, Notion's colorful database views

### 5.2 Design Evolution Examples

**Sticky Note Colors (Segmentation):**
1. **Attempt 1:** `bg-yellow-100` - too bright, felt like warnings
2. **Attempt 2:** `bg-amber-50` - softer, warmer, easier on eyes
3. **Result:** Amber-50 idle, amber-100 hover, indigo-200 selected

**Selection Accent:**
1. **Attempt 1:** Generic `bg-blue-200` - too common
2. **Attempt 2:** `bg-indigo-200` - more sophisticated, matches tab colors
3. **Result:** Indigo as app-wide selection accent (tabs, segments, highlights)

**Segment Pill Colors:**
1. **Attempt 1:** Static gray pills regardless of state
2. **Attempt 2:** Dynamic pills tied to card state (gray idle → indigo-500 selected)
3. **Result:** Strong visual connection between left text and right panel

### 5.3 Experiments Methodology

**Purpose:** Innovation sandbox for testing designs before production

**Process:**
1. Identify UX improvement opportunity
2. Create isolated experiment in `/experiments`
3. Gather feedback from instructors/students
4. Iterate on design
5. Graduate successful experiments to production
6. Document learnings

**Active Experiments:**
- Design System Showcase (`/experiments/design-system`) - **Graduated ✅**
- Admin Panel experiment (`/experiments/admin-panel`)
- Instructor Panel experiment (`/experiments/instructor-panel`)
- Student Dashboard experiment (`/experiments/student-dashboard`)
- Role-based tabs experiment (`/experiments/role-based-tabs`)

**Experiments Infrastructure:**
- Isolated routes, no impact on production
- Static file serving from `/experiments` folder
- Safe to modify/delete without breaking main app

---

## 6. Technical Architecture

### 6.1 Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React 18 + TypeScript | Type safety, component reusability |
| **Build** | Vite | Fast dev server, optimized production builds |
| **Routing** | Wouter | Lightweight (1.5KB), simple API |
| **State** | TanStack Query v5 | Server state caching, optimistic updates |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **UI Base** | shadcn/ui | Accessible primitives, customizable |
| **Rich Text** | TipTap (ProseMirror) | Extensible, TypeScript support |
| **Icons** | Lucide React | Consistent, tree-shakeable |
| **Backend** | Node.js + Express | Mature ecosystem, TypeScript support |
| **Database** | PostgreSQL (Neon) | Relational, JSON support, serverless pooling |
| **ORM** | Drizzle ORM | Type-safe queries, lightweight |
| **Auth** | Passport.js | Flexible strategies, session management |
| **Sessions** | connect-pg-simple | PostgreSQL-backed sessions |
| **File Upload** | Multer | Multipart form data handling |
| **Validation** | Zod | Schema validation, TypeScript inference |

### 6.2 Database Schema (Current State)

**Core Tables:**

```typescript
users          // Multi-role auth (student, instructor, content_manager, admin)
sessions       // Passport sessions
tracks         // 8 curriculum tracks
chapters       // Content with 3-script JSONB content
audioFiles     // Uploaded recordings
textSegments   // Script-specific text ranges
mediaSegments  // Audio timestamp segments
segmentMappings // Text ↔ audio links
batches        // Cohort management
enrollments    // Student-batch assignments
batchCoInstructors // Additional instructors
studentProgress // 5-level proficiency tracking
auditLogs      // System activity tracking
systemSettings // Configuration key-value store
```

**Key Relationships:**
- Tracks → Chapters (1:N)
- Chapters → AudioFiles, TextSegments (1:N each)
- AudioFiles → MediaSegments (1:N)
- TextSegments ↔ MediaSegments (N:M via segmentMappings)
- Batches → Enrollments, CoInstructors (1:N each)
- Students → Progress records (1:N)

**Design Decisions:**
- Script-specific segmentation (separate rows per script, not column-based)
- Content as JSONB `{te?: string, hi?: string, en?: string}` for flexibility
- Cascade deletes on chapters (removes orphaned audio/segments)
- Separate media_segments table (reusable across multiple mappings)
- Batch-scoped evaluation context (progress cumulative, but batch tracks who evaluated)

### 6.3 Modular Architecture

**Problem:** Monolithic 1253-line `routes-simple.ts` was unmaintainable

**Solution:** Domain-driven modular monolith (completed Dec 18, 2025)

**6 Domain Modules:**

```
server/modules/
├── identity-access/       // Auth, users, roles, sessions
├── content-publishing/    // Tracks, chapters, text segments
├── media-pipeline/        // Audio files, media segments, mappings
├── batch-cohort/          // Batches, enrollments, co-instructors
├── learning-delivery/     // Student progress, content access
└── system-admin/          // Audit logs, settings, admin tools
```

**Module Contracts:**
- Each module owns specific tables (single write authority)
- Modules expose public service APIs for cross-module reads
- Events for cross-module notifications (e.g., ChapterPublished)
- Routes call module services (no direct DB access)

**Benefits:**
- Clear ownership boundaries
- Easier to test in isolation
- Ready for future microservice extraction
- TypeScript compilation fast (<2s)

**Details:** See [docs/architecture/module-contracts.md](./architecture/module-contracts.md)

### 6.4 API Routes

**Current Route Structure:**

```
/api/auth/*               // Identity: register, login, logout, me, admin/users
/api/tracks               // Content: CRUD tracks
/api/chapters             // Content: CRUD chapters
/api/segments             // Content: text segment management
/api/audio-files          // Media: upload, metadata, deletion
/api/media-segments       // Media: timestamp segment creation
/api/mappings             // Media: text-audio mapping CRUD
/api/learning/*           // Learning: progress, access tracking
/api/batches              // Batch: CRUD, enrollment, co-instructors
/api/admin/*              // Admin: audit logs, system settings
```

**Middleware:**
- `requireAuth`: Blocks unauthenticated requests
- `requireApproved`: Blocks pending users
- `requireRole('role')`: Role-based authorization
- Error handler: Centralized error responses

### 6.5 Frontend Architecture

**Route-Based Code Splitting:**
- All page components lazy-loaded via React.lazy()
- Reduces initial bundle size
- Faster first page load

**State Management:**
- Server state: TanStack Query (caching, optimistic updates, background refresh)
- Local state: React useState/useReducer
- Preferences: localStorage (learn mode, editor mode)

**Component Organization:**
```
client/src/
├── pages/              // Route-level components (lazy-loaded)
├── components/
│   ├── ui/             // shadcn/ui base components
│   ├── design-system/  // Custom LMS components (26)
│   ├── audio-mapping/  // Progressive mapper components
│   └── text-segmentation/ // Segment display components
├── hooks/              // Custom hooks (useAuth, useToast)
├── lib/                // Utilities (queryClient, helpers)
└── services/           // API request functions
```

**Key Patterns:**
- ErrorBoundary wraps entire app
- TooltipProvider for accessible tooltips
- QueryClientProvider for TanStack Query
- Custom hooks encapsulate auth state, queries

### 6.6 Performance Optimizations

**Implemented:**
- Route-based code splitting (React.lazy)
- Background cache warming for tracks
- Optimistic updates for CRUD operations
- Static file serving with cache headers
- PostgreSQL connection pooling (Neon serverless)

**Measured:**
- Chapter load: < 2 seconds
- Segment highlight response: < 50ms
- Audio seek accuracy: ± 100ms

---

## 7. Current State & Roadmap

### 7.1 What's Implemented (January 13, 2026)

**✅ Core Features:**
- [x] User registration & approval workflow
- [x] Multi-role authentication (student, instructor, content_manager, admin)
- [x] Track & chapter CRUD with draft/published workflow
- [x] Rich text editor with 3-script support
- [x] Audio file upload with metadata extraction
- [x] Text segmentation with sticky note aesthetic
- [x] Progressive audio-text mapping (combined Audio & Mapping tab)
- [x] Dual learning modes (interactive segments + article view)
- [x] Batch management with enrollments
- [x] Co-instructor assignment
- [x] Student progress tracking (5-level proficiency)
- [x] Modern UI shell with sidebar navigation
- [x] Dark mode support (light / dark / system)
- [x] Role-based page organization
- [x] Design system (26 components, 12 colors)

**✅ Architecture:**
- [x] Modular monolith (6 domain modules)
- [x] Dual UI architecture (New UI + Legacy)
- [x] AppShell pattern with theming
- [x] TypeScript clean compile
- [x] Drizzle ORM with PostgreSQL
- [x] TanStack Query for state management
- [x] Route-based code splitting

**✅ Admin Tools:**
- [x] User management (/manage/users)
- [x] Batch management (/manage/batches)
- [x] Audit logging infrastructure
- [x] System settings storage

### 7.2 Known Gaps (See [docs/todo/](./todo/))

**Backend (14 items):**
- [ ] Published chapter deletion protection (db constraint)
- [ ] Input validation on server (duplicate Zod schemas)
- [ ] File upload validation (type whitelist, size limits)
- [ ] Segment overlap prevention
- [ ] Media segment reuse (single segment, multiple mappings)
- [ ] Progress gating (Track N+1 requires Track N ≥ level 2)
- [ ] Instructor batch authorization checks
- [ ] Batch capacity limits
- [ ] Transaction ordering cleanup

**Frontend (7 items):**
- [ ] Loading states/skeletons
- [ ] Form validation UX (inline errors)
- [ ] Error boundaries per route
- [ ] Confirmation modals (delete operations)
- [ ] Dark mode support
- [ ] Mobile responsive layout improvements

**Common (14 items):**
- [ ] E2E test suite (Playwright)
- [ ] Unit tests (Vitest)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component storybook
- [ ] Security audit
- [ ] GDPR compliance
- [ ] CI/CD pipeline
- [ ] Database backup strategy
- [ ] Performance profiling
- [ ] Monitoring/alerting
- [ ] Error tracking (Sentry)

### 7.3 Outstanding Architectural Issues

**1. Legacy audio_mappings Table:**
- Old direct text-audio mapping table still exists
- New pattern: mediaSegments + segmentMappings (cleaner, reusable)
- Migration needed: remove audio_mappings references, update queries

**2. Database Foreign Key Cleanup:**
- Some cascade rules not optimal
- Need audit of all ON DELETE/ON UPDATE rules
- Consider soft deletes for audit trail

**3. Instructor Authorization:**
- Batch-scoped checks incomplete
- Need middleware to verify instructor assignment
- Progress update authorization logic

**4. Content Versioning:**
- No audit trail for content changes
- Consider chapter_versions table for rollback capability

### 7.4 Future Enhancements

**Near-Term (Next 3-6 months):**
1. **Complete New UI Migration:** Finish migrating all pages from legacy to new-ui architecture
2. **Student Dashboard:** Dedicated student view with progress visualization
3. **Instructor Dashboard:** Batch roster, progress overview, evaluation tools
4. **Admin Dashboard:** System health, user analytics, audit log browser
5. **Mobile Responsive:** Continue enhancing touch-friendly controls (in progress)
6. **Track Gating:** Auto-unlock next track based on proficiency

**Medium-Term (6-12 months):**
1. **Waveform Visualization:** Visual audio timeline for mapping
2. **Collaborative Editing:** Real-time co-authoring for instructors
3. **Advanced Search:** Full-text search across content
4. **Export/Import:** Curriculum backup/restore
5. **Notifications:** Email/in-app for progress milestones

**Long-Term (12+ months):**
1. **AI-Assisted Segmentation:** Auto-suggest segment boundaries
2. **Speech Recognition:** Auto-generate transcripts
3. **Gamification:** Badges, leaderboards, achievements
4. **Mobile Apps:** Native iOS/Android with offline support
5. **Multi-Tenancy:** Separate organizations with data isolation

### 7.5 Success Metrics

**Adoption:**
- 100+ active students by Q2 2026
- 10+ instructors creating content
- 500+ chapters published

**Engagement:**
- 80% of students use Learn Mode regularly
- Average 30 minutes per session
- 70% complete at least one track

**Quality:**
- < 2 second page load times
- 99.5% uptime
- < 5% student-reported issues

---

## Appendix

### Related Documents

- [architecture/architecture.md](./architecture/architecture.md) - Technical overview
- [architecture/module-contracts.md](./architecture/module-contracts.md) - Module boundaries
- [domain-requirements.md](./domain-requirements.md) - Real-world workflows
- [todo/todo-backend.md](./todo/todo-backend.md) - Backend improvements
- [todo/todo-frontend.md](./todo/todo-frontend.md) - Frontend improvements
- [todo/todo-common.md](./todo/todo-common.md) - Testing, security, infrastructure

### Quick Links

- **Production App:** [Your deployment URL]
- **Repository:** [https://github.com/kashyapkuchipudi/VedicLMS](https://github.com/kashyapkuchipudi/VedicLMS)
- **Design System:** `/experiments/design-system`
- **Experiments:** `/experiments`

---

**Document Maintenance:**
- Update this doc when implementing new features
- Document design decisions and their rationale
- Keep "Current State" section accurate
- Archive outdated sections to `/docs/archive/`

**Last Updated:** January 13, 2026  
**Next Review:** February 2026
