# ADR-001 ADDENDUM: Domain-Specific Requirements

**Date:** 2025-12-16  
**Context:** Real-world Veda Pathasala operational model

---

## Domain Context: Traditional Vedic Learning Model

### Educational Structure
- **8 Sequential Tracks** (like semesters, but self-paced)
- **Target Audience:** Working professionals (household men) pursuing Vedic study as part of Brahmin dharma
- **Flexible Pace:** Not time-bound like traditional semesters, instructor-driven
- **Prerequisite Model:** Must complete Track N before starting Track N+1 (soft, not enforced initially)
- **Institution Type:** Free, volunteer-run Vedic Pathasala (~130 active students)

---

## Key Domain Requirements

### 1. User Registration & Account Creation (External Process)

#### Current Process
1. Students discover program via word-of-mouth
2. Sign up using **Google Forms survey** (external to LMS)
3. Admin reviews applications offline
4. Admin approves application → sends WhatsApp/message to student
5. Student creates account in LMS
6. Admin approves account in LMS → auto-assigns **'student'** role
7. Admin can later assign additional roles as needed

#### System Rules
- **No Self-Enrollment:** All user creation is admin-controlled
- **Auto Role Assignment:** Account approval auto-assigns 'student' role
- **Flexible Roles:** Admin can assign any combination of: student, instructor, content_manager, admin
- **External Workflow:** Application review process stays in Google Forms/spreadsheets
- **No System Enforcement:** Trust-based, flexibility prioritized

**Impact on Identity Module:**
```typescript
interface User {
  id: string;
  email: string;
  roles: ('student' | 'instructor' | 'content_manager' | 'admin')[];
  status: 'pending_approval' | 'active' | 'inactive';  // Pending = approved account, needs admin activation
  // No track context here - roles don't imply track level
}

// Admin workflow
async approveUserAccount(userId): Promise<User> {
  // Approve account → auto-assign student role
  const user = await updateUser(userId, {
    roles: ['student'],
    status: 'active'
  });
  eventBus.publish('UserAccountApproved', { userId, roles: ['student'] });
  return user;
}

async assignRoleToUser(userId, role): Promise<User> {
  // Admin can assign any role to existing user
  const user = await getUser(userId);
  const updatedRoles = [...user.roles, role]; // Add new role
  return await updateUser(userId, { roles: updatedRoles });
}
```

---

### 2. Batch Formation & Lifecycle

#### Current Process
1. Admin creates batch for a track
2. Admin assigns instructor(s) to batch
   - **Primary Instructor:** Main teacher for the batch
   - **Co-Instructors:** Teaching assistants (TAs) with same system privileges as instructor
3. Admin assigns students to batch
4. Batch begins instruction (no capacity constraints)

#### System Rules
- **No Capacity Limits:** Batch can start/run with any number of students
- **Track-Specific:** Each batch teaches ONE track, not mixed curriculum
- **Flexible Pacing:** No time limits; instructor-driven pace
- **Flexible Assignment:** Students/instructors can be reassigned between batches
- **Instructor Pool:** Any user with 'instructor' role can be assigned to teach
- **Co-Instructor Model:** Users with 'instructor' role assigned to batch as co-instructors have same privileges (TAs)

**Impact on Batch Module:**
```typescript
interface Batch {
  id: number;
  trackId: number;              // REQUIRED - batch teaches one track
  name: string;                 // e.g., "Fall 2025 Track 1 Batch A"
  status: 'active' | 'completed' | 'archived';
  //       ^^^^^^ Simple status - no formation constraints
  instructorId: string;         // Primary instructor/teacher
  coInstructorIds: string[];    // Co-instructors (TAs) - same privileges in code
  createdBy: string;
  createdAt: timestamp;
  updatedAt: timestamp;
  // No: minStudents, maxStudents, startedAt, completedAt, certifiedAt
}

// Business Logic
canStartBatch(batchId): boolean {
  // No constraints - admin can start batch anytime
  return true;
}

// Simple assignment tracking
async assignStudentToBatch(batchId, studentId, assignedBy): Promise<void> {
  // Create enrollment record
  // No duplicate check - admin can reassign as needed
}

async assignInstructorToBatch(batchId, instructorId, isPrimary, assignedBy): Promise<void> {
  // If isPrimary=true, set as primary instructor
  // If isPrimary=false, add to co-instructors
  // Same system privileges for both
}
```

---

### 2. Multi-Role User Model - Confirmed

#### Role-Based Access (Simple Checkbox Model)
- Roles are **independent flags** - no hierarchy
- User can have ANY combination: student, instructor, content_manager, admin
- No automatic relationship between roles (e.g., instructor doesn't imply student)
- Admin assigns roles as needed; roles don't relate to track level

#### User Roles
```typescript
interface User {
  id: string;
  email: string;
  roles: ('student' | 'instructor' | 'content_manager' | 'admin')[];
  status: 'pending_approval' | 'active' | 'inactive';
  
  // NO track context - roles are independent of tracks
  // Track context comes from batch assignment only
}

type UserRole = 'student' | 'instructor' | 'content_manager' | 'admin';

// Role meanings
// 'student' → Can view published content, submit/view own progress
// 'instructor' → Can view/update progress for students in assigned batches, update grades
// 'content_manager' → Can create/edit/publish content (tracks, chapters, segments, audio)
// 'admin' → Full system access - users, batches, settings, everything
```

**Authorization Examples:**
```typescript
// Simple role checking - no track context
canUpdateStudentProgress(userId, batchId): boolean {
  const user = await getUser(userId);
  const batch = await getBatch(batchId);
  
  // User must have 'instructor' role AND (be primary instructor OR co-instructor in batch)
  const hasInstructorRole = user.roles.includes('instructor');
  const isAssignedToBatch = batch.instructorId === userId || 
                            batch.coInstructorIds.includes(userId);
  
  return hasInstructorRole && isAssignedToBatch;
}

// Content editing - role-based only
canEditContent(userId): boolean {
  const user = await getUser(userId);
  return user.roles.includes('content_manager') || user.roles.includes('admin');
}
```

---

### 3. Proficiency Levels (0-4) - Instructor-Driven, No Enforcement

#### Level Definitions
| Level | Meaning | Notes |
|-------|---------|-------|
| **0** | Not started | Initial state |
| **1** | Basic proficiency | Instructor-assigned |
| **2** | Working proficiency | Instructor-assigned |
| **3** | Advanced proficiency | Instructor-assigned |
| **4** | Mastery/Certified | Instructor-assigned (typically after oral exam, but system doesn't enforce) |

#### Critical Rules (Minimal Initially)
- **Instructor Control:** Only instructors (or admin) can set levels for students in their batch
- **No Validation:** Levels can be set in any order (0→4, 4→1, etc.) - no sequential enforcement
- **Trust-Based:** Instructor has full discretion; system doesn't enforce prerequisites or gates
- **Track Completion (Future):** Eventually may track "all chapters ≥ level 2" for next track eligibility, but not enforced now
- **Certification (Outside System):** Level 4 is typically given after student passes oral exam, but this process is external

**Impact on Progress Module:**
```typescript
interface StudentProgress {
  id: number;
  studentId: string;
  chapterId: number;
  batchId: number;              // Progress tied to batch context
  proficiencyLevel: 0 | 1 | 2 | 3 | 4;
  lastEvaluatedAt: timestamp;
  evaluatedBy: string;          // instructorId or admin
  notes: string;                // Instructor feedback/observations
  createdAt: timestamp;
  updatedAt: timestamp;
}

// Simple business logic - no enforcement
async updateStudentProgress(
  batchId: string,
  studentId: string,
  chapterId: number,
  proficiencyLevel: number,
  instructorId: string
): Promise<StudentProgress> {
  // Validate:
  // 1. Instructor is assigned to this batch (primary or co-instructor)
  // 2. Student is assigned to this batch
  // That's it - no other validation
  
  const batch = await getBatch(batchId);
  const isAuthorized = batch.instructorId === instructorId || 
                       batch.coInstructorIds.includes(instructorId);
  
  if (!isAuthorized) throw new Error('Not authorized');
  
  // Update progress - any level to any level allowed
  return await createOrUpdateProgress({
    studentId,
    chapterId,
    batchId,
    proficiencyLevel,
    evaluatedBy: instructorId,
    lastEvaluatedAt: new Date()
  });
}

// No gates/restrictions
canProgressToNextTrack(studentId, currentTrackId): boolean {
  // Return true - system doesn't enforce track progression yet
  // Can be added later when stabilized
  return true;
}

canTakeOralExam(studentId, trackId): boolean {
  // Not implemented - exams are external
  // Can be added later
  return null;
}
```

**Future Business Rules (Add Later When Stabilized):**
- Track completion gate: all chapters ≥ level 2
- Exam eligibility gate: all chapters ≥ level 3
- Auto-progression when all chapters reach certain levels
- Progress reports for instructors

---

### 4. Track Progression Logic (Flexible, Not Enforced Initially)

#### Sequential Track Model
- 8 tracks total (Track 1 → Track 2 → ... → Track 8)
- **Soft Prerequisite:** Students should complete Track N before moving to Track N+1 (not enforced by system)
- **Flexible Assignments:** Admin can assign students to any batch regardless of previous completion
- **Progress Preservation:** When students drop out and return later, their previous progress is preserved
- **Batch-Based Learning:** Students learn in batches; admin moves them between batches as needed

**Impact on Batch & Learning Modules:**
```typescript
// Soft prerequisite - informational only, not enforced
async canEnrollInBatch(studentId, batchId): Promise<boolean> {
  const batch = await getBatch(batchId);
  
  // Check: Is student enrolled in another batch for same track?
  const existingEnrollment = await getActiveEnrollmentForTrack(studentId, batch.trackId);
  if (existingEnrollment) {
    throw new Error('Already enrolled in a batch for this track');
  }
  
  // That's it - no prerequisite check
  // Admin can assign to any track batch if needed (e.g., returning student)
  return true;
}

// Progress preservation when student returns
async getStudentProgressSummary(studentId): Promise<ProgressSummary> {
  // Returns all progress across all batches and tracks
  // Used to help admin determine which batch to re-enroll student
  return {
    allProgress: await getAllProgressForStudent(studentId),
    completedTracks: await getCompletedTracks(studentId),
    currentBatch: await getCurrentBatchForStudent(studentId)
  };
}
```

**Admin Workflow:**
```
1. Student returns to LMS after time away
2. Admin checks student's progress summary
3. Admin sees: "Completed Track 1 and 2, 70% through Track 3 in old batch"
4. Admin can:
   a) Enroll student in a new Track 3 batch (starting fresh)
   b) Or create custom scenario if needed
5. Previous progress preserved for records
```

---

### 5. New Entities Required

#### Batches Table (Simplified - No Capacity/Formation Constraints)
```sql
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Instructors
  instructor_id VARCHAR(255) NOT NULL REFERENCES users(id),  -- Primary instructor
  -- co_instructors handled in junction table (see below)
  
  status VARCHAR(50) DEFAULT 'active' NOT NULL,  -- 'active', 'completed', 'archived'
  
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batches_track ON batches(track_id);
CREATE INDEX idx_batches_instructor ON batches(instructor_id);
CREATE INDEX idx_batches_status ON batches(status);
```

#### Batch Co-Instructors Junction Table
```sql
CREATE TABLE batch_co_instructors (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  instructor_id VARCHAR(255) NOT NULL REFERENCES users(id),
  
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(255) NOT NULL REFERENCES users(id),
  
  UNIQUE(batch_id, instructor_id)  -- One co-instructor assignment per batch
);

CREATE INDEX idx_batch_co_instructors_batch ON batch_co_instructors(batch_id);
CREATE INDEX idx_batch_co_instructors_instructor ON batch_co_instructors(instructor_id);
```

#### Enrollments Table (Simplified)
```sql
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  
  status VARCHAR(50) DEFAULT 'active' NOT NULL,  -- 'active', 'dropped', 'completed'
  
  enrolled_at TIMESTAMP DEFAULT NOW(),
  enrolled_by VARCHAR(255) NOT NULL REFERENCES users(id),
  
  UNIQUE(batch_id, student_id)  -- One enrollment per student per batch (but can have multiple across batches)
);

CREATE INDEX idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

#### Student Progress Table (Enhanced - No Validation/Gates)
```sql
ALTER TABLE student_progress
  ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  ADD COLUMN last_evaluated_at TIMESTAMP,
  ADD COLUMN evaluated_by VARCHAR(255) REFERENCES users(id),
  ADD COLUMN notes TEXT;

CREATE INDEX idx_student_progress_batch ON student_progress(batch_id);
CREATE INDEX idx_student_progress_evaluated_by ON student_progress(evaluated_by);
```

#### Removed: Certificates & Oral Exams Tables
- **Reason:** Certification process is external (Excel/WhatsApp)
- **Future:** Can add when process becomes unmanageable (current: ~130 students)

---

### 6. Updated Module Responsibilities

#### Batch & Cohort Module (Simplified)
**Responsibilities:**
- Create/update/delete batches (track-specific)
- Assign primary instructor to batch
- Manage co-instructor assignments
- Assign/remove students from batches
- Query batches by instructor/track/status
- Get batch roster with current enrollments
- Support flexible reassignments (no constraints)

**No Responsibilities:**
- Capacity validation
- Prerequisite checking
- Progress gates/completion calculations
- Exam scheduling

#### Learning & Progress Module (Simplified)
**Responsibilities:**
- Allow instructors to view/update student progress per chapter
- Get student progress across all batches/tracks
- Preserve progress when students drop out or switch batches
- Generate progress summaries for students/instructors
- Simple reporting (proficiency by chapter, by track)

**No Responsibilities:**
- Level sequencing validation
- Track completion gates
- Certification workflows
- Exam integration

#### Identity & Access Module (Enhanced)
**Responsibilities:**
- User authentication (Replit Auth)
- Account approval workflow (pending → active)
- Role assignment (any combination of: student, instructor, content_manager, admin)
- Role-based permission checking
- User invitation (admin invites volunteers to system)
- Session management

#### Removed: Certification Module
**Reason:** Certification process is external (Excel, WhatsApp, Saturday/Sunday slots)
**Future:** Can be added as a module when scale grows beyond 130 students and process becomes unmanageable

---

### 7. Key Business Rules Summary

| Rule | Module | Implementation | Enforced? |
|------|--------|-----------------|-----------|
| User roles are independent flags | Identity | Admin assigns any combination of roles | Yes |
| Account approval auto-assigns student role | Identity | Auto-role assignment on account approval | Yes |
| No self-enrollment - admin-controlled | Batch | Only admin can assign students to batches | Yes |
| No batch capacity limits | Batch | Batches can have any number of students | Yes |
| Single primary instructor, multiple co-instructors | Batch | Primary instructor field + co-instructor junction table | Yes |
| Co-instructors have same system privileges | Batch | Both checked in authorization logic | Yes |
| Instructors update student progress per chapter | Progress | Instructor role can update batch students' progress | Yes |
| No level sequencing validation | Progress | Levels can be set in any order (0→4, 4→1) | No enforcement |
| No track prerequisite enforcement | Batch | Admin can assign to any batch regardless of history | No enforcement |
| Progress preservation on dropout | Progress | All progress kept; soft delete (status='dropped') | Yes |
| Flexible batch reassignment | Batch | Students can move between batches freely | Yes |
| Certification is external | All | Not in system - handled via Excel/WhatsApp | N/A |

---

### 8. Updated Database Schema Changes

#### Users Table (Add Account Status, Simplified Roles)
```sql
ALTER TABLE users
  ADD COLUMN status VARCHAR(50) DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'active', 'inactive')),
  MODIFY COLUMN roles JSONB DEFAULT '["student"]';
  -- roles: array of 'student' | 'instructor' | 'content_manager' | 'admin'

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_roles ON users USING GIN(roles);
```

#### Batches Table (Simplified - No Capacity/Formation)
```sql
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id VARCHAR(255) NOT NULL REFERENCES users(id),  -- Primary
  status VARCHAR(50) DEFAULT 'active' NOT NULL,
    CHECK (status IN ('active', 'completed', 'archived')),
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batches_track ON batches(track_id);
CREATE INDEX idx_batches_instructor ON batches(instructor_id);
CREATE INDEX idx_batches_status ON batches(status);
```

#### Batch Co-Instructors (New)
```sql
CREATE TABLE batch_co_instructors (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  instructor_id VARCHAR(255) NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(255) NOT NULL REFERENCES users(id),
  UNIQUE(batch_id, instructor_id)
);

CREATE INDEX idx_batch_co_instructors_batch ON batch_co_instructors(batch_id);
CREATE INDEX idx_batch_co_instructors_instructor ON batch_co_instructors(instructor_id);
```

#### Enrollments Table (Simplified)
```sql
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active' NOT NULL,
    CHECK (status IN ('active', 'dropped', 'completed')),
  enrolled_at TIMESTAMP DEFAULT NOW(),
  enrolled_by VARCHAR(255) NOT NULL REFERENCES users(id),
  UNIQUE(batch_id, student_id)
);

CREATE INDEX idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
```

#### Student Progress Table (Enhanced)
```sql
ALTER TABLE student_progress
  ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  ADD COLUMN last_evaluated_at TIMESTAMP,
  ADD COLUMN evaluated_by VARCHAR(255) REFERENCES users(id),
  ADD COLUMN notes TEXT;

CREATE INDEX idx_student_progress_batch ON student_progress(batch_id);
CREATE INDEX idx_student_progress_evaluated_by ON student_progress(evaluated_by);
```

---

### 9. Updated API Endpoints

#### Simplified Endpoint Set (No Exam/Certification)
```
/api
├── /auth
│   ├── GET    /me                           # Current user
│   ├── POST   /logout                       # Logout
│
├── /users (Admin only)
│   ├── GET    /                             # List all users (with roles/status)
│   ├── POST   /invite                       # Invite new user (creates pending_approval)
│   ├── PATCH  /:userId/approve              # Approve account → auto-assign student role
│   ├── PATCH  /:userId/roles                # Add/remove roles (any combination)
│   ├── PATCH  /:userId/status               # Enable/disable user
│
├── /batches
│   ├── GET    /                             # List (filtered by role: own assignments)
│   ├── GET    /:batchId                     # Detail (if instructor/co-instructor/admin or enrolled)
│   ├── POST   /                             # Create batch (admin only)
│   ├── PATCH  /:batchId                     # Update batch (admin only)
│   ├── DELETE /:batchId                     # Delete batch (admin only)
│   │
│   ├── GET    /:batchId/roster              # Enrollments (instructor/admin only)
│   ├── POST   /:batchId/enroll              # Assign student (admin only)
│   ├── DELETE /:batchId/enroll/:studentId   # Remove student (admin only)
│   │
│   ├── POST   /:batchId/instructors         # Assign co-instructor (admin only)
│   └── DELETE /:batchId/instructors/:instructorId  # Remove co-instructor (admin only)
│
├── /progress
│   ├── GET    /me                           # Student's own progress
│   ├── GET    /student/:studentId           # Instructor/admin only (if in batch)
│   ├── PATCH  /student/:studentId/:chapterId # Update progress (instructor/admin for their batch)
│   │
│   ├── GET    /track/:trackId/summary       # Track completion summary
│   └── POST   /bulk-update                  # Bulk update (for future use)
│
├── [Existing endpoints: /tracks, /chapters, /audio, /segments, /mappings - unchanged]
│
└── /admin (Admin only)
    ├── GET    /settings                     # System settings
    ├── PATCH  /settings/:key                # Update setting
    └── GET    /audit-logs                   # Audit trail
```

**Removed Endpoints:**
- `/api/exams/*` - Not in system
- `/api/certificates/*` - Not in system
- `/api/batches/forming` - No formation status
- `/api/batches/:id/start` - No start action needed
- `/api/batches/:id/complete` - Status change is simple PATCH

---

### 10. Updated Permission Matrix

| Action | Student | Instructor | Content Manager | Admin | Notes |
|--------|---------|------------|-----------------|-------|-------|
| **Account Management** | | | | |
| Invite users | ❌ | ❌ | ❌ | ✅ | External process, admin final step |
| Approve accounts | ❌ | ❌ | ❌ | ✅ | Auto-assigns student role |
| Assign/remove roles | ❌ | ❌ | ❌ | ✅ | Any role to any user |
| **Batches** | | | | |
| View own batches | ✅ (enrolled) | ✅ (assigned) | ❌ | ✅ |
| View all batches | ❌ | ❌ | ❌ | ✅ |
| Create batch | ❌ | ❌ | ❌ | ✅ |
| Assign instructor | ❌ | ❌ | ❌ | ✅ |
| Assign co-instructors | ❌ | ❌ | ❌ | ✅ |
| Enroll students | ❌ | ❌ | ❌ | ✅ |
| Remove students | ❌ | ❌ | ❌ | ✅ |
| **Progress Tracking** | | | | |
| View own progress | ✅ | ✅ | ❌ | ✅ |
| View batch roster | ❌ | ✅ (assigned) | ❌ | ✅ |
| Update student progress | ❌ | ✅ (batch students) | ❌ | ✅ |
| **Content** | | | | |
| View published | ✅ | ✅ | ✅ | ✅ |
| View drafts | ❌ | ❌ | ✅ | ✅ |
| Create/edit/publish | ❌ | ❌ | ✅ | ✅ |
| Upload audio | ❌ | ❌ | ✅ | ✅ |
| Create segments/mappings | ❌ | ❌ | ✅ | ✅ |
| **Admin** | | | | |
| Manage settings | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ |

---

### 11. Updated Migration Strategy

#### Phase 1: Foundation (Week 1-2)
1. Create module folder structure
2. Implement RequestContext, EventBus, structured logger
3. Add authMiddleware, requireRole, validateRequest middleware
4. Create base service classes for each module
5. Add new database tables (batches, enrollments, batch_co_instructors)

#### Phase 2: Auth & Identity Module (Week 2-3)
1. Migrate user operations to identity-access/service.ts
2. Implement account approval workflow (pending_approval → active + auto student role)
3. Implement role assignment (admin can assign any roles)
4. Add user invitation flow
5. Update all routes to use authMiddleware

#### Phase 3: Content & Media Modules (Week 3-4)
1. Migrate content operations to content-publishing/service.ts
2. Migrate media operations to media-pipeline/service.ts
3. Add publish protection (prevent deletion of published chapters)
4. Add ownership checks for content modification
5. Emit domain events for key operations

#### Phase 4: Batch & Learning Modules (Week 4-6)
1. Implement batch CRUD (no capacity constraints)
2. Implement primary instructor + co-instructors
3. Create enrollment/assignment logic
4. Update progress tracking with batch context
5. Create progress view endpoints (roster, summaries)
6. Support flexible reassignments and dropouts

#### Phase 5: Admin & Cleanup (Week 6-7)
1. Update user management for flexible roles
2. Create audit logging for all sensitive operations
3. Implement system settings management
4. Deprecate/remove database-storage.ts and routes-simple.ts
5. Add integration tests per module

**No Certification Phase** - Exam/certificate functionality kept external

---

---

## Key Takeaways (Revised)

1. **User Registration is External:** Google Forms → Admin review → Admin account creation → Admin approval
2. **Flexible Role Model:** Roles are independent flags (student, instructor, content_manager, admin)
3. **No Role Hierarchy:** Any user can have any combination of roles; roles don't imply track levels
4. **Batch = Track-Specific Learning Group:** Admin assigns students + instructor(s) + co-instructors
5. **Primary + Co-Instructors:** Single primary instructor, multiple co-instructors as TAs (same system privileges)
6. **No Batch Capacity Constraints:** Can start/run batches with any number of students
7. **Instructor-Driven Pacing:** No time limits; instructor controls pace and progression
8. **Simple Progress Tracking:** Instructors set chapter proficiency levels (0-4), no validation initially
9. **Flexible Track Progression:** Admin can enroll students in any batch; soft prerequisites (not enforced)
10. **Progress Preservation:** Dropout progress saved; when student returns, placed in appropriate batch
11. **Certification is External:** Exams/certificates handled via Excel/WhatsApp (8 Saturday + 8 Sunday slots/week)
12. **Trust-Based System:** Minimal enforcement initially; can add business rules as processes stabilize
13. **Volunteer-Run Institution:** All roles (instructor, content_manager, admin) filled by volunteers
14. **Small Scale (130 students):** Simple Excel-based processes work today; will add complexity when needed

---

## Implementation Philosophy

> **Start simple, add rules only when needed.**

This architecture intentionally avoids complex enforcement because:
- Your processes are still evolving
- You have low volume (~130 students) - manual oversight works
- Trust-based operation (volunteers running the institution)
- Rules can be added incrementally as workload grows

As you scale or processes stabilize, you can add:
- Track prerequisite enforcement
- Level sequencing validation
- Batch capacity management
- Certification workflow
- Progress gates

---

## Next Steps

1. **Review and approve** this revised addendum
2. **Answer any clarification questions** (listed at end)
3. **Create data schema** in Drizzle with new tables
4. **Define DTO contracts** for each module (shared/types)
5. **Implement auth middleware** as top priority
6. **Create branch:** `feat/modular-architecture-phase1`
7. **Start with Phase 1** (foundation + auth)

---

## Clarification Questions (Updated)

These are refinements based on the simplified model - feel free to clarify:

1. **Account Approval:** When admin approves a pending account, should it automatically activate or should there be another step?

2. **Role Assignment Timing:** When should instructors/content_managers be assigned their roles?
   - At account approval?
   - Later, in separate step?
   - When assigning to first batch/content task?

3. **Co-Instructor Privileges:** Should co-instructors be able to:
   - Update student progress? (assumed yes, same as instructors)
   - Create/delete students from batch? (assumed no, admin only)
   - Create announcements for batch? (future feature)

4. **Dropout Handling:** When student drops out:
   - Should their enrollment status change to 'dropped'?
   - Can they re-enroll in same batch or new batch?
   - Is progress carried over if they re-enroll?

5. **Content Manager Scope:** Can content_managers:
   - Upload audio files and create segments?
   - Publish/unpublish chapters?
   - Only edit content but not publish? (workflow approval?)

6. **Progress View:** For instructor batch roster:
   - Show proficiency per chapter?
   - Show last accessed date per student?
   - Show instructor notes?
   - Show aggregate track progress?

7. **Batch Status Workflow:** Currently 'active' → 'completed' → 'archived'
   - When should batch move to 'completed'? (admin decision? or auto when all students done?)
   - Can completed batches be reopened?
   - Can students be re-enrolled in archived batches?

8. **Cross-Batch Progress:** If student enrolled in Track 1 batch, drops out, then re-enrolled in different Track 1 batch:
   - Previous progress shows in roster?
   - Start fresh or continue?

---

**Related Documents:**  
- [ADR-001-Modular-Monolith-Architecture.md](ADR-001-Modular-Monolith-Architecture.md) - Core architecture
- [shared/schema.ts](../../shared/schema.ts) - Existing database schema (to be updated)
- [PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md) - Current system overview
