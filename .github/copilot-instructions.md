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
server/          # Express API, routes-simple.ts (main API), database-storage.ts
client/src/      # React app, pages/, components/, hooks/, services/
  components/ui/           # shadcn/ui base components
  components/design-system/ # Custom LMS components (26 variants)
  components/chapter-editor/    # 5-tab editor interface
  components/text-segmentation/ # Segment creation UI
  components/audio-mapping/     # Audio timestamp mapping
uploads/         # Audio files (served via /uploads static route)
experiments/     # Design system prototypes (served via /experiments)
docs/            # ADRs, implementation plans, rollback procedures
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

### API Development (server/routes-simple.ts)
- All routes prefixed with `/api`
- Use `storage` methods from `database-storage.ts` (not direct DB queries)
- Error handling: Use `createErrorResponse()` utility and `globalErrorHandler`
- File uploads: Configured multer for audio files in `/uploads`

## Critical Project-Specific Conventions

### Multilingual Content
- **Always** use script keys: `te`, `hi`, `en` (never full names)
- **Font rendering** (see PROJECT_DOCUMENTATION.md):
  - Telugu/IAST: JIMS font (fallback: Noto Sans Telugu)
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

### When to Create Docs (see docs/README.md)
- **Architecture decisions:** `docs/architecture/ADR-XXX-Title.md`
- **Implementation plans:** `docs/implementation/TODO-Feature-Name.md`
- **Bug fixes:** `docs/troubleshooting/issue-description.md`
- **Rollback procedures:** `docs/rollback/FEATURE_ROLLBACK_POINT.md`

### Reference PROJECT_DOCUMENTATION.md
- Comprehensive feature descriptions (1421 lines)
- Design philosophy and color system rationale
- Complete sitemap and navigation structure
- Outstanding architectural issues section

## Key Files to Reference

- [shared/schema.ts](shared/schema.ts) - Database models and relations
- [server/database-storage.ts](server/database-storage.ts) - All DB operations
- [server/routes-simple.ts](server/routes-simple.ts) - API endpoint definitions
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - Full feature specifications
- [tailwind.config.ts](tailwind.config.ts) - Custom color tokens
- [shared/constants.ts](shared/constants.ts) - Configuration values
