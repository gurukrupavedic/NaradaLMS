# Vedic LMS - System Architecture

**Last Updated:** December 16, 2025

This document describes the current architecture of the Vedic Learning Management System, a full-stack application for managing and delivering Vedic educational content with multilingual support and audio-text synchronization.

---

## System Overview

The Vedic LMS is a web application that enables:
- **Content Management**: Create and manage learning tracks with chapters containing Vedic texts in three scripts (Telugu, Devanagari, IAST)
- **Text Segmentation**: Break chapter content into segments for audio synchronization
- **Audio Mapping**: Map audio recordings to text segments for interactive playback
- **Interactive Learning**: Students can click on text segments to hear synchronized audio

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

---

## Data Model

### Core Entities

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   tracks    │──────<│  chapters   │──────<│ audio_files │
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │text_segments│
                      │             │
                      └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │audio_mappings│
                      │             │
                      └─────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (admin, instructor, student) |
| `tracks` | Learning tracks (e.g., "Vaidika Nithya Karma") |
| `chapters` | Content units within tracks, with JSONB multilingual content |
| `audio_files` | Uploaded audio recordings per chapter |
| `text_segments` | Defined text portions for audio mapping |
| `audio_mappings` | Links audio timestamps to text segments |

### Multilingual Content Storage

Chapter content uses JSONB with script keys:
```typescript
content: {
  te: string,  // Telugu script
  hi: string,  // Devanagari (Hindi/Sanskrit)
  en: string   // IAST romanization
}
```

---

## Key User Flows

### Content Creation Flow (Admin/Instructor)

```
1. Create Track
   └─> POST /api/tracks

2. Create Chapter within Track
   └─> POST /api/chapters

3. Edit Chapter Content (3 scripts)
   └─> PUT /api/chapters/:id
   └─> Rich text editor with script-specific fonts

4. Upload Audio Files
   └─> POST /api/audio-files/:chapterId/upload

5. Create Text Segments
   └─> Select text → POST /api/segments
   └─> Segments define mappable portions

6. Map Audio to Text (Progressive Mapper)
   └─> Listen to audio, click segments when heard
   └─> POST /api/mappings
```

### Learning Flow (Student)

```
1. Browse Tracks
   └─> GET /api/tracks

2. Select Chapter
   └─> GET /api/chapters/:trackId

3. Study Chapter
   └─> View content with audio player
   └─> Click segments to hear pronunciation
   └─> Audio plays from startTime to endTime
```

---

## Key Frontend Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | SimpleDashboard | Home dashboard with navigation |
| `/manage/tracks` | ManageTracks | Track list management |
| `/manage/tracks/:id` | ManageChapters | Chapter list for a track |
| `/manage/tracks/:trackId/chapters/:chapterId` | EditChapter | Multi-tab chapter editor |
| `/learn/tracks` | LearnTracks | Browse available tracks |
| `/learn/tracks/:id` | LearnChapters | Browse chapters in a track |
| `/study/:chapterId` | StudyChapter | Interactive learning view |

---

## Chapter Editor Tabs

The EditChapter page uses a tabbed interface:

1. **Content Tab**: Rich text editor for each script (Telugu, Devanagari, IAST)
2. **Media Tab**: Upload and manage audio recordings
3. **Text Segmentation Tab**: Select and define text segments
4. **Audio Mapping Tab**: Progressive audio-text mapping workflow
5. **Preview Tab**: Preview the learning experience with Learn Mode toggle

---

## Audio-Text Mapping System (Unified)

The system uses a single unified data model for audio-text synchronization:

**Tables:**
- `media_segments` - Audio timestamp ranges (startTime, endTime in seconds)
- `segment_mappings` - Links between media segments and text segments
- `text_segments` - Defined text portions

**API Endpoints** (unified `/api/mappings/*` pattern):
- `GET /api/mappings/chapter/:chapterId` - Fetch all mappings for a chapter
- `GET /api/mappings/audio/:audioFileId` - Fetch mappings for an audio file
- `POST /api/mappings` - Create a new audio-text mapping (atomically creates media segment + mapping)
- `DELETE /api/mappings/:audioFileId/:segmentId` - Delete a mapping

**Frontend Integration:**
- Handled by `progressiveMappingApi` service
- Used by Progressive Mapper component in EditChapter (Audio Mapping tab)
- Displayed in StudyChapter for interactive learning

**Data Flow:**
```
ProgressiveMapper UI (drag/click to map)
    ↓
progressiveMappingApi.createMapping()
    ↓
POST /api/mappings
    ↓
storage.createMappingWithMediaSegment() (atomic: insert both tables)
    ↓
PostgreSQL (media_segments + segment_mappings)
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
```

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

---

## Typography System

Custom fonts for Vedic scripts:

| Script | Font | CSS Class |
|--------|------|-----------|
| Telugu | JIMS (Noto Sans Telugu fallback) | `font-telugu` |
| Devanagari | AdishilaSanVedic | `font-devanagari` |
| IAST | AdishilaSan | `font-iast` |

Font sizes standardized at 30px for display, with Devanagari using semi-bold weight (600).

---

## State Management

- **Server State**: TanStack Query manages all API data with caching
- **Local UI State**: React useState for component-level state
- **Form State**: React Hook Form with Zod validation
- **Auth State**: Context-based authentication (Replit Auth)

---

## Development Notes

### Running the Application
```bash
npm run dev          # Start development server (port 5000)
npm run db:push      # Sync database schema
```

### Path Aliases
```typescript
@/          → client/src/
@shared     → shared/
@assets     → attached_assets/
```

