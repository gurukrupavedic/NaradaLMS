# Phase 5: Performance & Code Quality

> **Objective**: Fix N+1 database queries, add proper server-side pagination, wrap critical operations in transactions, remove dead code from server and shared packages, and clean up ESLint configuration.
>
> **Prerequisites**: Phases 3 and 4 completed and merged into `hardening`. You must be on the `hardening` branch. **All build-blocking type errors from Phase 4 wrap-up must be resolved** (see Phase 4 completion) so that `npm run verify` and portal builds pass before starting Phase 5.
>
> **Risk**: Low-Medium. Query changes affect data loading behavior. Test with realistic data volumes.

---

## Phase 4 Wrap-Up (complete before or at start of Phase 5)

The following pre-existing issues were identified during Phase 4 verification. They block `npm run verify` and must be fixed before Phase 6 (deployment). Prefer fixing them at the end of Phase 4 or at the start of Phase 5:

1. **`shared/utils/text-segmentation.ts`**: Add `TextSegment` to the import from `../types/text-segmentation` (the type is used but was never imported).
2. **Ops-portal MappingTab / ProgressiveMapper**: Align `TextSegment` usage with `@narada/types` — either use API response types with `createdAt: string` and `script: Script` at boundaries, or add a small adapter so Drizzle/schema types match what the UI expects.
3. **Root server type errors**: Add `@types/cookie-parser` and `@types/csurf` (or declare modules); fix `server/auth/jwt.utils.ts` `expiresIn` typing; fix `server/auth/passport-config.ts` Google strategy callback signature (req, accessToken, refreshToken, profile, done) and `done` parameter type; fix `server/index.ts` `csrfToken` on Request if needed.

After these fixes, `npx tsc --noEmit` (root), student-portal build, and ops-portal build should all pass.

---

## Branch (start of Phase 5)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-5
```

All tasks and commits for Phase 5 happen on `hardening-phase-5`.

---

## Task 5.1: Fix N+1 Query in `ContentStorage.getAllTracks()`

### Problem

**File**: `server/modules/content-publishing/storage.ts`

The `getAllTracks()` method fetches all tracks, then runs a separate `COUNT(*)` query per track to get chapter counts. With 20 tracks, this is 21 queries.

**Before** (around line 14):
```typescript
async getAllTracks(): Promise<any[]> {
    const allTracks = await db.select().from(tracks).orderBy(tracks.order);

    const tracksWithCounts = await Promise.all(
        allTracks.map(async (track) => {
            const chapterCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(chapters)
                .where(eq(chapters.trackId, track.id));

            return {
                ...track,
                chapterCount: Number(chapterCount[0]?.count || 0)
            };
        })
    );

    return tracksWithCounts;
}
```

**After** (single query with LEFT JOIN):
```typescript
async getAllTracks(): Promise<any[]> {
    const result = await db
        .select({
            id: tracks.id,
            title: tracks.title,
            description: tracks.description,
            order: tracks.order,
            createdBy: tracks.createdBy,
            createdAt: tracks.createdAt,
            updatedAt: tracks.updatedAt,
            chapterCount: sql<number>`count(${chapters.id})`.as('chapter_count'),
        })
        .from(tracks)
        .leftJoin(chapters, eq(chapters.trackId, tracks.id))
        .groupBy(tracks.id)
        .orderBy(tracks.order);

    return result.map(row => ({
        ...row,
        chapterCount: Number(row.chapterCount || 0),
    }));
}
```

### Verification for Task 5.1
1. Run: `npm run test:content` — content smoke test should pass
2. Run: `npm run test:smoke` — GET /api/content/tracks should return tracks with chapterCount
3. In the ops portal Content Studio, verify track list shows correct chapter counts

---

## Task 5.2: Fix N*M Query in `ContentStorage.getChaptersByTrack()`

### Problem

**File**: `server/modules/content-publishing/storage.ts`

For each chapter, the code queries `audioFiles`, then for each audio file queries `mediaSegments`. With 10 chapters each having 2 audio files, this is 1 + 10 + 20 = 31 queries.

**Before** (around line 75):
```typescript
const enrichedChapters = await Promise.all(chapterList.map(async (chapter) => {
    const hasContent = Boolean(...);

    const audioFilesList = await db.select().from(audioFiles).where(eq(audioFiles.chapterId, chapter.id));
    const audioFileCount = audioFilesList.length;

    let segmentCount = 0;
    for (const audioFile of audioFilesList) {
        const mediaSegmentsList = await db.select().from(mediaSegments).where(eq(mediaSegments.audioFileId, audioFile.id));
        segmentCount += mediaSegmentsList.length;
    }

    return { ...chapter, hasContent, audioFileCount, segmentCount };
}));
```

**After** (two bulk queries):
```typescript
async getChaptersByTrack(trackId: number): Promise<any[]> {
    // 1. Get all chapters for the track
    const chapterList = await db
        .select()
        .from(chapters)
        .where(eq(chapters.trackId, trackId))
        .orderBy(chapters.order);

    if (chapterList.length === 0) return [];

    const chapterIds = chapterList.map(c => c.id);

    // 2. Bulk query: audio file counts per chapter
    const audioCountResults = await db
        .select({
            chapterId: audioFiles.chapterId,
            audioFileCount: sql<number>`count(*)`.as('audio_file_count'),
        })
        .from(audioFiles)
        .where(inArray(audioFiles.chapterId, chapterIds))
        .groupBy(audioFiles.chapterId);

    const audioCountMap = new Map(
        audioCountResults.map(r => [r.chapterId, Number(r.audioFileCount)])
    );

    // 3. Bulk query: segment counts per chapter (via audioFiles join)
    const segmentCountResults = await db
        .select({
            chapterId: audioFiles.chapterId,
            segmentCount: sql<number>`count(${mediaSegments.id})`.as('segment_count'),
        })
        .from(mediaSegments)
        .innerJoin(audioFiles, eq(mediaSegments.audioFileId, audioFiles.id))
        .where(inArray(audioFiles.chapterId, chapterIds))
        .groupBy(audioFiles.chapterId);

    const segmentCountMap = new Map(
        segmentCountResults.map(r => [r.chapterId, Number(r.segmentCount)])
    );

    // 4. Enrich chapters with counts
    return chapterList.map(chapter => {
        const hasContent = Boolean(
            (chapter.content?.te && chapter.content.te.trim().length > 0) ||
            (chapter.content?.hi && chapter.content.hi.trim().length > 0) ||
            (chapter.content?.en && chapter.content.en.trim().length > 0)
        );

        return {
            ...chapter,
            hasContent,
            audioFileCount: audioCountMap.get(chapter.id) || 0,
            segmentCount: segmentCountMap.get(chapter.id) || 0,
        };
    });
}
```

**Note**: You'll need to import `inArray` from `drizzle-orm`:
```typescript
import { eq, sql, inArray } from 'drizzle-orm';
```

### Verification for Task 5.2
1. Run: `npm run test:content`
2. In the ops portal Content Studio, click on a track — should show chapters with correct audio/segment counts

---

## Task 5.3: Add Database-Level Pagination

### Problem

`identity.routes.ts` and `batch.routes.ts` fetch ALL records and paginate with JavaScript `.slice()`.

### Fix: Batch list pagination

**File**: `server/modules/batch-cohort/storage.ts`

Add a paginated list method:

```typescript
async listBatchesPaginated(limit: number, offset: number): Promise<{ items: any[]; total: number }> {
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(batches);
    const total = Number(countResult.count);

    const items = await db
        .select()
        .from(batches)
        .orderBy(batches.createdAt)
        .limit(limit)
        .offset(offset);

    return { items, total };
}
```

**File**: `server/modules/batch-cohort/service.ts` (or `index.ts`)

Add a corresponding service method that delegates to the new storage method.

**File**: `server/routes/batch.routes.ts`

**Before**:
```typescript
router.get('/batches', async (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const allItems = await batchService.listBatches();
        const total = allItems.length;
        const paginatedItems = allItems.slice(offset, offset + limit);

        res.json({ items: paginatedItems, pagination: { limit, offset, total } });
    } catch (error) { next(error); }
});
```

**After**:
```typescript
router.get('/batches', async (req, res, next) => {
    try {
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const { items, total } = await batchService.listBatchesPaginated(limit, offset);

        res.json({ items, pagination: { limit, offset, total } });
    } catch (error) { next(error); }
});
```

### Fix: User list pagination

Apply the same pattern to `server/modules/identity-access/storage.ts` and `server/routes/identity.routes.ts`:

Add `listUsersPaginated(limit, offset, filters?)` to the identity storage/service, and update the admin users route to use DB-level pagination.

### Fix: Instructor search

**File**: `apps/ops-portal/src/lib/hooks/useBatchRelations.ts`

The `useInstructors` hook fetches ALL 1000 users and filters client-side.

**Before** (around line 146):
```typescript
export function useInstructors() {
    return useQuery<Instructor[]>({
        queryKey: ["/api/auth/admin/users?role=instructor"],
        queryFn: async () => {
            const response = await apiRequest<{ users: any[] }>("/auth/admin/users?limit=1000");
            return response.users
                .filter((u: any) => u.roles && u.roles.includes('instructor'))
                // ...
```

**After**:
```typescript
export function useInstructors() {
    return useQuery<Instructor[]>({
        queryKey: ["instructors"],
        queryFn: async () => {
            const response = await apiRequest<{ users: any[] }>("/auth/admin/users?role=instructor&limit=200");
            return (response.users || []).map((u: any) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
            }));
        },
    });
}
```

**Note**: For this to work, the server's admin users endpoint needs to support a `role` query parameter for server-side filtering. Check if `identity.routes.ts` already supports this. If not, add:

```typescript
// In the admin users route handler:
if (req.query.role) {
    filteredUsers = filteredUsers.filter(u => u.roles?.includes(req.query.role as string));
}
```

### Verification for Task 5.3
1. Run: `npm run test:smoke`
2. In ops portal, navigate to batch list — should load with pagination
3. Navigate to admin users list — should paginate correctly
4. Create/edit a batch — instructor dropdown should populate

---

## Task 5.4: Wrap Order-Swap Operations in Transactions

### Problem

**File**: `server/modules/content-publishing/service.ts`

`moveTrack()` and `moveChapter()` perform two separate UPDATEs to swap order values. A crash between the two operations corrupts ordering.

**Before** (moveTrack):
```typescript
await this.storage.updateTrack(trackId, { order: previousTrack.order });
await this.storage.updateTrack(previousTrack.id, { order: currentTrack.order });
```

**After**:
```typescript
import { db } from '../../db';

// Use a transaction for atomic order swap
await db.transaction(async (tx) => {
    await tx.update(tracks).set({ order: previousTrack.order }).where(eq(tracks.id, trackId));
    await tx.update(tracks).set({ order: currentTrack.order }).where(eq(tracks.id, previousTrack.id));
});
```

Apply the same transaction pattern to `moveChapter()`.

**Note**: The storage methods currently handle the updates. You may need to create a new storage method `swapOrder(id1, order1, id2, order2)` that wraps both updates in a transaction, or do the transaction directly in the service layer using the `db` import.

### Verification for Task 5.4
1. Run: `npm run test:content`
2. In the ops portal Content Studio, reorder tracks using drag-and-drop — should work correctly
3. Reorder chapters — should work correctly

---

## Task 5.5: Remove Duplicate Route Handlers

### Problem

**File**: `server/routes/content.routes.ts`

Several routes are duplicated (legacy + new):
- `DELETE /chapters/:id` and `DELETE /chapters/:chapterId` — identical routes, Express treats them the same
- `POST /chapters` and `POST /tracks/:trackId/chapters` — same operation, different URLs
- `GET /chapters/:trackId` (legacy) and `GET /tracks/:trackId/chapters` (new) — same data

### Solution

Keep only the new RESTful routes and remove the legacy aliases. Update any frontend code that uses the legacy endpoints.

**Routes to remove** (legacy):
```
DELETE: router.post('/chapters', ...)  — replace with router.post('/tracks/:trackId/chapters', ...)
DELETE: router.get('/chapters/:trackId', ...)  — replaced by router.get('/tracks/:trackId/chapters', ...)
DELETE: second router.delete('/chapters/:chapterId', ...)  — keep only the first one
DELETE: router.patch('/segments/:chapterId/reorder', ...)  — replaced by router.post('/chapters/:chapterId/segments/reorder', ...)
```

**Important**: Before removing, search both portals for any fetch calls using the legacy URLs:
```bash
rg "/chapters/" apps/ --files-with-matches
rg "/segments/" apps/ --files-with-matches
```

Update any frontend code to use the new URLs before removing the legacy routes.

### Verification for Task 5.5
1. Run: `npm run test:smoke`
2. Run: `npm run test:content`
3. Content Studio operations (create/edit/delete chapters, reorder) should all work

---

## Task 5.6: Clean Up Dead Exports from `@narada/types`

### Problem

16+ type exports from `packages/types/src/types.ts` are never imported anywhere.

### Step 1: Audit each export

Run these searches for each type:
```bash
rg "UserWithRoles" apps/ packages/ui/ server/
rg "TrackWithChapters" apps/ packages/ui/ server/
rg "ChapterWithProgress" apps/ packages/ui/ server/
rg "StudentStats" apps/ packages/ui/ server/
rg "DashboardProps" apps/ packages/ui/ server/
rg "TrackCardProps" apps/ packages/ui/ server/
rg "MultiScriptContent" apps/ packages/ui/ server/
rg "CreateTrackRequest" apps/ packages/ui/ server/
rg "CreateChapterRequest" apps/ packages/ui/ server/
rg "UpdateChapterRequest" apps/ packages/ui/ server/
rg "ApiErrorResponse" apps/ packages/ui/ server/
rg "ApiSuccessResponse" apps/ packages/ui/ server/
rg "GetStudentDetailsResponse" apps/ packages/ui/ server/
rg "StudentEnrollment" apps/ packages/ui/ server/
rg "GetMyStudentsResponse" apps/ packages/ui/ server/
```

### Step 2: Remove unused types

For each type that returns zero results (excluding its own definition), remove it from `types.ts`.

**Important**: Some types may become useful in future phases (Stage 2/3). If a type is clearly forward-looking (like `ApiErrorResponse` or request/response types), consider keeping it with a `/** @future Stage 2 */` comment instead of deleting.

### Verification for Task 5.6
1. Run: `cd packages/types && npx tsc --noEmit`
2. Run: `cd apps/student-portal && npx tsc --noEmit`
3. Run: `cd apps/ops-portal && npx tsc --noEmit`

---

## Task 5.7: Clean Up ESLint Configuration

### Problem

- `@narada/eslint-config` disables `react/jsx-key` globally (catches real bugs in `.map()`)
- `typescript-eslint` is listed as a dependency but never configured
- Neither portal actually uses `@narada/eslint-config`

### Step 1: Update `@narada/eslint-config`

**File**: `packages/eslint-config/index.js`

**Before**:
```javascript
module.exports = [
    ...compat.extends("next/core-web-vitals", "turbo", "prettier"),
    {
        rules: {
            "@next/next/no-html-link-for-pages": "off",
            "react/jsx-key": "off",
        },
    },
];
```

**After**:
```javascript
module.exports = [
    ...compat.extends("next/core-web-vitals", "turbo", "prettier"),
    {
        rules: {
            "@next/next/no-html-link-for-pages": "off",
            // react/jsx-key is enabled (default) to catch missing keys in .map()
        },
    },
];
```

### Step 2: Consider adopting `@narada/eslint-config` in portals

This is optional for now. The portals use `eslint-config-next` directly, which is fine. Revisit during Stage 2 when branding may require shared lint rules.

### Verification for Task 5.7
1. Run: `npm run lint` from root — note any new errors from re-enabled `jsx-key` rule
2. Fix any legitimate missing key props in `.map()` calls

---

## Task 5.8: Remove Dead Server Code and Fix Root Type Errors

### Items to Remove or Fix

1. **`server/modules/identity-access/types.ts`**: Remove `UserWithoutPassword` (Omit is a no-op — `User` has no `passwordHash` field). Remove `Session` interface (dead code from session-based auth).

2. **`server/modules/system-admin/storage.ts`**: The `getSystemStats()` method returns `activeBatches` and `totalBatches` as the same value (no status column on batches). Add a comment explaining this or remove `activeBatches` until a status column is added.

3. **`server/monitoring/DatabaseMonitor.ts`**: If it imports from `@shared/monitoring/PerformanceMonitor` which doesn't exist, either fix the import or delete the file if monitoring is not active.

4. **Deprecated csurf**: The `csurf` package is deprecated. For now, add a comment noting it should be replaced. Full replacement is a Stage 2 concern. Add to `server/index.ts`:
   ```typescript
   // TODO: Replace deprecated csurf with csrf-csrf or lusca before production deployment
   ```

### Root Server Type Fixes (required for `npx tsc --noEmit` and verify)

5. **Missing type declarations**: Install or add declarations so the root TypeScript build passes:
   - `npm i --save-dev @types/cookie-parser @types/csurf` if they exist; otherwise add a root `types/env.d.ts` (or similar) with `declare module 'cookie-parser';` and `declare module 'csurf';`.

6. **`server/auth/jwt.utils.ts`**: The `jsonwebtoken.sign()` call with `expiresIn` — ensure the options object matches the correct overload (e.g. use `SignOptions` and a valid `expiresIn` value type). If using an older `@types/jsonwebtoken`, consider upgrading or casting.

7. **`server/auth/passport-config.ts`**: The Google OAuth strategy verify callback has signature `(accessToken, refreshToken, profile, done)`. Newer `passport-google-oauth20` expects `(req, accessToken, refreshToken, params, profile, done)`. Either use the correct 6-argument signature and pass `done` as the last parameter, or cast the callback. Ensure `done` is typed as `VerifyCallback` (e.g. `(err?: any, user?: any) => void`), not `Profile`.

8. **`server/index.ts`**: If `req.csrfToken` is used, ensure `@types/csurf` extends Express Request, or add a declaration that adds `csrfToken?: () => string` to `Express.Request`.

### Verification for Task 5.8
1. Run: `npx tsc --noEmit` from root — must pass
2. Run: `npm run test:smoke`
3. Run: `npm run verify` — must pass

---

## Task 5.9 (Optional): Phase 4 Task 4.5 Leftovers

These items were listed in Phase 4 Task 4.5 but are non-blocking. Complete them in Phase 5 if time permits:

1. **`apps/student-portal/src/lib/matrix-utils.ts`**: Audit and remove unused exported functions. Only `getCellColor` and `getProficiencyLabel` are used in the student portal; consider removing the rest or moving shared ones to `@narada/types` (Phase 4 already added `getProficiencyLabel` and `getProficiencyStatus` to types).

2. **`apps/student-portal/src/components/learning/LearnChapter.tsx`**: The `onCreateSegment={() => { }}` no-op — either hide the create-segment button or implement the handler.

3. **`apps/student-portal/src/components/common/AudioPlayerControls.tsx`**: Playback rate dropdown is cosmetic (not wired). Either wire `playbackRate` state and `previewAudioRef.current.playbackRate` in LearnChapter, or remove the dropdown.

4. **`apps/ops-portal/src/components/batches/MatrixEvaluationModal.tsx`**: Remove the "thinking aloud" comments (lines ~35–48) about pre-populating notes and relaxing the level check.

### Verification for Task 5.9
- No new type or lint errors; portals and verify still pass.

---

## Phase 5 Completion Checklist

- [ ] Phase 4 wrap-up: `shared/utils/text-segmentation.ts` and ops-portal TextSegment types fixed (if not done in Phase 4)
- [ ] Phase 4 wrap-up: Root server type errors fixed (if not done in Phase 4)
- [ ] N+1 query fixed in `getAllTracks()` — uses LEFT JOIN
- [ ] N*M query fixed in `getChaptersByTrack()` — uses bulk queries
- [ ] Database-level pagination for batches
- [ ] Database-level pagination for users
- [ ] Instructor search uses server-side role filter
- [ ] Order swap operations wrapped in transactions
- [ ] Duplicate legacy routes removed
- [ ] Dead type exports removed from `@narada/types`
- [ ] ESLint `react/jsx-key` re-enabled
- [ ] Dead server code cleaned up; root `npx tsc --noEmit` passes
- [ ] (Optional) Phase 4 Task 4.5 leftovers completed (Task 5.9)
- [ ] `npm run verify` passes
- [ ] All work committed on `hardening-phase-5`

---

## Merge (end of Phase 5)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-5 --no-ff -m "Merge hardening-phase-5: Performance and code quality"
git tag hardening-phase-5-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 6](phase-6-deployment-readiness.md): create `hardening-phase-6` from `hardening` when starting Phase 6.
