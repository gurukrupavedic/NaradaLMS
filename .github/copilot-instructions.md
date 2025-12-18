# VedicLMS - AI Coding Agent Instructions

## Project Overview
VedicLMS is a multilingual Learning Management System for Vedic education. The system synchronizes audio recitations with text in three scripts (Telugu, Hindi/Devanagari, English/IAST) using an interactive segment-based learning experience.

## Architecture Essentials

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite, Wouter routing, TanStack Query
- **Backend:** Express.js with Drizzle ORM (PostgreSQL via @neondatabase/serverless)
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components with custom colorful variants
- **Text Editing:** TipTap rich text editor for multilingual content
- **Auth:** Replit Auth with multi-role support (student/instructor/admin)

### Project Structure
```
shared/          # Shared types, schema, constants (Drizzle ORM models)
server/
  modules/       # 6 domain modules (identity-access, content-publishing, media-pipeline,
                 #                   batch-cohort, learning-delivery, system-admin)
  database-storage.ts # Centralized DB operations
  index.ts       # Express setup, module mounting
client/src/      # React app, pages/, components/, hooks/, services/
  components/ui/           # shadcn/ui base components
  components/design-system/ # Custom LMS components (26 variants)
  pages/         # 25 route-level components (lazy-loaded)
uploads/         # Audio files (served via /uploads static route)
experiments/     # Design system prototypes (served via /experiments)
docs/            # Product guide, architecture, domain requirements, todo
```

### Import Aliases (vite.config.ts)
- `@/` → client/src/
- `@shared/` → shared/

## Database Schema Patterns

### Key Tables (shared/schema.ts)
- **tracks** → chapters → audioFiles/textSegments → segmentMappings
- **users** with roles: ['student', 'instructor', 'admin']
- **chapters.content** is JSONB with script keys: `{te?: string, hi?: string, en?: string}`
- **chapters.status**: 'draft' | 'published' (protect published from deletion)
- **textSegments.script**: 'te' | 'hi' | 'en' (script-specific segmentation)
- **segmentMappings**: Links textSegment to mediaSegment with start/end timestamps

### Script Constants (shared/constants.ts)
```typescript
export const SCRIPTS = ['te', 'hi', 'en'] as const;
export const SCRIPT_LABELS = { te: 'Telugu', hi: 'Hindi', en: 'English' };
```

## Development Workflows

### Running the App
```bash
npm run dev       # Starts Vite dev server + Express API on port 5000
npm run build     # Vite build + esbuild server bundle
npm run db:push   # Push Drizzle schema changes to database
npm run check     # TypeScript type checking
```

### Database Changes
1. Edit `shared/schema.ts` (Drizzle ORM definitions)
2. Run `npm run db:push` to apply migrations
3. Update `server/database-storage.ts` methods if needed
4. Update TypeScript types in `shared/types.ts`

### API Development (server/modules/*/routes.ts)
- Modular architecture: 6 domain modules with dedicated route files
- All routes prefixed with `/api` and mounted in `server/index.ts`
- Use `storage` methods from `database-storage.ts` (not direct DB queries)
- Error handling: Use `createErrorResponse()` utility and `globalErrorHandler`
- File uploads: Configured multer for audio files in `/uploads`
- Module contract pattern: Each module owns specific tables with public service APIs

## Critical Project-Specific Conventions

### Multilingual Contentproduct-guide.md section 4.2):
  - Telugu: JIMS font (fallback: Noto Sans Telugu), 30px
  - Devanagari: AdishilaSanVedic font (fallback: Noto Sans Devanagari), 30px, semi-bold
  - IAST: AdishilaSan font (fallback: Noto Sans), 30px
  - Fonts served from `/client/public/fonts/`s Telugu)
  - Devanagari: Adishila San font (fallback: Noto Sans Devanagari)
  - Font size: 28px for Vedic text readability

### Design System
- **Color philosophy:** Modern, vibrant (blue/green/purple/orange/pink/indigo) - **NOT** traditional brown/gold
- **Components:** Use `client/src/components/design-system/` custom variants (26 components)
- **Tabs:** Indigo variant with sm/md/lg sizes (used in chapter editor)
- **Cards:** 12 color variants + educational semantics (lesson/progress/content)
- **Badges:** 96px consistent width for status indicators

### Chapter Editor Pattern (5 Tabs)
1. **Content Editor:** HTML/Text toggle, TipTap WYSIWYG, script switcher
2. **Audio Management:** Upload with metadata extraction, reciter attribution
3. **Text Segmentation:** Click-drag selection, sticky note aesthetics (amber-50/100, indigo-200 when selected)
4. **Audio Mapping:** Progressive click-when-heard interface (gray→orange→green states)
5. **Preview:** Learn Mode toggle (interactive segments vs. read-only HTML)

### Segment State Colors (Critical UX Pattern)
- **Idle:** amber-50 background
- **Hover:** amber-100 background
- **Selected:** indigo-200 background + indigo-400 border
- **Recording:** Orange card + badge
- **Mapped:** Green card + badge with timestamp

### Route Structure
- **Management:** `/manage` → `/manage/tracks/:trackId` → `/manage/tracks/:trackId/chapters/:chapterId`
- **Learning:** `/tracks` → `/tracks/:trackId` → `/chapter/:chapterId`
- **Legacy redirects:** `/content-management/*` → `/manage/*`

## Code Organization Rules

### Component Architecture
- Use lazy loading for routes (see App.tsx)
- Error boundaries wrap entire app with custom fallback
- TanStack Query for all API calls with prefetching (see `lib/query-prefetch.ts`)
- Custom hooks in `hooks/` (e.g., `useAuth`, `useToast`)

### State Management
- **Server state:** TanStack Query (queryClient in `lib/queryClient.ts`)
- **Local state:** React useState/useReducer
- **localStorage:** Learn mode preference, language selection

### Type Safety
- All API responses typed in `shared/types.ts`
- Drizzle Zod schemas for validation (createInsertSchema/createSelectSchema)
- Avoid `any` - use proper types from schema

## Common Pitfalls

1. **Script references:** Never hardcode script names - use `SCRIPTS` and `SCRIPT_LABELS` constants
2. **Published chapters:** Check `status === 'published'` before allowing deletion
3. **Audio uploads:** Ensure multer config matches `FILE_UPLOAD` constants (50MB max)
4. **Font rendering:** Always apply script-specific font classes
5. **Experiments folder:** Isolated from main app - served via static express route, safe to modify

## Documentation Standards

### Product documentation:** Update [docs/product-guide.md](docs/product-guide.md) for new features
- **Architecture decisions:** Document in [docs/architecture/](docs/architecture/) as markdown or ADRs
- **Domain workflows:** Update [docs/domain-requirements.md](docs/domain-requirements.md) with real-world usage
- **Active backlog:** Categorize work in [docs/todo/](docs/todo/) by feature area
- **Historical records:** Archive completed work to [docs/archive/](docs/archive/)

### Reference Product Guide
- [docs/product-guide.md](docs/product-guide.md) - **Single source of truth** (10,500 words)
  - Vision, problems solved, features, design philosophy
  - Technical architecture, current state, roadmap
  - Updated continuously as features are implementede
- Outstanding architectural issues section

##**Product & Architecture:**
  - [docs/product-guide.md](docs/product-guide.md) - Complete product specification
  - [docs/architecture/architecture.md](docs/architecture/architecture.md) - Technical overview
  - [docs/architecture/module-contracts.md](docs/architecture/module-contracts.md) - Module boundaries
  - [docs/domain-requirements.md](docs/domain-requirements.md) - Real-world workflows

- **Code:**
  - [shared/schema.ts](shared/schema.ts) - Database models and relations (14 tables)
  - [shared/constants.ts](shared/constants.ts) - Script keys, configuration values
  - [server/database-storage.ts](server/database-storage.ts) - Centralized DB operations
  - [server/modules/](server/modules/) - 6 domain modules with routes and services
  - [client/src/App.tsx](client/src/App.tsx) - Route definitions, lazy loading
  - [tailwind.config.ts](tailwind.config.ts) - Custom color tokens (12 semantic colors)re specifications
- [tailwind.config.ts](tailwind.config.ts) - Custom color tokens
- [shared/constants.ts](shared/constants.ts) - Configuration values
