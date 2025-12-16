# Modular Architecture Migration Roadmap

## Guiding Principle: "Strangler Pattern"

Instead of rewriting everything:
1. **Keep existing code working** (database-storage.ts, routes-simple.ts)
2. **Create new module structure alongside** it
3. **Gradually migrate routes** from old to new
4. **Test at each step** to ensure nothing breaks
5. **Delete old code** only after complete module is migrated and tested

This means you can have `ChapterEditor` working the entire time while we restructure backend.

---

## Phase 0: Foundation & Schema (Weeks 1-2)

**Goal:** Set up module infrastructure and database changes

### 0.1 Create Module Structure

```bash
server/modules/
├── identity-access/
│   ├── service.ts
│   ├── middleware.ts
│   ├── storage.ts
│   ├── types.ts
│   └── events.ts
├── content-publishing/
│   ├── service.ts
│   ├── storage.ts
│   ├── types.ts
│   └── events.ts
├── media-pipeline/
│   ├── service.ts
│   ├── storage.ts
│   ├── types.ts
│   └── events.ts
├── batch-cohort/
│   ├── service.ts
│   ├── storage.ts
│   ├── types.ts
│   └── events.ts
├── learning-delivery/
│   ├── service.ts
│   ├── storage.ts
│   ├── types.ts
│   └── events.ts
└── system-admin/
    ├── service.ts
    ├── audit.ts
    ├── storage.ts
    ├── types.ts
    └── event-handlers.ts

server/shared/
├── middleware/
│   ├── auth.ts
│   ├── validation.ts
│   ├── errors.ts
│   └── logger.ts
├── events/
│   ├── event-bus.ts
│   └── types.ts
└── utils/
    └── helpers.ts

server/routes/
├── identity.routes.ts
├── content.routes.ts
├── media.routes.ts
├── batch.routes.ts
├── learning.routes.ts
└── admin.routes.ts
```

**Work:**
- Create folder structure (no code yet)
- Create empty service.ts files (will populate in later phases)

**Testing:** Just folder structure
**Rollback:** Delete folders

---

### 0.2 Update Database Schema (CRITICAL - do this first)

**File:** `shared/schema.ts`

**Changes needed:**

```typescript
// NEW TABLE: batches
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(),
  trackId: integer('track_id').references(() => tracks.id),
  batchName: text('batch_name').notNull(),
  primaryInstructorId: text('primary_instructor_id').references(() => users.id),
  status: text('status').default('active'), // 'active' | 'completed' | 'archived'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: text('created_by').references(() => users.id),
});

// NEW TABLE: enrollments
export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batches.id),
  studentId: text('student_id').references(() => users.id),
  status: text('status').default('active'), // 'active' | 'dropped' | 'completed'
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  enrolledBy: text('enrolled_by').references(() => users.id),
  droppedAt: timestamp('dropped_at'),
  droppedReason: text('dropped_reason'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const enrollmentsIndex = uniqueIndex('enrollment_unique').on(enrollments.batchId, enrollments.studentId);

// NEW TABLE: batch_co_instructors
export const batchCoInstructors = pgTable('batch_co_instructors', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batches.id),
  instructorId: text('instructor_id').references(() => users.id),
  role: text('role').default('co_instructor'), // 'co_instructor' | 'ta'
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: text('assigned_by').references(() => users.id),
});

// NEW TABLE: audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(), // 'CREATE_CHAPTER', 'PUBLISH_CHAPTER', etc.
  resourceType: text('resource_type').notNull(), // 'chapter', 'batch', etc.
  resourceId: text('resource_id').notNull(),
  changes: json('changes'), // { before: {...}, after: {...} }
  timestamp: timestamp('timestamp').defaultNow(),
  requestId: text('request_id'), // for tracing
});

// NEW TABLE: system_settings
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// UPDATE users table - add status field
export const users = pgTable('users', {
  // ... existing fields
  status: text('status').default('active'), // 'pending_approval' | 'active' | 'inactive'
  roles: text('roles').array().default(sql`array[]::text[]`), // CHANGE: array instead of single
});

// UPDATE student_progress - add batch context
export const studentProgress = pgTable('student_progress', {
  id: serial('id').primaryKey(),
  studentId: text('student_id').references(() => users.id).notNull(),
  chapterId: integer('chapter_id').references(() => chapters.id).notNull(),
  batchId: integer('batch_id').references(() => batches.id), // NEW: which batch context
  proficiencyLevel: integer('proficiency_level').default(0), // 0-4
  lastAccessed: timestamp('last_accessed'),
  lastEvaluatedAt: timestamp('last_evaluated_at'),
  evaluatedBy: text('evaluated_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Work:**
- Edit `shared/schema.ts` with above tables
- Run `npm run db:push`
- Verify migration succeeds

**Testing:**
```bash
npm run db:push
# Check PostgreSQL: \dt to list tables
# Verify new tables exist
```

**Rollback:**
```bash
# Drizzle creates numbered migration files
# Manual rollback via database client if needed
```

**⚠️ CRITICAL:** Do this BEFORE writing module code

---

### 0.3 Create EventBus (Shared Infrastructure)

**File:** `server/shared/events/event-bus.ts`

```typescript
type EventHandler<T> = (event: T) => Promise<void> | void;

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

// Event types
export type DomainEvent =
  | { type: 'UserApproved'; userId: string; approvedBy: string }
  | { type: 'UserDisabled'; userId: string }
  | { type: 'ChapterPublished'; chapterId: number; userId: string }
  | { type: 'ChapterUnpublished'; chapterId: number }
  | { type: 'AudioUploaded'; audioFileId: number; chapterId: number }
  | { type: 'SegmentMappingCreated'; mappingId: number; chapterId: number }
  | { type: 'BatchCreated'; batchId: number; trackId: number }
  | { type: 'StudentEnrolled'; batchId: number; studentId: string }
  | { type: 'StudentDropped'; batchId: number; studentId: string }
  | { type: 'ProgressUpdated'; studentId: string; chapterId: number; proficiencyLevel: number }
  | { type: 'CoInstructorAssigned'; batchId: number; instructorId: string };
```

**Testing:**
```typescript
// Simple test
const bus = new EventBus();
let called = false;
bus.subscribe('TestEvent', () => { called = true; });
await bus.publish('TestEvent', {});
expect(called).toBe(true);
```

**Effort:** 1-2 hours

---

## Phase 1: Extract Identity & Access Module (Weeks 2-3)

**Goal:** Implement authentication/authorization in new module structure

**Why first?** Every other module depends on it.

### 1.1 Create Identity Service

**File:** `server/modules/identity-access/service.ts`

```typescript
export class IdentityService {
  constructor(private db: Database, private eventBus: EventBus) {}

  async getUser(userId: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    return user || null;
  }

  async approveUser(userId: string, approvedBy: string): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    await this.eventBus.publish('UserApproved', { userId, approvedBy });
    return user;
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.roles?.includes(role) ?? false;
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  async isInstructor(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'instructor');
  }

  async isContentManager(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'content_manager');
  }

  // ... other methods (20-30 methods total)
}

export const identityService = new IdentityService(db, eventBus);
```

**Work:**
- Implement ~25 methods (mostly copy from database-storage.ts)
- Create middleware wrappers for `authMiddleware`, `requireRole`
- Create types file with User DTOs

**Testing:**
```bash
# Unit tests for each method
npm test -- identity-access.test.ts
```

**Effort:** 8-10 hours

---

### 1.2 Create Auth Middleware

**File:** `server/shared/middleware/auth.ts`

```typescript
export const authMiddleware = async (req, res, next) => {
  // Your existing Replit Auth logic
  const session = req.headers['x-replit-user-id'];
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await identityService.getUser(session);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
};

export const requireRole = (...roles: string[]) => {
  return async (req, res, next) => {
    const hasRole = await identityService.hasRole(req.user.id, roles);
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

**Effort:** 2-3 hours

---

### 1.3 Migrate One Route as Proof

**Goal:** Show the pattern works without breaking anything

**Example:** Migrate `GET /api/users/:id` route

**Old code** (routes-simple.ts):
```typescript
app.get('/api/users/:id', async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
  res.json(user);
});
```

**New code** (server/routes/identity.routes.ts):
```typescript
const identityRouter = Router();

identityRouter.get('/users/:id', 
  authMiddleware,
  async (req, res) => {
    const user = await identityService.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  }
);

export { identityRouter };
```

**App integration** (server/index.ts):
```typescript
app.use('/api', identityRouter);
```

**Test it:**
```bash
npm run dev
curl http://localhost:5000/api/users/123
# Should work exactly like before
```

**Work:**
- Create identity.routes.ts
- Migrate 5-10 simple GET routes first
- Run dev server and test manually
- Verify nothing breaks in UI

**Effort:** 4-5 hours

---

## Phase 2: Extract Content & Publishing Module (Weeks 3-4)

**Goal:** Move track/chapter/segment operations to new module

### 2.1 Create Content Service

**File:** `server/modules/content-publishing/service.ts`

**Pseudo-code:**
```typescript
export class ContentService {
  constructor(private db: Database, private identityService: IdentityService, private eventBus: EventBus) {}

  async createTrack(name: string, createdBy: string): Promise<Track> {
    // Validate createdBy is admin or content_manager
    const track = await db.insert(tracks).values({
      name,
      createdBy,
      createdAt: new Date()
    }).returning();

    await this.eventBus.publish('TrackCreated', { trackId: track[0].id, createdBy });
    return track[0];
  }

  async createChapter(trackId: number, data: ChapterInput, createdBy: string): Promise<Chapter> {
    // ... validation
    const chapter = await db.insert(chapters).values({
      trackId,
      title: data.title,
      content: data.content,
      status: 'draft',
      createdBy,
      createdAt: new Date()
    }).returning();

    return chapter[0];
  }

  async publishChapter(chapterId: number, userId: string): Promise<Chapter> {
    // Validate user is content_manager or admin
    const isAuthorized = await this.identityService.isContentManager(userId) || 
                        await this.identityService.isAdmin(userId);
    if (!isAuthorized) throw new Error('Not authorized');

    const chapter = await this.getChapter(chapterId);
    if (chapter.status !== 'draft') throw new Error('Only drafts can be published');

    const updated = await db
      .update(chapters)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(chapters.id, chapterId))
      .returning();

    await this.eventBus.publish('ChapterPublished', { chapterId, userId });
    return updated[0];
  }

  // ... ~30-40 other methods
}
```

### 2.2 Migrate Content Routes

**Goal:** Move all chapter/segment/track routes from routes-simple.ts to new module

**Approach:**
1. Copy all chapter-related routes to content.routes.ts
2. Update them to use `contentService` instead of direct DB
3. Update app.use to include new router
4. Remove old routes from routes-simple.ts
5. Test ChapterEditor component still works

**Critical Testing:**
```
- Create chapter ✓
- Edit chapter content ✓
- Upload audio ✓
- Create text segments ✓
- Create segment mappings ✓
- Publish chapter ✓
```

**Effort:** 15-20 hours (biggest chunk - lots of routes)

---

## Phase 3: Extract Media Pipeline Module (Weeks 4-5)

**Goal:** Move audio/media operations to new module

**Work:**
- Create MediaService with 20+ methods
- Migrate all audio upload routes
- Migrate all segment/mapping routes
- Test audio playback in ChapterEditor

**Critical:** Test that audio mapping still works end-to-end

**Effort:** 10-12 hours

---

## Phase 4: Extract Batch & Cohort Module (Week 5)

**Goal:** Set up batch/enrollment management (new functionality)

**Work:**
- Create BatchService with enrollment operations
- Create batch.routes.ts for admin operations
- Test batch creation and enrollment

**Effort:** 8-10 hours

---

## Phase 5: Extract Learning Delivery Module (Week 6)

**Goal:** Move student progress operations to new module

**Work:**
- Create LearningService
- Migrate progress endpoints
- Migrate "view chapter as student" endpoints

**Effort:** 8-10 hours

---

## Phase 6: Extract System Admin Module (Week 6-7)

**Goal:** Set up audit logging and settings management

**Work:**
- Create AdminService
- Create event subscribers in system-admin/event-handlers.ts
- When other modules emit events, audit logs them

**Effort:** 4-6 hours

---

## Phase 7: Cleanup (Week 7)

**Goal:** Remove old code

**Work:**
- Delete routes-simple.ts (verify all routes migrated)
- Reorganize database-storage.ts → module-specific storage files
- Update imports throughout codebase
- Final testing

**Effort:** 4-6 hours

---

## Testing Strategy Throughout

### At Each Phase:

1. **Unit Tests** - Test service methods in isolation
   ```bash
   npm test -- --testPathPattern=modules/content
   ```

2. **Integration Tests** - Test routes + services together
   ```typescript
   describe('POST /api/chapters', () => {
     it('creates chapter', async () => {
       const response = await request(app)
         .post('/api/chapters')
         .set('Authorization', 'Bearer token')
         .send({ title: 'Test', trackId: 1 });
       expect(response.status).toBe(201);
     });
   });
   ```

3. **Manual Testing** - Test UI components
   ```bash
   npm run dev
   # Open ChapterEditor, try to:
   # - Create chapter
   # - Edit content
   # - Upload audio
   # - Create segments
   # - Publish
   ```

4. **Regression Testing** - Ensure nothing broke
   ```
   ✓ Can still create chapters
   ✓ Can still edit chapters
   ✓ Can still upload audio
   ✓ Can still play audio
   ✓ Can still see progress
   ```

---

## Rollback Strategy

**At any point, if something breaks:**

```bash
# Git branch created before each phase
git branch migration-phase-0  # Before schema changes
git branch migration-phase-1  # Before Identity module
git branch migration-phase-2  # Before Content module
# ... etc

# If Phase 3 breaks something:
git checkout migration-phase-2
# You're back to working state
```

**Database rollback:**
- Drizzle creates numbered migrations in `drizzle/`
- Can manually revert if needed
- Keep backups before running `npm run db:push`

---

## Risk Mitigation

**Highest Risk:** Database schema changes (0.2)
- **Mitigation:** Do this first, test before moving to services
- **Backup:** Export database before running migrations
- **Rollback:** Have manual SQL to drop new tables if needed

**High Risk:** Breaking ChapterEditor
- **Mitigation:** Test every route migration manually
- **Testing:** Keep dev server running, frequently test UI
- **Separation:** Do content routes (Phase 2) first since ChapterEditor uses them most

**Medium Risk:** Auth/middleware issues
- **Mitigation:** Keep old auth working until new auth fully tested
- **Testing:** Unit test all middleware
- **Rollback:** Easy to revert auth.ts changes

---

## Success Criteria

✅ Phase 0 Complete:
- New tables created in database
- EventBus implemented and tested
- Module folder structure in place

✅ Phase 1 Complete:
- All Identity methods implemented
- 5-10 routes migrated and tested
- No broken auth

✅ Phase 2 Complete:
- All Content routes migrated
- ChapterEditor still works perfectly
- Can still create/edit/publish chapters

✅ Phase 3 Complete:
- All Media routes migrated
- Audio upload/playback works
- Segment mapping works

✅ Phase 4-6 Complete:
- All modules extracted
- All routes migrated
- No old code remains

✅ Phase 7 Complete:
- routes-simple.ts deleted
- database-storage.ts refactored into module storage files
- Clean, modular codebase ready for new features

---

## Effort Estimate

| Phase | Task | Hours | Weeks |
|-------|------|-------|-------|
| 0 | Schema + EventBus | 10 | 1-2 |
| 1 | Identity module | 15 | 1-2 |
| 2 | Content module | 20 | 1-2 |
| 3 | Media module | 15 | 1-2 |
| 4 | Batch module | 12 | 1 |
| 5 | Learning module | 12 | 1 |
| 6 | Admin module | 8 | 0.5 |
| 7 | Cleanup | 8 | 0.5 |
| **Total** | **Migration** | **~100 hours** | **~7 weeks** |

**With 10 hours/week:** ~10 weeks total
**With 15 hours/week:** ~7 weeks total

---

## What NOT to Do

❌ Don't rewrite everything at once
❌ Don't skip testing at each phase
❌ Don't break ChapterEditor functionality
❌ Don't skip database schema step
❌ Don't forget rollback branches
❌ Don't migrate all routes simultaneously
❌ Don't delete old code before new code tested

---

## What TO Do

✅ Migrate one phase at a time
✅ Test thoroughly before moving forward
✅ Keep ChapterEditor working throughout
✅ Create git branches before each phase
✅ Use EventBus for loose coupling
✅ Document what you migrate
✅ Delete old code only after replacement tested

