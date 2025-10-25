# Vedic Learning Management System - Comprehensive Project Documentation

**Last Updated:** October 25, 2025  
**Project Status:** Content Management MVP - Ready for User Feedback  
**Repository:** Vedic LMS Full-Stack Application

---

## Table of Contents

1. [Project Vision & Goals](#1-project-vision--goals)
2. [What We Implemented](#2-what-we-implemented)
3. [What We Accomplished](#3-what-we-accomplished)
4. [Experiments & Design Exploration](#4-experiments--design-exploration)
5. [Complete Sitemap & Navigation](#5-complete-sitemap--navigation)
6. [Technical Architecture](#6-technical-architecture)
7. [Outstanding Architectural Issues](#7-outstanding-architectural-issues)

---

## 1. Project Vision & Goals

### 1.1 Core Mission

To create a modern, multilingual Learning Management System specifically designed for Vedic education that bridges ancient wisdom with contemporary technology. The system enables instructors to create rich, interactive content with synchronized audio-text experiences across three scripts: Telugu, Hindi/Devanagari, and English/IAST.

### 1.2 Primary Objectives

**For Content Creators (Instructors):**
- Create and manage learning tracks and chapters with multilingual support
- Upload audio recitations and synchronize them with text segments
- Build interactive learning experiences through advanced text segmentation and audio mapping
- Publish content with draft/published workflow protection

**For Students:**
- Access Vedic educational content in their preferred script
- Experience synchronized audio-text learning with clickable segments
- Track progress through proficiency levels (0-4 scale)
- Engage with both interactive (Learn Mode) and distraction-free (Read Mode) interfaces

**Design Philosophy:**
- Modern, colorful, elegant aesthetics (rejecting traditional brown/gold Vedic themes)
- Vibrant color palette emphasizing blue, green, purple, orange, pink, indigo
- Bootstrap 5-inspired professional design system with custom colorful palette
- Refined, whisper-light design elements that feel sophisticated rather than bold

---

## 2. What We Implemented

### 2.1 User Authentication & Management

**Technology:** Replit Auth Integration
- Automatic user authentication with Replit accounts
- Multi-role support system (student, instructor, admin)
- User invitation system with admin approval workflow
- Session management using PostgreSQL session storage
- Protected routes with authentication guards

### 2.2 Content Management System

#### 2.2.1 Tracks Management (`/manage`)
- **CRUD Operations:** Create, read, update, delete learning tracks
- **Ordering System:** Drag-and-drop reordering with sequential numbering (1, 2, 3...)
- **Metadata:** Title, description, creation tracking, timestamps
- **Visual Feedback:** Colorful track cards with hover effects
- **Bulk Operations:** Move tracks up/down in sequence

#### 2.2.2 Chapters Management (`/manage/tracks/:trackId`)
- **Track Association:** Chapters nested within tracks
- **Draft/Published Workflow:** Status toggle with publish protection
- **Ordering:** Chapter sequence management within tracks
- **Multilingual Content:** Content stored per script (te/hi/en)
- **Creation Tracking:** Author attribution and edit history

#### 2.2.3 Chapter Editor (`/manage/tracks/:trackId/chapters/:chapterId`)

A powerful tabbed interface with 5 comprehensive tabs:

**Tab 1: Content Editor**
- Rich text editor with HTML/Text mode toggle using Design System Tabs (indigo variant)
- TipTap WYSIWYG editor with formatting toolbar
- Multilingual content management (toggle between Telugu, Hindi, English)
- Script-specific font rendering:
  - Telugu & IAST: JIMS font (fallback: Noto Sans Telugu)
  - Devanagari: Adishila San font (fallback: Noto Sans Devanagari)
- HTML content validation and plain text conversion
- Auto-save functionality

**Tab 2: Audio Management**
- Audio file upload with metadata extraction (duration, file size, MIME type)
- Multiple audio files per chapter support
- Reciter attribution field
- Audio file metadata display (duration, file size)
- Delete audio files with confirmation
- Static file serving for playback (`/uploads`)

**Tab 3: Text Segmentation Studio**
- **Visual Interface:** Resizable two-panel layout (left: text display, right: segment cards)
- **Script-Aware Segmentation:** Independent segmentation for each script
- **Interactive Text Selection:** Click and drag to create segments from chapter content
- **Segment Display:** Sticky note aesthetic
  - Idle: amber-50 background (soft cream yellow)
  - Hover: amber-100 background (richer sticky note)
  - Selected: indigo-200 background + indigo-400 border
- **Segment Management:**
  - Drag-and-drop reordering
  - Delete segments
  - Auto-numbered pills (gray idle, indigo-500 selected)
  - Visual coherence between left text and right panel
- **Auto-scroll:** Smooth scroll to selected segments using scrollIntoView API
- **28px Font Size:** Optimized for Vedic text readability

**Tab 4: Audio Mapping**
- **Progressive Mapper Workflow:** Click-when-heard interface
- **Three-Panel Layout:**
  - Left: Audio controls with waveform visualization
  - Center: Instruction panel with real-time guidance
  - Right: Segment cards with status indicators
- **Mapping States:**
  - Ready: Gray badge
  - Recording: Orange card + badge
  - Mapped: Green card + badge with timestamp display
- **Features:**
  - Click to mark start timestamp when segment audio begins
  - Click to mark end timestamp when segment audio ends
  - Auto-advance to next segment
  - Edit/delete existing mappings
  - Visual progress tracking
- **Audio Player:**
  - Play/pause controls
  - Progress bar with time display
  - Playback speed control (0.5x - 2.0x)
  - Seek functionality

**Tab 5: Preview**
- **Learn Mode Toggle:** Switch between interactive and read-only views
- **Learn Mode ON (Interactive):**
  - Clickable text segments with audio playback
  - Segment highlighting (yellow/amber tones)
  - Auto-play audio from mapped start to end timestamps
  - Progress tracking across segments
- **Learn Mode OFF (Recitation):**
  - Clean HTML article view
  - Script-specific fonts at 28px
  - Distraction-free reading experience
- **State Persistence:** Learn mode preference saved in localStorage

### 2.3 Student-Facing Features

#### 2.3.1 Dashboard (`/` or `/dashboard`)
- Welcome message with user attribution
- Feature cards:
  - Learning: Browse tracks
  - Manage Content: Access content management
  - Experiments: Design system showcases
- Clean, modern card-based layout with colorful borders

#### 2.3.2 Track View (`/tracks/:trackId`)
- Display all chapters within a track
- Chapter proficiency level indicators (0-4)
- Track status badges (not started, in progress, ready for test, certified)
- Click chapters to navigate to chapter view

#### 2.3.3 Chapter View (`/chapters/:id`)
- Segmented text display with audio synchronization
- Language switcher (Telugu/Hindi/English)
- Interactive segments:
  - Hover highlights
  - Click to play associated audio
  - Auto-stop at segment boundaries
- Audio player with controls:
  - Play/pause
  - Playback speed
  - Progress tracking
  - Current segment highlighting

### 2.4 Design System (LMS Design System v1.0)

**26 Professional Components** organized as a cohesive system:

#### Core Components:
1. **Card** - 12 color variants + educational semantics (lesson, progress, content, etc.)
2. **Button** - Solid/outline variants across 12 colors + educational actions
3. **Input** - 12 focus color variants + educational types
4. **Tabs** - Indigo variant with sm/md/lg sizes
5. **Badge** - Status indicators with 96px consistent width
6. **TextSegment** - Segment cards with dynamic pill variants and CVA-based styling
7. **MappingSegmentCard** - Audio mapping cards with status-based colors
8. **Switch** - Toggle controls with multiple color variants
9. **Select** - Dropdown with focus states
10. **Checkbox** - Multiple states and colors
11. **Radio** - Radio button groups
12. **Slider** - Range controls
13. **Progress** - Progress bars
14. **Avatar** - User avatars
15. **Tooltip** - Contextual help
16. **Dialog** - Modal overlays
17. **Alert** - Notification messages
18. **Loading** - Loading states
19. **Breadcrumb** - Navigation breadcrumbs
20. **AudioControls** - Audio playback interface
21. **RichTextEditor** - TipTap-based editor
22. **Textarea** - Multi-line inputs
23. **ComponentInspector** - Development tool
24-26. **Additional utility components**

**Color Palette (24 colors):**
- Blue (#3b82f6): Learning, lessons, information
- Green (#22c55e): Success, completion, content creation
- Purple (#a855f7): Progress, previews, experiments
- Orange (#f97316): Audio content, media
- Pink (#ec4899): Assessments, evaluations
- Indigo (#6366f1): Navigation, features, selection accent
- Teal (#14b8a6): Text content, descriptions
- Cyan (#06b6d4): Communication, home
- Yellow/Amber (#eab308): Warnings, highlights, sticky notes
- Lime (#84cc16): Growth, achievements
- Rose (#f43f5e): Errors, deletion
- Emerald (#10b981): Publishing, tracks
- (Plus 12 additional variants)

**Design Features:**
- Interactive hover states with subtle glow effects
- Consistent transitions and animations
- Multi-layered box-shadows for luminous effects
- CVA (Class Variance Authority) for variant management
- Responsive sizing (sm/md/lg)
- Educational semantic variants

---

## 3. What We Accomplished

### 3.1 Content Management MVP (October 25, 2025)

**Major Milestone:** Content creation workflow is production-ready for early user feedback.

#### 3.1.1 Visual Design Achievements

**Sticky Note Aesthetic:**
- Implemented amber-50/amber-100 color scheme for text segment highlighting
- Softer, warmer tones easier on eyes for extended Vedic text study
- Natural "annotated manuscript" feeling

**Indigo Accent System:**
- Established indigo as consistent selection color throughout app
- Unified highlighting across text display and segment panels
- Dynamic number pill colors (gray idle → indigo-500 selected)
- Visual coherence: "this text on left IS this card on right"

**Color Hierarchy:**
- Gray: Neutral/ready states
- Orange: Active/recording states
- Green: Success/mapped states
- Indigo: Selection accent
- Amber: Idle text highlighting

**Design System Integration:**
- Tabs component with indigo variant for HTML/Text mode toggle
- CVA-based status colors for mapping segment cards
- Consistent badge styling with 96px width
- Professional nomenclature for designer-developer communication

#### 3.1.2 User Experience Achievements

**Auto-scroll Functionality:**
- Implemented scrollIntoView API for segment selection
- Smooth scroll behavior with center alignment
- Works across text segmentation and audio mapping workflows
- Data-segment-id attributes for precise scroll targeting

**Visual Feedback:**
- Refined hover states across all interactive elements
- Clear visual distinction between idle, hover, and selected states
- Status-based card coloring for audio mapping workflow
- Progress indicators for mapping completion

**Workflow Optimization:**
- Progressive mapper with clear real-time instructions
- Click-when-heard interface reduces cognitive load
- Auto-advance through segments during mapping
- Visual status tracking (ready → recording → mapped)

#### 3.1.3 Technical Achievements

**Component Architecture:**
- SegmentedTextDisplay component with amber/indigo color scheme
- TextSegment design system component with dynamic pill variants
- MappingSegmentCard with CVA-based status colors
- Separation of concerns: layout vs. business logic

**Layout Consistency:**
- Strict tab pattern: TabsContent → wrapper → header → content
- Resizable panels using PanelGroup pattern
- Height constraints preventing infinite vertical expansion
- Internal scrollbars for content overflow

**Performance:**
- React Query for caching and optimistic updates
- Code splitting with lazy loading
- Bundle optimization with centralized icon imports
- Background cache warming for tracks

---

## 4. Experiments & Design Exploration

### 4.1 Purpose of Experiments Page

The Experiments page (`/experiments`) serves as an **innovation sandbox** for:
- Testing new design patterns before production integration
- Showcasing design system components in isolation
- Exploring UI/UX alternatives without disrupting main app
- Providing a central hub for design reviews and feedback
- Maintaining clean separation between experimental and production code

### 4.2 Experiment Guidelines

1. **Dedicated Space:** Each experiment gets its own route and dedicated space
2. **Production Graduation:** Ready experiments move to main application
3. **Clean Architecture:** Consistent navigation structure for easy expansion
4. **Documentation:** Each experiment includes purpose and learnings

### 4.3 Active Experiments

#### Experiment 1: Design System (`/experiments/design-system`)
**Status:** Production Ready ✅

**Purpose:** Develop a modern, colorful design system as alternative to default shadcn/ui components.

**What We Explored:**
- 12-color variant system vs. single primary color
- Educational semantic variants (lesson, progress, content)
- Glow effects and subtle hover interactions
- Multi-language typography optimization
- Component composition patterns

**Key Learnings:**
- Vibrant colors increased engagement without sacrificing professionalism
- Semantic variants improved developer experience (self-documenting code)
- CVA (Class Variance Authority) proved excellent for variant management
- Consistent interaction patterns across components enhanced UX

**Components Developed:** 26 production-ready components

**Outcome:** Successfully graduated to production. Now used throughout content management interface.

#### Experiment 2-N: Placeholder
**Status:** Future Experiments

Reserved slots for:
- Alternative text segmentation interfaces
- Audio waveform visualization experiments
- Student progress tracking UI alternatives
- Gamification elements testing
- Mobile-responsive layout explorations

### 4.4 Design Exploration Process

**Our Iterative Approach:**

1. **Identify Pain Point:** User feedback or UX analysis reveals improvement opportunity
2. **Create Experiment:** Build isolated prototype in experiments page
3. **User Testing:** Gather feedback from instructors and students
4. **Refine Design:** Iterate based on feedback
5. **Production Integration:** Graduate successful experiments to main app
6. **Document Learnings:** Update documentation with insights

**Examples from Our Journey:**

**From Bright Yellow → Amber Sticky Notes:**
- Initial: `bg-yellow-100` (bright, warning-like)
- Problem: Too harsh for extended reading sessions
- Experiment: Test amber-50/amber-100 tones
- Result: Much easier on eyes, "paper" feeling
- Outcome: Adopted in production

**From Blue → Indigo Selection:**
- Initial: Generic blue-200 selection
- Problem: Wanted more refined, modern feel
- Experiment: Test indigo vs. blue across components
- Result: Indigo felt more sophisticated and matched tabs
- Outcome: Established indigo as app-wide selection accent

**From Static Pills → Dynamic Pill Colors:**
- Initial: Gray pills regardless of selection
- Problem: Selected segments lacked visual pop
- Experiment: Test dynamic pill colors tied to selection state
- Result: Strong visual connection between panels
- Outcome: Implemented with gray idle → indigo-500 selected

---

## 5. Complete Sitemap & Navigation

### 5.1 Public Routes (Unauthenticated)

```
/
└── Landing Page
    - Vedic LMS branding with ॐ symbol
    - "Enter Vedic LMS" call-to-action button
    - Triggers authentication flow
```

### 5.2 Authenticated Routes

#### 5.2.1 Dashboard & Navigation

```
/
├── / (Dashboard)
│   └── SimpleDashboard Component
│       ├── Welcome Message
│       ├── Feature Cards
│       │   ├── Learning (→ /tracks)
│       │   ├── Manage Content (→ /manage)
│       │   └── Experiments (→ /experiments)
│       └── User Profile Display
│
└── /dashboard (Alias to /)
```

#### 5.2.2 Content Management Hierarchy

```
/manage
├── /manage
│   └── Content Management Page
│       ├── Track List (sorted by order)
│       ├── Create Track Modal
│       ├── Edit Track Modal
│       ├── Delete Confirmation
│       └── Reorder Tracks (drag-and-drop)
│
├── /manage/tracks/:trackId
│   └── Track Chapters Page
│       ├── Chapter List (sorted by order)
│       ├── Create Chapter Modal
│       ├── Edit Chapter Modal
│       ├── Delete Confirmation
│       ├── Publish/Unpublish Toggle
│       └── Reorder Chapters (drag-and-drop)
│
└── /manage/tracks/:trackId/chapters/:chapterId
    └── Chapter Editor (Tabbed Interface)
        ├── Tab 1: Content Editor
        │   ├── Script Selector (te/hi/en)
        │   ├── HTML/Text Mode Toggle (Tabs component)
        │   ├── Rich Text Editor (TipTap)
        │   └── Save Content Button
        ├── Tab 2: Audio Management
        │   ├── Audio Upload (drag-drop or click)
        │   ├── Audio File List
        │   ├── Reciter Attribution
        │   ├── Metadata Display (duration, size)
        │   └── Delete Audio Files
        ├── Tab 3: Text Segmentation
        │   ├── Left Panel: Segmented Text Display
        │   │   ├── Script Selector
        │   │   ├── Interactive Text (click-drag selection)
        │   │   └── Segment Highlights (amber idle, indigo selected)
        │   └── Right Panel: Segment Cards
        │       ├── Create Segment Button
        │       ├── Segment List (drag-and-drop reorder)
        │       ├── Segment Pills (numbered)
        │       ├── Delete Segment
        │       └── Status Indicators
        ├── Tab 4: Audio Mapping
        │   ├── Left Panel: Audio Player
        │   │   ├── Waveform Display
        │   │   ├── Play/Pause Controls
        │   │   ├── Seek Bar
        │   │   ├── Speed Control (0.5x-2.0x)
        │   │   └── Time Display
        │   ├── Center Panel: Instructions
        │   │   ├── Real-time Guidance
        │   │   ├── Current Segment Display
        │   │   └── Progress Indicator
        │   └── Right Panel: Segment Cards
        │       ├── Ready State (gray)
        │       ├── Recording State (orange)
        │       ├── Mapped State (green + timestamps)
        │       └── Edit/Delete Mappings
        └── Tab 5: Preview
            ├── Learn Mode Toggle (Switch component)
            ├── Script Selector
            ├── Learn Mode ON:
            │   ├── Interactive Segmented Text
            │   ├── Click Segments to Play Audio
            │   └── Current Segment Highlighting
            └── Learn Mode OFF:
                ├── Clean HTML Article View
                ├── 28px Font Size
                └── Distraction-free Reading
```

#### 5.2.3 Student Learning Paths

```
/tracks
└── (Future: Track List Page)

/tracks/:trackId
└── Track View Page
    ├── Track Information
    ├── Track Status Badge
    ├── Chapter List
    │   ├── Chapter Cards
    │   ├── Proficiency Levels (0-4)
    │   └── Click to View Chapter
    └── Back to Dashboard

/chapters/:id
└── Chapter View Page
    ├── Chapter Header
    │   ├── Title
    │   ├── Track Breadcrumb
    │   └── Script Selector (te/hi/en)
    ├── Segmented Text Display
    │   ├── Interactive Segments
    │   ├── Hover Highlights
    │   └── Click to Play Audio
    ├── Audio Player
    │   ├── Play/Pause
    │   ├── Progress Bar
    │   ├── Playback Speed
    │   └── Current Time
    └── Segment-Audio Synchronization
        ├── Auto-highlight Current Segment
        └── Auto-stop at Segment Boundaries
```

#### 5.2.4 Experiments & Design System

```
/experiments
├── /experiments
│   └── Experiments Showcase (Index)
│       ├── Active Experiments List
│       │   └── Experiment 1: Design System ✅
│       ├── Future Experiment Placeholders
│       └── Experiment Guidelines
│
├── /experiments/design-system
│   └── Design System Experiment
│       └── DesignSystemShowcase Component
│           ├── Component Gallery
│           │   ├── Cards (12 variants)
│           │   ├── Buttons (24 variants)
│           │   ├── Inputs (12 variants)
│           │   ├── Tabs (variants & sizes)
│           │   ├── Badges
│           │   ├── Text Segments
│           │   ├── Mapping Cards
│           │   └── ...26 total components
│           ├── Color Palette Display
│           ├── Educational Semantics Guide
│           └── Usage Examples
│
├── /design-system-showcase
│   └── (Alternative route to Design System)
│
└── /experiments/daisyui-5
    └── DaisyUI5 Showcase (Legacy)
```

### 5.3 Navigation Patterns

**Header Navigation:**
- Dashboard: Logo/title → Dashboard
- Content Management: Back button → Previous level
- Chapter Editor: Back to chapters → Track chapters page
- Experiments: Back to dashboard

**Feature Card Navigation (Dashboard):**
- Click "Learning" → `/tracks`
- Click "Manage Content" → `/manage`
- Click "Experiments" → `/experiments`

**Breadcrumb Navigation:**
- Track View: Dashboard > Track
- Chapter View: Dashboard > Track > Chapter
- Chapter Editor: Dashboard > Track > Chapters > Edit Chapter

**Tab Navigation (Chapter Editor):**
- Persistent tab state within session
- Direct access to all 5 tabs
- Independent workflows per tab

---

## 6. Technical Architecture

### 6.1 Technology Stack

#### Frontend
- **Framework:** React 18 with TypeScript
- **Bundler:** Vite (with route-based code splitting)
- **Router:** Wouter (lightweight React router)
- **State Management:** TanStack Query v5 (React Query)
- **UI Framework:** Shadcn/ui + Custom Design System v1.0
- **Styling:** Tailwind CSS with custom color palette
- **Forms:** React Hook Form + Zod validation
- **Rich Text:** TipTap editor
- **Icons:** Lucide React + React Icons (for logos)

#### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript (executed with tsx)
- **Database:** PostgreSQL (Neon-backed, serverless connection pooling)
- **ORM:** Drizzle ORM
- **Authentication:** Replit Auth
- **Session Store:** connect-pg-simple (PostgreSQL sessions)
- **File Upload:** Multer
- **Audio Metadata:** music-metadata library

#### Development & Tooling
- **Package Manager:** npm
- **Dev Server:** Vite dev server (hot reload)
- **Production Server:** Express serves Vite build + API
- **Database Migrations:** `npm run db:push` (Drizzle)
- **Type Checking:** TypeScript strict mode
- **Linting:** ESLint
- **Code Quality:** Prettier (formatting)

### 6.2 Database Schema

#### 6.2.1 Core Tables

**users** (User Management)
```typescript
{
  id: varchar (primary key, Replit user ID)
  email: varchar (unique)
  firstName: varchar
  lastName: varchar
  profileImageUrl: varchar
  roles: jsonb (array of strings: ['student'], ['instructor'], ['admin'])
  status: varchar ('active', 'disabled', 'pending')
  invitedBy: varchar (references users.id)
  invitedAt: timestamp
  lastLoginAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

**tracks** (Learning Tracks)
```typescript
{
  id: serial (primary key)
  title: text (unique, not null)
  description: text (not null)
  order: integer (sequential: 1, 2, 3...)
  createdBy: varchar (references users.id)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**chapters** (Track Content)
```typescript
{
  id: serial (primary key)
  trackId: integer (references tracks.id, cascade delete)
  title: text (not null)
  order: integer (sequential within track)
  status: varchar ('draft' | 'published')
  content: jsonb {
    te?: string,  // Telugu
    hi?: string,  // Hindi/Devanagari
    en?: string   // English/IAST
  }
  publishedAt: timestamp
  lastEditedBy: varchar (references users.id)
  createdBy: varchar (references users.id)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**audio_files** (Chapter Audio Recitations)
```typescript
{
  id: serial (primary key)
  chapterId: integer (references chapters.id, cascade delete)
  filename: text (not null, stored in /uploads)
  displayName: text (original filename)
  reciter: text
  duration: real (seconds)
  fileSize: integer (bytes)
  mimeType: varchar
  uploadedBy: varchar (references users.id)
  createdAt: timestamp
}
```

**text_segments** (Text Segmentation)
```typescript
{
  id: serial (primary key)
  chapterId: integer (references chapters.id, cascade delete)
  script: varchar(2) ('te' | 'hi' | 'en')
  startPosition: integer (character index in content)
  endPosition: integer (character index in content)
  order: integer (segment sequence)
  createdBy: varchar (references users.id)
  createdAt: timestamp
}
```

**audio_mappings** (Legacy Audio-Text Sync)
```typescript
{
  id: serial (primary key)
  audioFileId: integer (references audio_files.id, cascade delete)
  segmentId: integer (references text_segments.id, cascade delete)
  startTime: real (seconds)
  endTime: real (seconds)
  createdBy: varchar (references users.id)
  createdAt: timestamp
}
```

**media_segments** (Audio Timeline Segments)
```typescript
{
  id: serial (primary key)
  audioFileId: integer (references audio_files.id, cascade delete)
  startTimestamp: real (seconds)
  endTimestamp: real (seconds)
  segmentName: text (optional)
  createdBy: varchar (references users.id)
  createdAt: timestamp
}
```

**segment_mappings** (Media-to-Text Mapping)
```typescript
{
  id: serial (primary key)
  mediaSegmentId: integer (references media_segments.id, cascade delete)
  textSegmentId: integer (references text_segments.id, cascade delete)
  createdBy: varchar (references users.id)
  createdAt: timestamp
}
```

**student_progress** (Learning Progress Tracking)
```typescript
{
  id: serial (primary key)
  studentId: varchar (references users.id)
  chapterId: integer (references chapters.id, cascade delete)
  proficiencyLevel: integer (0=not started, 1-4=levels)
  lastAccessed: timestamp
  updatedBy: varchar (references users.id, instructor)
  updatedAt: timestamp
}
```

**sessions** (Replit Auth Sessions)
```typescript
{
  sid: varchar (primary key)
  sess: jsonb (session data)
  expire: timestamp (indexed)
}
```

#### 6.2.2 Relationships

**Users ↔ Content:**
- User creates many Tracks (tracks.createdBy)
- User creates many Chapters (chapters.createdBy, chapters.lastEditedBy)
- User uploads many Audio Files (audio_files.uploadedBy)
- User creates many Text Segments (text_segments.createdBy)
- User creates many Mappings (audio_mappings.createdBy)

**Track ↔ Chapters:**
- Track has many Chapters (one-to-many)
- Chapter belongs to one Track

**Chapter ↔ Content:**
- Chapter has many Audio Files (one-to-many)
- Chapter has many Text Segments (one-to-many)
- Chapter has many Student Progress records (one-to-many)

**Audio ↔ Segments:**
- Audio File has many Audio Mappings (one-to-many)
- Audio File has many Media Segments (one-to-many)
- Text Segment has many Audio Mappings (one-to-many)
- Text Segment has many Segment Mappings (one-to-many)

**Students ↔ Progress:**
- Student (User) has many Progress records
- Chapter has many Progress records from different students
- Instructor (updatedBy) manages student progress

### 6.3 Backend API Routes

#### 6.3.1 Track Routes

```
GET    /api/tracks                      - Get all tracks
GET    /api/tracks/:id                  - Get specific track
POST   /api/tracks                      - Create new track
PUT    /api/tracks/:id                  - Update track
DELETE /api/tracks/:id                  - Delete track
POST   /api/tracks/:id/move             - Reorder track (up/down)
```

#### 6.3.2 Chapter Routes

```
GET    /api/chapters/:trackId                        - Get chapters by track
GET    /api/chapters/:chapterId/details              - Get chapter details
POST   /api/chapters                                 - Create chapter
PATCH  /api/chapters/:chapterId                      - Update chapter
PATCH  /api/chapters/:chapterId/status               - Toggle publish status
POST   /api/chapters/:id/move                        - Reorder chapter (up/down)
DELETE /api/chapters/:id                             - Delete chapter
```

#### 6.3.3 Audio Routes

```
GET    /api/audio-files/:chapterId                   - Get audio files by chapter
POST   /api/audio-files/:chapterId/upload            - Upload audio file (multipart)
PATCH  /api/audio-files/:audioFileId                 - Update audio metadata
DELETE /api/audio-files/:audioFileId                 - Delete audio file
GET    /uploads/:filename                            - Serve audio file (static)
```

#### 6.3.4 Segment Routes

```
GET    /api/segments/:chapterId/:script              - Get segments by chapter & script
GET    /api/segments/:chapterId                      - Get all segments (legacy)
POST   /api/segments                                 - Create text segment
PATCH  /api/segments/:segmentId                      - Update segment
DELETE /api/segments/:segmentId                      - Delete segment
POST   /api/segments/:id/reorder                     - Reorder segments (future)
```

#### 6.3.5 Mapping Routes

```
GET    /api/mappings/:chapterId                      - Get mappings by chapter
GET    /api/mappings/segment/:segmentId              - Get mappings by segment
POST   /api/mappings                                 - Create audio mapping
PATCH  /api/mappings/:mappingId                      - Update mapping
DELETE /api/mappings/:mappingId                      - Delete mapping
POST   /api/mappings/batch                           - Batch create mappings
```

### 6.4 Frontend Architecture

#### 6.4.1 Component Hierarchy

```
App.tsx (Root)
├── QueryClientProvider (TanStack Query)
├── TooltipProvider
├── ErrorBoundary
└── Router (Wouter)
    ├── Landing (Unauthenticated)
    └── Authenticated Routes
        ├── SimpleDashboard
        ├── ContentManagement
        │   ├── TrackCard (multiple)
        │   ├── CreateTrackModal
        │   ├── EditTrackModal
        │   └── ConfirmationModal
        ├── TrackChapters
        │   ├── ChapterCard (multiple)
        │   ├── CreateChapterModal
        │   └── ConfirmationModal
        ├── ChapterEditor (Complex Component)
        │   ├── ChapterEditorProvider (Context)
        │   ├── ChapterHeader
        │   ├── Tabs (Design System)
        │   │   ├── ContentTab
        │   │   │   ├── RichTextEditor (TipTap)
        │   │   │   └── Script Selector
        │   │   ├── AudioTab
        │   │   │   ├── AudioUpload (Dropzone)
        │   │   │   └── AudioFileCard (multiple)
        │   │   ├── SegmentationTab
        │   │   │   ├── PanelGroup (Resizable)
        │   │   │   │   ├── SegmentedTextDisplay (Left)
        │   │   │   │   └── SegmentPanel (Right)
        │   │   │   │       └── TextSegmentCard (multiple)
        │   │   │   └── Script Selector
        │   │   ├── AudioMappingTab
        │   │   │   ├── PanelGroup (Three Panels)
        │   │   │   │   ├── AudioPlayer (Left)
        │   │   │   │   ├── Instructions (Center)
        │   │   │   │   └── MappingSegmentCard (Right, multiple)
        │   │   │   └── ProgressiveMapper (Logic)
        │   │   └── PreviewTab
        │   │       ├── LearnModeSwitch
        │   │       ├── Script Selector
        │   │       └── SegmentedTextDisplay or HTML View
        │   └── Custom Hooks
        │       ├── useChapterData
        │       ├── useAudioPlayer
        │       ├── useSegmentData
        │       └── useTextSegmentation
        ├── TrackView
        │   └── ChapterCard (multiple)
        ├── ChapterView
        │   ├── SegmentedTextDisplay
        │   └── AudioPlayer
        └── ExperimentsShowcase
            ├── Experiment Cards
            └── Link to Design System Showcase
```

#### 6.4.2 State Management Strategy

**TanStack Query (React Query v5):**
- All server state managed through queries/mutations
- Aggressive caching with automatic background refetch
- Optimistic updates for instant UI feedback
- Query invalidation after mutations
- Prefetching for adjacent chapters (performance optimization)
- Query keys follow hierarchical pattern: `['/api/resource', id]`

**Local State (useState):**
- UI state (modals, tabs, selections)
- Form state (controlled inputs)
- Transient state (hover, focus)

**Context API:**
- ChapterEditorContext for shared state across tabs
- Auth context for user state

**LocalStorage:**
- Learn mode preference (Preview tab)
- UI preferences (future: theme, language defaults)

#### 6.4.3 Custom Hooks

**Data Fetching Hooks:**
- `useChapterData(chapterId)` - Loads chapter with all related data
- `useSegmentData(chapterId, script)` - Loads segments for specific script
- `useAudioPlayer(audioFiles)` - Manages audio playback state

**Business Logic Hooks:**
- `useTextSegmentation()` - Text selection and segment creation logic
- `useAuth()` - Authentication state and user data
- `useWarmTrackCache()` - Background prefetching for performance

**UI Hooks:**
- `useToast()` - Toast notifications
- `useLocation()` - Wouter navigation
- `useForm()` - React Hook Form integration

#### 6.4.4 Design System Integration

**Import Strategy:**
```typescript
// Design System Components (Custom)
import { Tabs, TabsList, TabsTrigger } from "@/components/design-system/Tabs";
import { Badge } from "@/components/design-system/Badge";
import { TextSegment } from "@/components/design-system/TextSegment";
import { MappingSegmentCard } from "@/components/design-system/MappingSegmentCard";
import { Switch } from "@/components/design-system/Switch";

// Shadcn UI Components (Base)
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

**CVA Pattern:**
```typescript
const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        blue: "color-specific-classes",
        green: "color-specific-classes",
        // ...12 variants
      },
      size: {
        sm: "small-classes",
        md: "medium-classes",
        lg: "large-classes"
      }
    },
    defaultVariants: { variant: "gray", size: "md" }
  }
);
```

### 6.5 Layout Architecture

#### 6.5.1 Consistent Tab Pattern

All tabbed interfaces follow strict structure:
```tsx
<TabsContent>
  <div className="h-full flex flex-col">
    {/* Header - Fixed height */}
    <div className="flex-shrink-0">
      <HeaderContent />
    </div>
    
    {/* Content - Flexible with scroll */}
    <div className="flex-1 min-h-0 overflow-auto">
      <MainContent />
    </div>
  </div>
</TabsContent>
```

#### 6.5.2 Resizable Panel Pattern

Text Segmentation and Audio Mapping tabs use:
```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={50} minSize={30}>
    <LeftContent />
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={50} minSize={30}>
    <RightContent />
  </Panel>
</PanelGroup>
```

#### 6.5.3 Height Management

**Goals:**
- All tabs fill viewport edge-to-edge
- Internal scrollbars appear when content exceeds space
- No infinite vertical expansion
- Responsive to window resize

**Implementation:**
- Use custom div containers instead of Card for height-constrained layouts
- `min-h-0` on flex children to prevent flex item size defaults
- `overflow-auto` on scrollable containers
- Strict flex hierarchy: fixed header + flexible content

### 6.6 Font System

#### 6.6.1 Custom Fonts

**Location:** `client/public/fonts/`

**Font Files:**
- `JIMS.otf` - Telugu & IAST/English
- `AdishilaSan-Regular.otf` - Devanagari/Hindi

**@font-face Declarations (index.css):**
```css
@font-face {
  font-family: 'JIMS';
  src: url('/fonts/JIMS.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Adishila San';
  src: url('/fonts/AdishilaSan-Regular.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
}
```

#### 6.6.2 Font Application Logic

**Automatic font selection based on script:**
```typescript
const fontFamily = 
  script === 'te' ? "'JIMS', 'Noto Sans Telugu', sans-serif" :
  script === 'hi' ? "'Adishila San', 'Noto Sans Devanagari', serif" :
  "'JIMS', 'Noto Sans Telugu', sans-serif";
```

**Fallback Strategy:**
- Primary: Custom fonts (JIMS, Adishila San)
- Fallback: Google Fonts (Noto Sans Telugu, Noto Sans Devanagari)
- Final: System serif/sans-serif

**Font Size:**
- Content text: 28px (optimized for Vedic text readability)
- Interface text: Inter font family (standard sizes)

### 6.7 Performance Optimizations

#### 6.7.1 Code Splitting
- React lazy loading for all routes
- Suspense boundaries with loading states
- Bundle optimization with Vite

#### 6.7.2 Query Optimization
- Prefetch adjacent chapters in background
- Cache warming for track data
- Stale-while-revalidate pattern

#### 6.7.3 Asset Optimization
- Centralized icon imports (`@/lib/icons`)
- Static file serving for uploads
- Lazy image loading (future)

---

## 7. Outstanding Architectural Issues

### 7.1 Known Technical Debt

#### 7.1.1 Dual Mapping System
**Problem:** Two separate systems for audio-text mapping exist:
- Legacy: `audio_mappings` table (simple segment-to-audio mapping)
- New: `media_segments` + `segment_mappings` (timeline-based mapping)

**Impact:**
- Code complexity in maintaining both systems
- Data migration path unclear
- Storage duplication

**Proposed Solution:**
- Migrate fully to new system (`media_segments` + `segment_mappings`)
- Deprecate `audio_mappings` table after data migration
- Update all queries to use new system exclusively

**Timeline:** Phase 2 of production rollout

#### 7.1.2 Script-Independent Segments
**Problem:** Current segmentation creates separate segments per script, but segments conceptually represent the same content across scripts.

**Current State:**
```typescript
// Three separate segment entries for same conceptual segment
{ chapterId: 1, script: 'te', startPosition: 0, endPosition: 50 }
{ chapterId: 1, script: 'hi', startPosition: 0, endPosition: 48 }
{ chapterId: 1, script: 'en', startPosition: 0, endPosition: 52 }
```

**Better Design:**
```typescript
// Single segment with script-specific positions
{
  chapterId: 1,
  conceptualName: "Opening Verse",
  positions: {
    te: { start: 0, end: 50 },
    hi: { start: 0, end: 48 },
    en: { start: 0, end: 52 }
  }
}
```

**Impact:**
- Harder to sync segments across scripts
- Audio mapping can only be to one script
- Cross-script learning features limited

**Proposed Solution:**
- Add `conceptualName` field to segments
- Implement cross-script segment linking
- Update UI to show linked segments across scripts

**Timeline:** Future enhancement, not blocking MVP

#### 7.1.3 Student Progress Implementation
**Problem:** Database schema exists but student-facing progress tracking UI not implemented.

**Missing Features:**
- Student dashboard showing progress across tracks
- Proficiency level assessment mechanism
- Instructor tools for updating student progress
- Progress visualization (charts, badges)

**Proposed Solution:**
- Phase 2: Implement student dashboard
- Phase 3: Add instructor progress management tools
- Phase 4: Gamification elements (badges, achievements)

**Timeline:** Post-MVP, dependent on user feedback

### 7.2 Scalability Concerns

#### 7.2.1 File Storage
**Current:** Files stored in local `/uploads` directory on server filesystem

**Problem:**
- Not scalable for multi-instance deployments
- No CDN for global distribution
- Backup/disaster recovery limited

**Proposed Solution:**
- Migrate to cloud storage (S3, Google Cloud Storage, or similar)
- Implement CDN for audio file delivery
- Add file versioning and retention policies

**Timeline:** Before multi-region deployment

#### 7.2.2 Database Connection Pooling
**Current:** Neon serverless connections

**Concern:**
- Connection limits under heavy load
- Potential timeout issues with long-running queries

**Proposed Solution:**
- Monitor connection pool usage
- Implement read replicas for heavy queries
- Add query result caching (Redis)

**Timeline:** Monitor in production, implement if issues arise

### 7.3 User Experience Gaps

#### 7.3.1 Mobile Responsiveness
**Status:** Desktop-first design, limited mobile optimization

**Issues:**
- Resizable panels not touch-friendly
- 28px font size may be too large on small screens
- Audio mapping workflow difficult on mobile

**Proposed Solution:**
- Responsive breakpoints for all components
- Touch-optimized controls for audio mapping
- Mobile-specific layouts for complex interfaces

**Timeline:** Phase 3, based on mobile usage analytics

#### 7.3.2 Keyboard Navigation
**Status:** Mouse-dependent workflows

**Missing:**
- Keyboard shortcuts for common actions
- Tab navigation through segments
- Hotkeys for audio player (space to play/pause, arrow keys for seek)

**Proposed Solution:**
- Implement keyboard event handlers
- Add keyboard shortcut documentation
- Accessibility audit and ARIA improvements

**Timeline:** Accessibility sprint (planned for Q2)

#### 7.3.3 Undo/Redo Functionality
**Status:** No undo system implemented

**Impact:**
- Accidental segment deletions are permanent
- Content editing mistakes can't be easily reversed
- User confidence in experimentation reduced

**Proposed Solution:**
- Implement action history stack
- Add undo/redo buttons to key interfaces
- Consider server-side version control for chapters

**Timeline:** Post-MVP enhancement

### 7.4 Data Integrity Issues

#### 7.4.4 Segment Overlap Validation
**Problem:** No validation prevents overlapping text segments

**Current State:** User can create:
```
Segment 1: positions 0-50
Segment 2: positions 30-80  // Overlaps with Segment 1!
```

**Impact:**
- Confusing UI with overlapping highlights
- Ambiguous audio mapping (which segment plays?)
- Data quality concerns

**Proposed Solution:**
- Add server-side validation on segment creation
- Client-side visual feedback for attempted overlaps
- Auto-adjust segments to prevent overlaps

**Timeline:** High priority, target for next sprint

#### 7.4.5 Orphaned Data Cleanup
**Problem:** Cascade deletes may leave orphaned mappings

**Concern:**
- Deleting audio file should clean up all mappings
- Deleting chapter should clean up segments and mappings
- Current cascade deletes may not cover all relationships

**Proposed Solution:**
- Audit all foreign key cascade rules
- Add database triggers for complex cleanup
- Implement soft deletes with retention period

**Timeline:** Database maintenance sprint

### 7.5 Security Considerations

#### 7.5.1 Authorization
**Status:** Authentication exists, but fine-grained authorization missing

**Missing:**
- Role-based access control (RBAC) enforcement
- Instructor can only edit their own content
- Admin-only operations (user management, track publishing)

**Proposed Solution:**
- Implement middleware for role checks
- Add ownership verification to mutations
- Create admin panel for user management

**Timeline:** Before production launch

#### 7.5.2 Input Validation
**Status:** Zod validation on client, limited server validation

**Gap:**
- Server should not trust client validation
- File upload validation needs strengthening
- SQL injection prevention audit needed

**Proposed Solution:**
- Duplicate Zod schemas on server
- Parameterized queries audit (Drizzle ORM handles this)
- File type whitelist enforcement

**Timeline:** Security audit before production

### 7.6 Developer Experience

#### 7.6.1 Documentation
**Status:** Code comments and README exist, but comprehensive docs missing

**Needs:**
- API documentation (Swagger/OpenAPI)
- Component storybook for design system
- Onboarding guide for new developers
- Architecture decision records (ADRs)

**Proposed Solution:**
- Generate API docs from route definitions
- Create Storybook for design system components
- Write developer onboarding documentation

**Timeline:** Ongoing, prioritize before team expansion

#### 7.6.2 Testing
**Status:** No automated tests currently

**Missing:**
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Visual regression tests for design system

**Proposed Solution:**
- Add Vitest for unit/integration tests
- Add Playwright for E2E tests
- Set up CI/CD pipeline with test gates

**Timeline:** Testing infrastructure sprint (planned)

### 7.7 Future Enhancements (Roadmap Items)

#### 7.7.1 Real-time Collaboration
**Idea:** Multiple instructors editing same chapter simultaneously

**Requirements:**
- WebSocket connections for real-time updates
- Operational transformation or CRDT for conflict resolution
- Presence indicators showing who's editing

**Complexity:** High
**Priority:** Low (post-MVP)

#### 7.7.2 Advanced Audio Features
**Ideas:**
- Waveform visualization with zoom/pan
- Pitch/tempo adjustment for learning
- Loop segments for practice
- A/B comparison between reciters

**Complexity:** Medium
**Priority:** Medium (based on user feedback)

#### 7.7.3 AI-Assisted Segmentation
**Idea:** Auto-segment text using NLP/ML for Vedic text patterns

**Requirements:**
- Train model on Vedic text structure
- API for segment suggestions
- UI for accepting/rejecting suggestions

**Complexity:** Very High
**Priority:** Research phase

---

## Conclusion

The Vedic Learning Management System represents a comprehensive, modern approach to digital Vedic education. With a production-ready content management system, multilingual support, and innovative audio-text synchronization, the platform is poised to transform how Vedic knowledge is taught and learned in the digital age.

**Current Status:** MVP ready for early user feedback
**Next Steps:** User testing, iteration based on feedback, security hardening
**Long-term Vision:** Full-featured LMS with student progress tracking, gamification, and AI-assisted content creation

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2025  
**Maintained by:** Vedic LMS Development Team
