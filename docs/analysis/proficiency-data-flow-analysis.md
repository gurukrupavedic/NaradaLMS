# Proficiency Update Flow - What's Broken & How to Fix It
**Date:** January 1, 2026  
**Status:** 🔴 NOT WORKING  

---

## What You're Trying to Do

You want instructors to:
1. Click a student's cell in the matrix
2. Select a proficiency level (0-4)
3. See the cell update with the new color immediately

**Current Reality:** Nothing works because the backend crashes before it can even fetch the data.

---

## The Simple Version: 3 Main Problems

### Problem #1: Backend Code Confusion 🔥 **MUST FIX FIRST**
**What's happening:** The backend code is importing the same database tables in two different ways, and it's getting confused about which one to use. Think of it like having two different names for the same person - the code doesn't know which name to use and crashes.

**Where:** `server/modules/batch-cohort/storage.ts`

**The Fix:** Use only ONE way to import everything.

---

### Problem #2: Frontend Expects Wrong Data Shape 🔥
**What's happening:** Your frontend is like a mailbox expecting a letter, but the backend is sending a package. The shapes don't match.

**Example:**
- **Frontend expects:** A field called `lastUpdated` (as a Date)
- **Backend sends:** A field called `lastEvaluatedAt` (as a string)
- **Result:** Frontend crashes because it can't find what it's looking for

**The Fix:** Make the frontend expect what the backend actually sends.

---

### Problem #3: Data Gets Lost in Translation 🔥
**What's happening:** The data travels through 4 different "translators" between the database and your screen:
1. Database → Backend API
2. Backend API → Hook Transform
3. Hook Transform → Page Component  
4. Page Component → Matrix Display

Each translator changes the format slightly, and by step 3, some data is in the wrong place or missing entirely.

**The Fix:** Align all the translators to speak the same language.

---

## What Happens When You Click a Cell (The Journey)

```
👆 User clicks cell
   ↓
📝 Modal opens → User selects proficiency level
   ↓
💾 Save to database → ✅ THIS PART WORKS!
   ↓
🔄 Try to refresh the matrix
   ↓
💥 CRASH! Backend can't fetch updated data
```

**Why it crashes:** The backend gets confused when trying to read from the database because of the import problem (Problem #1 above).

---

## 🔴 Critical Issues

### Issue #1: Backend Drizzle ORM Crash (BLOCKER)
**Location:** `server/modules/batch-cohort/storage.ts:getBatchProgress()`  
**Error:** `TypeError: Cannot convert undefined or null to object at orderSelectedFields`

**Root Cause:**
The top-level imports at line 3 include `users, tracks, studentProgress, chapters` but these are used INCONSISTENTLY throughout the class:

```typescript
// Line 3: Top-level import
import { batches, enrollments, batchCoInstructors, users, tracks, studentProgress, chapters } from "@shared/schema";

// Line 408: getBatchProgress method - USES TOP-LEVEL IMPORTS
const enrollmentsList = await db
  .select({
    studentId: enrollments.studentId,
    studentName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
    email: users.email,
  })
  .from(enrollments)
  .innerJoin(users, eq(enrollments.studentId, users.id))  // ✅ Works with top-level import
  
// BUT THEN...

// Line 504: evaluateStudent method - USES DYNAMIC IMPORTS
async evaluateStudent(input: {...}) {
  const { studentProgress } = await import('@shared/schema');  // ⚠️ Dynamic import
  cDetailed Breakdown (If You Want to Dig Deeper)

### 🔥 Problem #1 Details: The Import Confusion

**Think of it like this:**  
Imagine you have a toolbox. At the top of your workshop, you brought in a hammer from the garage. But then in the middle of your project, you go back to the garage and grab what you THINK is the same hammer, but it's actually a different hammer. Now you're trying to use both hammers at once and your hands are confused.

**In code terms:**
- **Top of file (Line 3):** We import database tables like `studentProgress`, `chapters`, `users`
- **Middle of file (Line 504):** We import the SAME tables again using a different method
- **Result:** The database library gets confused about which import to use and crashes

**The Error You See:**
```
TypeError: Cannot convert undefined or null to object
```

Translation: "I'm trying to use the studentProgress table, but I can't find it anymore - it's become undefined!"

**Files Affected:**
- `server/modules/batch-cohort/storage.ts` - Lines 3, 408, 504
      status: chapter.proficiencyLevel === null ? 'not_started' 
        : chapter.proficiencyLevel === 0 ? 'in_progress'
        : chapter.proficiencyLevel >= 4 ? 'completed'
        : 'in_progress',
      lastEvaluatedAt: chapter.lastEvaluatedAt,  // ❌ WRONG FIELD NAME
    🔥 Problem #2 Details: The Mismatched Expectations

**Think of it like this:**  
You order a pizza and expect it to come with:
- Cheese ✅
- Pepperoni ✅
- Pineapple ❌ (You asked for it but they didn't send it)
- Olives 🤷 (You didn't ask for it but they sent it anyway)

**In code terms:**
Your frontend "ordered" (expected) certain data fields, but the backend is "delivering" different fields.

**What Frontend Expects:**
```
✅ studentId
✅ chapterId  
✅ proficiencyLevel
✅ status
❌ lastUpdated         ← Expects this but backend sends "lastEvaluatedAt"
❌ evaluatedBy         ← Expects this but we're not sending it
```

**What Backend Actually Sends:**
```
✅ studentId
✅ chapterId
✅ proficiencyLevel
✅ lastEvaluatedAt     ← Different name!
✅ evaluatedBy         ← We have this but not using it
✅ notes               ← Frontend didn't ask for this
```

**The Result:** Frontend code tries to access `lastUpdated` but it doesn't exist, so things break.

**Fi🔥 Problem #3 Details: Data Gets Scrambled in Transit

**Think of it like a game of telephone:**  
You know the game where you whisper a message to someone, and they whisper it to the next person, and by the end it's completely different?

```
Database says:
  "Student John has proficiency 3 on chapter 5, evaluated on Jan 1"

↓ Backend translates to:
  "Here's a list of students, each with a list of chapters and scores"

↓ Hook transforms to:
  "Here are rows and cells organized differently"

↓ Page component expects:
  "Give me a flat list with field names that don't exist!"

↓ Matrix displays:
  "Error: Can't find the data I need!"
```

**The Core Issue:**  
Data changes format **4 times** as it travels from database to screen, and each transformation slightly changes the field names and structure. By the time it reaches the matrix, it's unrecognizable.

**Example of the Mismatch:**

| Stage | Field Name for "When Evaluated" | Type |
|-------|--------------------------------|------|
| Database | `lastEvaluatedAt` | timestamp |
| Backend API | `lastEvaluatedAt` | string |
| Hook Transform | `lastEvaluatedAt` | string |
| Frontend Type | `lastUpdated` | Date |
| **Result** | ❌ Name changed, type changed! | 💥 |

**Files Affected:**
- Database: `shared/schema.ts`
- Backend: `server/modules/batch-cohort/storage.ts`
- Hook: `client/src/new-ui/batches/hooks/useBatchProgress.ts`
- Page: `client/src/new-ui/batches/pages/BatchDetails.tsx`
- Types: `client/src/new-ui/batches/types/matrix.ts`

**Reality:** `useBatchProgress` transforms the response to `{ batchId, rows, chapters }` but BatchDetails tries to access `.students` which doesn't exist in the transformed data.

**Why It Doesn't Crash:**
- The backend is crashing BEFORE returning data
- If backend worked, this would be a runtime error: `Cannot read property 'flatMap' of undefined`

---

### Issue #5: chapterId Type Mismatch (DATA CORRUPTION RISK)
**Location:** Multiple files

**Database:** `chapterId: integer` (number)  
**API Response:** `chapterId: number`  
**Frontend Type:** `chapterId: string`  
**Matrix Component:** Expects `string`

**Current Flow:**
```typescript
// Backend returns: chapterId: 123 (number)

// BatchDetails transforms:
chapterId: String(chapter.chapterId)  // "123" (string)

// Matrix uses:
const key = `${studentId}-${chapterId}`;  // "user-123-123"

// Update API call:
chapterId: Number(chapterId)  // 123 (number)
```

**Problem:** Constant string-number conversions create bugs:
1. Matrix stores keys as "studentId-chapterId" strings
2. Modal needs to parse chapter back to number for API
3. Type safety is violated throughout

**Risk:** If a chapterId is accidentally stored as "123abc", `Number("123abc")` = `NaN`, breaking the API call.

---

### Issue #6: Progress Status Logic Incorrect
**Location:** `client/src/new-ui/batches/pages/BatchDetails.tsx:449-453`

**Current Logic:**
```typescript
status: chapter.proficiencyLevel === null ? 'not_started' 
  : chapter.proficiencyLevel === 0 ? 'in_progress'
  : chapter.proficiencyLevel >= 4 ? 'completed'
  : 'in_progress',
```

**Problems:**
1. Level 0 = "Practicing/Attending" should be `'practicing'`, not `'in_progress'`
2. Levels 1-3 map to `'in_progress'` but type only allows: `'practicing' | 'completed' | 'absent' | 'not_started'`
3. There's no `'in_progress'` status in the type definition
4. Level -1 (Absent) is never checked

**Correct Mapping:**
```typescript
// From product-guide.md and types/matrix.ts:
-1 → 'absent'
null → 'not_started'
0 → 'practicing'
1-3 → 'practicing' (actively learning)
4 → 'completed'
```

**Impact:** TypeScript should be throwing errors, but it's not catching this because the backend crashes first.

---

### Issue #7: Query Invalidation Key Might Be Wrong
**Location:** `client/src/new-ui/batches/hooks/useUpdateProficiency.ts:61`

**Current:**
```typescript
await queryClient.invalidateQueries({ 
  queryKey: [`/api/batches/${variables.batchId}/progress`],
});
```

**useBatchProgress Uses:**
```typescript
queryKey: batchId ? [`/api/batches/${batchId}/progress`] : ["/api/batches/undefined/progress"],
```

**Potential Issue:**
If `batchId` is a number (Number type), and `variables.batchId` is also a number, this should match. BUT, if one is stringified and the other isn't, we have a cache key mismatch:
- `['/api/batches/13/progress']` vs `['/api/batches/13/progress']` ✅ Match
- But if somewhere batchId becomes undefined: `['/api/batches/undefined/progress']` ❌ Mismatch

**Verification Needed:** Check if batchId can ever be undefined during invalidation.

---

### Issue #8: evaluateStudent Dynamic Imports (CONSISTENCY)
**Location:** `server/modules/batch-cohort/storage.ts:504-548`

**Current:**
```typescript
async evaluateStudent(input: {...}) {
  const { studentProgress } = await import('@shared/schema');
  const { and } = await import('drizzle-orm');
  // ... uses dynamic import
}

async chapterExists(chapterId: number) {
  const { chapters } = await import('@shared/schema');
  // ... uses dynamic import
}
```

**Problem:** These methods use dynamic imports while the rest of the file uses top-level imports. This is what's causing the Drizzle ORM crash.

**Why Dynamic Imports Were Used:**
Probably copied from a different pattern or to avoid circular dependencies, but it's unnecessary here because all imports are already at the top.

---

### Issue #9: Missing Error Handling in Matrix
**Location:** `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx`

**Current Flow:**
```typescript
const handleUpdateProficiency = async (level: ProficiencyLevel) => {
  if (!selectedCell) return;

  try {
    await onUpdateProficiency(selectedCell.studentId, selectedCell.chapterId, level);
    toast({ title: 'Proficiency updated' });
    setModalOpen(false);  // ✅ Closes modal on success
    setSelectedCell(null);
  } catch (error: any) {
    toast({
      title: 'Failed to update proficiency',
      description: error?.message || 'An error occurred',
      variant: 'destructive',
    });
    // ⚠️ Modal stays open on error - CORRECT
  }
};
```

**Problem:** If the backend returns an error, the modal correctly stays open, but the toast is shown AND the parent callback (BatchDetails.onUpdateProficiency) also shows a toast:

```typescript
// BatchDetails.tsx:724-738
onUpdateProficiency={async (studentId, chapterId, level) => {
  try {
    await updateProficiency.mutateAsync({...});
    toast({  // ⚠️ DUPLICATE TOAST
      title: 'Proficiency updated',
      description: `Level set to ${level}`,
    });
  } catch (error: any) {
    toast({  // ⚠️ DUPLICATE TOAST
      title: 'Failed to update proficiency',
      description: error?.message || 'An error occurred',
      variant: 'destructive',
    });
  }
}}
```

**Result:** Two toasts appear for every proficiency update (success or error).

---

## Data Structure Comparison Table

| Field | Database (schema.ts) | API Response (backend) | useBatchProgress Transform | Frontend Type (matrix.ts) | Current Mapping |
|-------|---------------------|----------------------|---------------------------|--------------------------|----------------|
| studentId | `varchar` | `string` | `string` | `string` | ✅ Match |
| chapterId | `integer` | `number` | `number` | `string` | ❌ Type mismatch |
| proficiencyLevel | `integer (0-4)` | `number \| null` | `number (0-4)` | `ProficiencyLevel (-1\|0\|1\|2\|3\|4)` | ❌ null vs -1 |
| lastAccessed | `timestamp` | `string \| null` | N/A | N/A | Not used |
| lastEvaluatedAt | `timestamp` | `string \| null` | `string \| null` | N/A | ❌ Not mapped |
| evaluatedBy | `varchar` | `string \| null` | N/A | `string?` | ❌ Not mapped |
| notes | `text` | `string \| null` | `string \| null` | N/A | ❌ Not in type |
| batchId | `integer` | N/A (top-level) | N/A | N/A | N/A |
| status | N/A | N/A | N/A | `'practicing'\|'completed'\|'absent'\|'not_started'` | ❌ Calculated wrong |
| lastUpdated | N/A | N/A | N/A | `Date` | ❌ Missing entirely |

**Summary:** 6 out of 9 fields have type mismatches or mapping errors.

---

## Execution Trace with Errors

Let me trace through what ACTUALLY happens when a user clicks a cell:

### Step 1-5: Modal Opens (✅ Works)
User clicks cell → Modal opens with current proficiency → User selects level 3

### Step 6-9: POST Request (✅ Works)
```
POST /api/batches/13/students/user-123/evaluate
Body: { chapterId: 45, proficiencyLevel: 3, notes: null }
```

### Step 10: Backend Route Handler (✅ Works)
```typescript
// batch.routes.ts:248-279
router.post('/batches/:batchId/students/:studentId/evaluate', async (...) => {
  const batchId = parseInt(req.params.batchId);  // 13
  const studentId = req.params.studentId;        // "user-123"
  const { chapterId, proficiencyLevel, notes } = req.body;  // 45, 3, null
  
  const result = await batchService.evaluateStudent({
    studentId: "user-123",
    chapterId: 45,
    proficiencyLevel: 3,
    notes: null,
    evaluatedBy: "instructor-456",
    batchId: 13,
  });
  
  res.json(result);  // ✅ Returns updated studentProgress record
});
```

### Step 11: Service Layer (✅ Works)
```typescript
// batch/service.ts:129-156
async evaluateStudent(input) {
  // Validates proficiency level (0-4) ✅
  // Validates student exists ✅
  // Validates chapter exists ✅
  // Validates batch exists ✅
  return batchStorage.evaluateStudent(input);
}
```

### Step 12: Storage Layer - UPDATE (✅ Works)
```typescript
// batch/storage.ts:504-548
async evaluateStudent(input) {
  const { studentProgress } = await import('@shared/schema');  // ⚠️ Dynamic import
  
  const existing = await db
    .select()
    .from(studentProgress)
    .where(and(
      eq(studentProgress.studentId, "user-123"),
      eq(studentProgress.chapterId, 45)
    ));
  
  if (existing.length > 0) {
    // Update existing record
    const [updated] = await db
      .update(studentProgress)
      .set({
        proficiencyLevel: 3,
        lastEvaluatedAt: new Date(),
        evaluatedBy: "instructor-456",
        updatedAt: new Date(),
      })
      .where(eq(studentProgress.id, existing[0].id))
      .returning();
    
    return updated;  // ✅ Success
  }
}
```

### Step 13: Response Returns (✅ Works)
```json
{
  "id": 789,
  "studentId": "user-123",
  "chapterId": 45,
  "batchId": 13,
  "proficiencyLevel": 3,
  "lastEvaluatedAt": "2026-01-01T11:18:10.000Z",
  "evaluatedBy": "instructor-456",
  "notes": null,
  "createdAt": "2025-12-20T10:00:00.000Z",
  "updatedAt": "2026-01-01T11:18:10.000Z"
}
```

### Step 14: Frontend Mutation Success (✅ Works)
```typescript
// useUpdateProficiency.ts:54-58
onSuccess: async (data, variables, context) => {
  // Invalidate batch progress query to trigger refetch
  await queryClient.invalidateQueries({ 
    queryKey: [`/api/batches/${variables.batchId}/progress`],
    // Invalidates: ['/api/batches/13/progress']
  });
}
```

### Step 15: TanStack Query Refetch Triggered (✅ Works)
```typescript
// useBatchProgress.ts:64-71
export function useBatchProgress(batchId: number | string | undefined) {
  return useQuery<BatchProgressResponseUI>({
    queryKey: batchId ? [`/api/batches/${batchId}/progress`] : [...],
    // Key: ['/api/batches/13/progress']
    // ✅ MATCHES invalidation key
    
    queryFn: async ({ queryKey }) => {
      const res = await getQueryFn<BatchProgressResponseServer>({ on401: "throw" })({ queryKey } as any);
      return transform(res as unknown as BatchProgressResponseServer);
    },
    enabled: Boolean(batchId),
  });
}
```

### Step 16: GET Request Fires (✅ Works)
```
GET /api/batches/13/progress
```

### Step 17: Backend Route Handler (✅ Works)
```typescript
// batch.routes.ts:241-245
router.get('/batches/:id/progress', async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);  // 13
    const progress = await batchService.getBatchProgress(batchId);
    res.json(progress);
  } catch (error) { next(error); }
});
```

### Step 18: Service Layer (✅ Works)
```typescript
// batch/service.ts:122-127
async getBatchProgress(batchId: number) {
  const batch = await this.getBatch(batchId);
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
  return batchStorage.getBatchProgress(batchId);
}
```

### Step 19: Storage Layer - CRASH 🔥
```typescript
// batch/storage.ts:408-498
async getBatchProgress(batchId: number) {
  const batchInfo = await this.getBatchById(batchId);  // ✅ Works
  
  const enrollmentsList = await db
    .select({
      studentId: enrollments.studentId,
      studentName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      email: users.email,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .where(and(
      eq(enrollments.batchId, batchId),
      eq(enrollments.status, 'active')
    ));
  // ✅ Works - returns students
  
  const chaptersList = await db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      chapterNumber: chapters.chapterNumber,
    })
    .from(chapters)
    .where(eq(chapters.trackId, batchInfo.trackId))
    .orderBy(chapters.chapterNumber);
  // ✅ Works - returns chapters
  
  const studentIds = enrollmentsList.map(e => e.studentId);
  const chapterIds = chaptersList.map(c => c.chapterId);
  
  // 🔥 CRASH HERE
  const progressRecords = await db
    .select()
    .from(studentProgress)  // ⚠️ studentProgress is undefined!
    .where(and(
      inArray(studentProgress.studentId, studentIds),
      inArray(studentProgress.chapterId, chapterIds)
    ));
  
  // TypeError: Cannot convert undefined or null to object
  //     at Function.entries (<anonymous>)
  //     at orderSelectedFields
```

**Why studentProgress is undefined:**
1. Line 3 imports `studentProgress` at top-level
2. Line 504 `evaluateStudent` method dynamically imports `studentProgress`
3. Drizzle ORM gets confused about which import to use
4. By the time `getBatchProgress` runs, the table reference is corrupted

---

## Root Cause Summary

### Primary Root Cause: Import Pattern Conflict
The storage class mixes top-level and dynamic imports of the same tables, causing Drizzle ORM to lose track of table definitions.

### Secondary Root Causes:
1. **Type Definition Mismatch** - Frontend types don't match backend response structure
2. **Incorrect Data Transformation** - useBatchProgress transforms data, but BatchDetails expects original structure
3. **Missing Fields** - StudentProgress type requires fields that backend doesn't provide or are named differently

---

## Recommended Fixes (Priority Order)

### 🔥 P0: Fix Backend Crash (MUST FIX FIRST)
**File:** `server/modules/batch-cohort/storage.ts`

**Solution:** Remove ALL dynamic imports, use only top-level imports consistently:

```typescript
// LINE 3: Keep all imports at top
import { 
  batches, 
  enrollments, 
  batchCoInstructors, 
  users, 
  tracks, 
  studentProgress, 
  chapters 
} from "@shared/schema";

// LINE 504: Remove dynamic imports from evaluateStudent
async evaluateStudent(input: {...}) {
  // ❌ DELETE THIS:
  // const { studentProgress } = await import('@shared/schema');
  // const { and } = await import('drizzle-orm');
  
  // ✅ USE THIS (already imported at top):
  const existing = await db
    .select()
    .from(studentProgress)  // Uses top-level import
    .where(and(  // 'and' is already imported at top (line 2)
      eq(studentProgress.studentId, input.studentId),
      eq(studentProgress.chapterId, input.chapterId)
    ))
    .limit(1);
  
  /How to Fix Everything (Step by Step)

### ✅ Step 1: Fix the Backend Import Confusion (15 minutes)

**File to edit:** `server/modules/batch-cohort/storage.ts`

**What to do:**
1. Find line 504 - the `evaluateStudent` method
2. Delete these two lines:
   ```typescript
   const { studentProgress } = await import('@shared/schema');
   const { and } = await import('drizzle-orm');
   ```
3. The method already has access to `studentProgress` and `and` from the top of the file - just use them directly!

4. Find line 549 - the `chapterExists` method
5. Delete this line:
   ```typescript
   const { chapters } = await import('@shared/schema');
   ```
6. Again, `chapters` is already imported at the top - just use it!

**Why this works:** We stop confusing the database library by only importing things ONE way (at the top of the file).

---

### ✅ Step 2: Fix the Frontend Type Definition (10 minutes)

**File to edit:** `client/src/new-ui/batches/types/matrix.ts`

**Find this:**
```typescript
export interface StudentProgress {
  studentId: string;
  chapterId: string;
  proficiencyLevel: ProficiencyLevel;
  status: 'practicing' | 'completed' | 'absent' | 'not_started';
  lastUpdated: Date;  // ← WRONG NAME
  evaluatedBy?: string;
}
```

**Replace with this:**
```typescript
export interface StudentProgress {
  studentId: string;
  chapterId: string;
  proficiencyLevel: ProficiencyLevel;
  status: 'practicing' | 'completed' | 'absent' | 'not_started';
  lastEvaluatedAt: string | null;  // ← CORRECT NAME
  evaluatedBy: string | null;
  notes: string | null;
}
```

**Why this works:** Now the frontend expects the same field names that the backend actually sends.

---

### ✅ Step 3: Fix the Data Transformation (15 minutes)

**File to edit:** `client/src/new-ui/batches/pages/BatchDetails.tsx`

**Find around line 443** (the `matrixProgress` useMemo):

**Current code tries to access:**
```typescript
batchProgress.data.students  // ← WRONG! This doesn't exist
```

**Change to:**
```typescript
batchProgress.data.rows  // ← CORRECT! This is what the hook actually returns
```

**Full replacement:**
```typescript
const matrixProgress: StudentProgress[] = useMemo(() => {
  if (!batchProgress.data) return [];

  return batchProgress.data.rows.flatMap(row =>
    row.cells.map(cell => ({
      studentId: row.studentId,
      chapterId: String(cell.chapterId),
      proficiencyLevel: cell.proficiencyLevel ?? -1,
      status: 
        cell.proficiencyLevel === null ? 'not_started'
        : cell.proficiencyLevel === -1 ? 'absent'
        : cell.proficiencyLevel === 0 ? 'practicing'
        : cell.proficiencyLevel >= 4 ? 'completed'
        : 'practicing',
      lastEvaluatedAt: cell.lastEvaluatedAt,
      evaluatedBy: cell.evaluatedBy ?? null,
      notes: cell.notes,
    }))
  );
}, [batchProgress.data]);
```

**BUT WAIT!** The hook doesn't give us `evaluatedBy` yet, so we need Step 4...

---

### ✅ Step 4: Make the Hook Include All Fields (10 minutes)

**File to edit:** `client/src/new-ui/batches/hooks/useBatchProgress.ts`

**Find the `ChapterProgressCell` interface** (around line 8):
```typescript
export interface ChapterProgressCell {
  chapterId: number;
  proficiencyLevel: number;
  lastEvaluatedAt?: string | null;
  notes?: string | null;
}
```

**Add the missing field:**
```typescript
export interface ChapterProgressCell {
  chapterId: number;
  proficiencyLevel: number;
  lastEvaluatedAt?: string | null;
  evaluatedBy?: string | null;  // ← ADD THIS
  notes?: string | null;
}
```

**Find the `transform` function** (around line 77), **find this part:**
```typescript
return {
  chapterId: c.chapterId,
  proficiencyLevel: found?.proficiencyLevel ?? 0,
  lastEvaluatedAt: found?.lastEvaluatedAt ?? null,
  notes: found?.notes ?? null,
};
```

**Add the missing field:**
```typescript
return {
  chapterId: c.chapterId,
  proficiencyLevel: found?.proficiencyLevel ?? 0,
  lastEvaluatedAt: found?.lastEvaluatedAt ?? null,
  evaluatedBy: found?.evaluatedBy ?? null,  // ← ADD THIS
  notes: found?.notes ?? null,
};
```

---

### ✅ Step 5: Remove Duplicate Toasts (5 minutes)

**File to edit:** `c (After All Fixes)

Once you've made all the changes above, test in this order:

1. ✅ Restart the server (Ctrl+C then `npm run dev`)
2. ✅ Check - no more "Cannot convert undefined or null to object" errors
3. ✅ Open browser to Batch Details page
4. ✅ Switch to Matrix View
5. ✅ Select a track - matrix should load with colored cells
6. ✅ Click any cell
7. ✅ Modal opens showing student and chapter info
8. ✅ Select a proficiency level (0-4)
9. ✅ Watch for loading spinner
10. ✅ Modal closes automatically
11. ✅ ONE toast notification appears (not two!)
12. ✅ Cell color updates immediately
13. ✅ Refresh page - color should stay the same (data persisted)

**If ANY step fails:** Stop and let me know which step - we'll debug that specific issue.

---

## Summary

**What's broken:**
1. Backend import confusion causing crashes
2. Frontend expecting wrong field names
3. Data getting scrambled through multiple transformations

**How long to fix:** About 1 hour total for all 5 steps

**Order to fix:**
1. Backend imports (15 min) ← **Do this first!**
2. Frontend type (10 min)
3. Data transformation (15 min)
4. Hook fields (10 min)
5. Remove duplicate toasts (5 min)

**Why it will work:**
- Step 1 stops the crashes
- Steps 2-4 align all the data structures
- Step 5 improves user experience

Once done, clicking a cell → selecting proficiency → seeing it update should work smoothly!

---

## Need Help?

**If you get stuck on any step:**
1. Tell me which step number (1-5)
2. Copy the error message you see
3. I'll give you more specific guidance

**Want me to just do it?**
Let me know and I can make all the code changes for you - just say "fix it all" and I'll implement everything.ficiency → status mapping rules

---

## End of Analysis

**Total Issues Found:** 9 critical + 3 observations  
**Blockers:** 3 (backend crash, type mismatch, data structure)  
**Next Steps:** Implement P0 fixes in order, then test end-to-end flow  
**Estimated Fix Time:** 2-3 hours for all P0-P2 fixes

