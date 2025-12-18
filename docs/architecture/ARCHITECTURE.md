# Vedic LMS - System Architecture

**Last Updated:** December 16, 2025

This document describes the technical architecture of the Vedic Learning Management System.

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool with hot reload |
| Wouter | Lightweight routing |
| TanStack Query v5 | Server state management |
| Tailwind CSS | Styling |
| Shadcn/ui | Component library |
| TipTap | Rich text editor |
| Lucide React | Icons |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | API server |
| TypeScript (tsx) | Server-side language |
| Drizzle ORM | Database queries |
| PostgreSQL (Neon) | Database with serverless connection pooling |
| Multer | File uploads |
| music-metadata | Audio file analysis |

### Shared

| Technology | Purpose |
|------------|---------|
| Zod | Schema validation |
| drizzle-zod | Type generation from schema |

---

## Application Structure

```
vedic-lms/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Shadcn base components
│   │   │   ├── design-system/ # Custom design system (26 components)
│   │   │   ├── audio-mapping/ # Progressive mapper components
│   │   │   └── text-segmentation/ # Segmentation components
│   │   ├── pages/             # Route-level page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities (queryClient, etc.)
│   │   └── App.tsx            # Root component with routing
│   └── public/
│       └── fonts/             # Custom Vedic script fonts
├── server/                    # Backend Express application
│   ├── index.ts               # Server entry point
│   ├── routes-simple.ts       # API route definitions
│   ├── database-storage.ts    # Database access layer
│   └── vite.ts                # Vite dev server integration
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts              # Database schema + types
└── uploads/                   # Uploaded audio files
```

### Path Aliases

```typescript
@/          → client/src/
@shared     → shared/
@assets     → attached_assets/
```

---

## Data Model

### Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   tracks    │──────<│  chapters   │──────<│ audio_files │
│             │       │             │  1:N  │             │  1:N  │             │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘       └─────────────┘
       │                     │                     │
       │ M:N                 │ 1:N                 │ 1:N
       │                     ▼                     ▼
       │              ┌─────────────┐       ┌─────────────┐       ┌───────────────┐
       └─────────────>│   batches   │       │text_segments│──────<│segment_mappings│
                      │             │       │             │  1:N  │               │
                      └──────┬──────┘       └─────────────┘       └───────┬───────┘
                             │                                            │ N:1
                             │ 1:N                                        ▼
                             ▼                                     ┌───────────────┐
                      ┌─────────────┐                             │media_segments │
                      │ enrollments │                             │               │
                      │             │                             └───────────────┘
                      └──────┬──────┘
                             │
                             │ authorization context
                             ▼
                      ┌──────────────────┐
                      │ student_progress │ (cumulative, not batch-scoped)
                      │                  │
                      └──────────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | User accounts with multi-role flags (student, instructor, content_manager, admin) |
| `tracks` | 8 sequential learning tracks with progress-based gating |
| `chapters` | Content units within tracks, with multilingual HTML content |
| `batches` | Social/temporal groupings for instructor-led learning (one track per batch) |
| `enrollments` | Student-batch assignments (fluid, admin-controlled) |
| `student_progress` | Cumulative proficiency levels per student per chapter (0-4 scale) |
| `audio_files` | Uploaded audio recordings per chapter |
| `text_segments` | Defined text portions for audio mapping |
| `media_segments` | Audio timestamp ranges (startTime, endTime) |
| `segment_mappings` | Links media segments to text segments |

### Multilingual Content Storage

Chapter content uses separate columns for each script:
```typescript
{
  teluguContent: string,   // Telugu script HTML
  hindiContent: string,    // Devanagari HTML
  englishContent: string   // IAST romanization HTML
}
```

---

## API Architecture

### Route Pattern

```
/api/tracks                    # Track CRUD
/api/chapters/:trackId         # Chapter list
/api/chapters/:id/details      # Single chapter
/api/audio-files/:chapterId    # Audio files
/api/segments/:chapterId       # Text segments
/api/mappings/chapter/:id      # Audio mappings
/api/mappings                  # Create mapping
```

### Audio-Text Mapping API (Unified)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mappings/chapter/:chapterId` | GET | Fetch all mappings for a chapter |
| `/api/mappings/audio/:audioFileId` | GET | Fetch mappings for an audio file |
| `/api/mappings` | POST | Create mapping (atomically creates media segment + mapping) |
| `/api/mappings/:audioFileId/:segmentId` | DELETE | Delete a mapping |

### Data Flow

```
Frontend Component
       │
       │ useQuery / useMutation
       ▼
 TanStack Query (queryClient)
       │
       │ fetch with apiRequest()
       ▼
 Express API Routes (routes-simple.ts)
       │
       │ storage.methodName()
       ▼
 Database Storage Layer (database-storage.ts)
       │
       │ Drizzle ORM
       ▼
   PostgreSQL Database
```

### Mapping Data Flow

```
ProgressiveMapper UI (drag/click to map)
    ↓
progressiveMappingApi.createMapping()
    ↓
POST /api/mappings
    ↓
storage.createMappingWithMediaSegment() (atomic insert)
    ↓
PostgreSQL (media_segments + segment_mappings)
```

---

## State Management

| State Type | Technology | Purpose |
|------------|------------|---------|
| Server State | TanStack Query | API data with caching |
| Local UI State | React useState | Component-level state |
| Form State | React Hook Form + Zod | Form validation |
| Auth State | Context | Replit Auth integration |
| Preferences | localStorage | Learn mode, editor mode persistence |

---

## Frontend Routes

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | SimpleDashboard | Home dashboard | Yes (approved) |
| `/manage/tracks` | ManageTracks | Track list management | Admin/Content Manager |
| `/manage/tracks/:id` | ManageChapters | Chapter list for a track | Admin/Content Manager |
| `/manage/tracks/:trackId/chapters/:chapterId` | EditChapter | Multi-tab chapter editor | Admin/Content Manager |
| `/learn/tracks` | LearnTracks | Browse unlocked tracks (progress-gated) | Student (batch-assigned) |
| `/learn/tracks/:id` | LearnChapters | Browse chapters in a track | Student (if track unlocked) |
| `/study/:chapterId` | StudyChapter | Interactive learning view | Student |
| `/admin/users` | UserManagement | Approve accounts, assign roles | Admin only |
| `/admin/batches` | BatchManagement | Create batches, assign students/instructors | Admin only |
| `/instructor/batches` | InstructorDashboard | View assigned batches, update progress | Instructor only |

---

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| RichTextEditor | `client/src/components/ui/rich-text-editor.tsx` | TipTap-based editor |
| SegmentedTextDisplay | `client/src/components/text-segmentation/SegmentedTextDisplay.tsx` | Highlighted text view |
| ProgressiveMapper | `client/src/components/audio-mapping/ProgressiveMapper.tsx` | Audio mapping workflow |
| ChapterEditor | `client/src/pages/ChapterEditor.tsx` | Main editing interface |
| StudyChapter | `client/src/pages/StudyChapter.tsx` | Student learning view |

---

## Typography System

Custom fonts for Vedic scripts:

| Script | Font | CSS Class |
|--------|------|-----------|
| Telugu | JIMS (Noto Sans Telugu fallback) | `font-telugu` |
| Devanagari | AdishilaSanVedic | `font-devanagari` |
| IAST | AdishilaSan | `font-iast` |

Font files location: `client/public/fonts/`

---

## User Management & Authentication

### Registration & Approval Flow

1. **Open Registration**: Users self-register via standard signup form
2. **Approval Queue**: Admin sees pending accounts (status: `pending_approval`)
3. **Vetting**: Admin approves only users vetted through external Google Forms process
4. **Auto-Role Assignment**: Approval automatically assigns `student` role
5. **Login Block**: Unapproved users cannot log in (auth blocked at login)
6. **Rejection**: Admin can permanently delete unvetted accounts

### Multi-Role Model

Users can have any combination of roles:
- **student**: View published content, track own progress (after batch assignment)
- **instructor**: View/update progress for students in assigned batches
- **content_manager**: Create/edit/publish tracks, chapters, audio, segments
- **admin**: Full system access (users, batches, settings)

### Batch System

**Batches** = Social/temporal groupings for instructor-led learning
- One track per batch (e.g., "Evening Batch - Track 1")
- One primary instructor + multiple secondary instructors (identical privileges)
- Students can switch batches for scheduling convenience
- Batch assignment required before students can see content

### Progress Tracking

**Progress** = Individual achievement (cumulative, not batch-scoped)
- Stored at student + chapter level (0-4 proficiency scale)
- Preserved across batch changes
- Only primary/secondary instructors can update (admin NOT involved)
- Instructors can only evaluate students in their assigned batches

### Track Gating

**System-enforced progression**: Student can access Track N+1 only if all Track N chapters ≥ level 2
- Track 1: Always accessible (after batch assignment)
- Track 2-8: Unlocked by completing previous track
- Progress-based visibility (not admin-controlled)

---

## Development

### Commands

```bash
npm run dev          # Start development server (port 5000)
npm run db:push      # Sync database schema
```

### Environment

- Development server runs on port 5000
- PostgreSQL via Neon serverless
- Vite handles frontend hot reload
