# Phase 1: Migrate `shared/` to Packages

**Branch:** `cleanup-phase-1` from `cleanup`
**Risk:** Low — only updating import paths, no logic changes
**Estimated effort:** 1 hour
**Prerequisites:** Phase 0 complete (dead `shared/` files deleted, `cleanup-phase-0` merged into `cleanup`)

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-1): <what was done>`
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
git checkout -b cleanup-phase-1
```

---

## Context

After Phase 0, the root `shared/` directory has only 4 actively imported files remaining:

| File | Exported Symbol | Import Sites |
|------|----------------|-------------|
| `shared/utils/date.ts` | `formatDate`, `FormatDateOptions` | 6 files |
| `shared/components/LinkStatusIcon.tsx` | `LinkStatusIcon` | 2 files |
| `shared/hooks/useMappingControls.ts` | `useMappingControls` | 1 file |
| `shared/monitoring/PerformanceMonitor.ts` | `performanceMonitor` | 0 files (consumer deleted in Phase 0) |

The `@shared/*` path alias is configured in 3 tsconfig files to resolve to `../../shared/*`.

---

## Task 1.1: Migrate `formatDate` to `@narada/types`

### Step A: Create the Target File

Copy `shared/utils/date.ts` to `packages/types/src/utils/date.ts`.

The file content (33 lines) should be:

```typescript
export type FormatDateOptions = Intl.DateTimeFormatOptions;

const defaultOptions: FormatDateOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatDate(
  date: Date | string | number | null | undefined,
  locale?: string,
  options?: FormatDateOptions
): string {
  if (date == null) return "—";
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const loc = locale ?? "en-US";
  const opts = options ?? defaultOptions;
  return new Intl.DateTimeFormat(loc, opts).format(d);
}
```

### Step B: Add Export to Package Barrel

In `packages/types/src/index.ts`, append this line:

```typescript
export * from "./utils/date.js";
```

### Step C: Update All 6 Import Sites

For each file, replace the exact import statement:

| # | File Path | Line | Old Import | New Import |
|---|-----------|------|-----------|------------|
| 1 | `apps/student-portal/src/components/learning/LearnChapter.tsx` | 23 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |
| 2 | `apps/student-portal/src/components/batches/BatchDetailsCard.tsx` | 7 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |
| 3 | `apps/student-portal/src/components/instructor/InstructorStudentList.tsx` | 8 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |
| 4 | `apps/admin-portal/src/components/instructor/instructor-student-list.tsx` | 38 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |
| 5 | `apps/admin-portal/src/components/batches/BatchDetailsCard.tsx` | 10 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |
| 6 | `packages/ui/src/components/student-progress/StudentDetailsCard.tsx` | 7 | `import { formatDate } from "@shared/utils/date";` | `import { formatDate } from "@narada/types";` |

### Step D: Delete Source File

Delete `shared/utils/date.ts`. If `shared/utils/` is now empty, delete the directory.

### Verify

```bash
npx tsc --noEmit
# Confirm zero results:
rg "@shared/utils/date" apps/ packages/
```

**Commit:** `cleanup(phase-1): migrate formatDate from shared/ to @narada/types`

---

## Task 1.2: Migrate `LinkStatusIcon` to `@narada/ui`

### Step A: Create the Target File

Copy `shared/components/LinkStatusIcon.tsx` to `packages/ui/src/components/link-status-icon.tsx`.

The file content (32 lines) should be a React component that imports `Zap` from `lucide-react` and renders a status icon. Read it before copying to confirm.

### Step B: Add Export to Package Barrel

In `packages/ui/src/components/index.ts`, append:

```typescript
export * from "./link-status-icon";
```

### Step C: Update 2 Import Sites

| # | File Path | Line | Old Import | New Import |
|---|-----------|------|-----------|------------|
| 1 | `apps/admin-portal/src/components/common/SegmentCard.tsx` | 3 | `import { LinkStatusIcon } from "@shared/components/LinkStatusIcon";` | `import { LinkStatusIcon } from "@narada/ui";` |
| 2 | `apps/admin-portal/src/app/content/components/TextSegmentationTab/SegmentList.tsx` | 6 | `import { LinkStatusIcon } from '@shared/components/LinkStatusIcon';` | `import { LinkStatusIcon } from "@narada/ui";` |

### Step D: Delete Source File

Delete `shared/components/LinkStatusIcon.tsx`. If `shared/components/` is now empty, delete the directory.

### Verify

```bash
npx tsc --noEmit
rg "@shared/components" apps/ packages/
```

**Commit:** `cleanup(phase-1): migrate LinkStatusIcon from shared/ to @narada/ui`

---

## Task 1.3: Migrate `useMappingControls` to `@narada/ui`

### Step A: Create the Target File

Copy `shared/hooks/useMappingControls.ts` to `packages/ui/src/hooks/use-mapping-controls.ts`.

**Critical:** After copying, update the internal import on line 11 inside the new file:

```typescript
// Old (references sibling in shared/):
import type { AudioMapping } from '../types/text-segmentation';

// New (references the canonical package):
import type { AudioMapping } from '@narada/types';
```

### Step B: Add Export to Package Barrel

In `packages/ui/src/hooks/index.ts`, append:

```typescript
export * from "./use-mapping-controls"
```

### Step C: Update 1 Import Site

| # | File Path | Line | Old Import | New Import |
|---|-----------|------|-----------|------------|
| 1 | `apps/admin-portal/src/app/content/components/MappingTab/ProgressiveMapper.tsx` | 3 | `import { useMappingControls } from '@shared/hooks/useMappingControls';` | `import { useMappingControls } from "@narada/ui";` |

### Step D: Delete Source File

Delete `shared/hooks/useMappingControls.ts`. If `shared/hooks/` is now empty, delete the directory.

### Verify

```bash
npx tsc --noEmit
rg "@shared/hooks" apps/ packages/
```

**Commit:** `cleanup(phase-1): migrate useMappingControls from shared/ to @narada/ui`

---

## Task 1.4: Delete Remaining `shared/` and Remove Path Aliases

### Step A: Delete `shared/monitoring/PerformanceMonitor.ts`

Its only consumer (`server/monitoring/DatabaseMonitor.ts`) was deleted in Phase 0. This file now has zero imports.

### Step B: Delete the Entire `shared/` Root Directory

After steps A, all files should be gone. Delete the `shared/` directory. If any files remain, **STOP** and investigate — they should not exist.

### Step C: Remove `@shared/*` Path Alias from 3 TSConfig Files

In each of the following files, find the `compilerOptions.paths` section and remove the `"@shared/*": ["../../shared/*"]` entry:

1. `apps/admin-portal/tsconfig.json`
2. `apps/student-portal/tsconfig.json`
3. `packages/ui/tsconfig.json`

### Step D: Remove `shared` from Root `tsconfig.json` Include

Read `tsconfig.json` at the repo root. If `shared/**/*` appears in the `include` array, remove it.

### Verify

```bash
# All must pass:
npx tsc --noEmit
npx turbo run build

# All must return zero results:
rg "@shared" apps/ packages/
ls shared/  # Should error: directory does not exist
```

**Commit:** `cleanup(phase-1): delete shared/ directory and remove @shared path aliases`

---

## Phase 1 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-1 --no-ff -m "Merge cleanup-phase-1: shared/ migration"
git tag cleanup-phase-1-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Start all 3 services and verify:
- Student portal login page loads at http://localhost:3000
- Admin portal login page loads at http://localhost:3001
- API returns 401 for `GET http://localhost:5000/api/auth/me`

### Summary of Changes

- 4 files migrated from `shared/` to packages (3 active + 1 deleted)
- 9 import statements updated across apps and packages
- `shared/` root directory fully eliminated
- `@shared/*` path alias removed from 3 tsconfig files
- Zero behavior changes
