# VedicLMS Project Structure

A comprehensive guide to the VedicLMS codebase organization, file locations, and architecture patterns.

## Quick Navigation

### For Feature Development
- **Adding a new learning feature?** Start in [features/learning](#learning-feature)
- **Building content management pages?** See [features/content-management](#content-management-feature)
- **Working on batch/enrollment management?** Go to [features/batch-management](#batch-management-feature)
- **Creating shared UI or auth flows?** Check [features/shared-features](#shared-features)

### For System Components
- **Design system components?** Browse [client/src/design-system](#design-system)
- **UI base components (shadcn)?** See [client/src/components/ui](#ui-base-components)
- **Reusable utilities or helpers?** Look in [client/src/lib](#libraries-and-utilities)
- **API integration?** Check [client/src/services](#services)

### For Backend Development
- **Domain modules and routes?** Go to [server/modules](#server-modules)
- **Database operations?** See [server/database-storage.ts](#database-layer)
- **Authentication setup?** Check [server/auth](#authentication)

---

## Client Application Structure

```
client/src/
├── App.tsx                    # Main application router
├── index.css                  # Global styles
├── main.tsx                   # React entry point
│
├── components/                # Reusable component groups
│   ├── ui/                    # shadcn/ui base components
│   ├── design-system/         # LMS design system components
│   ├── chapter-editor/        # Chapter editing interface (5 tabs)
│   ├── audio-mapping/         # Audio segment mapping UI
│   ├── text-segmentation/     # Text segmentation editor
│   ├── content-management/    # Content management UI utilities
│   └── common/                # Shared utility components
│
├── design-system/             # Design system documentation & showcase
│   ├── components/            # Design system component source
│   ├── DesignSystemExperiment.tsx
│   ├── light-theme-showcase.html
│   ├── dark-theme-showcase.html
│   └── docs/
│
├── features/                  # Feature-based modules (primary organization)
│   ├── learning/              # Student learning experiences
│   │   ├── pages/
│   │   │   ├── LearnTracks.tsx       # Track selection page
│   │   │   ├── LearnChapters.tsx     # Chapter list for track
│   │   │   └── StudyChapter.tsx      # Interactive chapter learning
│   │   ├── components/
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── TrackCard.tsx
│   │   │   ├── InteractiveSegment.tsx
│   │   │   └── InteractiveSegments.tsx
│   │   └── hooks/
│   │       ├── useAudioPlayer.ts
│   │       ├── useChapterData.ts
│   │       ├── useSegmentData.ts
│   │       └── useTextSegmentation.ts
│   │
│   ├── content-management/    # Instructor content authoring
│   │   ├── pages/
│   │   │   ├── ManageTracks.tsx       # Track CRUD and ordering
│   │   │   ├── ManageChapters.tsx     # Chapter list and management
│   │   │   └── EditChapter.tsx        # 5-tab chapter editor
│   │   ├── components/
│   │   └── hooks/
│   │
│   ├── batch-management/      # Batch and cohort management
│   │   ├── pages/
│   │   │   └── ManageBatches.tsx
│   │   ├── components/
│   │   └── hooks/
│   │
│   ├── user-management/       # User administration
│   │   ├── pages/
│   │   │   └── ManageUsers.tsx
│   │   ├── components/
│   │   └── hooks/
│   │
│   └── shared-features/       # Shared across all features
│       ├── pages/
│       │   ├── Landing.tsx            # Home page
│       │   ├── Login.tsx              # Authentication
│       │   ├── Register.tsx           # User registration
│       │   ├── PendingApproval.tsx    # Account approval page
│       │   └── NotFound.tsx           # 404 page
│       ├── components/
│       │   ├── AdminPanel.tsx
│       │   ├── Dashboard.tsx
│       │   ├── InstructorPanel.tsx
│       │   ├── SimpleDashboard.tsx
│       │   ├── StudentDashboard.tsx
│       │   ├── RoleTabs.tsx
│       │   └── LanguageSwitcher.tsx
│       └── hooks/
│           ├── useAuth.ts
│           ├── use-toast.ts
│           ├── use-mobile.tsx
│           ├── useNetworkStatus.ts
│           └── usePerformanceMonitor.ts
│
├── legacy/                    # Deprecated experiment pages (11 files)
│   └── *Experiment.tsx        # Old prototype and experimental pages
│
├── lib/                       # Utility functions and helpers
│   ├── queryClient.ts         # TanStack Query setup
│   ├── authUtils.ts           # Authentication utilities
│   ├── html-utils.ts          # HTML manipulation
│   ├── query-prefetch.ts      # Cache warming strategies
│   └── utils.ts               # General utilities (cn, etc.)
│
├── contexts/                  # React Context providers
│   ├── ChapterEditorContext.tsx
│   └── [other contexts]
│
├── hooks/                     # DEPRECATED - Hooks moved to features
│   └── (empty - for reference only)
│
├── pages/                     # DEPRECATED - Pages moved to features
│   └── (empty - for reference only)
│
├── services/                  # API integration layer
│   ├── audioService.ts
│   ├── chapterService.ts
│   ├── trackService.ts
│   └── [other services]
│
├── styles/                    # Additional style files
│   └── [theme files]
│
└── types/                     # TypeScript type definitions
    └── text-segmentation.ts
```

## Feature Organization Pattern

Each feature folder follows this structure:

```
features/feature-name/
├── pages/           # Route-level components (lazy-loaded)
│   └── FeaturePage.tsx
├── components/      # Feature-specific UI components
│   └── FeatureComponent.tsx
└── hooks/          # Feature-specific custom hooks
    └── useFeature.ts
```

### When to Add to a Feature

- **Pages**: Full-page components that appear at a route
- **Components**: UI elements specific to that feature (not shared)
- **Hooks**: Custom hooks used primarily within that feature

### When to Keep in Root Components

- **Shared UI**: Components used across multiple features
- **Design System**: Design tokens and system components
- **Base Utilities**: Components from shadcn/ui, common patterns

---

## Core Folders Explained

### Design System

The design system folder contains both the component library and documentation:

- **`design-system/components/`**: Source components for the LMS design system
  - 24 total components (8 active, 16 showcase-only)
  - Variants: Button, Card, Badge, Switch, RichTextEditor, Input, AudioControls, Alert
  - Reference only: Tabs, Tooltip, Dialog, Select, etc.

- **`design-system/docs/`**: Design documentation and reference

- **HTML Showrooms**: 
  - `light-theme-showcase.html` - Complete light theme with color palette
  - `dark-theme-showcase.html` - Dark theme with fluorescent effects

### UI Base Components

Located in `client/src/components/ui/`, these are shadcn/ui components:
- Button, Card, Input, Select, Textarea
- Dialog, Alert, Toast, Tooltip
- Form controls, sidebar components
- Styling via Tailwind CSS

### Chapter Editor

The `components/chapter-editor/` folder contains the 5-tab interface for editing chapters:

1. **ContentTab** - HTML editor with WYSIWYG (TipTap)
2. **AudioMappingTab** - Audio upload and playback
3. **SegmentationTab** - Text selection and segmentation
4. **AudioMappingTab** - Timestamp alignment
5. **PreviewTab** - Live learning mode preview

Each tab is a separate component with shared context via `ChapterEditorContext`.

### Text Segmentation

Interactive segment display and editing:
- `SegmentedTextDisplay.tsx` - Shows segmented text with audio sync
- `SegmentPanel.tsx` - Segment selection interface
- `SegmentationTab.tsx` - Segment creation and management

### Audio Mapping

Audio file management and segment synchronization:
- `AudioPlayerPanel.tsx` - Player with segment controls
- `MappingSegmentCard.tsx` - Individual segment card
- Timestamp alignment interface

---

## Server Structure

```
server/
├── index.ts                   # Express setup and module mounting
├── db.ts                      # Drizzle database initialization
├── database-storage.ts        # Centralized database operations
├── init-database.ts           # Schema initialization
├── seed-vedic-curriculum.ts   # Initial data seeding
│
├── modules/                   # 6 domain modules
│   ├── identity-access/
│   │   ├── routes.ts          # User auth and profile endpoints
│   │   └── [service files]
│   ├── content-publishing/
│   │   ├── routes.ts          # Track and chapter CRUD
│   │   └── [service files]
│   ├── media-pipeline/
│   │   ├── routes.ts          # Audio file upload and processing
│   │   └── [service files]
│   ├── batch-cohort/
│   │   ├── routes.ts          # Batch and enrollment management
│   │   └── [service files]
│   ├── learning-delivery/
│   │   ├── routes.ts          # Progress tracking and learning
│   │   └── [service files]
│   └── system-admin/
│       ├── routes.ts          # Admin settings and audit logs
│       └── [service files]
│
├── routes/                    # Legacy route files (being consolidated)
│   ├── auth.routes.ts
│   ├── admin.routes.ts
│   ├── batch.routes.ts
│   ├── content.routes.ts
│   ├── identity.routes.ts
│   ├── learning.routes.ts
│   └── media.routes.ts
│
├── auth/
│   └── passport-config.ts     # Passport.js setup
│
├── middleware/
│   └── [authentication and error handling]
│
├── monitoring/
│   └── DatabaseMonitor.ts
│
└── seeds/
    └── curriculum.json
```

### Module Contracts

Each server module owns specific database tables:

| Module | Owns | Depends On |
|--------|------|-----------|
| **identity-access** | users, sessions, roles | - |
| **content-publishing** | tracks, chapters, textSegments | identity-access |
| **media-pipeline** | audioFiles, mediaSegments | content-publishing |
| **batch-cohort** | batches, enrollments, batchCoInstructors | identity-access, content-publishing |
| **learning-delivery** | studentProgress, segmentMappings | batch-cohort, content-publishing, media-pipeline |
| **system-admin** | auditLogs, systemSettings | all |

---

## Shared Code

### Shared Directory

Located at project root: `shared/`

```
shared/
├── schema.ts          # Drizzle ORM models (14 tables)
├── types.ts           # TypeScript type definitions
├── constants.ts       # Script keys and configuration
├── components/
│   └── LinkStatusIcon.tsx
├── hooks/
│   └── useAudioPlayer.ts
├── utils/
│   └── text-segmentation.ts
├── monitoring/
│   └── Types and utilities for metrics
└── types/
    └── text-segmentation.ts
```

### Import Aliases

Configured in `vite.config.ts`:

```typescript
// Client imports
import { useAuth } from "@/features/shared-features/hooks/useAuth";
import { Button } from "@/components/ui/button";

// Shared imports
import type { Track } from "@shared/schema";
import { SCRIPTS, SCRIPT_LABELS } from "@shared/constants";
```

---

## Key Files Reference

### Root Configuration
- `vite.config.ts` - Build config with import aliases
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS with custom colors
- `drizzle.config.ts` - Database migrations
- `package.json` - Dependencies and scripts

### Database
- `shared/schema.ts` - All 14 table definitions
- `server/database-storage.ts` - Centralized DB operations
- `server/db.ts` - Database connection setup

### Documentation
- `docs/product-guide.md` - Product specifications and features
- `docs/domain-requirements.md` - Real-world workflows
- `docs/architecture/` - Architecture decisions
- `docs/project-structure.md` - This file

---

## Import Patterns

### Feature Pages Import Components and Hooks

```typescript
// Feature page using its own components and hooks
import { AudioPlayer } from "@/features/learning/components/AudioPlayer";
import { useChapterData } from "@/features/learning/hooks/useChapterData";

// Feature page using shared components and hooks
import { useAuth } from "@/features/shared-features/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/features/shared-features/components/LanguageSwitcher";
```

### Shared Component Imports

```typescript
// Shared component using design system
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/design-system/Card";

// Shared utilities
import { cn } from "@/lib/utils";
import { SCRIPTS } from "@shared/constants";
```

### Server Module Imports

```typescript
// Module route file using database storage
import { storage } from "@/database-storage";

// Module accessing database directly
const chapter = await storage.chapters.get(chapterId);
```

---

## Development Workflow

### Adding a New Page

1. Create file in appropriate feature: `client/src/features/feature-name/pages/NewPage.tsx`
2. Export the component as named export
3. Add lazy import in `client/src/App.tsx`:
   ```typescript
   const NewPage = lazy(() => 
     import("@/features/feature-name/pages/NewPage")
       .then(module => ({ default: module.NewPage }))
   );
   ```
4. Add route to Router component

### Adding a New Component

1. Create file in feature or shared location
2. If feature-specific: `client/src/features/feature-name/components/NewComponent.tsx`
3. If shared: `client/src/components/shared-name/NewComponent.tsx`
4. Import in consuming pages/components

### Adding a New Hook

1. If feature-specific: `client/src/features/feature-name/hooks/useNewHook.ts`
2. If shared: `client/src/features/shared-features/hooks/useNewHook.ts`
3. Use type-safe patterns with TanStack Query for async operations

### Adding a Database Table

1. Define in `shared/schema.ts` using Drizzle ORM
2. Update `shared/types.ts` with TypeScript types
3. Add to appropriate server module's scope
4. Create CRUD methods in `server/database-storage.ts`
5. Run `npm run db:push` to apply migration

### Adding a Server Endpoint

1. Add route in `server/modules/module-name/routes.ts`
2. Use `storage` for all database operations
3. Add auth middleware if needed: `requireAuth`, `requireRole('role')`
4. Use `createErrorResponse()` for error handling
5. Endpoint will be available at `/api/[module-path]`

---

## File Size and Organization Notes

### Pages
- Average: 300-400 lines
- Some complex pages (EditChapter): 2700+ lines
- Consider splitting very large pages into sub-components

### Components
- Small/simple: 50-100 lines
- Medium: 100-300 lines
- Large (Dashboard): 300+ lines
- Design system: Showcase components can be large

### Hooks
- Average: 100-200 lines
- Data hooks (TanStack Query): 150-250 lines
- UI hooks: 50-150 lines

---

## Migration from Legacy Structure

The application was recently reorganized from a flat structure to feature-based organization:

**Old Structure (Deprecated)**
```
client/src/
├── pages/              [NOW IN features/*/pages/]
├── components/         [SOME NOW IN features/*/components/]
└── hooks/              [NOW IN features/*/hooks/]
```

**New Structure (Current)**
```
client/src/
├── features/           [Feature-organized code]
│   ├── learning/
│   ├── content-management/
│   ├── batch-management/
│   ├── user-management/
│   └── shared-features/
├── components/         [Reusable UI groups]
└── legacy/            [Deprecated experiment pages]
```

All imports have been updated. The old `pages/` and `hooks/` directories are empty and can be deleted.

---

## Related Documentation

- [Product Guide](./product-guide.md) - Vision, features, and design philosophy
- [Domain Requirements](./domain-requirements.md) - Real-world workflows and use cases
- [Architecture Overview](./architecture/architecture.md) - Technical design decisions
- [Module Contracts](./architecture/module-contracts.md) - Server module boundaries

---

## Quick Checklist for Common Tasks

### I want to...

- **Add a new learning feature page**
  - Create in `client/src/features/learning/pages/`
  - Add hooks in `features/learning/hooks/` if needed
  - Add components in `features/learning/components/` if needed
  - Update App.tsx routing

- **Create a shared UI component**
  - Decide: Is it for multiple features or all features?
  - If multi-feature: Put in appropriate nested folder under `components/`
  - If all features: Consider if it belongs in design-system or shared-features/components/

- **Add a reusable hook**
  - Is it used by only one feature? Put in `features/feature-name/hooks/`
  - Is it shared? Put in `features/shared-features/hooks/`
  - If it's a data hook, use TanStack Query patterns

- **Modify the database schema**
  - Edit `shared/schema.ts`
  - Update types in `shared/types.ts`
  - Add/update methods in `server/database-storage.ts`
  - Run `npm run db:push`

- **Create a utility or test script**
  - Never create standalone scripts in root folder
  - Organize in `scripts/` folder by purpose:
    - Database utilities → `scripts/db/` (e.g., reset-db.ts)
    - Data seeding → `scripts/seed/` (e.g., create-sample-users.ts)
    - Testing → `scripts/test/` (e.g., auth-test.ts, smoke tests)
    - One-off utilities → `scripts/utils/` (e.g., list-users.ts)
  - Run with `npx tsx scripts/folder/script-name.ts`
  - Delete temporary scripts after use

- **Add an API endpoint**
  - Create in appropriate module's routes.ts
  - Use storage layer for database
  - Add authentication if needed
  - Document in OpenAPI schema

---

**Last Updated**: December 19, 2025  
**Project**: VedicLMS  
**Version**: Feature-based organization (Phase 3 complete)
