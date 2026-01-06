# Proficiency Update Debug Instructions

## Setup
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Keep console visible while testing

## Test Scenario 1: Co-Instructor (GR02-Grihasta Weekend Program)

### Step 1: Initial State
1. Navigate to: `/app/instructor/batches/:id` for GR02 batch
2. **OBSERVE Console Output:**
   - Look for `📋 batchProgress updated:` logs
   - Note the `rowCount` and `dataExists` values
   - Record the timestamp

3. **Wait** until you see:
   ```
   📋 batchProgress updated: {
     loading: false,
     error: false,
     dataExists: true,
     rowCount: X
   }
   ```
   - This means the cache is ready

### Step 2: Update Proficiency as Co-Instructor
1. Click on any proficiency cell (student + chapter combination)
2. Modal opens → Select a proficiency level → Submit

3. **OBSERVE Console Output - THIS IS CRITICAL:**

**Timeline to watch:**
```
🔵 handleUpdateProficiency called: { studentId: "...", chapterId: "...", newLevel: X }
📤 Mutation started: { batchId: X, studentId: "...", chapterId: X, proficiencyLevel: Y }
✅ Backend response received: { studentId: "...", chapterId: X, proficiencyLevel: Y, ... }
```

Then look for:

```
=== PROFICIENCY UPDATE onSuccess ===
Backend Response: { studentId: "...", chapterId: X, chapterIdType: "number", ... }
Cache BEFORE update: { exists: true/false, rowCount: X }
```

**CRITICAL QUESTION:** Is `exists: true` or `exists: false`?

If **`exists: false`**, that's the bug! The cache is empty when we try to update it.

### Step 3: Monitor Cache Update
Look for these logs:

```
setQueryData updater called with oldData: { exists: true/false, ... }
```

**If `exists: false`:**
```
⚠️ WARNING: oldData is null/undefined - CACHE UPDATE SKIPPED!
```

This confirms our theory!

### Step 4: Check if memo recalculates
```
📊 matrixProgress recalculated: {
  totalCells: X,
  timestamp: "...",
  firstCell: "Student: ..., Ch: ..., Level: ..."
}
```

**Did the memo recalculate AFTER the update?** If not, the memo deps are broken.

### Step 5: Visual Check
Does the cell update in the UI? 
- ✅ YES → Cache update worked
- ❌ NO → Cache update failed or memo didn't recalculate

---

## Test Scenario 2: Primary Instructor (Bramhachari Specialization)

Follow the SAME steps above with a batch where you ARE the primary instructor.

**Compare the console output:**
- Do you see `Cache BEFORE update: { exists: true }` for primary instructor?
- Do you see `Cache BEFORE update: { exists: false }` for co-instructor?

---

## What to Capture and Report

Please share:

1. **For CO-INSTRUCTOR update:**
   - Full console log from `🔵 handleUpdateProficiency` to `=== END PROFICIENCY UPDATE ===`
   - Screenshot of console

2. **For PRIMARY INSTRUCTOR update:**
   - Full console log from same section
   - Screenshot of console

3. **Answer these questions:**
   - Does `Cache BEFORE update: { exists: true }` for primary instructor?
   - Does `Cache BEFORE update: { exists: false }` for co-instructor?
   - Is `Cell chapterId` type `"number"` or `"string"`?
   - Does `setQueryData updater called with oldData: { exists: false }` appear?

---

## Additional Debug (if needed)

If you want to verify the cache manually, run in console:

```javascript
// Check what's in React Query cache for GR02 (replace with actual batch ID)
const cache = window.__REACT_QUERY_DEVTOOLS_PANEL__.queryClient?.getQueryData(['/api/batches/YOUR_BATCH_ID/progress']);
console.log('Full cache:', cache);
```

Replace `YOUR_BATCH_ID` with the actual GR02 batch ID.
