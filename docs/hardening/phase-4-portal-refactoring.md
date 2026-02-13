# Phase 4: Portal Refactoring

> **Objective**: Deduplicate components across portals, consolidate the three near-identical ops-portal layouts, fix hooks, and remove dead code from portal codebases.
>
> **Prerequisites**: Phase 2 completed and merged into `hardening`. You must be on the `hardening` branch.
>
> **Risk**: Low. Component extraction doesn't change behavior.
>
> **Can run in parallel with**: Phase 3 (Server Hardening) — portal and server changes are independent.
>
> **Execution tip**: Doing Task 4.7 first (especially Step 0: fix `SidebarMenuButton` types) unblocks `npm run verify` and portal builds. The UI package currently has type errors that prevent both portals from building.

---

## Branch (start of Phase 4)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-4
```

All tasks and commits for Phase 4 happen on `hardening-phase-4`.

---

## Task 4.1: Consolidate Ops Portal Layouts into a Shared Component

### Problem

Three layout files are nearly identical:
- `apps/ops-portal/src/app/admin/layout.tsx` (50 lines)
- `apps/ops-portal/src/app/instructor/layout.tsx` (65 lines)
- `apps/ops-portal/src/app/content/layout.tsx` (48 lines)

They all: check auth, redirect if not logged in, compute portal roles, render `<AppShell>`.

### Solution

Create a shared `OpsLayout` component and use it in all three.

### Step 1: Create the shared layout component

**Create file**: `apps/ops-portal/src/components/layout/OpsLayout.tsx`

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppShell, UserRole } from "@narada/ui";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getOpsNavigationForRole, contextualNavigation } from "@/lib/ops-navigation-config";

interface OpsLayoutProps {
    children: ReactNode;
    /** If true, use the user's actual roles. If false, show all ops roles. */
    useActualRoles?: boolean;
    /** Whether to include contextual navigation (e.g., for instructor pages) */
    showContextualNav?: boolean;
}

export default function OpsLayout({
    children,
    useActualRoles = false,
    showContextualNav = false,
}: OpsLayoutProps) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Determine which roles to show in navigation
    let portalRoles: UserRole[];
    if (useActualRoles) {
        portalRoles = user.roles.filter((role: string) =>
            ['instructor', 'admin', 'content_manager'].includes(role)
        ) as UserRole[];
        if (portalRoles.length === 0) portalRoles = ['instructor'];
    } else {
        portalRoles = ['admin', 'instructor', 'content_manager'];
    }

    const opsNavigation = getOpsNavigationForRole(portalRoles);

    return (
        <AppShell
            user={user}
            userRoles={portalRoles}
            customNavigation={opsNavigation}
            contextualNavigation={showContextualNav ? contextualNavigation : undefined}
            onLogout={logout}
        >
            {children}
        </AppShell>
    );
}
```

### Step 2: Simplify each layout to use `OpsLayout`

**File**: `apps/ops-portal/src/app/admin/layout.tsx`

**After**:
```typescript
import OpsLayout from "@/components/layout/OpsLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <OpsLayout>{children}</OpsLayout>;
}
```

**File**: `apps/ops-portal/src/app/instructor/layout.tsx`

**After**:
```typescript
import OpsLayout from "@/components/layout/OpsLayout";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    return <OpsLayout useActualRoles showContextualNav>{children}</OpsLayout>;
}
```

**File**: `apps/ops-portal/src/app/content/layout.tsx`

**After**:
```typescript
import OpsLayout from "@/components/layout/OpsLayout";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
    return <OpsLayout>{children}</OpsLayout>;
}
```

### Verification for Task 4.1
1. Run: `cd apps/ops-portal && npx tsc --noEmit`
2. Start the ops portal
3. Navigate to `/admin`, `/instructor`, `/content` — all should load with correct navigation
4. Log out — should redirect to `/` (not localhost:5000)

---

## Task 4.2: Extract Shared Student Progress Components to `@narada/ui`

### Problem

These components exist as near-identical copies in both portals:
- `TrackCard` (student-portal `dashboard/student-progress/` and ops-portal `instructor/student-progress/`)
- `TrackList` (same locations)
- `ChapterItem` (same locations)
- `StudentDetailsCard` (student-portal `dashboard/` and ops-portal `instructor/`)

### Solution

Move the canonical version of each component to `packages/ui/src/components/` and import from `@narada/ui` in both portals.

### Step 1: Create student-progress components in the UI package

**Create directory**: `packages/ui/src/components/student-progress/`

Copy the **student-portal** versions (they tend to be cleaner) into the UI package:

**Create**: `packages/ui/src/components/student-progress/TrackList.tsx`
- Copy from: `apps/student-portal/src/components/dashboard/student-progress/TrackList.tsx`
- Update imports to use relative paths within the UI package (e.g., `../accordion` instead of `@narada/ui`)
- Import types from `@narada/types` (TrackProgress, ChapterProgress)

**Create**: `packages/ui/src/components/student-progress/TrackCard.tsx`
- Copy from: `apps/student-portal/src/components/dashboard/student-progress/TrackCard.tsx`
- Fix the `any` type on `onChapterClick` prop: change `chapter: any` to `chapter: ChapterProgress`
- Add division-by-zero guard: `const completionPercentage = track.totalChapters > 0 ? Math.round((track.completedChapters / track.totalChapters) * 100) : 0;`

**Create**: `packages/ui/src/components/student-progress/ChapterItem.tsx`
- Copy from: `apps/student-portal/src/components/dashboard/student-progress/ChapterItem.tsx`
- Remove the per-item `<TooltipProvider>` wrapping (it will be provided by the parent)

**Create**: `packages/ui/src/components/student-progress/ChapterList.tsx`
- Copy from: `apps/student-portal/src/components/dashboard/student-progress/ChapterList.tsx`
- Wrap the grid in a single `<TooltipProvider>` here (lifted from ChapterItem)

**Create**: `packages/ui/src/components/student-progress/index.ts`
```typescript
export { TrackList } from './TrackList';
export { TrackCard } from './TrackCard';
export { ChapterItem } from './ChapterItem';
export { ChapterList } from './ChapterList';
```

### Step 2: Export from UI package barrel

**File**: `packages/ui/src/components/index.ts`

Add:
```typescript
export * from "./student-progress";
```

### Step 3: Update both portals to import from `@narada/ui`

**Student Portal**: Update all imports of these components from local paths to `@narada/ui`:

```typescript
// BEFORE:
import { TrackList } from '@/components/dashboard/student-progress/TrackList';

// AFTER:
import { TrackList } from '@narada/ui';
```

Then delete the local copies:
```
DELETE: apps/student-portal/src/components/dashboard/student-progress/TrackCard.tsx
DELETE: apps/student-portal/src/components/dashboard/student-progress/TrackList.tsx
DELETE: apps/student-portal/src/components/dashboard/student-progress/ChapterItem.tsx
DELETE: apps/student-portal/src/components/dashboard/student-progress/ChapterList.tsx
```

**Ops Portal**: Same treatment:
```
DELETE: apps/ops-portal/src/components/instructor/student-progress/TrackCard.tsx
DELETE: apps/ops-portal/src/components/instructor/student-progress/TrackList.tsx
DELETE: apps/ops-portal/src/components/instructor/student-progress/ChapterItem.tsx
```

Update imports to use `@narada/ui`.

### Step 4: Extract `StudentDetailsCard` similarly

Create `packages/ui/src/components/student-progress/StudentDetailsCard.tsx` from the student-portal version. Export it. Update both portals to import from `@narada/ui`. Delete local copies.

### Verification for Task 4.2
1. Run: `cd packages/ui && npx tsc --noEmit`
2. Run: `cd apps/student-portal && npx tsc --noEmit`
3. Run: `cd apps/ops-portal && npx tsc --noEmit`
4. Start both portals — student progress views should render correctly in both
5. Verify: Student portal dashboard shows tracks/chapters with correct progress
6. Verify: Ops portal instructor → student detail page shows the same data correctly

---

## Task 4.3: Extract Shared `text-segmentation-utils` to a Package

### Problem

`apps/student-portal/src/lib/text-segmentation-utils.ts` is a 225-line copy-paste of `shared/utils/text-segmentation.ts`. The ops-portal imports from `@shared/utils/` (which may no longer exist after Phase 1).

### Solution

Move the utilities into `@narada/types` (they work closely with type definitions) or create a new `@narada/utils` package.

**Simpler option**: Add to `@narada/types` since the utils are type-adjacent.

### Step 1: Move text-segmentation utils to `@narada/types`

**Create file**: `packages/types/src/utils/text-segmentation.ts`

Copy the contents from `apps/student-portal/src/lib/text-segmentation-utils.ts` (or the original `shared/utils/text-segmentation.ts`). Ensure imports reference `@narada/types` internal paths.

### Step 2: Export from the types package

**File**: `packages/types/src/index.ts`

Add:
```typescript
export * from "./utils/text-segmentation";
```

### Step 3: Update both portals

**Student Portal**: Change imports from local util to `@narada/types`:
```typescript
// BEFORE:
import { getDisplayText, formatDuration } from '@/lib/text-segmentation-utils';

// AFTER:
import { getDisplayText, formatDuration } from '@narada/types';
```

Delete: `apps/student-portal/src/lib/text-segmentation-utils.ts`

**Ops Portal**: Update any imports from `@shared/utils/text-segmentation` to `@narada/types`.

### Verification for Task 4.3
1. Compile both portals without errors
2. Student portal chapter view should display text correctly

---

## Task 4.4: Fix Proficiency Status Mapping Duplication

### Problem

The proficiency-level-to-status mapping logic is duplicated in:
- `apps/student-portal/src/components/dashboard/student-progress/ChapterItem.tsx` (lines 30-44)
- `apps/student-portal/src/components/learning/LearnChapter.tsx` (lines 336-348)
- `apps/ops-portal/src/components/instructor/student-progress/ChapterItem.tsx`

### Solution

Create a shared utility function.

**Add to** `packages/types/src/constants.ts`:

```typescript
export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 8 | 9;

export type ProficiencyStatus = 'not_started' | 'absent' | 'practicing' | 'level_1' | 'level_2' | 'level_3' | 'certified';

export function getProficiencyStatus(level: number | null | undefined): ProficiencyStatus {
    if (level === null || level === undefined || level === 9) return 'not_started';
    if (level === 8) return 'absent';
    if (level === 0) return 'practicing';
    if (level === 1) return 'level_1';
    if (level === 2) return 'level_2';
    if (level === 3) return 'level_3';
    if (level === 4) return 'certified';
    return 'not_started';
}
```

Update the duplicated components to use this shared function instead of inline switch/if-else.

### Verification for Task 4.4
1. Compile all packages and portals
2. Chapter items should show correct proficiency badges in both portals

---

## Task 4.5: Remove Dead Code and Unused Imports from Portals

### Student Portal Dead Code

1. **`matrix-utils.ts`**: After Task 1.3 fixes the import, audit which functions are actually used. If only `getCellColor` and `getProficiencyLabel` are used, remove the other ~10 exported functions. Search with:
   ```bash
   rg "from.*matrix-utils" apps/student-portal/ --files-with-matches
   ```
   For each exported function, search for its usage. Remove unused ones.

2. **`StudentDetailsCard.tsx`**: Remove unused `User` import from lucide-react (line 3). Remove the unused `rollNumber` computation (lines 18-20).

3. **`SelectableTextPanel.tsx`**: Remove unused `X` import from lucide-react (line 3).

4. **`LearnChapter.tsx`**: 
   - Remove stale comment `// Removed wouter hooks` (line 85)
   - Remove the duplicate local type definitions (lines 21-79) and import from `@narada/types` instead
   - The `onCreateSegment={() => { }}` no-op should either be removed (hide the create button) or implemented

5. **Playback rate dropdown**: In `AudioPlayerControls.tsx`, the rate selector dropdown never actually changes the audio playback rate. Either:
   - Wire it up: In `LearnChapter.tsx`, when `playbackRate` state changes, set `previewAudioRef.current.playbackRate = rate`
   - Or remove the dropdown until it's properly implemented

### Ops Portal Dead Code

1. **QueryKeys (cosmetic)**: In `useBatchRelations.ts`, change `useInstructors` queryKey from `["/api/auth/admin/users?role=instructor"]` to `["/auth/admin/users?role=instructor"]`. In `useSearchStudents.ts`, change queryKey from `["/api/auth/admin/users?limit=100"]` to `["/auth/admin/users?limit=100"]`. These are cache keys only (no double-prefix bug), but consistency with other hooks avoids confusion.

2. **`OpsAuthPage.tsx`**: Remove unused imports: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `CardDescription`, `CardHeader`, `CardTitle`, `Label` (leftover from removed registration tab). Remove "CHANGE 1 & 2" comments.

3. **`instructor-student-list.tsx`**: Remove `console.log('First student data:', students[0])` (line 61-63).

4. **`batch-list.tsx`**: Remove the duplicate `import { useRouter } from "next/navigation"` (line 342). Remove stream-of-consciousness comments (lines 66-70).

5. **`ChapterItem.tsx` (ops)**: Remove the "thinking aloud" comment block (lines 35-48).

6. **`MatrixEvaluationModal.tsx`**: Remove commented-out import (line 8). Remove the comment about import limitations (line 34).

7. **`TrackTabs.tsx`**: Move the inline `<style>` CSS for scrollbar hiding to the `globals.css` file:
   ```css
   .scrollbar-hide::-webkit-scrollbar { display: none; }
   .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
   ```

### Both Portals

1. Remove placeholder links (`href="#"`) for Terms of Service and Privacy Policy in both auth pages. Replace with a comment or remove the text entirely.

2. **useAuth.ts**: The stale comment `// Updated to use the correct apiFetch from lib/api` was removed in Phase 2 — no action needed.

### Verification for Task 4.5
1. Run: `cd apps/student-portal && npx tsc --noEmit`
2. Run: `cd apps/ops-portal && npx tsc --noEmit`
3. Both portals should build and function identically

---

## Task 4.6: Clean Up Student Portal `tsconfig.json`

**File**: `apps/student-portal/tsconfig.json`

Currently overrides every option from the base config, making the `extends` meaningless.

**Before**:
```json
{
  "extends": "@narada/typescript-config/nextjs.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../shared/*"]
    }
  }
}
```

**After** (clean, relying on base config):
```json
{
  "extends": "@narada/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

Note: `@shared/*` path was removed in Phase 1.

### Verification for Task 4.6
1. Run: `cd apps/student-portal && npx tsc --noEmit` — should compile without errors
2. Run: `cd apps/student-portal && npm run build` — should build successfully

---

## Task 4.7: Fix `@narada/ui` Package Configuration

**Do this task early** — it fixes the type errors that currently block `npm run verify` and portal builds.

### Step 0: Fix `SidebarMenuButton` props type (build blocker)

**File**: `packages/ui/src/components/sidebar.tsx`

The `SidebarMenuButton` component destructures `variant` and `size` (used in the rendered button) but they are not declared on its props type. This causes:
- `sidebar.tsx(513,13): Property 'variant' does not exist`
- `sidebar.tsx(514,13): Property 'size' does not exist`
- `nav-user.tsx(53,29): Property 'size' does not exist` (when passing `size="lg"`)

**Fix**: Extend the props type so it includes `variant` and `size`. For example, change the type from:

```typescript
React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
}
```

to:

```typescript
React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
    variant?: "default" | "ghost" | "outline" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}
```

(Or use the same variant/size union types as your existing `Button` component if the UI package has one.) After this fix, `cd apps/student-portal && npx tsc --noEmit` and portal builds should pass.

### Step 1: Extend shared TypeScript config

**File**: `packages/ui/tsconfig.json`

**Before**:
```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "target": "es2017",
        "strict": false,
        "moduleResolution": "node",
        // ... many overrides
    }
}
```

**After**:
```json
{
    "extends": "@narada/typescript-config/base.json",
    "compilerOptions": {
        "baseUrl": ".",
        "jsx": "preserve",
        "moduleResolution": "bundler",
        "paths": {
            "@narada/ui/*": ["./src/*"]
        }
    },
    "include": ["src"],
    "exclude": ["node_modules"]
}
```

**Note**: Changing `strict: false` to `strict: true` (from base config) may surface type errors. Fix them one at a time:
- Add explicit types where `any` was implicit
- Add null checks where needed
- If the number of errors is very large (>50), consider keeping `strict: false` for now and enabling strictness in a future PR

### Step 2: Remove unused icon imports from `app-sidebar.tsx`

**File**: `packages/ui/src/components/layout/app-sidebar.tsx`

Remove unused imports (lines 3-15):
```typescript
// REMOVE:
import {
    BookOpen, Bot, Command, Frame, LifeBuoy,
    Map as MapIcon, PieChart, Send, Settings2, SquareTerminal,
} from "lucide-react"
```

Only keep icons that are actually used in the file.

### Step 3: Fix `icon` type in navigation config

**File**: `packages/ui/src/lib/navigation-config.ts`

**Before**:
```typescript
icon: any; // React.ElementType
```

**After**:
```typescript
icon: React.ComponentType<{ className?: string }>;
```

### Verification for Task 4.7
1. Run: `cd packages/ui && npx tsc --noEmit` — fix any type errors that arise
2. Both portals should still build and render correctly

---

## Phase 4 Completion Checklist

- [ ] Three ops-portal layouts consolidated into `OpsLayout` component
- [ ] Student progress components extracted to `@narada/ui`
- [ ] Local copies deleted from both portals
- [ ] `text-segmentation-utils` moved to `@narada/types`
- [ ] Proficiency status mapping centralized in `@narada/types`
- [ ] Dead code removed from student portal (unused imports, unreachable code, stale comments)
- [ ] Dead code removed from ops portal (unused imports, debug logs, stale comments)
- [ ] Student portal tsconfig cleaned up
- [ ] `@narada/ui` tsconfig updated
- [ ] Unused icon imports removed from UI package
- [ ] `npm run verify` passes
- [ ] Both portals build and function correctly
- [ ] All work committed on `hardening-phase-4`

---

## Phase 4 Wrap-Up (pre-existing fixes)

The following issues were identified during Phase 4 verification and fixed so that `npm run verify` and all builds pass. They are documented in Phase 5 as optional to re-do if merging Phase 4 before doing them:

1. **`shared/utils/text-segmentation.ts`**: Added `TextSegment` to the import from `../types/text-segmentation`.
2. **Ops-portal MappingTab / ProgressiveMapper**: Introduced `SegmentForMapper` (and `SegmentForDisplay` in `@narada/types` utils) so API response segments (`createdAt: string`, `script: string`) are accepted; updated FocusSessionSetup, FocusMappingView, SegmentMappingGrid to use it; relaxed `useMappingControls` to accept `SegmentWithId[]`.
3. **Root server type errors**: Added `server/types.d.ts` for `cookie-parser` and `csurf`; fixed `server/auth/jwt.utils.ts` sign options; fixed `server/auth/passport-config.ts` Google strategy callback signature (6-arg with `done`); fixed `server/index.ts` CSRF token access.
4. **MatrixEvaluationModal**: Removed "thinking aloud" comments (Task 4.5).

Optional leftovers for Phase 5 Task 5.9: matrix-utils unused function audit, LearnChapter `onCreateSegment` no-op, AudioPlayerControls playback rate wiring.

---

## Merge (end of Phase 4)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-4 --no-ff -m "Merge hardening-phase-4: Portal refactoring"
git tag hardening-phase-4-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 5](phase-5-performance.md): create `hardening-phase-5` from `hardening` when starting Phase 5 (Phase 3 may be merged in any order).
