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

### 1. User Registration & Account Creation (Open Registration + Approval)

#### Current Process
1. Students discover program via word-of-mouth/social channels
2. Sign up using **Google Forms survey** (external to LMS) - vetting process
3. Admin reviews applications offline
4. Admin approves application → requests student to create LMS account
5. **Student self-registers** in LMS (open registration, like any standard app)
6. Admin sees approval queue → approves only vetted users → auto-assigns **'student'** role
7. Admin can reject/ignore unvetted users (permanently deleted)
8. Admin can later assign additional roles as needed

#### System Rules
- **Open Registration:** Users can self-register accounts (standard signup flow)
- **Approval Queue:** Admin sees all pending accounts waiting for approval
- **Conditional Approval:** Admin approves only users who passed Google Forms vetting
- **Rejection Flow:** Admin can permanently delete unvetted/rejected accounts
- **Auto Role Assignment:** Account approval auto-assigns 'student' role
- **Flexible Roles:** Admin can assign any combination of: student, instructor, content_manager, admin
- **Pre-Approval Security:** Unapproved users **cannot log in** (auth blocked at login)
- **Batch-Gated Content:** Approved students can't see tracks/chapters until assigned to a batch

**Impact on Identity Module:**
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;       // For self-registration
  roles: ('student' | 'instructor' | 'content_manager' | 'admin')[];
  status: 'pending_approval' | 'active' | 'inactive';
  // pending_approval = registered but not vetted
  // active = admin-approved, can log in
  // inactive = suspended/disabled
  createdAt: timestamp;
  approvedAt?: timestamp;
  approvedBy?: string;        // adminId
}

// Registration flow (open)
async registerAccount(email, password): Promise<User> {
  // Anyone can register
  const user = await createUser({
    email,
    passwordHash: await hash(password),
    roles: [],
    status: 'pending_approval'
  });
  // Notify admin of new pending account
  eventBus.publish('UserAccountCreated', { userId: user.id, email });
  return user;
}

// Login blocked for unapproved users
async login(email, password): Promise<Session> {
  const user = await authenticateCredentials(email, password);
  
  if (user.status === 'pending_approval') {
    throw new AuthError(
      'PENDING_APPROVAL',
      'Your account is awaiting admin approval. You will receive an email when activated.'
    );
  }
  
  if (user.status === 'inactive') {
    throw new AuthError('ACCOUNT_DISABLED', 'Your account has been disabled.');
  }
  
  return createSession(user);
}

// Admin approval workflow
async approveUserAccount(userId, adminId): Promise<User> {
  const user = await updateUser(userId, {
    roles: ['student'],
    status: 'active',
    approvedAt: new Date(),
    approvedBy: adminId
  });
  // Send welcome email to user
  eventBus.publish('UserAccountApproved', { userId, email: user.email });
  return user;
}

// Admin rejection (permanent delete)
async rejectUserAccount(userId, adminId): Promise<void> {
  await deleteUser(userId);
  eventBus.publish('UserAccountRejected', { userId, rejectedBy: adminId });
}

async assignRoleToUser(userId, role): Promise<User> {
  const user = await getUser(userId);
  const updatedRoles = [...user.roles, role];
  return await updateUser(userId, { roles: updatedRoles });
}
```

---

### 2. Batch Formation & Lifecycle (Social Grouping for Instruction)

#### Current Process
1. Admin creates batch for a track
2. Admin assigns instructor(s) to batch
   - **Primary Instructor:** Main teacher (ONE per batch)
   - **Secondary Instructors:** Additional teachers (NOT TAs) with identical privileges
3. Admin assigns students to batch
4. Batch begins instruction (no capacity constraints)
5. Students can switch batches based on schedule/convenience

#### System Rules
- **No Capacity Limits:** Batch can start/run with any number of students
- **Track-Specific:** Each batch teaches ONE track, not mixed curriculum
- **Flexible Pacing:** No time limits; instructor-driven pace
- **Fluid Assignment:** Students can move between batches freely (admin-controlled)
- **Instructor Pool:** Any user with 'instructor' role can be assigned
- **Primary/Secondary Model:** One primary + multiple secondary instructors per batch
- **Identical Privileges:** Primary and secondary instructors have same system permissions
- **Batch as Social Group:** Defines WHO and WHEN students learn together, not WHAT they've achieved

**Impact on Batch Module:**
```typescript
interface Batch {
  id: number;
  trackId: number;                  // REQUIRED - batch teaches one track
  name: string;                     // e.g., "Evening Batch - Track 1"
  status: 'active' | 'completed' | 'archived';
  primaryInstructorId: string;      // ONE primary instructor
  secondaryInstructorIds: string[]; // Multiple secondary instructors (not TAs)
  createdBy: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}

interface BatchEnrollment {
  id: number;
  batchId: number;
  studentId: string;
  status: 'active' | 'dropped' | 'completed';
  enrolledAt: timestamp;
  enrolledBy: string;  // adminId
}

// Batch is fluid - students can be reassigned
async assignStudentToBatch(batchId, studentId, adminId): Promise<void> {
  // Remove from other batches for same track (if any)
  await deactivateEnrollmentsForTrack(studentId, batch.trackId);
  
  // Create new enrollment
  await createEnrollment({
    batchId,
    studentId,
    status: 'active',
    enrolledBy: adminId
  });
}

// When student leaves batch, they disappear from instructor's view
async transferStudentToBatch(studentId, fromBatchId, toBatchId, adminId): Promise<void> {
  // Mark old enrollment as dropped
  await updateEnrollment(fromBatchId, studentId, { status: 'dropped' });
  
  // Create new enrollment
  await assignStudentToBatch(toBatchId, studentId, adminId);
  
  // Student's progress is preserved (cumulative across batches)
}

async assignInstructorToBatch(batchId, instructorId, isPrimary, adminId): Promise<void> {
  if (isPrimary) {
    await updateBatch(batchId, { primaryInstructorId: instructorId });
  } else {
    await addSecondaryInstructor(batchId, instructorId);
  }
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

### 3. Proficiency Levels (0-4) - Instructor-Driven, Cumulative Progress

#### Level Definitions
| Level | Meaning | Notes |
|-------|---------|-------|
| **0** | Not started | Initial state |
| **1** | Basic proficiency | Instructor-assigned |
| **2** | Working proficiency | Gate for next track access |
| **3** | Advanced proficiency | Instructor-assigned |
| **4** | Mastery/Certified | Instructor-assigned (typically after oral exam, external process) |

#### Critical Rules
- **Instructor-Only Control:** Only primary/secondary instructors can set levels (admins are NOT involved)
- **Batch-Context Authorization:** Instructors can only update students in their assigned batches
- **Cumulative Progress:** Progress is at **student + chapter** level, NOT batch-scoped
- **Progress Preservation:** When student switches batches, their progress stays (doesn't reset)
- **No Validation:** Levels can be set in any order (0→4, 4→1, etc.) - instructor discretion
- **Trust-Based:** System doesn't enforce prerequisites or sequential level increases
- **Track Gating:** Student can access Track N+1 only if all Track N chapters ≥ level 2
- **Certification (External):** Level 4 typically after oral exam, but process is outside system

**Impact on Progress Module:**
```typescript
interface StudentProgress {
  id: number;
  studentId: string;            // PK component
  chapterId: number;            // PK component
  proficiencyLevel: 0 | 1 | 2 | 3 | 4;
  lastEvaluatedAt: timestamp;
  lastEvaluatedBy: string;      // instructorId who made last update
  notes: string;                // Instructor feedback
  createdAt: timestamp;
  updatedAt: timestamp;
  // NO batchId - progress is cumulative across batches
}

// Authorization based on batch, but progress is student-level
async updateStudentProgress(
  batchId: number,
  studentId: string,
  chapterId: number,
  proficiencyLevel: number,
  instructorId: string
): Promise<StudentProgress> {
  const batch = await getBatch(batchId);
  
  // Verify instructor is assigned to batch (primary or secondary)
  const isAuthorized = batch.primaryInstructorId === instructorId ||
                       batch.secondaryInstructorIds.includes(instructorId);
  if (!isAuthorized) throw new Error('Not authorized to update this batch');
  
  // Verify student is enrolled in this batch
  const enrollment = await getEnrollment(batchId, studentId);
  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('Student not in batch');
  }
  
  // Update progress (upsert - creates or updates existing)
  // Progress is NOT scoped to batch, but authorization uses batch context
  return await upsertStudentProgress({
    studentId,
    chapterId,
    proficiencyLevel,
    lastEvaluatedBy: instructorId,
    lastEvaluatedAt: new Date(),
    notes: notes || ''
  });
}

// Track access gating - system-enforced
async canAccessTrack(studentId: string, trackId: number): Promise<boolean> {
  // Track 1 is always accessible
  if (trackId === 1) return true;
  
  const previousTrackId = trackId - 1;
  
  // Get all chapters in previous track
  const prevTrackChapters = await getChaptersForTrack(previousTrackId);
  
  // Check if student achieved level 2+ on ALL chapters
  const progressRecords = await Promise.all(
    prevTrackChapters.map(ch => getStudentProgressForChapter(studentId, ch.id))
  );
  
  const allCompleted = progressRecords.every(p => p && p.proficiencyLevel >= 2);
  
  return allCompleted;
}

// Get student's visible tracks based on cumulative progress
async getAccessibleTracks(studentId: string): Promise<Track[]> {
  const allTracks = await getAllTracks();
  
  const accessibleTracks = [];
  for (const track of allTracks) {
    const canAccess = await canAccessTrack(studentId, track.id);
    if (canAccess) {
      accessibleTracks.push(track);
    } else {
      break; // Stop at first inaccessible track (sequential gating)
    }
  }
  
  return accessibleTracks;
}
```

**Admin Responsibilities (Limited):**
- Create batches
- Assign students to batches
- Assign primary/secondary instructors to batches
- **NOT involved in student progress updates** (only instructors)

---

### 4. Track Progression Logic (System-Enforced Gating)

#### Sequential Track Model with Progress-Based Access
- 8 tracks total (Track 1 → Track 2 → ... → Track 8)
- **System-Enforced Gate:** Student can access Track N+1 only if all Track N chapters ≥ level 2
- **Track Access ≠ Batch Assignment:** Track visibility is progress-based; batch assignment is schedule-based
- **Progress Preservation:** All student progress is cumulative and persists across batch changes
- **Batch Switching:** Students can move between batches (same track or different track) for scheduling convenience

**Key Architectural Distinction:**
```
PROGRESS (What student has achieved)
  ↓
  Student-level, cumulative, gates track access
  Stored in: student_progress (studentId, chapterId, proficiencyLevel)
  
BATCH (Where/when student learns)
  ↓
  Social grouping, defines who can evaluate progress
  Stored in: enrollments (batchId, studentId, status)
```

**Impact on Learning & Batch Modules:**
```typescript
// Track access based on INDIVIDUAL progress (not batch)
async getVisibleTracksForStudent(studentId: string): Promise<Track[]> {
  const allTracks = await getAllTracks();
  const visibleTracks = [];
  
  for (const track of allTracks) {
    const canAccess = await canAccessTrack(studentId, track.id);
    if (canAccess) {
      visibleTracks.push(track);
    } else {
      break; // Sequential gating - stop at first locked track
    }
  }
  
  return visibleTracks;
}

// Batch enrollment - admin can assign to any batch
// (even if student hasn't unlocked that track - admin override for special cases)
async enrollStudentInBatch(batchId: number, studentId: string, adminId: string): Promise<void> {
  const batch = await getBatch(batchId);
  
  // Warn if student hasn't unlocked this track yet (but allow)
  const canAccessTrack = await canAccessTrack(studentId, batch.trackId);
  if (!canAccessTrack) {
    console.warn(`Admin override: Enrolling student ${studentId} in Track ${batch.trackId} without prerequisite completion`);
  }
  
  // Check: Student not already in another batch for same track
  const existingEnrollment = await getActiveEnrollmentForTrack(studentId, batch.trackId);
  if (existingEnrollment) {
    throw new Error(`Student already enrolled in batch ${existingEnrollment.batchId} for this track`);
  }
  
  // Create enrollment
  await createEnrollment({
    batchId,
    studentId,
    status: 'active',
    enrolledBy: adminId
  });
}

// Student view - shows only unlocked tracks
async getStudentDashboard(studentId: string): Promise<Dashboard> {
  const visibleTracks = await getVisibleTracksForStudent(studentId);
  const currentBatch = await getCurrentBatchForStudent(studentId);
  const progressSummary = await getProgressSummary(studentId);
  
  return {
    visibleTracks,      // Based on progress gating
    currentBatch,       // Social context (where student attends classes)
    progressSummary     // Overall achievement
  };
}

// Instructor view - sees only students in their assigned batches
async getInstructorDashboard(instructorId: string): Promise<InstructorDashboard> {
  const assignedBatches = await getBatchesForInstructor(instructorId);
  
  const batchesWithStudents = await Promise.all(
    assignedBatches.map(async batch => {
      const enrollments = await getActiveEnrollments(batch.id);
      const studentsWithProgress = await Promise.all(
        enrollments.map(async e => {
          const student = await getUser(e.studentId);
          const progress = await getProgressForTrack(e.studentId, batch.trackId);
          return { student, progress };
        })
      );
      return { batch, students: studentsWithProgress };
    })
  );
  
  return { batches: batchesWithStudents };
}
```

**Student Learning Flow:**
```
1. Student registers → approved → assigned to Batch A (Track 1)
   ↓
2. Student can see only Track 1 (Track 2-8 locked)
   ↓
3. Primary/Secondary instructors in Batch A evaluate chapters
   ↓
4. Once all Track 1 chapters ≥ level 2 → Track 2 unlocked
   ↓
5. Student wants to switch to Batch C (schedule conflict)
   ↓
6. Admin reassigns: Batch A → Batch C (same track or next track)
   ↓
7. Progress preserved; Batch C instructors can now evaluate
   ↓
8. When student leaves Batch A, they disappear from Batch A instructor view
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

## Key Takeaways

1. **Batches are Track-Specific:** Not flexible groupings - each batch teaches exactly one track
2. **Multi-Role Users:** Students can be instructors; roles are not mutually exclusive
3. **Sequential Track Progression:** Strict prerequisites - can't skip tracks
4. **Proficiency Levels Have Meaning:** Not arbitrary - specific percentages and gates
5. **Instructor = Advanced Student:** Teaching qualification based on current track
6. **Certification is Separate Workflow:** Oral exam + bulk level update + certificate generation
7. **Chapter-Level Progress Only:** Simpler than originally designed - no segment tracking needed
8. **Capacity-Based Batch Formation:** Batches don't start until minimum enrollment met

---

**Next Steps:**
1. Review and validate these domain rules with stakeholders
2. Update schema definitions in `shared/schema.ts`
3. Create certification module structure
4. Update existing progress tracking to match proficiency semantics
5. Implement track progression logic

---

**Questions for Clarification:**
1. Can a student be enrolled in multiple batches simultaneously (for different tracks)?
2. What happens if a student fails the oral exam? Can they retake immediately?
3. Can instructors give level 4 without oral exam, or is level 4 exclusively for certified students?
4. Is there a time limit for completing a track, or purely proficiency-based?
5. Can students drop out mid-batch? What happens to their progress?
6. How are instructors selected/assigned to new batches? First-come-first-serve or admin picks best fit?
