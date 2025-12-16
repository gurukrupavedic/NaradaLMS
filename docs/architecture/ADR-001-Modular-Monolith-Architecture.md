# ADR-001: Modular Monolith Architecture & Authentication

**Status:** Draft  
**Date:** 2025-12-16  
**Decision Makers:** Product Team  
**Context:** Preparing for new personas (admin, instructor) while maintaining ability to split into microservices later

---

## Executive Summary

Transform VedicLMS from a single-layer Express app into a modular monolith with clear domain boundaries, role-based access control, and internal service contracts. This architecture supports immediate expansion (batches, instructor workflows, admin tools) while enabling future service extraction without rewrites.

---

## 1. Domain Module Structure

### 1.1 Module Definitions

#### **Identity & Access Module** (`server/modules/identity-access/`)
**Responsibilities:**
- User authentication (Replit Auth integration)
- Session management
- Role assignment and validation
- Permission/policy checks
- User profile CRUD
- Invitation system (admin invites users with roles)

**Core Entities:** `users`, `sessions`  
**Exports:** `AuthService`, `AuthMiddleware`, `PermissionGuard`

---

#### **Content & Publishing Module** (`server/modules/content-publishing/`)
**Responsibilities:**
- Track/chapter CRUD with ordering
- Multilingual content management (te/hi/en)
- Draft/published workflow with protection rules
- Text segmentation per script
- Content versioning/audit trail
- Ownership and edit rights

**Core Entities:** `tracks`, `chapters`, `textSegments`  
**Exports:** `ContentService`, `PublishingService`, `SegmentService`

---

#### **Media Pipeline Module** (`server/modules/media-pipeline/`)
**Responsibilities:**
- Audio file upload/storage
- Metadata extraction (duration, size, mime type)
- Media segment creation (timestamps)
- Segment-to-text mapping
- Future: transcoding, waveform generation, CDN integration

**Core Entities:** `audioFiles`, `mediaSegments`, `segmentMappings`  
**Exports:** `MediaService`, `UploadService`, `MappingService`

---

#### **Learning Delivery Module** (`server/modules/learning-delivery/`)
**Responsibilities:**
- Student content access (published chapters only)
- Learn mode rendering (interactive segments)
- Progress tracking (proficiency levels 0-4)
- Last accessed timestamps
- Student-facing APIs (read-heavy)

**Core Entities:** `studentProgress`, reads from `chapters`, `tracks`  
**Exports:** `LearningService`, `ProgressService`

---

#### **Batch & Cohort Module** (`server/modules/batch-cohort/`) *(NEW)*
**Responsibilities:**
- Batch creation and lifecycle (active/completed/archived)
- Student enrollment/unenrollment
- Instructor assignment to batches
- Batch-scoped progress aggregation
- Roster management
- Batch-level announcements/communications (future)

**Core Entities:** `batches`, `enrollments`, `batchInstructors`  
**Exports:** `BatchService`, `EnrollmentService`, `RosterService`

---

#### **System Administration Module** (`server/modules/system-admin/`) *(NEW)*
**Responsibilities:**
- System-wide settings (feature flags, configurations)
- User management UI support (list all users, change roles/status)
- Audit logs (who did what when)
- Data export/reporting
- System health monitoring endpoints

**Core Entities:** `systemSettings`, `auditLogs`  
**Exports:** `AdminService`, `AuditService`, `SettingsService`

---

### 1.2 Module Folder Structure

```
server/
├── modules/
│   ├── identity-access/
│   │   ├── service.ts          # AuthService, UserService
│   │   ├── middleware.ts       # authMiddleware, requireRole
│   │   ├── policies.ts         # Permission checking logic
│   │   ├── storage.ts          # User/session DB operations
│   │   ├── types.ts            # Module-specific DTOs
│   │   └── events.ts           # UserCreated, UserRoleChanged
│   │
│   ├── content-publishing/
│   │   ├── service.ts          # ContentService, PublishingService
│   │   ├── validation.ts       # Content validation rules
│   │   ├── storage.ts          # Track/chapter DB operations
│   │   ├── types.ts            # Content DTOs, ContentScript
│   │   └── events.ts           # ChapterPublished, ContentUpdated
│   │
│   ├── media-pipeline/
│   │   ├── service.ts          # MediaService, UploadService
│   │   ├── upload.ts           # Multer config, file handling
│   │   ├── storage.ts          # Audio/media DB operations
│   │   ├── types.ts            # Media DTOs, MappingWithTimestamps
│   │   └── events.ts           # AudioUploaded, MappingCreated
│   │
│   ├── learning-delivery/
│   │   ├── service.ts          # LearningService, ProgressService
│   │   ├── filters.ts          # Published-only content filters
│   │   ├── storage.ts          # Progress tracking DB operations
│   │   ├── types.ts            # Progress DTOs, ProficiencyLevel
│   │   └── events.ts           # ProgressUpdated, ChapterCompleted
│   │
│   ├── batch-cohort/          # NEW
│   │   ├── service.ts          # BatchService, EnrollmentService
│   │   ├── validation.ts       # Enrollment rules, capacity checks
│   │   ├── storage.ts          # Batch/enrollment DB operations
│   │   ├── types.ts            # Batch DTOs, EnrollmentStatus
│   │   └── events.ts           # BatchCreated, StudentEnrolled
│   │
│   └── system-admin/          # NEW
│       ├── service.ts          # AdminService, AuditService
│       ├── storage.ts          # Settings/audit DB operations
│       ├── types.ts            # Admin DTOs, AuditLogEntry
│       └── events.ts           # SettingChanged, AdminActionLogged
│
├── shared/
│   ├── middleware/             # Cross-module middleware
│   │   ├── error-handler.ts   # Global error handler
│   │   ├── request-context.ts # Request ID, user context
│   │   └── validation.ts      # Zod validation middleware
│   │
│   ├── events/
│   │   ├── event-bus.ts       # In-process event dispatcher
│   │   └── handlers.ts        # Cross-module event handlers
│   │
│   └── utils/
│       ├── logger.ts          # Structured logging
│       └── errors.ts          # Custom error classes
│
├── routes/                    # Route handlers (thin layer)
│   ├── identity.routes.ts
│   ├── content.routes.ts
│   ├── media.routes.ts
│   ├── learning.routes.ts
│   ├── batch.routes.ts
│   └── admin.routes.ts
│
├── database-storage.ts        # DEPRECATED - migrate to module storage
├── routes-simple.ts           # DEPRECATED - migrate to route modules
└── index.ts                   # App bootstrap
```

---

## 2. Authentication & Authorization Architecture

### 2.1 Core Concepts

#### **Authentication (AuthN):** Who are you?
- Handled by Replit Auth (OAuth-based)
- Session stored in PostgreSQL (`sessions` table)
- User record in `users` table with multi-role array

#### **Authorization (AuthZ):** What can you do?
- Role-Based Access Control (RBAC)
- Roles: `student`, `instructor`, `admin`, `publisher` (legacy/alias for admin)
- Permissions derived from role + resource ownership
- Policies enforce business rules (e.g., "can't delete published chapters")

---

### 2.2 Role Definitions

#### **Student**
- **Access:** Published tracks/chapters only
- **Actions:** View content, track own progress, submit proficiency updates
- **Restrictions:** Cannot see drafts, cannot modify content, cannot see other students' progress

#### **Instructor**
- **Inherits:** All student permissions
- **Additional Access:** Assigned batches and their enrolled students
- **Actions:** 
  - View roster for assigned batches
  - Update student progress within assigned batches
  - View batch-level analytics
  - Create announcements for batches (future)
- **Restrictions:** Cannot modify content, cannot access unassigned batches, cannot change user roles

#### **Admin/Publisher**
- **Inherits:** All instructor permissions
- **Additional Access:** All content (drafts + published), all users, system settings
- **Actions:**
  - Full CRUD on tracks/chapters/audio/segments
  - Publish/unpublish chapters
  - Create/modify/delete batches
  - Assign instructors to batches
  - Invite users and set roles
  - Manage system settings
  - View audit logs
- **Restrictions:** None (full system access)

---

### 2.3 Permission Matrix

| Resource/Action               | Student | Instructor | Admin |
|------------------------------|---------|------------|-------|
| **Tracks & Chapters**        |         |            |       |
| View published               | ✅      | ✅         | ✅    |
| View drafts                  | ❌      | ❌         | ✅    |
| Create/edit content          | ❌      | ❌         | ✅    |
| Publish/unpublish            | ❌      | ❌         | ✅    |
| Delete draft chapters        | ❌      | ❌         | ✅    |
| Delete published chapters    | ❌      | ❌         | ❌ (protected) |
| **Audio & Segments**         |         |            |       |
| Upload audio                 | ❌      | ❌         | ✅    |
| Create segments/mappings     | ❌      | ❌         | ✅    |
| **Student Progress**         |         |            |       |
| View own progress            | ✅      | ✅         | ✅    |
| Update own progress          | ✅      | ✅         | ✅    |
| View others' progress        | ❌      | ✅ (batch) | ✅ (all) |
| Update others' progress      | ❌      | ✅ (batch) | ✅ (all) |
| **Batches**                  |         |            |       |
| View assigned batches        | ✅ (enrolled) | ✅ (assigned) | ✅ (all) |
| Create/delete batches        | ❌      | ❌         | ✅    |
| Enroll/unenroll students     | ❌      | ❌         | ✅    |
| Assign instructors           | ❌      | ❌         | ✅    |
| **Users & System**           |         |            |       |
| View user list               | ❌      | ❌         | ✅    |
| Invite users                 | ❌      | ❌         | ✅    |
| Change user roles            | ❌      | ❌         | ✅    |
| Manage system settings       | ❌      | ❌         | ✅    |
| View audit logs              | ❌      | ❌         | ✅    |

---

### 2.4 Authentication Flow

```
1. User accesses protected route
   ↓
2. authMiddleware checks session
   ↓
   ├─ No session → 401 Unauthorized
   │
   └─ Valid session → Fetch user from DB
      ↓
      ├─ User not found → 401 Unauthorized
      │
      └─ User found → Attach to req.user
         ↓
3. Route handler executes
   ↓
4. requireRole/Permission guards check authorization
   ↓
   ├─ Insufficient permissions → 403 Forbidden
   │
   └─ Authorized → Process request
```

---

### 2.5 Middleware Components

#### **authMiddleware** (Required on all protected routes)
```typescript
// Validates session and attaches user to request
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Check session cookie
  // 2. Fetch user from DB
  // 3. Attach req.user = { id, email, roles, status }
  // 4. Check status === 'active'
  // 5. Call next() or return 401
}
```

#### **requireRole** (Role-based guard)
```typescript
// Ensures user has at least one of the required roles
function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) return res.status(403).json({ error: 'Insufficient permissions' });
    
    next();
  };
}
```

#### **requireOwnership** (Resource ownership guard)
```typescript
// Ensures user owns the resource or is admin
async function requireOwnership(resourceType: string, resourceIdParam: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user.roles.includes('admin')) return next(); // Admins bypass
    
    const resourceId = req.params[resourceIdParam];
    const resource = await getResource(resourceType, resourceId);
    
    if (resource.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this resource' });
    }
    
    next();
  };
}
```

#### **validateRequest** (Zod validation)
```typescript
// Validates request body/params against Zod schema
function validateRequest(schema: z.ZodSchema, target: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten()
      });
    }
    req[target] = result.data; // Replace with parsed data
    next();
  };
}
```

---

### 2.6 Request Context Pattern

#### **RequestContext** (Thread-local user context)
```typescript
// Attached to every authenticated request
interface RequestContext {
  requestId: string;           // UUID for tracing
  user: {
    id: string;
    email: string;
    roles: UserRole[];
    status: 'active' | 'disabled' | 'pending';
  };
  timestamp: Date;
}

// Extended Express Request
interface AuthenticatedRequest extends Request {
  user: RequestContext['user'];
  requestId: string;
}
```

---

## 3. Database Schema Extensions

### 3.1 New Tables for Batch/Cohort Module

#### **batches**
```sql
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'archived'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_students INTEGER,                          -- Capacity limit
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batches_track ON batches(track_id);
CREATE INDEX idx_batches_status ON batches(status);
```

#### **enrollments**
```sql
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active' NOT NULL, -- 'active', 'withdrawn', 'completed'
  enrolled_at TIMESTAMP DEFAULT NOW(),
  enrolled_by VARCHAR(255) NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_id, student_id)                  -- One enrollment per student per batch
);

CREATE INDEX idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
```

#### **batch_instructors**
```sql
CREATE TABLE batch_instructors (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  instructor_id VARCHAR(255) NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(255) NOT NULL REFERENCES users(id),
  UNIQUE(batch_id, instructor_id)               -- One instructor assignment per batch
);

CREATE INDEX idx_batch_instructors_batch ON batch_instructors(batch_id);
CREATE INDEX idx_batch_instructors_instructor ON batch_instructors(instructor_id);
```

---

### 3.2 New Tables for System Admin Module

#### **system_settings**
```sql
CREATE TABLE system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR(255) NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **audit_logs**
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,                 -- 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', etc.
  resource_type VARCHAR(100) NOT NULL,          -- 'track', 'chapter', 'user', 'batch', etc.
  resource_id VARCHAR(255),                     -- ID of affected resource
  changes JSONB,                                -- Before/after snapshot
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

### 3.3 Schema Updates to Existing Tables

#### **users table** (Already has most fields, but clarifications)
```sql
-- Existing fields (no changes needed):
-- id, email, firstName, lastName, profileImageUrl, roles (JSONB array), 
-- status, invitedBy, invitedAt, lastLoginAt, createdAt, updatedAt

-- Add index for role filtering (optional optimization)
CREATE INDEX idx_users_roles ON users USING GIN(roles);
```

#### **student_progress table** (Add batch context)
```sql
ALTER TABLE student_progress 
  ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;

-- Index for batch-scoped queries
CREATE INDEX idx_student_progress_batch ON student_progress(batch_id);
```

---

## 4. Domain Events Architecture

### 4.1 Event Bus Pattern (In-Process)

```typescript
// server/shared/events/event-bus.ts
type EventHandler<T = any> = (event: T) => Promise<void> | void;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  
  subscribe<T>(eventType: string, handler: EventHandler<T>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  async publish<T>(eventType: string, event: T) {
    const handlers = this.handlers.get(eventType) || [];
    await Promise.all(handlers.map(h => h(event)));
  }
}

export const eventBus = new EventBus();
```

---

### 4.2 Event Catalog

#### **Identity & Access Events**
- `UserCreated`: New user registered/invited
- `UserRoleChanged`: Role added/removed
- `UserStatusChanged`: Active/disabled/pending status change
- `UserLoggedIn`: Login timestamp update

#### **Content & Publishing Events**
- `ChapterPublished`: Chapter moved from draft → published
- `ChapterUnpublished`: Chapter moved from published → draft
- `ContentUpdated`: Chapter content modified
- `TrackCreated`: New track added to curriculum

#### **Media Pipeline Events**
- `AudioUploaded`: New audio file uploaded
- `MappingCreated`: Text segment mapped to audio timestamp
- `MappingDeleted`: Mapping removed

#### **Learning Delivery Events**
- `ProgressUpdated`: Student proficiency level changed
- `ChapterAccessed`: Student viewed a chapter
- `ChapterCompleted`: Student reached proficiency level 4

#### **Batch & Cohort Events**
- `BatchCreated`: New batch created
- `StudentEnrolled`: Student added to batch
- `StudentUnenrolled`: Student removed from batch
- `InstructorAssigned`: Instructor assigned to batch

#### **System Admin Events**
- `SettingChanged`: System setting updated
- `AdminActionLogged`: Admin performed sensitive action

---

### 4.3 Event Handlers (Cross-Module)

```typescript
// Example: Audit logging on publish
eventBus.subscribe('ChapterPublished', async (event) => {
  await auditService.log({
    userId: event.userId,
    action: 'PUBLISH',
    resourceType: 'chapter',
    resourceId: event.chapterId,
    changes: { status: { from: 'draft', to: 'published' } }
  });
});

// Example: Send notification when student enrolls
eventBus.subscribe('StudentEnrolled', async (event) => {
  // Future: Send welcome email or push notification
  console.log(`Student ${event.studentId} enrolled in batch ${event.batchId}`);
});
```

---

## 5. API Route Structure

### 5.1 Route Organization

```
/api
├── /auth
│   ├── GET  /me                     # Get current user
│   ├── POST /logout                 # Logout
│   └── POST /refresh                # Refresh session
│
├── /users                           # Admin only
│   ├── GET    /                     # List all users
│   ├── POST   /invite               # Invite user with role
│   ├── PATCH  /:userId/roles        # Update user roles
│   └── PATCH  /:userId/status       # Enable/disable user
│
├── /tracks
│   ├── GET    /                     # All users (published only for students)
│   ├── GET    /:id                  # Track details
│   ├── POST   /                     # Admin only
│   ├── PATCH  /:id                  # Admin only
│   ├── DELETE /:id                  # Admin only
│   └── POST   /:id/move             # Reorder (admin only)
│
├── /chapters
│   ├── GET    /track/:trackId       # Filtered by user role
│   ├── GET    /:id                  # Chapter details
│   ├── POST   /                     # Admin only
│   ├── PATCH  /:id                  # Admin only
│   ├── PATCH  /:id/status           # Publish/unpublish (admin only)
│   ├── DELETE /:id                  # Admin only (draft only)
│   └── POST   /:id/move             # Reorder (admin only)
│
├── /audio
│   ├── GET    /chapter/:chapterId   # All authenticated users
│   ├── POST   /chapter/:chapterId   # Upload (admin only)
│   ├── PATCH  /:audioId             # Update metadata (admin only)
│   └── DELETE /:audioId             # Admin only
│
├── /segments
│   ├── GET    /chapter/:chapterId/:script  # All authenticated
│   ├── POST   /                            # Create segment (admin only)
│   ├── PATCH  /:segmentId                  # Admin only
│   ├── DELETE /:segmentId                  # Admin only
│   └── PATCH  /chapter/:chapterId/reorder  # Reorder (admin only)
│
├── /mappings
│   ├── GET    /chapter/:chapterId          # All authenticated
│   ├── GET    /audio/:audioFileId          # All authenticated
│   ├── POST   /                            # Create mapping (admin only)
│   └── DELETE /:audioFileId/:segmentId     # Admin only
│
├── /progress
│   ├── GET    /me                          # Student's own progress
│   ├── PATCH  /me/:chapterId               # Update own progress
│   ├── GET    /student/:studentId          # Instructor/admin only
│   └── PATCH  /student/:studentId/:chapterId # Instructor/admin (batch-scoped)
│
├── /batches
│   ├── GET    /                            # Filtered by role
│   ├── GET    /:batchId                    # Detail (if enrolled/assigned/admin)
│   ├── POST   /                            # Admin only
│   ├── PATCH  /:batchId                    # Admin only
│   ├── DELETE /:batchId                    # Admin only
│   ├── GET    /:batchId/roster             # Instructor/admin
│   ├── POST   /:batchId/enroll             # Admin only
│   ├── DELETE /:batchId/enroll/:studentId  # Admin only
│   ├── POST   /:batchId/instructors        # Assign instructor (admin only)
│   └── DELETE /:batchId/instructors/:instructorId # Admin only
│
└── /admin
    ├── GET    /settings                    # Admin only
    ├── PATCH  /settings/:key               # Admin only
    ├── GET    /audit-logs                  # Admin only (paginated)
    └── GET    /audit-logs/:userId          # Audit trail for user (admin only)
```

---

### 5.2 Route Protection Examples

```typescript
// Public routes (no auth)
app.get('/api/health', healthCheck);

// Authenticated routes (any logged-in user)
app.get('/api/tracks', authMiddleware, trackController.list);

// Role-based routes
app.post('/api/tracks', 
  authMiddleware, 
  requireRole('admin'), 
  validateRequest(createTrackSchema),
  trackController.create
);

// Batch-scoped routes (instructor can access if assigned)
app.get('/api/batches/:batchId/roster',
  authMiddleware,
  requireRole('instructor', 'admin'),
  requireBatchAccess, // Custom middleware checks instructor assignment
  batchController.getRoster
);

// Ownership-based routes
app.patch('/api/progress/student/:studentId/:chapterId',
  authMiddleware,
  requireRole('instructor', 'admin'),
  requireBatchEnrollment, // Verify instructor teaches student's batch
  progressController.updateStudentProgress
);
```

---

## 6. Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create module folder structure
2. Implement `RequestContext`, `EventBus`, structured logger
3. Add `authMiddleware`, `requireRole`, `validateRequest` middleware
4. Create base service classes for each module
5. Add new database tables (batches, enrollments, batch_instructors, system_settings, audit_logs)

### Phase 2: Auth & Identity Module (Week 2-3)
1. Migrate user operations to `identity-access/service.ts`
2. Implement permission policies and guards
3. Add user invitation flow (admin invites → email sent → user activates)
4. Update all routes to use `authMiddleware`

### Phase 3: Content & Media Modules (Week 3-4)
1. Migrate content operations to `content-publishing/service.ts`
2. Migrate media operations to `media-pipeline/service.ts`
3. Add publish protection (prevent deletion of published chapters)
4. Add ownership checks for content modification
5. Emit domain events for key operations

### Phase 4: Batch & Learning Modules (Week 4-6)
1. Implement batch CRUD and enrollment logic
2. Create instructor assignment workflow
3. Update progress tracking to be batch-aware
4. Add batch-scoped roster/progress views
5. Create instructor dashboard endpoints

### Phase 5: Admin Module & Cleanup (Week 6-7)
1. Implement system settings management
2. Add audit logging to all sensitive operations
3. Create admin user management UI endpoints
4. Deprecate/remove `database-storage.ts` and `routes-simple.ts`
5. Add integration tests per module

---

## 7. Testing Strategy

### 7.1 Test Layers

**Unit Tests** (Module services)
- Test business logic in isolation
- Mock storage layer
- Verify domain events emitted

**Integration Tests** (Module + DB)
- Test storage implementations
- Verify DB constraints
- Test transaction boundaries

**Contract Tests** (API routes)
- Verify request/response schemas
- Test authentication/authorization
- Validate error responses

**E2E Tests** (User workflows)
- Student learning flow
- Instructor batch management
- Admin content publishing

---

### 7.2 Test Coverage Targets

- **Services:** 80% coverage (business logic)
- **Routes:** 70% coverage (happy paths + error cases)
- **Middleware:** 90% coverage (auth/validation critical)

---

## 8. Open Questions & Decisions Needed

### 8.1 Authentication
- **Q:** Should we keep Replit Auth or switch to custom JWT-based auth for production?
- **Decision:** TBD (keep Replit for now, but design auth module to be swappable)

### 8.2 Multi-tenancy
- **Q:** Will we support multiple organizations/schools in the future?
- **Impact:** If yes, add `organizationId` to all tables now
- **Decision:** TBD

### 8.3 Batch Enrollment
- **Q:** Can students enroll themselves or admin-only?
- **Decision:** TBD (recommend admin-only initially, add self-enroll later with approval workflow)

### 8.4 Progress Update Permissions
- **Q:** Can instructors override student-submitted progress or only view?
- **Decision:** TBD (recommend instructors can update, with audit trail)

### 8.5 Published Content Deletion
- **Q:** Hard block deletion of published chapters or allow with confirmation?
- **Decision:** TBD (recommend hard block via DB constraint, add archive status instead)

### 8.6 Media Storage
- **Q:** Keep local filesystem or migrate to S3/CDN?
- **Decision:** TBD (local for now, design media module to abstract storage)

---

## 9. Success Criteria

### 9.1 Technical Metrics
- ✅ All routes protected with auth middleware
- ✅ Zero direct DB calls in route handlers (use services)
- ✅ Domain events emitted for key actions
- ✅ Request IDs propagated through logs
- ✅ 70%+ test coverage for new modules

### 9.2 Business Metrics
- ✅ Admin can invite users with roles
- ✅ Instructor can view/update progress for assigned batches only
- ✅ Students see only published content
- ✅ Published chapters protected from deletion
- ✅ Audit logs capture all admin actions

---

## 10. Next Steps

1. **Review & Approve** this ADR
2. **Create detailed schemas** in Drizzle for new tables
3. **Define DTO contracts** for each module (shared/types)
4. **Implement auth middleware** as first priority
5. **Create branch:** `feat/modular-architecture`
6. **Iterate module by module** following migration phases

---

**Reviewers:**  
- [ ] Technical Lead  
- [ ] Product Manager  
- [ ] Security Reviewer

**Related Documents:**  
- [PROJECT_DOCUMENTATION.md](../PROJECT_DOCUMENTATION.md) - Current system overview  
- [shared/schema.ts](../../shared/schema.ts) - Existing database schema
