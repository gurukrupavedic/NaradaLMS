# Phase 1: Monolith Frontend Removal & Type System Unification

> **Objective**: Remove the legacy `client/` directory and consolidate the dual type system so that `@narada/types` is the single source of truth for all shared types, schemas, and constants.
>
> **Prerequisites**: Phase 0 completed and merged into `hardening`. Verification scripts in place. You must be on the `hardening` branch (or have just merged `hardening-phase-0` into it).
>
> **Risk**: Medium. This phase changes import paths across many files. If an import is missed, compilation will fail (which is easy to catch).

---

## Branch (start of Phase 1)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-1
```

All tasks and commits for Phase 1 happen on `hardening-phase-1`.

---

## Background

Currently there are two parallel type systems:

| Location | Files | Used By |
|----------|-------|---------|
| `shared/schema.ts`, `shared/types.ts`, `shared/constants.ts` | Root-level `shared/` folder | Server, Admin Portal (via `@shared/*` alias or relative imports) |
| `packages/types/src/schema.ts`, `packages/types/src/types.ts`, `packages/types/src/constants.ts` | `@narada/types` package | Student Portal |

These are **byte-for-byte identical copies** that will inevitably drift. Additionally, `shared/types/text-segmentation.ts` and `packages/types/src/text-segmentation.ts` have **already diverged** (different `createdAt` types).

The `client/` directory (281+ files) is the legacy Vite+React SPA that has been replaced by the two Next.js portals. It exists only as reference material.

---

## Task 1.1: Remove the Legacy Monolith Frontend

### Step 1: Delete the `client/` directory

Delete the entire `client/` directory. This is the legacy Vite+React SPA.

```
DELETE: client/ (entire directory, ~281 files)
```

### Step 2: Remove monolith-specific config files from root

Delete these root-level files that only served the monolith frontend:

```
DELETE: vite.config.ts
DELETE: tailwind.config.ts  (root level — NOT the one in packages/tailwind-config/)
DELETE: postcss.config.js   (root level, if it exists)
DELETE: components.json      (if it exists — shadcn/ui config for monolith)
```

### Step 3: Remove Vite-related code from the server

**File**: `server/index.ts`

Remove the Vite development server setup that serves the monolith SPA.

Find and remove these lines:

```typescript
// REMOVE this import:
import { setupVite, serveStatic } from "./vite";

// REMOVE this block in the async IIFE:
  if (config.env === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
```

Replace the removed block with just the server listen:

```typescript
  // No more Vite SPA serving — the API server is a pure API now.
  // Portals are served separately via Next.js.
```

Then delete the Vite helper file:

```
DELETE: server/vite.ts
```

### Step 4: Update root `package.json`

**File**: `package.json` (root)

The `build` script currently builds the Vite SPA. Update it to only build the server:

**Before**:
```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
```

**After**:
```json
"build": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
```

Also remove monolith-only dependencies from root `package.json`. These are dependencies that were only used by `client/` and are NOT used by the server or shared packages. **Be conservative** — only remove dependencies you are certain are not used by the server. The following are safe to remove because they are purely frontend/UI:

```
REMOVE from dependencies:
- wouter (client-side router, replaced by Next.js)
- react-icons (not used by server — will be added to portal package.json separately)
- embla-carousel-react (client component)
- react-window (client component)
- recharts (client component)
- react-colorful (client component)
- react-day-picker (client component)
- react-hook-form (client component)
- react-resizable-panels (client component)
- input-otp (client component)
- cmdk (client component)

REMOVE from devDependencies:
- @vitejs/plugin-react (Vite plugin)
- vite (build tool for monolith)
```

**Important**: Do NOT remove React, ReactDOM, Radix UI, TanStack, TipTap, or Tailwind from root — they may be used by `@narada/ui` package which is built from root context.

### Step 5: Update root `tsconfig.json`

**File**: `tsconfig.json` (root)

This tsconfig currently includes the monolith client paths.

**Before**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"]
}
```

**After**:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["shared/**/*", "server/**/*"]
}
```

Note: We keep `@shared/*` for now because the server still uses it. We will update the server's imports in the next task.

### Verification for Task 1.1
1. Run: `npm install` (to update lockfile after dependency removal)
2. Run: `npx tsc --noEmit` from root — should compile without errors referencing `client/`
3. Run: `npm run dev` — server should start without Vite
4. Hit `http://localhost:5000/api/auth/me` — should return 401 (API still works)
5. Run: `npm run test:smoke` (with server running)

---

## Task 1.2: Make `@narada/types` the Single Source of Truth

### Overview

After this task:
- `packages/types/` is the ONLY place where schemas, types, and constants are defined
- `shared/` becomes a thin re-export layer for backward compatibility during migration
- The server imports from `@narada/types`
- Both portals import from `@narada/types`

### Step 1: Fix the internal name collision in `@narada/types`

**File**: `packages/types/src/index.ts`

Currently, `schema.ts` exports type names that collide with `types.ts` (e.g., `User`, `Track`, etc.). The schema.ts exports silently shadow types.ts due to barrel order.

**Before**:
```typescript
export * from "./types";
export * from "./schema";
export * from "./constants";
export * from "./text-segmentation";
```

**After**:
```typescript
// Schema: Drizzle table definitions and Zod validation schemas
// These are the canonical table definitions used by the server
export * from "./schema";

// Types: TypeScript interfaces derived from schema + custom interfaces
// Re-exports base types from schema, adds extended interfaces
export * from "./types";

// Constants: Script keys, proficiency levels, etc.
export * from "./constants";

// Text Segmentation: Enriched types for the segmentation system
export * from "./text-segmentation";
```

**File**: `packages/types/src/types.ts`

Remove the duplicate base type exports that collide with `schema.ts`. The first few lines currently re-derive types from schema tables:

```typescript
// REMOVE these lines (they are redundant with schema.ts Zod exports):
export type User = typeof users.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type TextSegment = typeof textSegments.$inferSelect;
export type AudioFile = typeof audioFiles.$inferSelect;
```

And replace with imports:
```typescript
// Import base types from schema (single source of truth)
import type { User, Track, Chapter, TextSegment, AudioFile } from './schema';

// Re-export for convenience
export type { User, Track, Chapter, TextSegment, AudioFile };
```

This ensures schema.ts is the canonical source and types.ts only extends/re-exports.

### Step 2: Consolidate text-segmentation types

**File**: `packages/types/src/text-segmentation.ts`

This file imports from `./types` and defines enriched types. The `shared/types/text-segmentation.ts` defines the SAME types standalone with diverged shapes (e.g., `createdAt: string` vs `createdAt: Date | null`).

Keep the `packages/types/` version as canonical. It correctly derives from the schema. No changes needed to this file — it's already well-structured.

### Step 3: Add `@narada/types` as a dependency to the server

**File**: `package.json` (root)

The server currently uses `@shared/*` imports to reach `shared/`. We need it to use `@narada/types` instead.

Add `@narada/types` to root dependencies:
```json
"dependencies": {
    "@narada/types": "*",
    // ... existing deps
}
```

### Step 4: Update all server imports from `@shared/schema` to `@narada/types`

This is the largest mechanical change. Every file in `server/` that imports from `@shared/schema` or `@shared/constants` or `@shared/types` needs to be updated.

**Pattern**: Find all imports matching `from '@shared/schema'`, `from '@shared/constants'`, `from '@shared/types'`, or `from '../../shared/schema'` etc.

**Search command**: 
```bash
rg "@shared/" server/ --files-with-matches
rg "from ['\"].*shared/" server/ --files-with-matches
```

For each file found, update the import:

**Before**:
```typescript
import { users, tracks, chapters, ... } from '@shared/schema';
import { SCRIPT_KEYS } from '@shared/constants';
```

**After**:
```typescript
import { users, tracks, chapters, ... } from '@narada/types';
import { SCRIPT_KEYS } from '@narada/types';
```

**Important files that need updating** (non-exhaustive — search to find all):
- `server/db.ts`
- `server/modules/identity-access/storage.ts`
- `server/modules/content-publishing/storage.ts`
- `server/modules/media-pipeline/storage.ts` and `service.ts`
- `server/modules/batch-cohort/storage.ts`
- `server/modules/learning-delivery/service.ts`
- `server/modules/system-admin/storage.ts`
- `server/routes/content.routes.ts`
- `server/routes/batch.routes.ts`
- `server/routes/media.routes.ts`
- `server/routes/learning.routes.ts`
- `server/routes/identity.routes.ts`
- `server/routes/student.routes.ts`
- `server/routes/admin.routes.ts`
- `server/db-seeding/seed-curriculum.ts`
- `server/init-database.ts`
- `drizzle.config.ts` (root level)

Also update `scripts/` files:
```bash
rg "@shared/" scripts/ --files-with-matches
rg "shared/" scripts/ --files-with-matches
```

### Step 5: Update all admin-portal imports from `@shared/*` and relative `shared/` paths

The admin-portal currently uses either `@shared/*` alias or deeply relative paths like `../../../../../../shared/types`.

**Search command**:
```bash
rg "@shared/" apps/admin-portal/ --files-with-matches
rg "from ['\"]\.+/.*shared/" apps/admin-portal/ --files-with-matches
```

For each file found, update the import:

**Before** (various patterns):
```typescript
import { ... } from '@shared/schema';
import { ... } from '@shared/types';
import { ... } from '@shared/constants';
import { ... } from '../../../../../shared/types';
import { ... } from '../../../../../../shared/types';
```

**After** (all become):
```typescript
import { ... } from '@narada/types';
```

**Important**: The admin-portal's `package.json` already lists `@narada/types` as a dependency (line 16), so no dependency change is needed.

### Step 6: Remove the `@shared/*` path alias from tsconfig files

**File**: `apps/student-portal/tsconfig.json`

Remove the `@shared/*` path alias (it's defined but not used by student portal):

**Before**:
```json
"paths": {
    "@/*": ["./src/*"],
    "@shared/*": ["../../shared/*"]
}
```

**After**:
```json
"paths": {
    "@/*": ["./src/*"]
}
```

**File**: `apps/admin-portal/tsconfig.json`

The admin-portal tsconfig does NOT have `@shared/*` (verified), so no change needed.

**File**: `tsconfig.json` (root)

Keep `@shared/*` for now ONLY if the server still needs it. After Step 4, the server should use `@narada/types` and no longer need `@shared/*`. Once all server imports are updated:

**Before**:
```json
"paths": {
    "@shared/*": ["./shared/*"]
}
```

**After**:
```json
"paths": {}
```

Or remove the `paths` key entirely.

### Step 7: Convert `shared/` to a thin re-export layer (or delete)

After all imports are updated, the `shared/` directory is unused. However, some scripts or config files might still reference it. 

**Option A (safer)**: Convert to re-exports
```
shared/schema.ts  → export * from '@narada/types/src/schema';
shared/types.ts   → export * from '@narada/types/src/types';
shared/constants.ts → export * from '@narada/types/src/constants';
```

**Option B (cleaner)**: Delete the entire `shared/` directory and its subdirectories:
```
DELETE: shared/schema.ts
DELETE: shared/types.ts
DELETE: shared/constants.ts
DELETE: shared/types/ (entire directory)
DELETE: shared/utils/ (move to @narada/types or a new @narada/utils first)
DELETE: shared/components/ (if unused)
DELETE: shared/monitoring/ (if unused by server)
```

**Recommended**: Use Option B (delete). Since we've updated all imports, there should be no references left. If `shared/utils/text-segmentation.ts` is still imported by the admin-portal, move it to a shared location first.

**Check before deleting**:
```bash
rg "shared/" --files-with-matches
```

Ensure zero results from `server/`, `apps/`, `packages/`, and `scripts/`.

### Step 8: Update `drizzle.config.ts`

**File**: `drizzle.config.ts` (root)

This likely imports schema from `shared/schema`. Update to use `@narada/types`.

**Before**:
```typescript
import { ... } from './shared/schema';
// or
schema: './shared/schema.ts',
```

**After**:
```typescript
import { ... } from '@narada/types';
// or
schema: './packages/types/src/schema.ts',
```

### Verification for Task 1.2
1. Run: `npm install`
2. Run: `npx tsc --noEmit` — should compile without errors
3. Run: `npm run dev` — server should start
4. Run: `npm run test:smoke`
5. Run: `npm run test:content`
6. Start student portal: `cd apps/student-portal && npm run dev`
7. Start admin portal: `cd apps/admin-portal && npm run dev`
8. Verify both portals load and show content
9. Run: `rg "@shared/" --files-with-matches` — should return zero results (or only `shared/` re-exports if using Option A)
10. Run: `rg "from.*shared/" --files-with-matches` — should return zero results outside `shared/` itself

---

## Task 1.3: Fix Student Portal's Broken Import

**File**: `apps/student-portal/src/lib/matrix-utils.ts`

Line 7 imports from a non-existent path:

**Before**:
```typescript
import { ProficiencyLevel } from '../types/matrix';
```

**After**:
```typescript
import { ProficiencyLevel } from '@narada/types';
```

**Note**: Verify that `ProficiencyLevel` is actually exported from `@narada/types`. Check `packages/types/src/constants.ts` — if it's not there, add it:

```typescript
export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 8 | 9;
```

### Verification for Task 1.3
1. Run: `cd apps/student-portal && npx tsc --noEmit`
2. Confirm no import errors

---

## Task 1.4: Clean Up Root Dependencies

After removing `client/`, many root `package.json` dependencies are only needed by the server or by workspace packages. Review and move client-only dependencies to the appropriate portal's `package.json` if needed.

**Add `react-icons` to both portals** (it's imported but not declared):

**File**: `apps/student-portal/package.json` — add to dependencies:
```json
"react-icons": "^5.4.0"
```

**File**: `apps/admin-portal/package.json` — add to dependencies:
```json
"react-icons": "^5.4.0"
```

### Verification for Task 1.4
1. Run: `npm install` from root
2. Run: `cd apps/student-portal && npm run build`
3. Run: `cd apps/admin-portal && npm run build`
4. Confirm no missing dependency errors

---

## Phase 1 Completion Checklist

- [ ] `client/` directory deleted
- [ ] Root `vite.config.ts` deleted
- [ ] Root `tailwind.config.ts` deleted
- [ ] `server/vite.ts` deleted
- [ ] `server/index.ts` updated (no Vite imports)
- [ ] Root `package.json` build script updated
- [ ] Monolith-only dependencies removed from root
- [ ] `@narada/types` internal collisions fixed
- [ ] All server imports updated to `@narada/types`
- [ ] All admin-portal imports updated to `@narada/types`
- [ ] `@shared/*` path aliases removed from tsconfig files
- [ ] `shared/` directory deleted (or converted to re-exports)
- [ ] `drizzle.config.ts` updated
- [ ] `matrix-utils.ts` broken import fixed
- [ ] `react-icons` added to portal package.json files
- [ ] `npm run verify` passes
- [ ] Both portals build and load correctly
- [ ] All work committed on `hardening-phase-1` (e.g. `git commit -m "Phase 1: Remove monolith frontend, unify type system on @narada/types"`)

---

## Merge (end of Phase 1)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-1 --no-ff -m "Merge hardening-phase-1: Monolith removal and type unification"
git tag hardening-phase-1-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 2](phase-2-critical-fixes.md): create `hardening-phase-2` from `hardening` when starting Phase 2.
