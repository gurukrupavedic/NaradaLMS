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
│   tracks    │──────<│  chapters   │──────<│ audio_files │
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐       ┌───────────────┐
                      │text_segments│──────<│segment_mappings│
                      │             │  1:N  │               │
                      └─────────────┘       └───────────────┘
                                                   │
                                                   │ N:1
                                                   ▼
                                            ┌───────────────┐
                                            │media_segments │
                                            │               │
                                            └───────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (admin, instructor, student) |
| `tracks` | Learning tracks (e.g., "Vaidika Nithya Karma") |
| `chapters` | Content units within tracks, with multilingual HTML content |
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

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | SimpleDashboard | Home dashboard |
| `/manage/tracks` | ManageTracks | Track list management |
| `/manage/tracks/:id` | ManageChapters | Chapter list for a track |
| `/manage/tracks/:trackId/chapters/:chapterId` | EditChapter | Multi-tab chapter editor |
| `/learn/tracks` | LearnTracks | Browse available tracks |
| `/learn/tracks/:id` | LearnChapters | Browse chapters in a track |
| `/study/:chapterId` | StudyChapter | Interactive learning view |

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
