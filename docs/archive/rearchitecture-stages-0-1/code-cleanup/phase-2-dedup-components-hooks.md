# Phase 2: Consolidate Duplicate Components and Hooks

**Branch:** `cleanup-phase-2` from `cleanup`
**Risk:** Medium — moving shared components, must update all consumers
**Estimated effort:** 3–4 hours
**Prerequisites:** Phase 1 complete (`shared/` fully eliminated, `cleanup-phase-1` merged into `cleanup`)

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-2): <what was done>`
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
git checkout -b cleanup-phase-2
```

---

## Strategy for Every Consolidation

Follow this exact order for each duplicate:

1. **Create** the canonical version in `packages/ui`
2. **Export** from the appropriate barrel file
3. **Update Portal A** imports (verify tsc passes)
4. **Update Portal B** imports (verify tsc passes)
5. **Delete** both portal copies
6. **Commit**

This ensures at least one portal is always working at every intermediate step.

---

## Task 2.1: Set Up Shared Directories

Create these directories and barrel files:

```
packages/ui/src/components/batches/index.ts
packages/ui/src/components/common/           (may already exist)
packages/ui/src/contexts/
packages/ui/src/hooks/data/index.ts
```

For each `index.ts` barrel file, start with an empty file — exports will be added as components are moved in subsequent tasks.

Add to `packages/ui/src/components/index.ts`:
```typescript
export * from "./batches";
```

**Commit:** `cleanup(phase-2): create shared directories for batch components and data hooks`

---

## Task 2.2: Consolidate `AudioPlayerControls`

**Source files (identical):**
- `apps/student-portal/src/components/common/AudioPlayerControls.tsx`
- `apps/admin-portal/src/components/common/AudioPlayerControls.tsx`

**Steps:**
1. Read both files and confirm they are identical
2. Copy student-portal version to `packages/ui/src/components/common/AudioPlayerControls.tsx`
3. Ensure `"use client"` directive is present at top
4. Add export to `packages/ui/src/components/index.ts`: `export * from "./common/AudioPlayerControls";`
5. In student-portal, update imports from `@/components/common/AudioPlayerControls` to `import { AudioPlayerControls } from "@narada/ui";`
6. Verify: `npx tsc --noEmit`
7. In admin-portal, update imports similarly
8. Verify: `npx tsc --noEmit`
9. Delete both portal copies

**Commit:** `cleanup(phase-2): consolidate AudioPlayerControls into @narada/ui`

---

## Task 2.3: Consolidate `TrackTabs`

**Source files (diff: empty state message text only):**
- `apps/student-portal/src/components/batches/TrackTabs.tsx`
- `apps/admin-portal/src/components/batches/TrackTabs.tsx`

**Steps:**
1. Read both files and identify the text difference
2. Copy admin-portal version to `packages/ui/src/components/batches/TrackTabs.tsx`
3. Add an optional prop `emptyMessage?: string` with a sensible default to handle the text difference
4. Ensure `"use client"` directive is present
5. Export from `packages/ui/src/components/batches/index.ts`
6. Update student-portal imports, passing custom `emptyMessage` if needed
7. Verify: `npx tsc --noEmit`
8. Update admin-portal imports
9. Verify: `npx tsc --noEmit`
10. Delete both portal copies

**Commit:** `cleanup(phase-2): consolidate TrackTabs into @narada/ui`

---

## Task 2.4: Consolidate `BatchDetailsCard`

**Source files (diff: minor formatting, both import `formatDate`):**
- `apps/student-portal/src/components/batches/BatchDetailsCard.tsx`
- `apps/admin-portal/src/components/batches/BatchDetailsCard.tsx`

**Steps:**
1. Read both files. Use admin-portal version as canonical (better formatting)
2. Copy to `packages/ui/src/components/batches/BatchDetailsCard.tsx`
3. Ensure `"use client"` directive is present
4. Update `formatDate` import to use `@narada/types` (should already be correct from Phase 1)
5. Export from `packages/ui/src/components/batches/index.ts`
6. Update student-portal imports → verify
7. Update admin-portal imports → verify
8. Delete both portal copies

**Commit:** `cleanup(phase-2): consolidate BatchDetailsCard into @narada/ui`

---

## Task 2.5: Consolidate `UnifiedBatchMatrix`

**Source files (diff: comments only):**
- `apps/student-portal/src/components/batches/UnifiedBatchMatrix.tsx`
- `apps/admin-portal/src/components/batches/UnifiedBatchMatrix.tsx`

Same pattern as Task 2.4. Use admin-portal version (more documented).

**Commit:** `cleanup(phase-2): consolidate UnifiedBatchMatrix into @narada/ui`

---

## Task 2.6: Consolidate `MatrixEvaluationModal`

**Source files (diff: formatting only):**
- `apps/student-portal/src/components/batches/MatrixEvaluationModal.tsx`
- `apps/admin-portal/src/components/batches/MatrixEvaluationModal.tsx`

Same pattern. Use admin-portal version.

**Commit:** `cleanup(phase-2): consolidate MatrixEvaluationModal into @narada/ui`

---

## Task 2.7: Consolidate `batches/types.ts` and `batches/utils.ts`

**types.ts:**
- Student-portal: `apps/student-portal/src/components/batches/types.ts` (73 lines, basic types)
- Admin-portal: `apps/admin-portal/src/components/batches/types.ts` (92 lines, includes extra `Batch`, `EligibleStudent`)
- Use admin-portal version as canonical (superset). Move to `packages/ui/src/components/batches/types.ts`.

**utils.ts:**
- Functionally identical between portals.
- Move to `packages/ui/src/components/batches/utils.ts`.

**Steps:**
1. Copy admin-portal `types.ts` to `packages/ui/src/components/batches/types.ts`
2. Copy either portal's `utils.ts` to `packages/ui/src/components/batches/utils.ts`
3. Export from `packages/ui/src/components/batches/index.ts`
4. Update both portals' imports
5. Delete both portal copies

**Commit:** `cleanup(phase-2): consolidate batch types and utils into @narada/ui`

---

## Task 2.8: Consolidate `ContentContextLabelContext.tsx`

**Source files (functionally identical):**
- `apps/student-portal/src/lib/learning/ContentContextLabelContext.tsx`
- `apps/admin-portal/src/lib/content/context/ContentContextLabelContext.tsx`

**Steps:**
1. Read both and confirm they are functionally identical
2. Copy to `packages/ui/src/contexts/ContentContextLabelContext.tsx`
3. Add export to `packages/ui/src/index.ts`: `export * from "./contexts/ContentContextLabelContext";`
4. Update student-portal imports → verify
5. Update admin-portal imports → verify
6. Delete both portal copies

**Commit:** `cleanup(phase-2): consolidate ContentContextLabelContext into @narada/ui`

---

## Task 2.9: Consolidate 8 Identical Data-Fetching Hooks

These hooks are nearly identical between portals (only `"use client"` directives and quote style differ). Move them to `packages/ui/src/hooks/data/`.

**Hooks to move:**

| Hook | Student-Portal Path | Admin-Portal Path |
|------|-------------------|-----------------|
| `useBatch` | `src/lib/hooks/useBatch.ts` | `src/lib/hooks/useBatch.ts` |
| `useBatchProgress` | `src/lib/hooks/useBatchProgress.ts` | `src/lib/hooks/useBatchProgress.ts` |
| `useChaptersByTrack` | `src/lib/hooks/useChaptersByTrack.ts` | `src/lib/hooks/useChaptersByTrack.ts` |
| `useTracks` | `src/lib/hooks/useTracks.ts` | `src/lib/hooks/useTracks.ts` |
| `useTrackProgress` | `src/lib/hooks/useTrackProgress.ts` | `src/lib/hooks/useTrackProgress.ts` |
| `useStudentDetails` | `src/lib/hooks/useStudentDetails.ts` | `src/lib/hooks/useStudentDetails.ts` |
| `useUpdateProficiency` | `src/lib/hooks/useUpdateProficiency.ts` | `src/lib/hooks/useUpdateProficiency.ts` |
| `useMyStudents` | `src/lib/hooks/useMyStudents.ts` | `src/lib/hooks/useMyStudents.ts` |

**For each hook:**

1. Use the **student-portal** version as canonical (has `"use client"` and uses `unknown` types)
2. Copy to `packages/ui/src/hooks/data/<hookName>.ts`
3. **Critical import change:** Each hook imports `apiRequest` from `@/lib/api` (a portal-local alias). Change this to:
   ```typescript
   import { apiRequest } from "@narada/api-client";
   ```
4. Ensure `"use client"` directive is at the top
5. Export from `packages/ui/src/hooks/data/index.ts`

**Before moving hooks:** Verify `packages/ui/package.json` has `@narada/api-client` and `@tanstack/react-query` as dependencies. If not, add them.

After all 8 hooks are in `packages/ui/src/hooks/data/`, update `packages/ui/src/hooks/index.ts`:
```typescript
export * from "./data"
```

Then update both portals to import from `@narada/ui` instead of their local `lib/hooks/` paths, and delete all 16 portal copies (8 per portal).

**Verify:** `npx tsc --noEmit` and `npx turbo run build` after all hook migrations.

**Commit:** `cleanup(phase-2): consolidate 8 identical data-fetching hooks into @narada/ui`

---

## Task 2.10: Handle 4 Different Hooks (Partial Consolidation)

These hooks differ meaningfully between portals. Extract ONLY the shared query logic.

### `useBatches.ts`

- **Shared:** The `useBatches()` query hook is identical in both portals.
- **Admin-only:** `useCreateBatch()`, `useUpdateBatch()`, `useDeleteBatch()` exist only in admin.
- **Student-portal issue:** Has unused imports (`useMutation`, `useQueryClient`).

**Action:**
1. Move the shared `useBatches()` query to `packages/ui/src/hooks/data/useBatches.ts` (use student-portal version, change `apiRequest` import to `@narada/api-client`, remove unused `useMutation`/`useQueryClient` imports)
2. In admin-portal, keep `apps/admin-portal/src/lib/hooks/useBatches.ts` but change it to:
   - Re-export the shared hook: `export { useBatches, type Batch, type BatchPaginationParams } from "@narada/ui";`
   - Keep only the admin-specific mutations (`useCreateBatch`, `useUpdateBatch`, `useDeleteBatch`)
3. In student-portal, update imports to use `@narada/ui` and delete the local file

### `useBatchRelations.ts`

- **Shared queries:** `useCoInstructors`, `useInstructors`, `useEnrollments`, `useEligibleStudents`, `useDropEnrollment`
- **Admin-only mutations:** `useAssignCoInstructor`, `useRemoveCoInstructor`, `useEnrollStudent`
- **Type difference:** Student-portal uses `unknown` with type guards; admin uses `any`.

**Action:**
1. Move the shared queries to `packages/ui/src/hooks/data/useBatchRelations.ts` using the student-portal version (uses `unknown`, which is the correct pattern)
2. Change `apiRequest` import to `@narada/api-client`
3. In admin-portal, keep local file with only the admin-specific mutations, re-export shared hooks
4. In student-portal, update imports and delete local file

### `useAuth.ts` and `useRoleGuard.ts`

**DO NOT consolidate.** These have portal-specific redirect logic that must remain different:
- Student-portal `useRoleGuard` redirects to `/` and `/vedic-learning`
- Admin-portal `useRoleGuard` redirects to `/login` and `/unauthorized`

Keep separate in each portal. No changes needed.

**Commit:** `cleanup(phase-2): extract shared query hooks from useBatches and useBatchRelations`

---

## Phase 2 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-2 --no-ff -m "Merge cleanup-phase-2: consolidate duplicate components and hooks"
git tag cleanup-phase-2-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Start all 3 services and verify:
- Student portal login page loads and navigation works
- Admin portal login page loads and navigation works
- Batch details pages load with proficiency matrix in both portals
- Content studio loads in admin portal
- API endpoints return data correctly

### Summary of Changes

- 6 component pairs consolidated into `packages/ui/src/components/`
- 10 data-fetching hooks consolidated into `packages/ui/src/hooks/data/`
- 2 supporting files (types.ts, utils.ts) consolidated
- 1 context (ContentContextLabelContext) consolidated
- ~3,600 lines of duplicate code eliminated
- Zero behavior changes
