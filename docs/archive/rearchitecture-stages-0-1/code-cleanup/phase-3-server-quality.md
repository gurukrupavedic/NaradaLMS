# Phase 3: Server Code Quality

**Branch:** `cleanup-phase-3` from `cleanup`
**Risk:** Medium — changing route handlers, must verify API still works
**Estimated effort:** 2–3 hours
**Prerequisites:** Phase 2 complete (`cleanup-phase-2` merged into `cleanup`)

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-3): <what was done>`
6. **Verify after each task.** Run the verification command specified. If it fails, fix the issue before proceeding.
7. **Do NOT touch** any file not explicitly listed in this document.
8. **Do NOT modify** `packages/types/src/schema.ts`, database migrations, or any database-related code.

## Verification Commands (Run After Every Task)

```bash
npx tsc --noEmit
npx turbo run build
```

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-3
```

---

## Task 3.1: Remove Duplicate Route Handlers from `media.routes.ts`

### Context

Audio and mapping routes exist in BOTH `server/routes/media.routes.ts` and `server/routes/content.routes.ts`. The admin-portal already uses the `content.routes.ts` versions. The student-portal uses the `media.routes.ts` versions. We will switch student-portal to use `content.routes.ts` endpoints, then remove the duplicates from `media.routes.ts`.

### Step A: Update Student Portal API Calls

In `apps/student-portal/src/components/learning/LearnChapter.tsx`:

**Audio files query (around lines 134–137):**
```typescript
// Old:
queryKey: [`/api/audio-files/${chapterId}`],
// ...
return apiRequest<AudioFile[]>(`/audio-files/${chapterId}`);

// New:
queryKey: [`/api/content/chapters/${chapterId}/audio`],
// ...
return apiRequest<AudioFile[]>(`/content/chapters/${chapterId}/audio`);
```

**Segment mappings query (around lines 142–145):**
```typescript
// Old:
queryKey: [`/api/segment-mappings/${chapterId}`],
// ...
return apiRequest<AudioTextMapping[]>(`/segment-mappings/${chapterId}`);

// New:
queryKey: [`/api/content/chapters/${chapterId}/mappings`],
// ...
return apiRequest<AudioTextMapping[]>(`/content/chapters/${chapterId}/mappings`);
```

**Verify:** `npx tsc --noEmit` passes. Start API + student portal, navigate to a chapter — audio and text should still load.

### Step B: Remove Duplicate Handlers from `media.routes.ts`

Read `server/routes/media.routes.ts` and remove these route handlers:

1. `GET /audio-files/:chapterId` (around line 37)
2. `POST /audio-files/:chapterId/upload` (around line 45)
3. `DELETE /audio-files/:audioFileId` (around line 90)
4. `GET /segment-mappings/:chapterId` (around line 172)
5. `GET /mappings/chapter/:chapterId` (around line 180)
6. `POST /mappings` (around line 204)
7. `DELETE /mappings/:audioFileId/:segmentId` (around line 218)

**Keep** the multer configuration, `router.use(jwtAuth)`, and any routes that do NOT have equivalents in `content.routes.ts`. Specifically keep:
- Any text-segment CRUD routes unique to `media.routes.ts`
- The multer upload setup (disk storage, file filter)

If after removal `media.routes.ts` only has the multer setup and router boilerplate with no route handlers, consider whether it should be kept or removed entirely. If all its routes are now in `content.routes.ts`, the file can be deleted and its mount removed from `server/index.ts`.

**Verify:** `npx tsc --noEmit` passes. Test API endpoints:
- `GET /api/content/chapters/:id/audio` — should return audio files
- `GET /api/content/chapters/:id/mappings` — should return mappings

**Commit:** `cleanup(phase-3): remove duplicate route handlers, switch student-portal to content routes`

---

## Task 3.2: Standardize Error Handling with `catchAsync`

### Reference: The `catchAsync` Utility

Located at `server/utils/catchAsync.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};
```

### Files to Update

Three route files use manual `try/catch` + `console.error` instead of `catchAsync`:

**1. `server/routes/identity.routes.ts`**
- Add import: `import { catchAsync } from '../utils/catchAsync';`
- For each `async (req, res) => { try { ... } catch (error) { console.error(...); res.status(500).json(...) } }` handler:
  - Wrap with `catchAsync(async (req, res) => { ... })`
  - Remove the try/catch block (keep only the try body)
  - Remove the `console.error` call

Before:
```typescript
router.get('/me', jwtAuth, async (req, res) => {
  try {
    const user = await identityService.getUserById(req.user!.id);
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
```

After:
```typescript
router.get('/me', jwtAuth, catchAsync(async (req, res) => {
    const user = await identityService.getUserById(req.user!.id);
    res.json({ user });
}));
```

**2. `server/routes/admin.routes.ts`** — same transformation, ~5 route handlers.

**3. `server/routes/learning.routes.ts`** — same transformation, ~8 route handlers.

**DO NOT** change the logic inside each handler. Only wrap with `catchAsync` and remove try/catch + console.error.

**Verify:** `npx tsc --noEmit` passes. Start API, test login and a few endpoints.

**Commit:** `cleanup(phase-3): standardize error handling with catchAsync in 3 route files`

---

## Task 3.3: Replace Remaining `console.error` with Logger

### Reference: The Logger

Located at `server/utils/logger.ts`, exports `Logger` class with static methods:
- `Logger.error(message: string, meta?: any)`
- `Logger.warn(message: string, meta?: any)`
- `Logger.info(message: string, meta?: any)`

### Action

After Task 3.2, most `console.error` calls in routes are gone. Search for any remaining in:

- `server/routes/content.routes.ts`
- `server/routes/media.routes.ts`
- `server/routes/batch.routes.ts`
- `server/routes/student.routes.ts`

For each file with remaining `console.error`:
1. Add `import { Logger } from '../utils/logger';` (if not already imported)
2. Replace `console.error('message', error)` with `Logger.error('message', error)`

**Verify:**
```bash
npx tsc --noEmit
# Should return zero results in routes/:
rg "console\.error" server/routes/
```

**Commit:** `cleanup(phase-3): replace console.error with Logger in route handlers`

---

## Task 3.4: Remove Placeholder Middleware Stubs

### In `server/shared/middleware/index.ts`

Read the file first. It should contain:
1. Lines 1–10: Re-exports of auth middleware (KEEP)
2. Lines 12–21: `validateRequest` function — a placeholder that just calls `next()` (REMOVE)
3. Lines 23–35: `errorHandler` function — a placeholder (real handler is at `server/middleware/error.middleware.ts`) (REMOVE)

After removal, the file should only contain the auth re-exports.

### Update Consumers of `validateRequest`

Search for imports of `validateRequest` across server code. Known usage:
- `server/routes/media.routes.ts` may import it from `'../shared/middleware'` or from `'../utils/validation'`

For any route using `validateRequest` as middleware (e.g., `router.post('/path', validateRequest(schema), handler)`):
- Remove `validateRequest(schema)` from the middleware chain (it's a no-op that just calls `next()`)
- Remove the import

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-3): remove placeholder validateRequest and errorHandler stubs`

---

## Task 3.5: Remove Unused Storage Methods

### In `server/modules/identity-access/storage.ts`

Find the `getAllUsers()` method. It has been replaced by `listUsersPaginated()`.

Before removing:
```bash
rg "getAllUsers" server/
```
Confirm it returns only the definition, not any call sites. Then remove the method.

### In `server/modules/batch-cohort/storage.ts`

Find the `listBatches()` method. It has been replaced by `listBatchesPaginated()`.

Before removing:
```bash
rg "listBatches\b" server/
```
Confirm it returns only the definition (not `listBatchesPaginated`). Then remove the method.

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-3): remove unused getAllUsers and listBatches storage methods`

---

## Phase 3 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-3 --no-ff -m "Merge cleanup-phase-3: server code quality"
git tag cleanup-phase-3-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Start all 3 services and verify:
- `POST /api/auth/login` works
- `GET /api/batches` returns data
- `GET /api/content/tracks` returns data
- `GET /api/content/chapters/:id/audio` returns audio files
- `GET /api/content/chapters/:id/mappings` returns mappings
- Student portal chapter page loads with audio
- Admin portal content studio works

### Summary of Changes

- 6–7 duplicate route handlers removed from `media.routes.ts`
- ~16 route handlers standardized to use `catchAsync` (3 files)
- ~21 `console.error` calls replaced with `Logger`
- 2 placeholder middleware stubs removed
- 2 unused storage methods removed
- Zero behavior changes — same API responses, same error handling flow
