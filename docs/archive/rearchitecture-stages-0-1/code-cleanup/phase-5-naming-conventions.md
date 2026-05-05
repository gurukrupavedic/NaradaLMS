# Phase 5: Naming and Convention Standardization

**Branch:** `cleanup-phase-5` from `cleanup`
**Risk:** Low — file renames and type annotation updates
**Estimated effort:** 1 hour
**Prerequisites:** Phases 3 and 4 complete (all code moves finished before renaming)

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-5): <what was done>`
6. **Verify after each task.** Run the verification command specified. If it fails, fix the issue before proceeding.
7. **Do NOT touch** any file not explicitly listed in this document.

## Verification Commands (Run After Every Task)

```bash
npx tsc --noEmit
npx turbo run build
```

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-5
```

---

## Task 5.1: Rename Kebab-Case Component Files to PascalCase

The admin-portal has 6 component files using kebab-case naming. The convention across the rest of the codebase is PascalCase for component files. Rename them to be consistent.

**For each rename:**
1. Use `git mv` to rename the file (preserves git history)
2. Search for all imports that reference the old filename and update them
3. Run `npx tsc --noEmit` to verify

### Rename 1: `batch-list.tsx` → `BatchList.tsx`

```bash
git mv apps/admin-portal/src/components/admin/batch-list.tsx apps/admin-portal/src/components/admin/BatchList.tsx
```
Search for imports of `./batch-list` or `../admin/batch-list` and update to `./BatchList` or `../admin/BatchList`.

### Rename 2: `user-list.tsx` → `UserList.tsx`

```bash
git mv apps/admin-portal/src/components/admin/user-list.tsx apps/admin-portal/src/components/admin/UserList.tsx
```
Update imports accordingly.

### Rename 3: `instructor-batch-list.tsx` → `InstructorBatchList.tsx`

```bash
git mv apps/admin-portal/src/components/instructor/instructor-batch-list.tsx apps/admin-portal/src/components/instructor/InstructorBatchList.tsx
```
Update imports accordingly.

### Rename 4: `instructor-student-list.tsx` → `InstructorStudentList.tsx`

```bash
git mv apps/admin-portal/src/components/instructor/instructor-student-list.tsx apps/admin-portal/src/components/instructor/InstructorStudentList.tsx
```
Update imports accordingly.

### Rename 5: `track-list-item.tsx` → `TrackListItem.tsx`

```bash
git mv apps/admin-portal/src/components/content/track-list-item.tsx apps/admin-portal/src/components/content/TrackListItem.tsx
```
Update imports accordingly.

### Rename 6: `chapter-list-item.tsx` → `ChapterListItem.tsx`

```bash
git mv apps/admin-portal/src/components/content/chapter-list-item.tsx apps/admin-portal/src/components/content/ChapterListItem.tsx
```
Update imports accordingly.

**Verify after all 6 renames:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-5): rename 6 admin-portal component files to PascalCase`

---

## Task 5.2: Rename `image-button-2.tsx` to `image-button.tsx`

The original `image-button.tsx` was deleted in Phase 0. Now rename the replacement file.

```bash
git mv packages/ui/src/editor/tiptap-editor/components/controls/image-button-2.tsx packages/ui/src/editor/tiptap-editor/components/controls/image-button.tsx
```

Update the import in `packages/ui/src/editor/tiptap-editor/components/menu-bar.tsx`:

```typescript
// Old (around line 7):
import ImageButton from "./controls/image-button-2";

// New:
import ImageButton from "./controls/image-button";
```

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-5): rename image-button-2 to image-button`

---

## Task 5.3: Standardize `unknown` Over `any` for Error Types

The student-portal hooks use `apiRequest<unknown>` with explicit type guards (correct TypeScript practice). The admin-portal hooks use `apiRequest<any>` (less safe).

If `useBatchRelations` was partially consolidated in Phase 2, the admin-portal may still have a local file with mutations using `any`. Update it.

### In `apps/admin-portal/src/lib/hooks/useBatchRelations.ts` (if it still exists):

Replace all `apiRequest<any>` calls with `apiRequest<unknown>` and add type guards matching the student-portal pattern:

```typescript
// Old:
const res = await apiRequest<any>(`/batches/${batchId}/co-instructors`);
if (Array.isArray(res)) return res;
if (res.data && Array.isArray(res.data)) return res.data;

// New:
const res = await apiRequest<unknown>(`/batches/${batchId}/co-instructors`);
if (Array.isArray(res)) return res;
if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data))
    return (res as { data: CoInstructor[] }).data;
```

**DO NOT** change the logic, only the type annotations and type narrowing.

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-5): standardize unknown over any in admin-portal hooks`

---

## Task 5.4: Migrate Deprecated `AudioMapping` Type

The `AudioMapping` type in `packages/types/src/text-segmentation.ts` is marked `@deprecated` in favor of `SimplifiedMapping`.

### Step A: Verify Type Compatibility

Read `packages/types/src/text-segmentation.ts` and compare `AudioMapping` and `SimplifiedMapping`. Confirm they have the same fields (`segmentId`, `startTime`, `endTime`).

If `SimplifiedMapping` has the same shape, proceed. If the fields differ, **STOP** and report the discrepancy.

### Step B: Update 4 Files

In each file, change the import and all usages:

1. `apps/admin-portal/src/app/content/components/MappingTab/SegmentMappingGrid.tsx`
2. `apps/admin-portal/src/app/content/components/MappingTab/ProgressiveMapper.tsx`
3. `apps/admin-portal/src/app/content/components/MappingTab/FocusMappingView.tsx`
4. `apps/admin-portal/src/app/content/components/MappingTab/FocusSessionSetup.tsx`

For each file:
```typescript
// Old:
import { AudioMapping } from "@narada/types";

// New:
import { SimplifiedMapping } from "@narada/types";
```

Then find-and-replace `AudioMapping` with `SimplifiedMapping` in the file.

**Note:** The `useMappingControls` hook (migrated in Phase 1) also uses `AudioMapping`. If it was updated in Phase 1 to import from `@narada/types`, update it here too to use `SimplifiedMapping`. Check `packages/ui/src/hooks/use-mapping-controls.ts`.

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-5): migrate deprecated AudioMapping to SimplifiedMapping`

---

## Phase 5 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-5 --no-ff -m "Merge cleanup-phase-5: naming and convention standardization"
git tag cleanup-phase-5-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Start all 3 services and verify:
- Admin portal loads (all renamed components work)
- Content studio editor loads (renamed image-button works)
- Batch details pages work in both portals

### Summary of Changes

- 6 admin-portal component files renamed from kebab-case to PascalCase
- `image-button-2.tsx` renamed to `image-button.tsx`
- `any` type annotations standardized to `unknown` with type guards
- Deprecated `AudioMapping` type migrated to `SimplifiedMapping` in 4+ files
- Zero behavior changes
