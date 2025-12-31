# Backend Analysis: Unified Batch Matrix

**Date:** December 31, 2025  
**Status:** Pre-Implementation Review  
**Purpose:** Comprehensive analysis of data flow, database schema, API requirements, and implementation gaps

---

## Table of Contents

1. [Database Schema Analysis](#database-schema-analysis)
2. [Current API State](#current-api-state)
3. [Data Flow Mapping](#data-flow-mapping)
4. [Frontend Requirements](#frontend-requirements)
5. [Issues & Gaps Identified](#issues--gaps-identified)
6. [API Specification (Proposed)](#api-specification-proposed)
7. [Implementation Plan](#implementation-plan)
8. [Questions for Clarification](#questions-for-clarification)

---

## Database Schema Analysis

### Core Tables Involved

#### 1. **users** Table
```
Fields: id, firstName, lastName, email, roles, status, ...
Key Role: Represents students and instructors
Constraints: 
  - roles: array of ['student', 'instructor', 'content_manager', 'admin']
  - status: 'active', 'pending_approval', or 'inactive'
```

#### 2. **batches** Table
```
Fields:
  - id (PK)
  - batchCode, batchName (unique identifiers)
  - trackId (FK to tracks, nullable - can assign later)
  - primaryInstructorId (FK to users)
  - cohortType: 'bramhachari' | 'grihasta' (optional)
  - createdBy, createdAt, updatedAt

Key Properties:
  - Batch can exist without a track assigned
  - Each batch has ONE primary instructor
  - Multiple co-instructors via batchCoInstructors junction table
```

#### 3. **enrollments** Table
```
Fields:
  - id (PK)
  - batchId (FK), studentId (FK), status
  - enrolledAt, enrolledBy, droppedAt, droppedReason
  - updatedAt

Business Rules:
  ✅ Student can only be enrolled in ONE batch at a time (via partial unique index on studentId WHERE status='active')
  ✅ Only show ACTIVE enrollments (status='active')
  ✅ Hide dropped students unless specifically querying for history
```

#### 4. **tracks** Table
```
Fields:
  - id (PK)
  - title (unique), description
  - order (sequential: 1, 2, 3, ...)
  - createdBy, createdAt, updatedAt

Represents: Curriculum divisions (e.g., "Shankara's Upanishads", "Brahma Sutras")
```

#### 5. **chapters** Table
```
Fields:
  - id (PK)
  - trackId (FK - which track this belongs to)
  - title (NOT unique - can have chapters with same name in different tracks)
  - order (ordering within track, e.g., 1, 2, 3, ...)
  - status: 'draft' | 'published' (protection: can't delete published chapters)
  - content: JSONB { te?: string, hi?: string, en?: string } (multilingual content)
  - publishedAt, lastEditedBy, createdBy, createdAt, updatedAt

Key Properties:
  - Chapters are grouped by track
  - Each chapter has script-specific content (Telugu, Hindi, English)
  - Support for draft/published workflow
```

#### 6. **studentProgress** Table ⭐ CRITICAL
```
Fields:
  - id (PK)
  - studentId (FK to users)
  - chapterId (FK to chapters)
  - batchId (FK to batches, nullable - for context but not enforced)
  - proficiencyLevel: 0-4 (scale: 0=not started, 1=50%, 2=70%, 3=90%, 4=95%)
  - lastAccessed (when student last opened chapter)
  - lastEvaluatedAt (when proficiency was last set)
  - evaluatedBy (FK to users - which instructor evaluated)
  - notes (text)
  - createdAt, updatedAt

Current State:
  ✅ Table exists
  ✅ Relations defined
  ✅ Foreign keys in place
  
Issues Found:
  ⚠️  No unique constraint on (studentId, chapterId, batchId) - could have duplicates
  ⚠️  batchId is nullable - progress can exist without batch context
  ⚠️  No index on (batchId, studentId) for fast batch progress queries
```

### Schema Relationships

```
Track (1) ---> (many) Chapters
   ↓
Batch --> (optional) Track
   ↓
Enrollments (many) ---> (1) Student (users)
   ↓
StudentProgress 
   ├─ studentId ---> (1) Student
   ├─ chapterId ---> (1) Chapter
   └─ batchId ---> (1) Batch (optional)
```

---

## Current API State

### Existing Endpoints

#### 1. **GET /api/batches/:id/progress** ✅ EXISTS
```
Purpose: Get all student progress in batch (Excel-like grid)
Auth: Instructors & Admins only

Current Implementation:
  - Location: server/routes/batch.routes.ts:228
  - Handler: batchService.getBatchProgress(batchId)
  - Returns: { batchId, batchName, trackId, trackName, students: [{...}] }

What it does:
  1. Get batch info
  2. Get all ACTIVE enrollments in batch
  3. Get chapters from batch's track
  4. Query studentProgress for all (student, chapter) combinations
  5. Build matrix response structure

ISSUE FOUND: Uses 'chapterNumber' field that doesn't exist in schema
  - Schema has: chapters.order (integer)
  - Code references: chapters.chapterNumber (undefined)
  - Impact: Query will fail at runtime
```

#### 2. **POST /api/batches/:batchId/students/:studentId/evaluate** ✅ EXISTS
```
Purpose: Update student's proficiency level for a chapter
Auth: Instructors only

Current Implementation:
  - Location: server/routes/batch.routes.ts:253
  - Handler: batchService.evaluateStudent(input)
  - Input: { chapterId, proficiencyLevel, notes }
  - Behavior:
    * If progress record exists for (studentId, chapterId) → UPDATE
    * If not exists → CREATE new record
  - Returns: Updated/Created studentProgress record

What's good:
  ✅ Handles both create and update
  ✅ Sets evaluatedBy, lastEvaluatedAt
  ✅ Stores notes

What's missing:
  ⚠️  No validation of proficiencyLevel range (0-4, -1 for absent)
  ⚠️  No check if student is actually enrolled in batch
  ⚠️  No check if chapter belongs to batch's track
  ⚠️  No optimistic updates (updates are slow)
```

#### 3. **GET /api/batches/:id** ✅ EXISTS
```
Purpose: Get single batch details
Returns: Batch with enrollments, co-instructors, etc.
Useful for: Loading batch context
```

#### 4. **GET /api/learning/progress** ✅ EXISTS
```
Purpose: Student-facing progress tracking
Note: Different from batch progress endpoint
Used by: Individual students to see their own progress
Not used by: Matrix component (matrix is instructor-centric)
```

### Missing Endpoints for Matrix

❌ **GET /api/batches/:id/students** - Get students and chapters separately
   - Current: Returns students+chapters+progress in one response
   - Needed: Separate endpoints for students, chapters, progress

❌ **PUT /api/batches/:batchId/students/:studentId/progress/:chapterId** - Update proficiency
   - Current: POST /evaluate
   - Needed: Cleaner REST endpoint

❌ **POST /api/batches/:batchId/enrollments** - Enroll student in batch
   - Current: Likely exists elsewhere
   - Needed: Matrix needs to call this

❌ **DELETE /api/batches/:batchId/enrollments/:enrollmentId** - Drop student
   - Current: Likely exists elsewhere
   - Needed: Matrix calls this via kebab menu

---

## Data Flow Mapping

### 1. Load Matrix Data

```
UI: BatchDetails Component
  ↓
User selects batch + track
  ↓
Call: GET /api/batches/:id/progress
  ↓
Backend: batchService.getBatchProgress(batchId)
  ├─ Get batch by ID
  ├─ Get active enrollments in batch → [Student]
  ├─ Get chapters from batch.trackId → [Chapter]
  ├─ Get studentProgress records → [StudentProgress]
  └─ BUILD: Students × Chapters matrix
  ↓
Response: {
  batchId: number
  batchName: string
  trackId: number (or null)
  trackName: string (or null)
  students: [
    {
      studentId: string
      studentName: string
      email: string
      chapters: [
        {
          chapterId: number
          chapterTitle: string
          proficiencyLevel: 0-4 or null
          lastEvaluatedAt: timestamp
          evaluatedBy: string
          notes: string
        }
      ]
    }
  ]
}
  ↓
UI: Transform response to frontend types
  ├─ StudentMatrixRow[] (extract student info)
  ├─ Chapter[] (extract chapter info)
  └─ StudentProgress[] (combine student+chapter+proficiency)
  ↓
Render: UnifiedBatchMatrix component
```

### 2. Update Proficiency

```
UI: Matrix cell clicked
  ↓
Open: MatrixEvaluationModal
  ↓
User: Select proficiency level
  ↓
Call: POST /api/batches/:batchId/students/:studentId/evaluate
  Body: {
    chapterId: number
    proficiencyLevel: 0-4 | -1
    notes?: string
  }
  ↓
Backend: batchService.evaluateStudent()
  ├─ Check if progress exists
  ├─ Update or Create
  └─ Return updated record
  ↓
Response: {
  id: number
  studentId: string
  chapterId: number
  proficiencyLevel: number
  lastEvaluatedAt: timestamp
  evaluatedBy: string
  notes: string
  ...
}
  ↓
UI: Update local state (or refetch matrix)
  ↓
Close: Modal
```

### 3. Enroll Student

```
UI: Type student name in input row
  ↓
Call: GET /api/batches/:id/eligible-students?search=...
  ↓
Backend: batchService.listEligibleStudents(batchId, searchQuery)
  ├─ Get all ACTIVE students
  ├─ Exclude students already enrolled in ANY batch
  ├─ Exclude batch's primary instructor
  ├─ Filter by search query
  └─ Return filtered list
  ↓
UI: Show dropdown of matching students
  ↓
User: Select student
  ↓
Call: POST /api/batches/:batchId/enrollments
  Body: { studentId: string }
  ↓
Backend: batchService.addEnrollment()
  ├─ Create enrollment record
  └─ Set status='active', enrolledBy=current user
  ↓
Response: { id, batchId, studentId, status, enrolledAt, ... }
  ↓
UI: Add to matrix (or refetch)
```

### 4. Drop Student

```
UI: Kebab menu on student row → "Drop from batch"
  ↓
Call: DELETE /api/batches/:batchId/enrollments/:enrollmentId
  ↓
Backend: batchService.dropEnrollment()
  ├─ Update status='dropped'
  ├─ Set droppedAt=now, droppedReason
  └─ Return updated record
  ↓
Response: { id, status='dropped', droppedAt, droppedReason, ... }
  ↓
UI: Remove from matrix (or refetch)
```

---

## Frontend Requirements

### What the UI Needs (from UnifiedBatchMatrixProps)

```typescript
{
  // Data (required)
  students: StudentMatrixRow[]  // id, firstName, lastName, email, enrollmentId
  chapters: Chapter[]            // id, code, title, trackId
  progress: StudentProgress[]    // studentId, chapterId, proficiencyLevel, status, lastUpdated, evaluatedBy
  
  // Context (required)
  selectedBatchId: string
  selectedTrackId: string
  
  // Callbacks (required)
  onAddStudent: (studentId: string) => Promise<void>
  onDropStudent: (enrollmentId: number) => Promise<void>
  onUpdateProficiency: (studentId: string, chapterId: string, level: ProficiencyLevel) => Promise<void>
  
  // States (optional)
  isLoading?: boolean
  isUpdating?: boolean
}
```

### Transform Required: Backend Response → Frontend Types

**Backend returns:**
```
{
  students: [
    {
      studentId: string        // ← id for StudentMatrixRow
      studentName: string      // ← firstName + lastName (needs splitting)
      email: string
      chapters: [
        {
          chapterId: number    // ← string in frontend, number in DB
          chapterTitle: string // ← title for Chapter
          proficiencyLevel: 0-4 | null  // ← part of StudentProgress
          ...
        }
      ]
    }
  ]
}
```

**Frontend expects:**
```
{
  students: [
    {
      id: string               // = studentId
      firstName: string        // Need to parse from studentName
      lastName: string         // Need to parse from studentName
      email: string
      enrollmentId: number     // Missing from getBatchProgress response!
    }
  ],
  chapters: [
    {
      id: string               // = chapterId.toString()
      code: string             // Missing from DB!
      title: string
      trackId: string
    }
  ],
  progress: [
    {
      studentId: string
      chapterId: string        // Need to convert from number
      proficiencyLevel: 0-4
      status: 'practicing'|'completed'|'absent'|'not_started'  // How to determine?
      lastUpdated: Date        // Could use lastEvaluatedAt
      evaluatedBy?: string     // Present in DB
    }
  ]
}
```

### Data Mapping Issues 🚨

1. **enrollmentId missing** - Backend response doesn't include enrollmentId, but UI needs it for dropping students
2. **Chapter code missing** - Backend doesn't return chapter code, UI expects it
3. **Status field unclear** - UI expects status field (practicing/completed/absent/not_started) but DB only has proficiencyLevel
4. **studentName parsing** - Backend returns "FirstName LastName" but UI needs separate firstName/lastName
5. **ID type mismatch** - Backend uses number for chapterId, UI uses string

---

## Issues & Gaps Identified

### 🔴 Critical Issues

#### 1. **getBatchProgress uses non-existent field**
- **Location:** server/modules/batch-cohort/storage.ts:447, 451, 480
- **Problem:** References `chapters.chapterNumber` which doesn't exist
- **Schema has:** `chapters.order` (integer)
- **Impact:** Endpoint will crash when called
- **Fix:** Replace `chapterNumber` with `order`

#### 2. **Response structure doesn't match frontend needs**
- **Problem:** getBatchProgress returns data in one shape, but frontend needs different shape
- **Missing fields:** enrollmentId, chapter.code, Student firstName/lastName separation
- **Presence of fields:** studentName (concatenated), but separate fields needed
- **Impact:** Frontend will have to do complex transformations or call will fail

#### 3. **Proficiency "status" field undefined**
- **Problem:** UI expects `StudentProgress.status: 'practicing'|'completed'|'absent'|'not_started'`
- **Database has:** Only proficiencyLevel (0-4) and -1 for absent
- **Status derivation unclear:** How should we map?
  - If proficiencyLevel === -1 → 'absent'
  - If proficiencyLevel === 0 → 'practicing'
  - If proficiencyLevel >= 1 → 'completed'?
  - If proficiencyLevel >= 3 → 'ready'?
  - If proficiencyLevel >= 4 → 'certified'?
- **Impact:** Frontend needs logic to derive status, or backend needs to compute it

### 🟡 Important Gaps

#### 4. **No unique constraint on studentProgress**
- **Problem:** Could insert duplicate (studentId, chapterId, batchId) records
- **Current:** Only primary key on `id`, no unique constraints
- **Risk:** evaluateStudent() might create duplicates in race conditions
- **Recommendation:** Add unique index on (studentId, chapterId, batchId)

#### 5. **Missing indexes for batch progress queries**
- **Current:** No indexes on (batchId, studentId) combinations
- **Impact:** `getBatchProgress()` does multiple joins which could be slow
- **Recommendation:** Add index on (batchId, studentId) and (chapterId, trackId)

#### 6. **Chapter code not stored in database**
- **Problem:** UI displays chapter.code (e.g., "INTRO", "MANTRA")
- **Database:** Only has chapter.title and chapter.order
- **Mock data shows:** code: 'INTRO', 'MANTRA', 'MEANING'
- **Options:**
  - A) Add `code` column to chapters table
  - B) Derive code from title (e.g., slugify)
  - C) Use order number as code (e.g., "CH1", "CH2")

#### 7. **batchId nullable in studentProgress**
- **Problem:** studentProgress.batchId can be null
- **Implication:** Progress can exist without knowing which batch it's for
- **Recommendation:** Make batchId NOT NULL for batch-context progress

### 🔵 Design Questions

#### 8. **How should we handle multiple instructors evaluating the same chapter?**
- Current: Only stores `evaluatedBy` (last instructor)
- History: No history of previous evaluations
- Question: Keep simple (just last evaluator) or track history?

#### 9. **Should proficiencyLevel have "not_started" state?**
- Current: 0-4 scale, with 0="Practicing"
- Mock data: Shows -1 for "Absent"
- Missing: No explicit "not_started" state
- Question: Should we use null for "no progress record"?

#### 10. **Track assignment timing**
- Current: Batch.trackId can be null, assigned later
- Matrix: Filtered by selectedTrackId, not batch.trackId
- Question: Does matrix work correctly if batch has no track assigned?

---

## API Specification (Proposed)

### GET /api/batches/:id/progress

**Purpose:** Get all student progress in batch with chapters

**Authentication:** Instructor or Admin

**Response:**
```typescript
interface BatchProgressResponse {
  batchId: number;
  batchName: string;
  trackId: number | null;
  trackName: string | null;
  
  students: {
    id: string;                    // studentId
    firstName: string;              // Parsed from full name
    lastName: string;               // Parsed from full name
    email: string;
    enrollmentId: number;           // For dropping
    
    chapters: {
      id: string;                  // chapterId.toString()
      code: string;                // Chapter identifier (NEW)
      title: string;
      proficiencyLevel: 0|1|2|3|4|null;  // null if no record
      status: 'not_started'|'practicing'|'completed'|'ready'|'certified'|'absent';  // Derived
      lastEvaluatedAt: string | null;  // ISO timestamp
      evaluatedBy: string | null;      // Instructor name
      notes: string | null;
    }[];
  }[];
}
```

**Issues to fix:**
- ✅ Fix chapterNumber → order
- ✅ Add enrollmentId
- ✅ Add chapter code
- ✅ Compute status field
- ✅ Parse firstName/lastName

---

### POST /api/batches/:batchId/students/:studentId/evaluate

**Purpose:** Update student proficiency (create or update)

**Authentication:** Instructor only

**Request Body:**
```typescript
{
  chapterId: number;              // Required
  proficiencyLevel: 0|1|2|3|4|-1; // Required, -1 for absent
  notes?: string;                 // Optional
}
```

**Validation Required:**
- ✅ studentId: Must be valid user with 'student' role
- ✅ chapterId: Must exist and belong to batch.trackId
- ✅ proficiencyLevel: Must be 0-4 or -1
- ✅ studentId: Must be enrolled in batch

**Response:**
```typescript
{
  id: number;
  studentId: string;
  chapterId: number;
  proficiencyLevel: number;
  lastEvaluatedAt: string;  // ISO timestamp
  evaluatedBy: string;
  notes: string | null;
}
```

**Performance:**
- Current: Creates/updates one at a time
- Recommendation: Consider batch updates later (Phase 3)

---

### POST /api/batches/:batchId/enrollments

**Purpose:** Enroll student in batch

**Authentication:** Instructor only

**Request Body:**
```typescript
{
  studentId: string;
}
```

**Validation:**
- ✅ studentId: Valid student user
- ✅ studentId: Not enrolled in another active batch
- ✅ Instructor has permission to enroll in batch

**Response:**
```typescript
{
  id: number;
  batchId: number;
  studentId: string;
  status: 'active';
  enrolledAt: string;
  enrolledBy: string;
}
```

---

### DELETE /api/batches/:batchId/enrollments/:enrollmentId

**Purpose:** Drop student from batch

**Authentication:** Instructor only

**Request Body:**
```typescript
{
  droppedReason?: string;
}
```

**Response:**
```typescript
{
  id: number;
  status: 'dropped';
  droppedAt: string;
  droppedReason: string | null;
}
```

---

### GET /api/batches/:batchId/enrollments/eligible

**Purpose:** Get students eligible for enrollment (not enrolled in any batch)

**Authentication:** Instructor only

**Query Parameters:**
```
?search=anya&limit=50&offset=0
```

**Response:**
```typescript
{
  students: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
```

---

## Implementation Plan

### Phase 2A: Fix Critical Bugs (1-2 hours)

1. **Fix getBatchProgress response**
   - [ ] Replace `chapters.chapterNumber` with `chapters.order`
   - [ ] Add `enrollmentId` to response
   - [ ] Parse studentName into firstName/lastName
   - [ ] Add chapter code (decide approach: DB column vs. derived)
   - [ ] Compute status field from proficiencyLevel
   - [ ] Add type definitions for response

2. **Add validation to evaluateStudent**
   - [ ] Validate proficiencyLevel range
   - [ ] Validate student is enrolled in batch
   - [ ] Validate chapter belongs to batch's track
   - [ ] Return proper error codes

### Phase 2B: Database Schema Updates (30 mins)

1. **Add chapter.code column** (if chosen approach)
   - [ ] Add migration to add `code` varchar column
   - [ ] Make code unique per track (track_id, code UNIQUE)
   - [ ] Populate codes for existing chapters

2. **Add indexes**
   - [ ] Index on (batchId, studentId) for enrollment queries
   - [ ] Index on (chapterId, trackId) for chapter queries
   - [ ] Unique constraint on studentProgress (studentId, chapterId)

3. **Make studentProgress.batchId NOT NULL** (optional)
   - [ ] Decision: Should batch context be required?

### Phase 2C: Update Services & Types (1-2 hours)

1. **Update batch-cohort storage.ts**
   - [ ] Fix getBatchProgress to return correct shape
   - [ ] Add transformations for frontend compatibility

2. **Update shared types**
   - [ ] Export response types for endpoints
   - [ ] Document expected shape

3. **Add type safety**
   - [ ] Create API response types
   - [ ] Add validation schemas using Drizzle/Zod

### Phase 2D: Wire Frontend to Backend (1-2 hours)

1. **Create API hooks** (in client/src/new-ui/batches/hooks/)
   - [ ] useBatchProgress() - GET /api/batches/:id/progress
   - [ ] useUpdateProficiency() - POST /evaluate
   - [ ] useEnrollStudent() - POST /enrollments
   - [ ] useDropStudent() - DELETE /enrollments/:id
   - [ ] useEligibleStudents() - GET /eligible

2. **Update BatchDetails component**
   - [ ] Replace mock data with API calls
   - [ ] Handle loading states
   - [ ] Handle error states
   - [ ] Add refetch logic after mutations

3. **Update Matrix component**
   - [ ] Wire proficiency update callback
   - [ ] Wire enroll/drop callbacks
   - [ ] Add optimistic updates (optional)

### Timeline

```
Phase 2A: Fix Bugs              1-2 hours
Phase 2B: Schema Updates        30 mins
Phase 2C: Update Services       1-2 hours
Phase 2D: Wire Frontend         1-2 hours
         ──────────────────
         TOTAL              4-6 hours (plus testing)
```

---

## Questions for Clarification

### Database Schema Questions

1. **Chapter Code**
   - Should we add a `code` column to chapters?
   - Or derive it (e.g., slugify title, use order number)?
   - Example codes: 'INTRO', 'MANTRA_1', 'CH_001'?

2. **Proficiency Status Field**
   - How should we map proficiencyLevel to status?
   - Proposed mapping:
     - -1 → 'absent'
     - 0 → 'practicing'
     - 1-2 → 'completed'
     - 3 → 'ready'
     - 4 → 'certified'
   - Is this correct?

3. **Multiple Instructors Evaluating Same Chapter**
   - Keep just last evaluator (current), or track history?
   - Do we need audit trail of all proficiency changes?

### Frontend Integration Questions

4. **Refetch Strategy**
   - After updating proficiency, should we:
     - A) Refetch entire batch progress (slow)
     - B) Update local state (requires frontend update logic)
     - C) Use optimistic updates with fallback
   - Recommendation?

5. **Track Selection Without Batch Track Assignment**
   - If batch has no track assigned, can user select chapters?
   - Does matrix show no data, or error?
   - Who is responsible for assigning batch to track?

6. **Error Handling for Invalid Operations**
   - What if instructor tries to enroll a student already in batch?
   - What if instructor tries to evaluate a student not in batch?
   - What if chapter not in batch's track?
   - Should frontend prevent these or should backend return specific error codes?

### Performance Questions

7. **Batch Size**
   - Typical batch size: 10-50 students?
   - Typical track size: 5-20 chapters?
   - Need pagination for large batches?

8. **Query Performance**
   - getBatchProgress does:
     - 1 batch lookup
     - 1 enrollments join
     - 1 chapters query
     - 1 studentProgress query
   - Acceptable performance for 50 students × 20 chapters?

---

## Summary

The Unified Batch Matrix has a solid foundation:
- ✅ Database schema mostly complete
- ✅ Progress tracking endpoint exists
- ✅ Evaluation endpoint exists
- ⚠️ Several bugs need fixing
- ⚠️ Response shape needs alignment
- ⚠️ Missing chapter.code field

**Next Step:** Address questions above, then proceed with Phase 2A (bug fixes).

