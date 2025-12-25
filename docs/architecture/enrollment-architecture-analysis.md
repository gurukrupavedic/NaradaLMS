# Enrollment Architecture Analysis - One-to-Many Correction

**Date:** December 25, 2025  
**Status:** Analysis Phase  
**Critical:** Business requirement correction from Many-to-Many to One-to-Many

## Business Requirements (Corrected)

### Student-Batch Relationship
- ✅ **A student can enroll in ONLY ONE batch** (not multiple)
- ✅ **A batch can have MULTIPLE students** (many students → one batch)
- ✅ This is a **One-to-Many** relationship (Batch 1:N Students)

### Instructor-Batch Relationships
1. **Primary Instructor:**
   - A user can be primary instructor for **MULTIPLE batches**
   - A batch can have **ONLY ONE primary instructor**
   - One-to-Many: User 1:N Batches (as primary instructor)

2. **Secondary Instructors (Co-Instructors):**
   - A user can be secondary instructor for **MULTIPLE batches**
   - A batch can have **MULTIPLE secondary instructors**
   - Many-to-Many: Uses `batchCoInstructors` join table ✅ (correct)

## Current Implementation Issues

### ❌ Problem: Incorrect Many-to-Many Design

**Current Schema:**
```typescript
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  status: varchar("status").default("active").notNull(),
  // ... other fields
});
```

**What this allows (WRONG):**
- Student A → [Batch 1, Batch 2, Batch 3] (multiple active enrollments)
- Student B → [Batch 2] (one enrollment)
- No constraint preventing multiple active enrollments per student

### Impact Analysis

#### Files Affected (100+ matches found):

**Schema & Types:**
- `shared/schema.ts` - Enrollments table definition, relations, types
- `shared/types.ts` - Enrollment TypeScript interfaces

**Backend - batch-cohort module:**
- `server/modules/batch-cohort/storage.ts`:
  - `listEnrollmentsByBatch()` - Get enrollments for a batch
  - `addEnrollment()` - Create enrollment
  - `dropEnrollment()` - Drop enrollment
  - `listEligibleStudents()` - Filter out enrolled students
  - `getBatchById()` - Count active enrollments
  - `deleteBatch()` - Check for active enrollments before delete

**Backend - learning-delivery module:**
- `server/modules/learning-delivery/storage.ts`:
  - `getAvailableChapters()` - Currently queries ALL enrollments for student
  - Assumes student can have multiple batches/tracks

**Backend - Routes:**
- `server/routes/batch.routes.ts`:
  - `POST /api/batches/:id/enrollments` - Enroll student
  - `GET /api/batches/:id/enrollments` - List enrollments
  - `PATCH /api/enrollments/:id/drop` - Drop enrollment
  - `GET /api/batches/:id/eligible-students` - Filter enrolled students

**Frontend - Hooks:**
- `client/src/new-ui/admin/hooks/useBatchRelations.ts`:
  - `useEnrollments()` - Fetch enrollments
  - `useEnrollStudent()` - Enroll mutation
  - `useDropEnrollment()` - Drop mutation
  - `useEligibleStudents()` - Filter enrolled students
  
- `client/src/new-ui/batches/hooks/`:
  - `useEnrollments.ts`
  - `useAddEnrollment.ts`
  - `useDropEnrollment.ts`

**Frontend - Components:**
- `client/src/new-ui/admin/pages/BatchDetailAdmin.tsx` - Enrollment table with typeahead

**Tests:**
- `tests/admin-batches-smoke.ts` - Enrollment API tests

## Schema Design Options

### Option A: Direct Foreign Key on Users Table

**Pros:**
- Simplest database design
- Enforces one-batch constraint at DB level
- No join table needed
- Fast queries (no JOIN for batch lookup)

**Cons:**
- Loses enrollment audit history (when enrolled, by whom, drop reason)
- Can't track past enrollments (if student changes batches)
- No `status` field for active/dropped/completed states

**Schema:**
```typescript
export const users = pgTable("users", {
  // ... existing fields
  currentBatchId: integer("current_batch_id").references(() => batches.id),
  enrolledAt: timestamp("enrolled_at"),
  enrolledBy: varchar("enrolled_by").references(() => users.id),
});
```

### Option B: Enrollments Table with UNIQUE Constraint

**Pros:**
- ✅ Maintains full audit trail (enrolledAt, enrolledBy, droppedReason)
- ✅ Supports enrollment lifecycle (active → dropped → re-enroll different batch)
- ✅ Preserves historical data
- ✅ Minimal code changes (mostly validation additions)

**Cons:**
- Slightly more complex queries (need WHERE status = 'active')
- Join table adds marginal query overhead

**Schema:**
```typescript
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id),
  status: varchar("status").default("active").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  enrolledBy: varchar("enrolled_by").notNull().references(() => users.id),
  droppedAt: timestamp("dropped_at"),
  droppedReason: text("dropped_reason"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // UNIQUE constraint: only one active enrollment per student
  uniqueActiveEnrollment: unique().on(table.studentId, table.status).where(sql`status = 'active'`),
}));
```

**Note:** PostgreSQL partial unique index syntax:
```sql
CREATE UNIQUE INDEX unique_active_enrollment 
ON enrollments(student_id) 
WHERE status = 'active';
```

### Option C: Hybrid Approach

**Pros:**
- Both current batch reference AND full history
- Fast current batch queries
- Complete audit trail

**Cons:**
- Data duplication (currentBatchId mirrors active enrollment)
- Synchronization complexity
- Over-engineered for this use case

## Recommended Approach: **Option B**

### Rationale:
1. **Preserves audit requirements** - Who enrolled, when, why dropped
2. **Supports business workflows** - Student drops → re-enrolls different batch
3. **Minimal code disruption** - Add validation, not restructure
4. **PostgreSQL native** - Partial unique indexes are standard feature
5. **Aligns with existing patterns** - Similar to `batchCoInstructors` join table

## Required Code Changes (Option B)

### 1. Schema Migration (`shared/schema.ts`)
```typescript
// Add partial unique index to enrollments table
export const enrollments = pgTable("enrollments", {
  // ... existing fields (no changes)
}, (table) => ({
  uniqueActiveEnrollment: index("unique_active_enrollment")
    .on(table.studentId)
    .where(sql`status = 'active'`),
}));
```

### 2. Backend Validation (`server/modules/batch-cohort/service.ts`)
```typescript
async addEnrollment(input: EnrollmentCreateInput) {
  // NEW: Check for existing active enrollment
  const existingEnrollment = await batchStorage.getActiveEnrollmentForStudent(input.studentId);
  if (existingEnrollment) {
    throw Object.assign(
      new Error(`Student is already enrolled in batch: ${existingEnrollment.batchId}`),
      { status: 400, code: 'ALREADY_ENROLLED' }
    );
  }
  
  // Existing validation...
  const batch = await this.getBatch(input.batchId);
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
  
  const studentExists = await batchStorage.userExists(input.studentId);
  if (!studentExists) throw Object.assign(new Error('Student not found'), { status: 400 });
  
  return batchStorage.addEnrollment(input);
}
```

### 3. Storage Layer (`server/modules/batch-cohort/storage.ts`)
```typescript
async getActiveEnrollmentForStudent(studentId: string) {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.status, 'active')
    ))
    .limit(1);
  return enrollment || null;
}
```

### 4. Eligible Students Filter (`server/modules/batch-cohort/storage.ts`)
```typescript
async listEligibleStudents(batchId: number, searchQuery?: string) {
  // CHANGE: Get ALL students with active enrollments (not just this batch)
  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.status, 'active')); // Remove batchId filter
  
  const enrolledIds = enrolled.map(e => e.studentId);
  
  // Rest remains same...
}
```

### 5. Learning Delivery (`server/modules/learning-delivery/storage.ts`)
```typescript
async getAvailableChapters(studentId: string): Promise<AvailableChapterDTO[]> {
  // CHANGE: Get THE enrollment (not multiple)
  const [studentEnrollment] = await db
    .select({
      batchId: enrollments.batchId,
      trackId: batches.trackId,
    })
    .from(enrollments)
    .innerJoin(batches, eq(enrollments.batchId, batches.id))
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.status, 'active')
    ))
    .limit(1); // Only ONE enrollment
  
  if (!studentEnrollment) {
    return []; // No enrollment, no chapters
  }
  
  // Rest uses single trackId instead of array...
}
```

### 6. Frontend Error Handling (`client/src/new-ui/admin/pages/BatchDetailAdmin.tsx`)
```typescript
const handleEnroll = (student: EligibleStudent) => {
  enrollStudent.mutate(
    { studentId: student.id },
    {
      onSuccess: () => {
        toast({ title: "Student enrolled successfully" });
        setSearchQuery("");
        setShowDropdown(false);
      },
      onError: (err: any) => {
        const message = err.code === 'ALREADY_ENROLLED'
          ? `${student.firstName} is already enrolled in another batch`
          : err.message;
        toast({
          title: "Failed to enroll student",
          description: message,
          variant: "destructive",
        });
      },
    }
  );
};
```

### 7. Database Migration SQL
```sql
-- Add partial unique index
CREATE UNIQUE INDEX unique_active_enrollment 
ON enrollments(student_id) 
WHERE status = 'active';

-- Verify no violations exist
SELECT student_id, COUNT(*) 
FROM enrollments 
WHERE status = 'active' 
GROUP BY student_id 
HAVING COUNT(*) > 1;
```

## Testing Strategy

### Pre-Migration Validation
1. Query database for students with multiple active enrollments
2. Decide handling: Keep newest, keep oldest, or manual review
3. Clean up duplicate enrollments

### Post-Migration Tests
1. **Unit Tests:**
   - Enroll student → success
   - Enroll already-enrolled student → error ALREADY_ENROLLED
   - Drop enrollment → success
   - Re-enroll in different batch → success

2. **Integration Tests:**
   - Eligible students query excludes all enrolled students (not just current batch)
   - Batch deletion blocked if students enrolled
   - Learning delivery shows chapters from ONE batch only

3. **UI Tests:**
   - TypeWahead doesn't show enrolled students
   - Enrollment error toast displays friendly message
   - Drop → Re-enroll flow works

## Migration Steps (Recommended Order)

1. **Phase 1: Analysis** ✅
   - Document current state
   - Identify all affected code
   - Choose schema approach

2. **Phase 2: Data Audit**
   - Query for duplicate active enrollments
   - Clean up test data violations
   - Document cleanup strategy

3. **Phase 3: Backend Changes**
   - Add `getActiveEnrollmentForStudent()` storage method
   - Add validation to `addEnrollment()` service
   - Update `listEligibleStudents()` filter logic
   - Update `getAvailableChapters()` to single enrollment
   - Add error codes and messages

4. **Phase 4: Database Migration**
   - Create migration SQL
   - Test on dev database
   - Apply partial unique index
   - Verify constraint works

5. **Phase 5: Frontend Updates**
   - Update error handling in enrollment UI
   - Update tests
   - Test typeahead filtering

6. **Phase 6: Testing & Rollout**
   - Run integration tests
   - Manual QA on dev
   - Deploy to production
   - Monitor for errors

## Rollback Plan

- Migration can be rolled back by dropping the unique index
- Code changes are additive (validation checks), safe to deploy first
- If issues arise, temporarily disable validation while investigating

## Open Questions for User

1. **Data Cleanup:** Should we keep the newest or oldest enrollment if duplicates exist?
2. **Status Field:** Keep current 'active'/'dropped'/'completed', or simplify?
3. **Re-enrollment:** Can a student drop and re-enroll in a different batch immediately, or require admin approval?
4. **Historical Enrollments:** Should we maintain full history of all past enrollments (dropped), or archive/delete after some period?

## Summary

**Current State:** Many-to-Many (incorrect)  
**Target State:** One-to-Many (correct)  
**Recommended Solution:** Add partial unique index + validation  
**Impact:** ~15 files, mostly validation additions  
**Risk:** Low (constraint catches violations, graceful error handling)  
**Timeline:** 2-3 hours implementation + testing
