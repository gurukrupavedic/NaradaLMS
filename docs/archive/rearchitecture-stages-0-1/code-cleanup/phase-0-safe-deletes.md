# Phase 0: Safe Deletes

**Branch:** `cleanup-phase-0` from `cleanup`
**Risk:** None — all files have zero imports/references confirmed by codebase-wide audit
**Estimated effort:** 30 minutes
**Prerequisites:** `cleanup` branch exists, branched from `main`

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-0): <what was done>`
6. **Verify after each task.** Run the verification command specified. If it fails, fix the issue before proceeding.
7. **Do NOT touch** any file not explicitly listed in this document.
8. **Do NOT modify** `packages/types/src/schema.ts`, database migrations, or any database-related code.

## Verification Commands (Run After Every Task)

```bash
# 1. Type check (must pass)
npx tsc --noEmit

# 2. Build check (must pass)
npx turbo run build
```

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-0
```

---

## Task 0.1: Delete Unused Files in Root `shared/`

Delete these 11 files. All have been confirmed to have zero imports across the entire codebase:

```
shared/schema.ts                                  # deprecated re-export of packages/types/src/schema.ts
shared/types.ts                                   # deprecated re-export of packages/types/src/types.ts
shared/constants.ts                               # deprecated re-export of packages/types/src/constants.ts
shared/utils/text-segmentation.ts                 # diverged duplicate (281 lines), zero imports
shared/types/text-segmentation.ts                 # duplicate of packages/types version, zero imports
shared/hooks/useAudioPlayer.ts                    # replaced by AudioPlayerContext.tsx, zero imports
shared/components/icons/ConnectedCirclesIcon.tsx   # zero imports
shared/components/icons/index.ts                  # zero imports
shared/utils/mapping-status.ts                    # zero imports
shared/monitoring/MetricsCollector.ts             # zero imports
shared/monitoring/types.ts                        # only imported by MetricsCollector (also being deleted)
```

**DO NOT delete these files** (they are still actively imported and will be migrated in Phase 1):
- `shared/utils/date.ts` — 6 active import sites
- `shared/components/LinkStatusIcon.tsx` — 2 active import sites
- `shared/hooks/useMappingControls.ts` — 1 active import site
- `shared/monitoring/PerformanceMonitor.ts` — 1 active import site (from file being deleted in Task 0.2)

After deleting:
- If `shared/components/icons/` is empty, delete the directory.
- If `shared/types/` is empty, delete the directory.
- Leave `shared/utils/`, `shared/components/`, `shared/hooks/`, and `shared/monitoring/` alone — they still have files needed for Phase 1.

**Verify:** `npx tsc --noEmit` passes with no import errors.

**Commit:** `cleanup(phase-0): delete 11 unused files from shared/`

---

## Task 0.2: Delete Dead Server Files

Delete these 3 files:

```
server/add-tracks-4-8.ts                        # one-off seed script (and its JSON asset; both removed from repo)
server/monitoring/DatabaseMonitor.ts             # not imported by any server code, monitoring not active
server/shared/monitoring/PerformanceMonitor.ts   # stub file, zero imports from any server code
```

After deleting:
- If `server/monitoring/` is now empty, delete the directory.

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-0): delete 3 dead server files`

---

## Task 0.3: Delete Dead Editor Files

Delete these 2 files:

```
packages/ui/src/editor/tiptap-editor/components/test-page.tsx              # placeholder test page ("Media Library not implemented"), zero imports
packages/ui/src/editor/tiptap-editor/components/controls/image-button.tsx  # replaced by image-button-2.tsx, zero imports
```

**Verify:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-0): delete dead editor test-page and old image-button`

---

## Task 0.4: Delete Obsolete Scripts

Delete these 2 files:

```
scripts/utils/test-session.ts           # tests old session-based auth, app uses JWT now
scripts/utils/verify-error-middleware.ts # unused test utility, zero references
```

**Verify:** No build verification needed (scripts are not part of build). Optionally confirm they are not referenced in `package.json` scripts.

**Commit:** `cleanup(phase-0): delete obsolete test-session and verify-error-middleware scripts`

---

## Task 0.5: Clean Commented-Out Code in Tiptap Editor

For each file below, remove **ONLY** the commented-out lines specified. Do **NOT** change any active (uncommented) code. Read each file before editing to confirm the commented code is at the expected lines.

### File 1: `packages/ui/src/editor/tiptap-editor/components/menus/image-menu/image-menu.tsx`
- **Remove lines 82–145:** Large commented-out `ImageMenu` component and `getImageOrFigureNode` function.
- These lines start with `// import React` and end with `//     node = selection.node;` area.

### File 2: `packages/ui/src/editor/tiptap-editor/extensions/image/image-figure.ts`
- **Remove lines 159–190:** Commented-out `imageFigureDragPlugin` function.
- These lines start with `// export function imageFigureDragPlugin`.

### File 3: `packages/ui/src/editor/tiptap-editor/components/menus/table-menu/table-menu.tsx`
- **Remove lines 67–186:** Large commented-out `TableMenu` component.
- These lines start with `// import React, { useCallback }` and end with `// export default TableMenu;`.

### File 4: `packages/ui/src/editor/tiptap-editor/extensions/youtube/youtube.ts`
- **Remove lines 87–100:** Commented-out `addNodeView()` method.
- Starts with `// addNodeView()`.

### File 5: `packages/ui/src/editor/tiptap-editor/extensions/image/image-caption.ts`
- **Remove lines 49–60:** Commented-out decoration code block.
- Starts with `// // Get image node`.

### File 6: `packages/ui/src/editor/tiptap-editor/components/provider.tsx`
- **Remove line 5:** `// import SourceEditor from "@/components/source-editor/editor";`

### File 7: `packages/ui/src/editor/tiptap-editor/components/controls/emoji-popover.tsx`
- **Remove lines 10–17:** Commented-out `handleSelect` callback.
- Starts with `// const { editor }`.

### File 8: `packages/ui/src/editor/tiptap-editor/extensions/index.ts`
- **Remove line 13:** `// import { CodeBlockShiki } from "./code-block-shiki";`
- **Remove lines 62–63:** `// CodeBlockLowlight,` and `// CodeBlockShiki,`
- **Remove lines 68–75:** Commented-out `placeholders` object starting with `// const placeholders:`.

### File 9: `packages/ui/src/editor/tiptap-editor/components/menu-bar.tsx`
- **Remove line 5:** `// import EmojiPopover from "./controls/emoji-popover";`
- **Remove line 14:** `// import TableButton from "./controls/table-button";`

### File 10: `packages/ui/src/editor/tiptap-editor/components/menus/code-block-menu/language-dropdown.tsx`
- **Remove line 3:** `// import { getSupportedLanguages } from "@/lib/lowlight";`

### File 11: `packages/ui/src/editor/tiptap-editor/components/table-builder.tsx`
- **Remove line 3:** `// import { PopoverClose } from "@radix-ui/react-popover";`

### File 12: `packages/ui/src/editor/tiptap-editor/components/emoji-picker/emoji-picker.tsx`
- **Remove line 8:** `// import type { EmojiItem } from "@tiptap/extension-emoji";`

**Verify:** `npx tsc --noEmit` and `npx turbo run build` pass.

**Commit:** `cleanup(phase-0): remove commented-out code from 12 tiptap editor files`

---

## Phase 0 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-0 --no-ff -m "Merge cleanup-phase-0: safe deletes"
git tag cleanup-phase-0-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Then start all 3 services and verify:
- Student portal login page loads at http://localhost:3000
- Admin portal login page loads at http://localhost:3001
- API returns 401 for `GET http://localhost:5000/api/auth/me`

### Summary of Changes

- 18 files deleted (11 shared/, 3 server/, 2 editor/, 2 scripts/)
- 12 editor files cleaned of commented-out code
- Zero behavior changes
