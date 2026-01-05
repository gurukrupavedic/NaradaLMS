# Component Migration Cleanup Checklist

**Goal:** Ensure NO mock/prototype code creeps into production  
**Status:** Pre-migration audit completed

---

## ✅ Components That Are CLEAN (Safe to Copy As-Is)

### 1. **TrackCard.tsx** - ✅ CLEAN
- **Dependencies:** Only imports production files (Accordion, Progress, TrackProgress interface)
- **Data handling:** Pure functional component, receives `track` prop
- **Side effects:** None
- **Mock/Debug code:** None
- **Action:** Copy directly to `instructor/components/student-progress/`
- **Import updates needed:** Update `from './types'` → `from '@shared/types'`

### 2. **ChapterList.tsx** - ✅ CLEAN
- **Dependencies:** Only imports ChapterItem, ChapterProgress
- **Data handling:** Pure functional component, receives `chapters` array prop
- **Side effects:** None
- **Mock/Debug code:** None
- **Empty state:** Has one (`No chapters found`) - appropriate, keep it
- **Action:** Copy directly
- **Import updates needed:** Update `from './types'` → `from '@shared/types'`

### 3. **ChapterItem.tsx** - ✅ CLEAN
- **Dependencies:** Only imports real utilities (date-fns, lucide, Tooltip, getCellColor, getProficiencyLabel)
- **Data handling:** Pure functional component, receives `chapter` prop
- **Side effects:** None
- **Mock/Debug code:** None
- **Hardcoded values:** None
- **Action:** Copy directly
- **Import updates needed:** 
  - `from './types'` → `from '@shared/types'`
  - `from '@/new-ui/batches/utils/matrix-utils'` → stays the same ✓

### 4. **TrackList.tsx** - ✅ CLEAN (mostly)
- **Dependencies:** Only imports Accordion, TrackProgress, TrackCard
- **Data handling:** Pure functional component, receives `tracks` array prop
- **Smart default logic:** Opens first incomplete track - KEEP (good UX)
- **Mock/Debug code:** None
- **Action:** Copy directly
- **Import updates needed:** Update `from './types'` → `from '@shared/types'`

---

## ❌ Components That MUST NOT BE COPIED

### StudentProgressTracker.tsx - ❌ DO NOT COPY
**Why:** This is the prototype wrapper - contains:
- ✗ Mock data import: `import { MOCK_STUDENT_PROGRESS } from './mock-data'`
- ✗ useState/useEffect for simulating API: `const [data, setData] = useState<StudentProgressData | null>(null)`
- ✗ Hardcoded setTimeout delay: `const timer = setTimeout(() => { ... }, 500)`
- ✗ Prototype banner: "🚧 PROTOTYPE MODE: Showing mock data for UI visualization"
- ✗ Container styling specific to prototype: `animate-in fade-in duration-500`
- ✗ Manual loading state management (will use TanStack Query instead)

**Instead:** Integration logic goes directly into `StudentDetailsPage.tsx`

### mock-data.ts - ❌ DO NOT COPY
**Why:** Pure mock data file, ZERO production value
- All hardcoded student/track/chapter data
- Only useful for prototype testing
- Will be replaced by real API data from `useTrackProgress` hook

### types.ts - ⚠️ PARTIALLY (Migrate to shared/types.ts)
**Why:** Types are needed but should live in `shared/types.ts`
- Move types to shared (already planned in analysis doc)
- Do NOT copy the file itself
- Remove temporary `Student` interface from types.ts (use existing types in shared)
- Keep only the core interfaces:
  - `ChapterProgress`
  - `TrackProgress`
  - `StudentProgressData`

---

## 🔍 Code Review Checklist (Before Copying Each File)

### For Each Component File, Verify:

**TrackCard.tsx**
- [ ] No imports from `./mock-data`
- [ ] No useState/useEffect hooks
- [ ] No hardcoded test data
- [ ] No console.logs or debugger statements
- [ ] No localStorage/sessionStorage access
- [ ] Only receives data via props (`track: TrackProgress`)
- [ ] All dependencies are production-safe

**ChapterList.tsx**
- [ ] No imports from `./mock-data`
- [ ] No useState/useEffect hooks
- [ ] Only receives data via props (`chapters: ChapterProgress[]`)
- [ ] Empty state is legitimate (not a debug message)
- [ ] All imports reference real utilities

**ChapterItem.tsx**
- [ ] No imports from `./mock-data`
- [ ] No useState/useEffect hooks
- [ ] No hardcoded proficiency levels or chapter data
- [ ] Uses `getCellColor()` from matrix-utils (correct path)
- [ ] Uses `getProficiencyLabel()` from matrix-utils (correct path)
- [ ] Tooltip logic is clean (conditional on data presence)
- [ ] Date formatting via date-fns (correct library)

**TrackList.tsx**
- [ ] No imports from `./mock-data`
- [ ] No useState/useEffect hooks
- [ ] Smart default (opens first incomplete) is intentional - KEEP
- [ ] Accordion logic is pure (no side effects)
- [ ] Only receives data via props (`tracks: TrackProgress[]`)

---

## 🛠️ Import Updates During Migration

**For each file, update these imports:**

### TrackCard.tsx
```typescript
// FROM:
import { TrackProgress } from './types';
import { ChapterList } from './ChapterList';

// TO:
import { TrackProgress } from '@shared/types';
import { ChapterList } from './ChapterList';
```

### ChapterList.tsx
```typescript
// FROM:
import { ChapterProgress } from './types';
import { ChapterItem } from './ChapterItem';

// TO:
import { ChapterProgress } from '@shared/types';
import { ChapterItem } from './ChapterItem';
```

### ChapterItem.tsx
```typescript
// FROM:
import { ChapterProgress } from './types';

// TO:
import { ChapterProgress } from '@shared/types';
```

### TrackList.tsx
```typescript
// FROM:
import { TrackProgress } from './types';
import { TrackCard } from './TrackCard';

// TO:
import { TrackProgress } from '@shared/types';
import { TrackCard } from './TrackCard';
```

---

## 📋 Post-Migration Verification

After copying components to production:

- [ ] All import paths updated and correct
- [ ] No remaining imports from `./types` or `./mock-data`
- [ ] No remaining imports from temp-prototype folder
- [ ] Run `npm run check` - **zero TypeScript errors**
- [ ] All four components export cleanly
- [ ] Component props match backend API response shape
- [ ] No console.logs or debug code
- [ ] No dead code or commented-out sections

---

## 🗑️ Cleanup After Migration

Once components are in production:

1. **Delete temp-prototype folder entirely:**
   ```bash
   rm -r client/src/temp-prototype/student-progress-tracker
   ```

2. **Verify temp-prototype is truly deleted:**
   ```bash
   # Should return no results:
   find . -name "student-progress-tracker" -type d
   ```

3. **Check for any remaining references to prototype:**
   ```bash
   # Should return no results:
   grep -r "temp-prototype/student-progress-tracker" src/
   ```

4. **Commit message:**
   ```
   chore: remove prototype folder after Phase D migration
   ```

---

## 🚨 Red Flags - If You See Any of These, STOP

- ❌ `import { MOCK_STUDENT_PROGRESS }` - Stop, don't copy
- ❌ `import { mock-data }` - Stop, don't copy
- ❌ `useState(` in component body - Stop, verify it's not needed
- ❌ `useEffect(` with mock data loading - Stop, don't copy
- ❌ `setTimeout(` in component - Stop, don't copy
- ❌ Hardcoded test data (e.g., `chapterCode: 'CH1'`) - Should be OK (data-driven)
- ❌ `localStorage.setItem()` - Stop, don't copy
- ❌ `sessionStorage.getItem()` - Stop, don't copy
- ❌ Prototype banner ("🚧 PROTOTYPE MODE") - Stop, don't copy
- ❌ `console.log()` or `debugger` - Stop, remove before copy
- ❌ Comments about mock data - Consider removing

---

## 🎯 Summary

**Safe to Copy (4 files):**
1. ✅ TrackList.tsx
2. ✅ TrackCard.tsx
3. ✅ ChapterList.tsx
4. ✅ ChapterItem.tsx

**Do NOT Copy (3 files):**
1. ❌ StudentProgressTracker.tsx (contains prototype logic)
2. ❌ mock-data.ts (pure test data)
3. ❌ types.ts (use shared/types.ts instead)

**Action Items:**
1. Update shared/types.ts with ChapterProgress, TrackProgress, StudentProgressData
2. Copy 4 component files with import updates
3. Integrate into StudentDetailsPage.tsx
4. Delete temp-prototype folder
5. Verify zero TypeScript errors and no mock imports remain
