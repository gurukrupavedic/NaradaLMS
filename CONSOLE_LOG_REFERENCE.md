# Quick Console Log Reference

## Expected Log Flow (Successful Update)

```
🔵 handleUpdateProficiency called
📤 Mutation started
✅ Backend response received
=== PROFICIENCY UPDATE onSuccess ===
Backend Response: {...}
Cache BEFORE update: { exists: true }
setQueryData updater called with oldData: { exists: true }
Cache structure: { rows: X }
Looking for studentId: "abc123"
Available studentIds in cache: ["abc123", "def456", ...]
Found matching row for studentId: abc123
Cell comparison: {
  cellChapterId: 5,
  cellChapterIdType: "number",
  dataChapterId: 5,
  dataChapterIdType: "number",
  match: true,
  matchLoose: true
}
✅ Updating cell with new proficiency: 3
Cache AFTER update
Cache AFTER setQueryData completed
=== END PROFICIENCY UPDATE ===
🟢 Update succeeded, closing modal
📊 matrixProgress recalculated
```

## Critical Checkpoints

### ✅ If you see all these:
1. `Cache BEFORE update: { exists: true }`
2. `Found matching row for studentId:`
3. `✅ Updating cell with new proficiency:`
4. `📊 matrixProgress recalculated:`

→ **Cache update worked!** But UI still not updating?
→ Check if there's a CSS/display issue

### ❌ If you see:
1. `Cache BEFORE update: { exists: false }`

→ **CACHE DOESN'T EXIST!** That's the bug!

### ❌ If you see:
1. `Looking for studentId: "abc123"`
2. `Available studentIds in cache: ["xyz789", "def456"]`

→ **WRONG STUDENT!** Backend returned wrong studentId? Or wrong mutation input?

### ❌ If you don't see:
1. `Found matching row for studentId:`

→ **STUDENT NOT FOUND!** Cache doesn't have this student.

### ❌ If you see:
1. `Cell comparison: { match: false, matchLoose: true }`

→ **TYPE MISMATCH!** cellChapterId is one type, dataChapterId is another!

## What to Copy-Paste for Report

After completing update, in console, run:

```javascript
// Copy all logs since the 🔵 emoji
// Use Ctrl+Shift+J to open DevTools
// Right-click on first log → Copy message
// Then select all subsequent logs → Copy
```

Or if DevTools won't let you easily select, take a screenshot with all logs visible.
