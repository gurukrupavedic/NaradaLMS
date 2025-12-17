# VedicLMS: Master Objective & Roadmap

**Document Purpose:** Single source of truth for the entire modular architecture refactoring initiative. One plan, one path forward, no deviations.

**Created:** December 17, 2025  
**Status:** Ready to Execute

---

## Part 1: Final Objective & Future State

### The Goal (What We're Building Towards)

Transform VedicLMS from a **monolithic, tightly-coupled codebase** into a **modular, loosely-coupled, domain-driven architecture** that:

- ✅ Separates concerns into 6 independent domain modules
- ✅ Makes each module independently testable and deployable
- ✅ Enables parallel development of features without merge conflicts
- ✅ Creates clear boundaries between business domains
- ✅ Makes the codebase easy to understand and extend
- ✅ Provides foundation for scaling to 100+ students and volunteers

### Current State (Today - Main Branch)

```
server/
├── routes-simple.ts          (682 lines) - ALL ROUTES mixed together
│   ├── User routes (login, register, approve)
│   ├── Chapter routes (CRUD, publish)
│   ├── Audio routes (upload)
│   ├── Segment routes (text, media, mappings)
│   ├── Progress routes (read/write student progress)
│   ├── Batch routes (create batches, enroll students)
│   └── Admin routes (settings, audit)
│
├── database-storage.ts       (571 lines) - ALL DB OPERATIONS mixed together
│   ├── User queries
│   ├── Chapter queries
│   ├── Audio queries
│   ├── Progress queries
│   ├── Batch queries
│   └── Admin queries
│
└── [Other files...]

PROBLEM: Everything talks to everything
- 50+ methods in database-storage.ts
- No clear responsibilities
- Hard to know what to modify when adding features
- ChapterEditor could break when changing unrelated code
- New developers need 100+ lines of context to understand one operation
```

### Future State (Target - After All Phases Complete)

```
server/
├── modules/
│   ├── identity-access/                    ✅ INDEPENDENT MODULE
│   │   ├── service.ts                      (handles all auth/user logic)
│   │   ├── storage.ts                      (owns users + sessions tables)
│   │   ├── middleware.ts                   (auth + role-based middleware)
│   │   ├── types.ts                        (User, Role types)
│   │   ├── events.ts                       (UserApproved, UserRoleChanged)
│   │   └── index.ts                        (exports: identityService)
│   │
│   ├── content-publishing/                 ✅ INDEPENDENT MODULE
│   │   ├── service.ts                      (handles all track/chapter/segment logic)
│   │   ├── storage.ts                      (owns tracks + chapters + textSegments tables)
│   │   ├── types.ts                        (Track, Chapter, TextSegment types)
│   │   ├── events.ts                       (ChapterPublished, ContentUpdated)
│   │   └── index.ts                        (exports: contentService)
│   │
│   ├── media-pipeline/                     ✅ INDEPENDENT MODULE
│   │   ├── service.ts                      (handles all audio/media logic)
│   │   ├── storage.ts                      (owns audioFiles + mediaSegments + segmentMappings tables)
│   │   ├── types.ts                        (AudioFile, MediaSegment, Mapping types)
│   │   ├── events.ts                       (AudioUploaded, MappingCreated)
│   │   └── index.ts                        (exports: mediaService)
│   │
│   ├── batch-cohort/                       ✅ INDEPENDENT MODULE
│   │   ├── service.ts                      (handles all batch/enrollment/instructor logic)
│   │   ├── storage.ts                      (owns batches + enrollments + batchCoInstructors tables)
│   │   ├── types.ts                        (Batch, Enrollment, CoInstructor types)
│   │   ├── events.ts                       (BatchCreated, StudentEnrolled)
│   │   └── index.ts                        (exports: batchService)
│   │
│   ├── learning-delivery/                  ✅ INDEPENDENT MODULE
│   │   ├── service.ts                      (handles student progress + content delivery)
│   │   ├── storage.ts                      (owns studentProgress table)
│   │   ├── types.ts                        (StudentProgress, LearningContext types)
│   │   ├── events.ts                       (ProgressUpdated)
│   │   └── index.ts                        (exports: learningService)
│   │
│   └── system-admin/                       ✅ INDEPENDENT MODULE
│       ├── service.ts                      (admin operations)
│       ├── audit.ts                        (audit logging logic)
│       ├── event-handlers.ts               (listens to domain events, logs them)
│       ├── storage.ts                      (owns auditLogs + systemSettings tables)
│       ├── types.ts                        (AuditLog, SystemSetting types)
│       └── index.ts                        (exports: adminService)
│
├── routes/                                 (6 route files, one per module)
│   ├── identity.routes.ts                  (login, register, approve, etc.)
│   ├── content.routes.ts                   (tracks, chapters, publish, etc.)
│   ├── media.routes.ts                     (audio upload, segments, mappings, etc.)
│   ├── batch.routes.ts                     (batches, enrollments, instructors, etc.)
│   ├── learning.routes.ts                  (progress, content delivery, etc.)
│   └── admin.routes.ts                     (settings, audit logs, user management UI, etc.)
│
├── shared/                                 (Infrastructure)
│   ├── middleware/
│   │   ├── auth.ts                         (authMiddleware, requireRole)
│   │   ├── validation.ts                   (request validation)
│   │   ├── errors.ts                       (error handling)
│   │   └── logger.ts                       (request logging)
│   │
│   ├── events/
│   │   ├── event-bus.ts                    (EventBus class - pub/sub system)
│   │   └── types.ts                        (DomainEvent type definitions)
│   │
│   └── utils/
│       └── helpers.ts                      (shared utilities)
│
└── [Other files...]

BENEFITS: Everything is separated by domain
- Each module is < 200 lines per file
- Clear responsibilities (Identity handles auth, Content handles chapters, etc.)
- Modules only talk via EventBus (loose coupling)
- Easy to add features without breaking others
- New developers read ONE module to understand one feature
- Can work on features in parallel (different modules = no conflicts)
```

### Success Criteria (How We Know We're Done)

```
✅ Structure
  ├── 6 modules exist in server/modules/
  ├── Each module has: service.ts, storage.ts, types.ts, events.ts, index.ts
  ├── 6 route files exist in server/routes/
  └── EventBus fully implemented in server/shared/events/

✅ Functionality (Everything Still Works)
  ├── Users can register and log in
  ├── Admin can approve accounts and assign roles
  ├── Publishers can create/edit/publish chapters
  ├── Audio upload and playback works
  ├── Text segmentation and audio mapping works
  ├── Students can view content and track progress
  ├── Instructors can view/update student progress
  └── All existing features preserved

✅ Code Quality
  ├── No direct DB access outside modules
  ├── All inter-module communication via service APIs or EventBus
  ├── TypeScript compiles with zero errors
  ├── All tests pass
  └── routes-simple.ts and database-storage.ts are DELETED

✅ Team Capability
  ├── New team members can understand one module in 30 minutes
  ├── Adding a feature requires touching only 1-2 modules
  ├── Two people can work on different modules simultaneously
  └── CI/CD can run tests on individual modules
```

---

## Part 2: The 7-Phase Execution Plan

### Overview Timeline

```
Phase 0  Foundation & Schema           Weeks 1-2   (10 hours)
Phase 1  Identity & Access Module      Weeks 2-3   (15 hours)  ← Foundation work done in Phase 0
Phase 2  Content & Publishing Module   Weeks 3-4   (20 hours)
Phase 3  Media Pipeline Module         Weeks 4-5   (15 hours)
Phase 4  Batch & Cohort Module         Week 5      (12 hours)
Phase 5  Learning Delivery Module      Week 6      (12 hours)
Phase 6  System Admin Module           Week 6-7    (8 hours)
Phase 7  Cleanup & Finalization        Week 7      (8 hours)
                                                   ───────────
Total Effort: ~100 hours (7-8 weeks at 12-15 hours/week)
```

### Guiding Principle: Strangler Pattern

**Never break existing functionality.** Instead:

1. **Build new module alongside old code** (both exist simultaneously)
2. **Migrate routes one at a time** (old route removed only after new route works)
3. **Test at each step** (dev server running, manual testing between phases)
4. **Keep rollback branches** (can revert if something breaks)
5. **Delete old code LAST** (only after all routes migrated and tested)

---

## Phase 0: Foundation & Schema (Weeks 1-2)

**Goal:** Set up infrastructure, database schema, and prove the module pattern works

**Outcome:** Infrastructure ready. Old code still works. Nothing broken.

### 0.1 Create Module Folder Structure

**Work:**
- Create `server/modules/` with 6 empty subfolders
- Create `server/shared/middleware/`, `server/shared/events/`, `server/shared/utils/`
- Create `server/routes/` directory
- Create empty `.ts` files (service.ts, storage.ts, types.ts, events.ts, index.ts in each module)

**Result:** 
```
server/modules/identity-access/service.ts (empty)
server/modules/identity-access/storage.ts (empty)
... (repeat for 5 more modules)
```

**Testing:** `npm run check` compiles, folder structure exists

**Effort:** 1 hour

---

### 0.2 Update Database Schema (Critical - Do First)

**Why first:** All modules need new tables before writing code

**File:** `shared/schema.ts`

**Add these 6 new tables:**

```typescript
// 1. batches - Batch lifecycle management
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(),
  trackId: integer('track_id').references(() => tracks.id).notNull(),
  batchName: text('batch_name').notNull(),
  primaryInstructorId: text('primary_instructor_id').references(() => users.id),
  status: text('status').default('active'),  // 'active' | 'completed' | 'archived'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: text('created_by').references(() => users.id),
});

// 2. enrollments - Student enrollment in batches
export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batches.id).notNull(),
  studentId: text('student_id').references(() => users.id).notNull(),
  status: text('status').default('active'),  // 'active' | 'dropped' | 'completed'
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  enrolledBy: text('enrolled_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. batch_co_instructors - Co-instructors assigned to batches
export const batchCoInstructors = pgTable('batch_co_instructors', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batches.id).notNull(),
  instructorId: text('instructor_id').references(() => users.id).notNull(),
  role: text('role').default('co_instructor'),  // 'co_instructor' | 'ta'
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: text('assigned_by').references(() => users.id),
});

// 4. audit_logs - System-wide audit trail
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),  // 'PUBLISH_CHAPTER', 'APPROVE_USER', 'ENROLL_STUDENT', etc.
  resourceType: text('resource_type').notNull(),  // 'chapter', 'user', 'batch', etc.
  resourceId: text('resource_id').notNull(),
  changes: json('changes'),  // { before: {...}, after: {...} }
  timestamp: timestamp('timestamp').defaultNow(),
  requestId: text('request_id'),
});

// 5. system_settings - Key-value settings
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. UPDATE users table - Add new fields for approval workflow
export const users = pgTable('users', {
  // ... existing fields ...
  status: text('status').default('pending_approval'),  // NEW: 'pending_approval' | 'active' | 'inactive'
  roles: text('roles').array().default(sql`array[]::text[]`),  // CHANGE: array of roles
  // ... rest of fields ...
});

// 7. UPDATE student_progress - Add batch context
export const studentProgress = pgTable('student_progress', {
  // ... existing fields ...
  batchId: integer('batch_id').references(() => batches.id),  // NEW: which batch context
  // ... rest of fields ...
});
```

**Implementation:**
```bash
# 1. Edit shared/schema.ts with above code
# 2. Run migration
npm run db:push

# 3. Verify in PostgreSQL
# Connect to vediclms_dev and run: \dt
# Should see: batches, enrollments, batch_co_instructors, audit_logs, system_settings
```

**Rollback:** If migration fails:
```bash
# Revert in PostgreSQL:
DROP TABLE IF EXISTS batches, enrollments, batch_co_instructors, audit_logs, system_settings;
# Then manually reset schema via drizzle if needed
```

**Effort:** 3 hours (includes testing migration)

---

### 0.3 Create EventBus (Shared Infrastructure)

**File:** `server/shared/events/event-bus.ts`

**Purpose:** Pub/Sub system for modules to communicate without tight coupling

```typescript
export type EventHandler<T> = (event: T) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    await Promise.all(handlers.map(h => Promise.resolve(h(event))));
  }
}

export const eventBus = new EventBus();
```

**File:** `server/shared/events/types.ts`

```typescript
export type DomainEvent =
  | { type: 'UserApproved'; userId: string; approvedBy: string; timestamp: Date }
  | { type: 'UserRoleChanged'; userId: string; role: string; added: boolean; timestamp: Date }
  | { type: 'ChapterPublished'; chapterId: number; userId: string; timestamp: Date }
  | { type: 'ChapterUnpublished'; chapterId: number; userId: string; timestamp: Date }
  | { type: 'AudioUploaded'; audioFileId: number; chapterId: number; timestamp: Date }
  | { type: 'SegmentMappingCreated'; mappingId: number; chapterId: number; timestamp: Date }
  | { type: 'BatchCreated'; batchId: number; trackId: number; createdBy: string; timestamp: Date }
  | { type: 'StudentEnrolled'; batchId: number; studentId: string; enrolledBy: string; timestamp: Date }
  | { type: 'StudentDropped'; batchId: number; studentId: string; timestamp: Date }
  | { type: 'ProgressUpdated'; studentId: string; chapterId: number; proficiencyLevel: number; timestamp: Date }
  | { type: 'CoInstructorAssigned'; batchId: number; instructorId: string; timestamp: Date };
```

**Implementation:**
```typescript
// In server/index.ts, after initializing app:
import { eventBus } from './shared/events/event-bus';

// Example: AdminService subscribes to events for audit logging
eventBus.subscribe('UserApproved', async (event) => {
  // Audit log the approval
  await auditService.logAction('USER_APPROVED', event.approvedBy, 'user', event.userId, {});
});

// Example: ContentService publishes when chapter is published
await eventBus.publish('ChapterPublished', {
  type: 'ChapterPublished',
  chapterId: 123,
  userId: 'user-456',
  timestamp: new Date(),
});
```

**Testing:**
```typescript
// Simple test in test file
const bus = new EventBus();
let eventReceived = null;
bus.subscribe('TestEvent', (event) => { eventReceived = event; });
await bus.publish('TestEvent', { data: 'test' });
expect(eventReceived).toEqual({ data: 'test' });
```

**Effort:** 2 hours (includes testing)

---

### 0.4 Create Auth Middleware (Shared)

**File:** `server/shared/middleware/auth.ts`

**Purpose:** Used by all modules for authentication & authorization

```typescript
import { Request, Response, NextFunction } from 'express';
import { identityService } from '../../modules/identity-access/service';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Validate session exists
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - no session' });
  }

  // Validate user exists and is active
  const user = await identityService.getUser(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account not active' });
  }

  req.user = user;
  next();
};

export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some(r => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireInstructor = requireRole('instructor');
export const requireContentManager = requireRole('content_manager');
```

**Effort:** 1 hour

---

### Phase 0 Completion Checklist

- [ ] `server/modules/` folder structure created (6 modules with empty files)
- [ ] `server/shared/middleware/`, `server/shared/events/` created
- [ ] `server/routes/` directory created
- [ ] `shared/schema.ts` updated with 6 new tables + user/progress updates
- [ ] `npm run db:push` succeeds
- [ ] EventBus implemented in `server/shared/events/event-bus.ts`
- [ ] Auth middleware created in `server/shared/middleware/auth.ts`
- [ ] TypeScript compiles: `npm run check` ✓
- [ ] Dev server starts: `npm run dev` ✓
- [ ] ChapterEditor still works (manual test)
- [ ] Git branch: `git checkout -b refactor-phase-0`
- [ ] Commit: "Phase 0: Foundation & schema setup"

**Phase 0 Status:** ✅ READY TO START

---

## Phase 1: Identity & Access Module (Weeks 2-3)

**Goal:** Extract all user/auth logic from `routes-simple.ts` + `database-storage.ts` into new module

**Outcome:** 
- ✅ Identity module complete and working
- ✅ Auth routes migrated from old file to new `identity.routes.ts`
- ✅ All user operations working via `identityService`
- ✅ Old user routes removed from `routes-simple.ts`
- ✅ ChapterEditor still works

### 1.1 Create Identity Service

**File:** `server/modules/identity-access/service.ts`

**Methods to implement** (copy from `database-storage.ts`, adapt to new structure):

```typescript
class IdentityService {
  // Authentication
  async getUser(userId: string): Promise<User | null>
  async getUserByEmail(email: string): Promise<User | null>
  async createUser(email: string, password: string, roles?: string[]): Promise<User>
  async authenticateUser(email: string, password: string): Promise<User | null>
  
  // User Approval
  async approveUser(userId: string, approvedBy: string): Promise<User>
  async rejectUser(userId: string, reason: string): Promise<void>
  
  // Role Management
  async assignRole(userId: string, role: string): Promise<User>
  async removeRole(userId: string, role: string): Promise<User>
  async hasRole(userId: string, role: string): Promise<boolean>
  
  // Permission Checks
  async isAdmin(userId: string): Promise<boolean>
  async isInstructor(userId: string): Promise<boolean>
  async isContentManager(userId: string): Promise<boolean>
  async isStudent(userId: string): Promise<boolean>
  
  // Account Management
  async disableUser(userId: string): Promise<User>
  async enableUser(userId: string): Promise<User>
  async updateUserProfile(userId: string, data: Partial<User>): Promise<User>
  async deleteUser(userId: string): Promise<void>
  
  // Listing
  async listPendingUsers(): Promise<User[]>
  async listActiveUsers(): Promise<User[]>
  async listAllUsers(): Promise<User[]>
  
  // Sessions
  async validateSession(sessionId: string): Promise<boolean>
  async destroySession(sessionId: string): Promise<void>
}

export const identityService = new IdentityService(db, eventBus);
```

**Effort:** 6 hours

---

### 1.2 Create Routes

**File:** `server/routes/identity.routes.ts`

**Routes to create:**
```typescript
const router = Router();

// Authentication
router.post('/auth/login', async (req, res) => { ... });
router.post('/auth/register', async (req, res) => { ... });
router.post('/auth/logout', authMiddleware, async (req, res) => { ... });
router.get('/auth/me', authMiddleware, async (req, res) => { ... });

// User Management (admin only)
router.get('/admin/users', authMiddleware, requireAdmin, async (req, res) => { ... });
router.get('/admin/users/:userId', authMiddleware, requireAdmin, async (req, res) => { ... });
router.patch('/admin/users/:userId/approve', authMiddleware, requireAdmin, async (req, res) => { ... });
router.patch('/admin/users/:userId/role/:role', authMiddleware, requireAdmin, async (req, res) => { ... });
router.post('/admin/users/:userId/disable', authMiddleware, requireAdmin, async (req, res) => { ... });

export { router as identityRouter };
```

**Effort:** 4 hours

---

### 1.3 Migrate Old Routes & Remove from Old File

**Work:**
1. Create `server/routes/identity.routes.ts` (above)
2. Mount in `server/index.ts`: `app.use('/api', identityRouter);`
3. Remove old user routes from `routes-simple.ts`
4. Test: `npm run dev` → curl login endpoint → verify it works

**Effort:** 3 hours (includes testing)

---

### 1.4 Testing

**Manual testing checklist:**
- [ ] User can register with new password
- [ ] User can log in with email/password
- [ ] Admin can approve pending users
- [ ] Approved user can log in
- [ ] Admin can assign roles
- [ ] User's roles are returned in `/api/auth/me`
- [ ] Unauthenticated requests return 401
- [ ] Non-admin users can't access admin endpoints (403)

**Effort:** 2 hours

---

### Phase 1 Completion Checklist

- [ ] `server/modules/identity-access/service.ts` - IdentityService implemented (~300 lines)
- [ ] `server/modules/identity-access/storage.ts` - Database queries (~100 lines)
- [ ] `server/modules/identity-access/types.ts` - User, Role, Session types
- [ ] `server/modules/identity-access/events.ts` - UserApproved, UserRoleChanged event types
- [ ] `server/modules/identity-access/index.ts` - Exports identityService
- [ ] `server/routes/identity.routes.ts` - All auth routes (~200 lines)
- [ ] Old user routes removed from `routes-simple.ts`
- [ ] App uses `identityRouter`: `app.use('/api', identityRouter);`
- [ ] TypeScript compiles: `npm run check` ✓
- [ ] Dev server works: `npm run dev` ✓
- [ ] All 8 manual tests pass ✓
- [ ] Git commit: "Phase 1: Extract Identity & Access module"

**Phase 1 Status:** ✅ READY FOR PHASE 2

---

## Phase 2: Content & Publishing Module (Weeks 3-4)

**Goal:** Extract all track/chapter/segment logic into new module

**Outcome:**
- ✅ Content module complete
- ✅ All chapter routes migrated
- ✅ ChapterEditor works perfectly
- ✅ Content routes removed from `routes-simple.ts`

### 2.1 Create Content Service

**File:** `server/modules/content-publishing/service.ts`

**Key methods:**
```typescript
class ContentService {
  // Tracks
  async getTrack(trackId: number): Promise<Track | null>
  async listTracks(): Promise<Track[]>
  async createTrack(name: string, createdBy: string): Promise<Track>
  async updateTrack(trackId: number, data: Partial<Track>): Promise<Track>
  
  // Chapters
  async getChapter(chapterId: number): Promise<Chapter | null>
  async getChaptersByTrack(trackId: number): Promise<Chapter[]>
  async getPublishedChapters(): Promise<Chapter[]>
  async createChapter(trackId: number, title: string, createdBy: string): Promise<Chapter>
  async updateChapterContent(chapterId: number, content: object): Promise<Chapter>
  async publishChapter(chapterId: number, userId: string): Promise<Chapter>
  async unpublishChapter(chapterId: number, userId: string): Promise<Chapter>
  async deleteChapter(chapterId: number): Promise<void>
  
  // Text Segments
  async getSegment(segmentId: number): Promise<TextSegment | null>
  async getSegmentsByChapter(chapterId: number, script?: string): Promise<TextSegment[]>
  async createSegment(chapterId: number, script: string, text: string, startPos: number, endPos: number, createdBy: string): Promise<TextSegment>
  async updateSegment(segmentId: number, text: string): Promise<TextSegment>
  async deleteSegment(segmentId: number): Promise<void>
  async reorderSegments(chapterId: number, segmentOrders: Array<{id, order}>): Promise<void>
}

export const contentService = new ContentService(db, identityService, eventBus);
```

**Effort:** 8 hours

---

### 2.2 Create Routes

**File:** `server/routes/content.routes.ts`

**Routes:**
```typescript
const router = Router();

// Tracks
router.get('/tracks', async (req, res) => { ... });
router.get('/tracks/:trackId', async (req, res) => { ... });
router.post('/tracks', authMiddleware, requireContentManager, async (req, res) => { ... });

// Chapters
router.get('/chapters/:chapterId', async (req, res) => { ... });
router.get('/tracks/:trackId/chapters', async (req, res) => { ... });
router.post('/chapters', authMiddleware, requireContentManager, async (req, res) => { ... });
router.patch('/chapters/:chapterId', authMiddleware, requireContentManager, async (req, res) => { ... });
router.patch('/chapters/:chapterId/publish', authMiddleware, requireContentManager, async (req, res) => { ... });
router.delete('/chapters/:chapterId', authMiddleware, requireContentManager, async (req, res) => { ... });

// Text Segments
router.get('/chapters/:chapterId/segments', async (req, res) => { ... });
router.post('/chapters/:chapterId/segments', authMiddleware, requireContentManager, async (req, res) => { ... });
router.patch('/segments/:segmentId', authMiddleware, requireContentManager, async (req, res) => { ... });
router.delete('/segments/:segmentId', authMiddleware, requireContentManager, async (req, res) => { ... });

export { router as contentRouter };
```

**Effort:** 6 hours

---

### 2.3 Testing

**Critical testing (ChapterEditor must work):**
- [ ] Can create chapter
- [ ] Can edit chapter content
- [ ] Can create text segments
- [ ] Can reorder segments
- [ ] Can publish chapter
- [ ] Published chapter is visible in student view
- [ ] Cannot delete published chapter
- [ ] Can unpublish chapter

**Effort:** 3 hours

---

### Phase 2 Completion Checklist

- [ ] Content module complete (service, storage, types, events)
- [ ] `server/routes/content.routes.ts` created
- [ ] Content routes removed from `routes-simple.ts`
- [ ] ChapterEditor works perfectly ✓
- [ ] All 8 testing items pass ✓
- [ ] Commit: "Phase 2: Extract Content & Publishing module"

**Phase 2 Status:** ✅ PATTERN VALIDATED - NOW WE'RE CONFIDENT

---

## Phase 3: Media Pipeline Module (Weeks 4-5)

**Goal:** Extract audio/media logic into module

**Outcome:**
- ✅ Media module complete
- ✅ Audio upload/playback works
- ✅ Segment mappings work

### 3.1 Create Media Service & Routes

**File:** `server/modules/media-pipeline/service.ts`

```typescript
class MediaService {
  // Audio Files
  async uploadAudio(chapterId: number, file: FileUpload, reciter: string, createdBy: string): Promise<AudioFile>
  async getAudioFile(audioFileId: number): Promise<AudioFile | null>
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>
  async deleteAudioFile(audioFileId: number): Promise<void>
  
  // Media Segments
  async createMediaSegment(audioFileId: number, startTime: number, endTime: number): Promise<MediaSegment>
  async getMediaSegment(segmentId: number): Promise<MediaSegment | null>
  
  // Segment Mappings
  async createMapping(textSegmentId: number, mediaSegmentId: number, createdBy: string): Promise<SegmentMapping>
  async getMappingsByChapter(chapterId: number): Promise<SegmentMapping[]>
  async getMappingsByTextSegment(textSegmentId: number): Promise<SegmentMapping[]>
  async deleteMapping(mappingId: number): Promise<void>
  
  // Validation
  async validateAudioFile(file: FileUpload): Promise<{ valid: boolean; error?: string }>
}

export const mediaService = new MediaService(db, contentService, eventBus);
```

**Effort:** 8 hours

---

### 3.2 Create Routes & Test

**Critical test:**
- [ ] Audio upload works
- [ ] Audio playback works
- [ ] Can create segment mappings
- [ ] Segment mappings display correctly in ChapterEditor

**Effort:** 5 hours

---

### Phase 3 Completion Checklist

- [ ] Media module complete
- [ ] `server/routes/media.routes.ts` created
- [ ] Audio upload/playback works ✓
- [ ] Commit: "Phase 3: Extract Media Pipeline module"

**Phase 3 Status:** ✅ READY FOR PHASE 4

---

## Phase 4: Batch & Cohort Module (Week 5)

**Goal:** Extract batch/enrollment logic into module

**Key methods:**
- Create batch, manage enrollments, assign instructors
- All new functionality (prerequisites for learning delivery)

**Effort:** 12 hours

---

## Phase 5: Learning Delivery Module (Week 6)

**Goal:** Extract student progress logic and content delivery into module

**Key methods:**
- Get student progress, update progress, deliver chapter content to students
- Orchestrates reads from Content + Media + Batch modules

**Effort:** 12 hours

---

## Phase 6: System Admin Module (Week 6-7)

**Goal:** Set up audit logging and system settings

**Key methods:**
- Audit logging (event listeners), system settings management

**Effort:** 8 hours

---

## Phase 7: Cleanup & Finalization (Week 7)

**Goal:** Delete old code, verify everything works

**Work:**
- Delete `routes-simple.ts` (all routes migrated)
- Reorganize `database-storage.ts` → move methods to module storage files
- Delete `database-storage.ts`
- Update all imports throughout codebase
- Final comprehensive testing

**Effort:** 8 hours

---

## Part 3: Risk Management & Rollback

### Key Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Database migration fails | HIGH | Backup DB before Phase 0.2, test migration locally first |
| ChapterEditor breaks | HIGH | Test manually after each phase, keep old routes until new routes proven |
| Routes missing | MEDIUM | Checklist of all old routes before deleting from old file |
| Circular dependencies | MEDIUM | EventBus ensures loose coupling, code review for direct imports |
| TypeScript errors | MEDIUM | Run `npm run check` after each phase, fix immediately |

### Rollback Procedure

**At any point, if something breaks:**

```bash
# Go back to last known-good phase
git checkout refactor-phase-2  # (for example)
git reset --hard

# Restart that phase with better understanding
npm run db:reset
npm run dev
```

**Database rollback:**
```bash
# Drizzle migrations are in drizzle/ folder
# Can manually drop tables if needed
DROP TABLE IF EXISTS batches, enrollments, batch_co_instructors, audit_logs, system_settings;
# Then re-push schema without those tables
```

---

## Part 4: Execution Rules (No Deviations!)

### Rule 1: One Phase at a Time
- **DO NOT** start Phase 2 until Phase 1 is completely done and tested
- **DO NOT** work on multiple modules simultaneously
- Phases build on each other

### Rule 2: Git Discipline
- Before each phase: `git checkout -b refactor-phase-X`
- During phase: Commit frequently (daily)
- After phase: Merge to main via PR (review checklist)

### Rule 3: Testing at Each Step
- **After each phase:** Dev server runs, manual testing completes
- **ChapterEditor test:** Works before moving forward
- **Build test:** `npm run build` succeeds
- **TypeScript test:** `npm run check` has zero errors

### Rule 4: Maintain Working State
- Old code + new code coexist during migration
- Old routes only deleted after new routes fully tested
- ChapterEditor works the ENTIRE time

### Rule 5: Documentation During Work
- Update this master document with progress after each phase
- Mark sections complete with date/commit hash
- Record any deviations with reason

### Rule 6: PR & Code Review
- Before merging phase to main: Create PR on GitHub
- Review checklist: All tests pass, no breaking changes, documentation updated
- Merge only when all checkmarks done

---

## Part 5: Current Status & Next Steps

### What's Done (Before This Refactoring)

✅ Phase 0 (Auth): Passport setup, session auth, user approval workflow  
✅ Phase 1 (Admin Approval): Login/register UI, user management  

### What's Next (This Refactoring)

⏳ **Phase 0 (Refactor):** Foundation & schema - **READY TO START**
⏳ Phase 1 (Refactor): Identity module
⏳ Phase 2 (Refactor): Content module
... and so on

### How to Start Executing

```bash
# 1. Create phase-0 branch
git checkout main
git pull origin main
git checkout -b refactor-phase-0

# 2. Follow Phase 0 instructions above (0.1 - 0.4)

# 3. After completing Phase 0:
npm run check       # Verify TypeScript compiles
npm run dev         # Start dev server
# Manual test: Create chapter in ChapterEditor

# 4. Commit Phase 0
git add -A
git commit -m "Phase 0: Foundation & schema setup - module structure, EventBus, auth middleware"
git push origin refactor-phase-0

# 5. Create PR on GitHub for review
# (On GitHub: Create PR refactor-phase-0 → main)

# 6. After PR approved & merged:
git checkout main
git pull origin main
git checkout -b refactor-phase-1

# 7. Continue to Phase 1...
```

---

## Document Status & History

| Date | Phase | Status | Commit Hash | Notes |
|------|-------|--------|-------------|-------|
| Dec 17, 2025 | 0 | Ready to Execute | N/A | Master document created, plan finalized |
| (TBD) | 0 | In Progress | (TBD) | Folder structure + schema being set up |
| (TBD) | 0 | Complete | (TBD) | EventBus working, middleware created |
| (TBD) | 1 | In Progress | (TBD) | Identity service being implemented |
| (TBD) | 1 | Complete | (TBD) | All user/auth logic extracted |
| | | ... | | (Continue documenting each phase) |

---

## References

- See [MODULE-BREAKDOWN-DETAILED.md](docs/architecture/MODULE-BREAKDOWN-DETAILED.md) for complete module descriptions
- See [MODULE-SEPARATION-BOUNDARIES.md](docs/architecture/MODULE-SEPARATION-BOUNDARIES.md) for module boundaries and data ownership
- See [MIGRATION-ROADMAP.md](docs/MIGRATION-ROADMAP.md) for detailed technical implementation steps (reference only)
- See [OPTION-B-VISUAL-GUIDE.md](docs/OPTION-B-VISUAL-GUIDE.md) for visual/simplified explanation

---

**THIS IS THE SINGLE SOURCE OF TRUTH. FOLLOW THIS PLAN. DO NOT DEVIATE.**
