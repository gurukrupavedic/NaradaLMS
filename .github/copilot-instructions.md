# VedicLMS - AI Coding Agent Instructions

## Project Overview
VedicLMS is a multilingual Learning Management System for Vedic education. The system synchronizes audio recitations with text in three scripts (Telugu, Hindi/Devanagari, English/IAST) using an interactive segment-based learning experience.

## AI Assistant Communication Rules

**CRITICAL: When asking questions to the user, ALWAYS format them in a code block.**

This is a mandatory requirement to allow easy copy-paste for responses. Never post questions in regular markdown format.

**Correct format:**
```
QUESTIONS ABOUT [FEATURE NAME]

1. Question about X?
   - Sub-point if needed
   - Another sub-point

2. Question about Y?

3. Question about Z?
```

**Incorrect format:**
Do NOT post questions as regular markdown bullets or numbered lists outside code blocks.

**When to use this:**
- Architecture/design clarifications
- Feature specification questions
- Implementation approach discussions
- Any multi-question brainstorming session

**Exception:**
Single, simple clarifying questions can be asked inline without a code block.

## Architecture Essentials

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite, Wouter routing, TanStack Query v5
- **Backend:** Express.js (modular monolith architecture)
- **Database:** Drizzle ORM with PostgreSQL (@neondatabase/serverless)
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components with custom colorful variants
- **Text Editing:** TipTap rich text editor for multilingual content
- **Auth:** Passport.js (local strategy) with PostgreSQL session store (connect-pg-simple)

### Project Structure
```
shared/          # Shared types, schema, constants (Drizzle ORM models)
server/
  modules/       # 6 domain modules (identity-access, content-publishing, media-pipeline,
                 #                   batch-cohort, learning-delivery, system-admin)
  routes/        # Legacy route files (being migrated to modules)
  shared/        # Shared middleware, utils, events
  index.ts       # Express setup, module mounting
client/src/      # React app with feature-based organization
  features/      # Feature modules (content-management, learning, batch-management, etc.)
  components/    # Shared UI components
    ui/          # shadcn/ui base components
    design-system/ # Custom LMS components (26 variants)
scripts/         # Utility scripts (organized by purpose - see Scripts Organization below)
  db/            # Database utilities (reset-db.ts)
  seed/          # Data seeding scripts (sample users, batches, etc.)
  test/          # Smoke tests and manual testing scripts
  utils/         # One-off utilities (list-users.ts, update-user-role.ts)
uploads/         # Audio files (served via /uploads static route)
docs/            # Product guide, architecture, domain requirements, todo
```

### Import Aliases (vite.config.ts)
- `@/` → client/src/
- `@shared/` → shared/

### Module Architecture (Completed Dec 2025)
**Modular Monolith Pattern**: 6 independent domain modules with clear boundaries:
- Each module has: `index.ts` (public API), `service.ts` (business logic), `storage.ts` (DB access), `events.ts`, `types.ts`
- **Only** the owning module writes to its tables; others consume via service APIs
- Routes in `server/routes/` are legacy (being migrated); new routes belong in modules
- Cross-module communication via events (see `server/shared/events/`)
- Module contracts documented in [docs/architecture/module-contracts.md](docs/architecture/module-contracts.md)

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

### Scripts Organization
**Keep the repository root clean** - all utility scripts belong in `scripts/` folder:
- **scripts/db/** - Database utilities (reset-db.ts for development resets)
- **scripts/seed/** - Data seeding and sample data generation (create users, batches, etc.)
- **scripts/test/** - Manual smoke tests and testing utilities
- **scripts/utils/** - One-off utilities (list users, update roles, etc.)

**Rules:**
- Never create standalone `.ts` scripts in root folder
- Use Drizzle's `npm run db:push` for schema changes (not SQL migration files)
- Temporary one-time scripts should be deleted after use or moved to appropriate subfolder
- Test scripts use `npx tsx` for execution (e.g., `npx tsx scripts/seed/create-full-batches.ts`)

### API Development (server/modules/*/service.ts + routes in server/routes/*.routes.ts)
- **Modular architecture**: 6 domain modules with dedicated storage and service layers
- All routes prefixed with `/api` and mounted in `server/index.ts`
- Use service methods from modules (e.g., `contentService.listTracks()`) - never direct DB queries in routes
- **Error handling pattern**: 
  ```typescript
  // Inline helper (being extracted to shared util - see TODO-Backend.md #2)
  function createErrorResponse(message: string, code?: string, details?: any): ApiErrorResponse {
    return { error: { message, code, details, timestamp: new Date().toISOString(), requestId: generateRequestId() }};
  }
  // Usage in routes:
  return res.status(404).json(createErrorResponse("Chapter not found", "CHAPTER_NOT_FOUND"));
  ```
- File uploads: Configured multer for audio files in `/uploads` (50MB max)
- Module contract pattern: Each module owns specific tables with public service APIs (see module-contracts.md)
- Authentication middleware: `requireAuth`, `requireApproved`, `requireRole('role')` (in `server/shared/middleware/auth.ts`)

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
- **Always use shadcn/ui components** - Never use native HTML form elements (`<select>`, `<input>`, `<button>`, etc.)
  - Use shadcn equivalents from `@/components/ui/*` (Select, Input, Button, Badge, etc.)
  - If a needed shadcn component is missing, inform the user before implementing custom alternatives
  - Maintain consistent component usage across the application

- **Dropdown/Popover Background Fix** (CRITICAL - prevents text overlap):
  - All shadcn dropdown components (Select, DropdownMenu, Popover) use `bg-white dark:bg-black` instead of `bg-popover`
  - This ensures solid backgrounds prevent underlying text from showing through
  - Already fixed in: `client/src/components/ui/select.tsx`, `dropdown-menu.tsx`, `popover.tsx`
  - Pattern: Replace `bg-popover` with `bg-white dark:bg-black` in component base className
  - See commit 7b23d6f for reference implementation

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

### Batch Management (Role-Based Access Control)

**Unified Page for Two Roles:**
- Single page at `/app/admin/batches/:id` (Admin) and `/app/instructor/batches/:id` (Instructor)
- Page title changes by context: "Batch Details" (admin) vs "Batch Progress" (instructor)

**Admin Access (Batch Details):**
- ✅ Can enroll/unenroll students (enrollment section visible)
- ❌ Cannot update proficiency levels (proficiency cells disabled, read-only)
- Use case: Administrative roster and student lifecycle management

**Instructor Access (Batch Progress):**
- ❌ Cannot enroll/unenroll students (enrollment section hidden)
- ✅ Can update proficiency levels (proficiency cells interactive)
- Use case: Teaching and student evaluation

**Implementation:**
- Frontend: Pass `canEditProficiency={context === 'instructor'}` prop to `UnifiedBatchMatrix`
- Backend: Verify user is batch's primary or co-instructor before allowing proficiency updates
- Security: Two-layer enforcement (UX disabling + API validation) prevents unauthorized changes

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
- No direct DB queries outside module storage layers (`server/modules/*/storage.ts`)

## Common Pitfalls

1. **Script references:** Never hardcode script names - use `SCRIPTS` and `SCRIPT_LABELS` constants
2. **Published chapters:** Check `status === 'published'` before allowing deletion
3. **Audio uploads:** Ensure multer config matches file size limits (50MB max)
4. **Font rendering:** Always apply script-specific font classes (`font-telugu`, etc.)
5. **Multi-role users:** Check role arrays with `requireRole()` middleware, not string equality
6. **Progress tracking:** Proficiency is 0-4 scale, not binary pass/fail
7. **Batch context:** Student progress evaluation requires batch assignment context
8. **Module boundaries:** Routes must call module services (e.g., `contentService.listTracks()`), never direct Drizzle queries
9. **Error responses:** Use `createErrorResponse()` pattern for consistent API error shapes (currently duplicated, see TODO-Backend.md #2)

## Documentation Standards

### When to Create Docs (see docs/README.md)
- **Product features:** Update [docs/product-guide.md](docs/product-guide.md) for new features or implementation changes
- **Naming:** Use lowercase kebab-case filenames for docs (avoid ALL-CAPS like `MVP-SCOPE.md`)
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
- [server/modules/](server/modules/) - 6 domain modules with storage and services
- [client/src/App.tsx](client/src/App.tsx) - Route definitions, lazy loading
- [tailwind.config.ts](tailwind.config.ts) - Custom color tokens (12 semantic colors)
- [openapi.yaml](openapi.yaml) - REST API contract (WIP)
