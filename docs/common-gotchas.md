# Common Gotchas & Lessons Learned

This document tracks common issues, bugs, and implementation pitfalls encountered during development, along with their solutions and commit references.

---

## JavaScript/TypeScript

### Nullish Coalescing (`??`) vs Logical OR (`||`) with Proficiency Levels

**Issue:** When using proficiency level values in color calculations or status mapping, using the logical OR operator (`||`) causes `0` to be treated as falsy and replaced with the default value.

**Problem Code:**
```typescript
const colors = getCellColor(chapter.proficiencyLevel || 9, status);
// When proficiencyLevel is 0 (Practicing), this evaluates to:
// getCellColor(9, status) - WRONG!
```

**Correct Code:**
```typescript
const colors = getCellColor(chapter.proficiencyLevel ?? 9, status);
// Only uses 9 when proficiencyLevel is null or undefined, NOT when it's 0
```

**Why This Matters:**
- Proficiency level `0` represents "Practicing" status
- Using `||` converts `0` → `9` (Not Started), showing wrong colors
- Proficiency levels `1`, `2`, `3` are not affected because they're truthy

**Symptoms:**
- Chapters with Practicing status appear with Not Started colors (very pale/white)
- Batch matrix shows correct amber color, but student progress cards show pale gray
- All other proficiency levels display correctly

**Fix Reference:**
- Commit: `dfcbcb7` - "fix: use nullish coalescing for proficiencyLevel to handle 0 correctly"
- File: `client/src/new-ui/instructor/components/student-progress/ChapterItem.tsx`
- Date: January 5, 2026

**Rule of Thumb:**
When working with numeric proficiency levels (0-4, 8, 9), **always use `??`** for default values, never `||`.

---

## Future Sections

Add new gotchas here as they're discovered during development.
