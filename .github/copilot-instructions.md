# VedicLMS - AI Coding Agent Instructions

## Project Overview
VedicLMS is a multilingual Learning Management System for Vedic education. The system synchronizes audio recitations with text in three scripts (Telugu, Hindi/Devanagari, English/IAST) using an interactive segment-based learning experience.

## Architecture Essentials

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite, Wouter routing, TanStack Query v5
- **Backend:** Express.js with Drizzle ORM (PostgreSQL via @neondatabase/serverless)
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components with custom colorful variants
- **Text Editing:** TipTap rich text editor for multilingual content
- **Auth:** Passport.js (local strategy, PostgreSQL-backed sessions) + optional social OAuth

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
- **users** with roles: ['student', 'instructor', 'content_manager', 'admin'] + approval workflow (status: pending_approval | active)
- **sessions** (PostgreSQL-backed, connect-pg-simple)
- **tracks** → chapters → audioFiles/textSegments → segmentMappings
- **chapters.content** is JSONB with script keys: `{te?: string, hi?: string, en?: string}`
- **chapters.status**: 'draft' | 'published' (protect published from deletion)
- **textSegments.script**: 'te' | 'hi' | 'en' (script-specific segmentation)
- **mediaSegments**: Audio timestamp ranges (reusable across mappings)
- **segmentMappings**: Links textSegment to mediaSegment with start/end timestamps
- **batches** → enrollments → students (batch-cohort module)
- **batchCoInstructors**: Multiple instructors per batch (equal privileges)
- **studentProgress**: 5-level proficiency scale (0-4) with batch context for evaluation
- **auditLogs**: System activity tracking (system-admin module)
- **systemSettings**: Configuration key-value store

### Script Constants (shared/constants.ts)
```typescript
export const SCRIPTS = ['te', 'hi', 'en'] as const;
export const SCRIPT_LABELS = { te: 'Telugu', hi: 'Hindi', en: 'English' };
```

## Development Workflows

### Git Branching Strategy
**Daily Branch Pattern**: Work is organized by daily branches with feature sub-branches.

**Branch Naming:**
```
daily/YYYY-MM-DD                    # Daily checkpoint branch
daily/YYYY-MM-DD/fix-*              # Bug fix sub-branch
daily/YYYY-MM-DD/feat-*             # Feature sub-branch
daily/YYYY-MM-DD/refactor-*         # Refactor sub-branch
```

**Morning - Start of Day:**
```bash
git checkout main
git pull origin main
git checkout -b daily/2024-12-19
git push -u origin daily/2024-12-19
```

**During Day - Feature Work:**
```bash
git checkout daily/2024-12-19
git checkout -b daily/2024-12-19/feature-name
# ... work on feature ...
git add .
git commit -m "feat: descriptive message"
git checkout daily/2024-12-19
git merge daily/2024-12-19/feature-name
git push origin daily/2024-12-19
```

**End of Day - Merge to Main:**
```bash
git checkout main
git pull origin main
git merge --no-ff daily/2024-12-19  # Preserve branch history
git push origin main
# Optional: Delete daily branch
git branch -d daily/2024-12-19
git push origin --delete daily/2024-12-19
```

**Workflow Benefits:**
- Daily checkpoints for easy rollback
- Feature isolation with clean commit history
- Main branch stays stable until end of day
- Clear history grouped by day, then by feature

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
- File uploads: Configured multer for audio files in `/uploads` (50MB max)
- Module contract pattern: Each module owns specific tables with public service APIs
- Authentication middleware: `requireAuth`, `requireApproved`, `requireRole('role')`

## Critical Project-Specific Conventions

### Multilingual Content
- **Always** use script keys: `te`, `hi`, `en` (never full names)
- **Font rendering** (see product-guide.md section 4.2):
  - Telugu: JIMS font (fallback: Noto Sans Telugu), 30px
  - Devanagari: AdishilaSanVedic font (fallback: Noto Sans Devanagari), 30px, semi-bold
  - IAST: AdishilaSan font (fallback: Noto Sans), 30px
  - Fonts located in `client/public/fonts/` and served at `/fonts/`
  - Font classes: `font-telugu`, `font-devanagari`, `font-iast`

### Design System
- **Color philosophy:** Modern, vibrant (blue/green/purple/orange/pink/indigo) - **NOT** traditional brown/gold
- **Components:** Use `client/src/components/design-system/` custom variants (26 components)
- **Tabs:** Indigo variant with sm/md/lg sizes (used in chapter editor)
- **Cards:** 12 color variants + educational semantics (lesson/progress/content)
- **Badges:** 96px consistent width; semantic colors based on segment state

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
- **Admin:** `/manage/users`, `/manage/batches`
- **Legacy redirects:** `/content-management/*` → `/manage/*`

## Code Organization Rules

### Component Architecture
- Use lazy loading for routes (see App.tsx)
- Error boundaries wrap entire app with custom fallback
- TanStack Query for all API calls with prefetching
- Custom hooks in `hooks/` (e.g., `useAuth`, `useToast`)

### State Management
- **Server state:** TanStack Query v5 (queryClient in `lib/queryClient.ts`)
- **Local state:** React useState/useReducer
- **localStorage:** Learn mode preference, language selection

### Type Safety
- All API responses typed in `shared/types.ts`
- Drizzle Zod schemas for validation (createInsertSchema/createSelectSchema)
- Avoid `any` - use proper types from schema
- No direct DB queries outside `database-storage.ts`

## Common Pitfalls

1. **Script references:** Never hardcode script names - use `SCRIPTS` and `SCRIPT_LABELS` constants
2. **Published chapters:** Check `status === 'published'` before allowing deletion
3. **Audio uploads:** Ensure multer config matches file size limits (50MB max)
4. **Font rendering:** Always apply script-specific font classes (`font-telugu`, etc.)
5. **Experiments folder:** Isolated from main app - served via static express route, safe to modify
6. **Multi-role users:** Check role arrays with `requireRole()` middleware, not string equality
7. **Progress tracking:** Proficiency is 0-4 scale, not binary pass/fail
8. **Batch context:** Student progress evaluation requires batch assignment context

## Documentation Standards

### When to Create Docs (see docs/README.md)
- **Product features:** Update [docs/product-guide.md](docs/product-guide.md) for new features or implementation changes
### Naming
 - Use lowercase filenames for docs (avoid ALL-CAPS names like `MVP-SCOPE.md`); prefer `kebab-case`.
- **Architecture decisions:** Document in [docs/architecture/](docs/architecture/) as markdown ADRs
- **Domain workflows:** Update [docs/domain-requirements.md](docs/domain-requirements.md) with real-world usage patterns
- **Active backlog:** Categorize work in [docs/todo/](docs/todo/) by feature area (backend/frontend/common)
- **Historical records:** Archive completed work to [docs/archive/](docs/archive/)

### Reference Product Guide
- [docs/product-guide.md](docs/product-guide.md) - **Single source of truth** (10,500 words)
  - Vision, problems solved, features, design philosophy
  - Technical architecture, current state, roadmap
  - Updated continuously as features are implemented

## Key Files to Reference

### Product & Architecture
- [docs/product-guide.md](docs/product-guide.md) - Complete product specification
- [docs/architecture/architecture.md](docs/architecture/architecture.md) - Technical overview
- [docs/architecture/module-contracts.md](docs/architecture/module-contracts.md) - Module boundaries and ownership
- [docs/domain-requirements.md](docs/domain-requirements.md) - Real-world workflows and user stories

### Code
- [shared/schema.ts](shared/schema.ts) - Database models and relations (14 tables)
- [shared/constants.ts](shared/constants.ts) - Script keys, configuration values
- [server/database-storage.ts](server/database-storage.ts) - Centralized DB operations
- [server/modules/](server/modules/) - 6 domain modules with routes and services
- [client/src/App.tsx](client/src/App.tsx) - Route definitions, lazy loading
- [tailwind.config.ts](tailwind.config.ts) - Custom color tokens (12 semantic colors)
- [openapi.yaml](openapi.yaml) - REST API contract (WIP)
