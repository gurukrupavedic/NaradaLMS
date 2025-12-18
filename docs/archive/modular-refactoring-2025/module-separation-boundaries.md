# Module Separation & Boundaries - Deep Dive

This document clarifies exact module boundaries, data ownership, and dependencies to ensure clear separation of concerns.

---

## 1. Data Ownership & Table Assignment

### Clear Ownership Model

**Rule:** Each table belongs to ONE module. Only that module writes to it. Other modules read it (if needed) via service APIs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE TABLES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IDENTITY & ACCESS Module owns:                                            │
│  ├── users                  (R/W only by Identity module)                  │
│  └── sessions               (R/W only by Identity module)                  │
│                                                                              │
│  CONTENT & PUBLISHING Module owns:                                         │
│  ├── tracks                 (R/W only by Content module)                   │
│  ├── chapters               (R/W only by Content module)                   │
│  └── text_segments          (R/W only by Content module)                   │
│                                                                              │
│  MEDIA PIPELINE Module owns:                                               │
│  ├── audio_files            (R/W only by Media module)                     │
│  ├── media_segments         (R/W only by Media module)                     │
│  └── segment_mappings       (R/W only by Media module)                     │
│                                                                              │
│  BATCH & COHORT Module owns:                                               │
│  ├── batches                (R/W only by Batch module)                     │
│  ├── enrollments            (R/W only by Batch module)                     │
│  └── batch_co_instructors   (R/W only by Batch module)                     │
│                                                                              │
│  LEARNING DELIVERY Module owns:                                            │
│  └── student_progress       (R/W only by Learning module)                  │
│                                                                              │
│  SYSTEM ADMIN Module owns:                                                 │
│  ├── audit_logs             (R/W only by Admin module)                     │
│  └── system_settings        (R/W only by Admin module)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Who Can Read What?

```typescript
// Reading (allowed across modules):

Identity & Access:
  • Reads: users, sessions (owns both)
  • Reads from others: None

Content & Publishing:
  • Reads: tracks, chapters, text_segments (owns all)
  • Reads from others: users.id (for audit trail)

Media Pipeline:
  • Reads: audio_files, media_segments, segment_mappings (owns all)
  • Reads from others: chapters.id (via text_segments), users.id

Learning Delivery:
  • Reads: student_progress (owns it)
  • Reads from others: 
    - chapters, text_segments (published only)
    - audio_files, media_segments, segment_mappings (for playback)
    - batches, enrollments (to verify batch/student context)
    - users.id (for evaluatedBy)

Batch & Cohort:
  • Reads: batches, enrollments, batch_co_instructors (owns all)
  • Reads from others: 
    - users (to verify roles and instructor assignments)
    - tracks (to show which track batch teaches)

System Admin:
  • Reads: audit_logs, system_settings (owns both)
  • Reads from others: All tables (for audit context)
```

---

## 2. API Contracts - What Each Module Exposes

### Rule: Other modules only interact via service methods, never direct DB queries

```typescript
// ❌ WRONG - direct DB access:
const chapter = await db.select().from(chapters).where(eq(chapters.id, chapterId));

// ✅ RIGHT - via service:
const chapter = await contentService.getChapter(chapterId);
```

### Identity & Access Module - Public API

```typescript
class IdentityService {
  // Other modules call these ONLY
  
  async getUser(userId: string): Promise<User | null>
  async getUserByEmail(email: string): Promise<User | null>
  async hasRole(userId: string, role: UserRole): Promise<boolean>
  async isAdmin(userId: string): Promise<boolean>
  async isInstructor(userId: string): Promise<boolean>
  async isContentManager(userId: string): Promise<boolean>
  async isStudent(userId: string): Promise<boolean>
  
  // Authenticated middleware (internal to Identity module)
  authMiddleware(req, res, next)
  requireRole(...roles)(req, res, next)
}

// ❌ NOT exposed to other modules:
// - createUser, updateUser, deleteUser (admin only, via System Admin UI)
// - Session management (handled by middleware)
// - Role assignment (admin only)
```

**Who calls IdentityService:**
- Batch module: `identityService.hasRole(instructorId, 'instructor')`
- Content module: `identityService.hasRole(userId, 'content_manager')`
- Learning module: `identityService.hasRole(userId, 'student')`
- Middleware: All routes call `authMiddleware`

---

### Content & Publishing Module - Public API

```typescript
class ContentService {
  // Publicly exposed for other modules to READ
  
  async getAllTracks(): Promise<Track[]>
  async getTrack(trackId: number): Promise<Track | null>
  async getChaptersByTrack(trackId: number, publishedOnly?: boolean): Promise<Chapter[]>
  async getChapter(chapterId: number): Promise<Chapter | null>
  async getSegmentsByChapter(chapterId: number, script?: string): Promise<TextSegment[]>
  async canDeleteChapter(chapterId: number): Promise<boolean>
  
  // Internal - used by content manager UI via routes
  async createTrack(...)
  async createChapter(...)
  async updateChapterContent(...)
  async publishChapter(...)
  async deleteChapter(...)
  // ... etc
}

// Who calls ContentService publicly:
// - Batch: contentService.getChapter() for batch.trackId info
// - Learning: contentService.getChaptersByTrack(trackId, publishedOnly=true)
// - Learning: contentService.getSegmentsByChapter(chapterId)
// - Learning: Gets chapter content for student display
```

---

### Media Pipeline Module - Public API

```typescript
class MediaService {
  // Publicly exposed for other modules to READ
  
  async getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>
  async getMediaSegmentsByAudioFile(audioFileId: number): Promise<MediaSegment[]>
  async getMappingsByChapter(chapterId: number): Promise<MappingWithTimestamps[]>
  async getMappingsByAudioFile(audioFileId: number): Promise<MappingWithTimestamps[]>
  
  // Internal - used by content manager UI via routes
  async uploadAudio(...)
  async createMediaSegment(...)
  async createMapping(...)
  async deleteMapping(...)
  // ... etc
}

// Who calls MediaService publicly:
// - Learning: mediaService.getMappingsByChapter(chapterId)
//   → Gets all text↔audio mappings for interactive playback
```

---

### Batch & Cohort Module - Public API

```typescript
class BatchService {
  // Publicly exposed for other modules to READ
  
  async getBatch(batchId: number): Promise<Batch | null>
  async getBatchesByInstructor(instructorId: string): Promise<Batch[]>
  async getEnrollmentsByBatch(batchId: number): Promise<Enrollment[]>
  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>
  async isStudentEnrolledInBatch(studentId: string, batchId: number): Promise<boolean>
  async isPrimaryInstructor(instructorId: string, batchId: number): Promise<boolean>
  async isCoInstructor(instructorId: string, batchId: number): Promise<boolean>
  async isAssignedToAnyBatch(instructorId: string): Promise<boolean>
  
  // Internal - admin operations via routes
  async createBatch(...)
  async enrollStudent(...)
  async assignCoInstructor(...)
  // ... etc
}

// Who calls BatchService publicly:
// - Learning: batchService.getEnrollmentsByBatch(batchId)
//   → Get roster for instructor view
// - Learning: batchService.isStudentEnrolledInBatch(studentId, batchId)
//   → Verify student can view/submit progress for this batch
// - Identity: batchService.isAssignedToAnyBatch(instructorId)
//   → Determine if user is instructor (has role + assigned to batch)
```

---

### Learning Delivery Module - Public API

```typescript
class LearningService {
  // Publicly exposed for other modules to READ
  
  async getPublishedTracks(): Promise<Track[]>
  async getPublishedChaptersByTrack(trackId: number): Promise<Chapter[]>
  async getStudentProgress(studentId: string): Promise<StudentProgress[]>
  async getStudentProgressByTrack(studentId: string, trackId: number): Promise<StudentProgress[]>
  async getChapterProgress(studentId: string, chapterId: number): Promise<StudentProgress | null>
  
  // Internally used for instructor roster
  async getBatchRoster(batchId: number): Promise<RosterEntry[]>
  
  // Used by routes for student learning
  async getChapterForLearning(chapterId: number, studentId: string): Promise<ChapterWithProgress>
  async updateStudentProgress(...): Promise<StudentProgress>
}

// Who calls LearningService publicly:
// - Admin: learningService.getStudentProgress(studentId) for monitoring
// - Instructor: learningService.updateStudentProgress() to grade students
// - Instructor: learningService.getBatchRoster(batchId) for roster
```

---

### System Admin Module - Public API

```typescript
class AdminService {
  // Publicly exposed
  
  async getAllUsers(filters?: {...}): Promise<User[]>
  async getAuditLogs(filters?: {...}): Promise<AuditLog[]>
  async getSetting(key: string): Promise<Setting | null>
  
  // Internal admin operations via routes
  async updateSetting(...)
  async exportAuditLogs(...)
}

class AuditService {
  // Internal only - called by event subscribers
  
  async logAction(action, userId, resourceType, resourceId, changes): Promise<void>
}

// Who calls AdminService publicly:
// - None (admin module is mostly internal + admin UI routes)
```

---

## 3. Module Dependency Graph

### Clean Dependency Direction (Acyclic)

```
        ┌─────────────────────────────────────────────┐
        │  IDENTITY & ACCESS (Foundation Layer)       │
        │  ↑ Everyone depends on it                    │
        │  ↑ No dependencies on others                 │
        └────────┬────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬─────────────────────┐
    │            │            │                     │
    ▼            ▼            ▼                     ▼
┌─────────┐  ┌────────────┐ ┌──────────┐    ┌──────────────┐
│CONTENT  │  │MEDIA       │ │BATCH &   │    │SYSTEM ADMIN  │
│& PUB    │  │PIPELINE    │ │COHORT    │    │(Event-driven)│
└────┬────┘  └──────┬─────┘ └────┬─────┘    └──────────────┘
     │              │            │
     │              │            │
     │         ┌────┴────┐       │
     │         │          │      │
     └─────────┼──────────┴──────┘
               │
               ▼
        ┌──────────────────────┐
        │LEARNING DELIVERY     │
        │(Reads everything)    │
        └──────────────────────┘
```

**Dependency Rules:**

1. **Identity & Access** - No dependencies
   ```typescript
   import { db } from '@/server/db';
   // No other module imports
   ```

2. **Content & Publishing** - Depends on Identity only
   ```typescript
   import { identityService } from '@/modules/identity-access/service';
   import { eventBus } from '@/shared/events/event-bus';
   // No Batch, Media, Learning imports
   ```

3. **Media Pipeline** - Depends on Identity only
   ```typescript
   import { identityService } from '@/modules/identity-access/service';
   import { eventBus } from '@/shared/events/event-bus';
   // Can read chapters/segments via ContentService (passed in constructor)
   ```

4. **Batch & Cohort** - Depends on Identity only
   ```typescript
   import { identityService } from '@/modules/identity-access/service';
   import { eventBus } from '@/shared/events/event-bus';
   // No Content, Media, Learning imports
   ```

5. **Learning Delivery** - Depends on all others (read-only)
   ```typescript
   import { identityService } from '@/modules/identity-access/service';
   import { contentService } from '@/modules/content-publishing/service';
   import { mediaService } from '@/modules/media-pipeline/service';
   import { batchService } from '@/modules/batch-cohort/service';
   // Reads everything
   ```

6. **System Admin** - No direct dependencies
   ```typescript
   // Subscribes to all events (loose coupling)
   import { eventBus } from '@/shared/events/event-bus';
   // No module imports - just event listeners
   ```

---

## 4. Critical Separation Examples

### Example 1: Enrolling a Student in a Batch

**Question:** Which module should handle this?

**Answer:** BATCH & COHORT module ONLY

```typescript
// ✅ CORRECT - Batch module handles enrollment

// Routes file
app.post('/api/batches/:batchId/enroll', 
  authMiddleware, 
  requireRole('admin'),
  async (req, res) => {
    const { batchId } = req.params;
    const { studentId } = req.body;
    
    // Call Batch service
    const enrollment = await batchService.enrollStudent(batchId, studentId, req.user.id);
    res.json(enrollment);
  }
);

// Batch module handles it
async enrollStudent(batchId: number, studentId: string, enrolledBy: string) {
  // Validate
  const batch = await this.getBatch(batchId);
  if (!batch) throw new Error('Batch not found');
  
  const user = await identityService.getUser(studentId);
  if (!user) throw new Error('User not found');
  
  // Check not already enrolled
  const existing = await this.getEnrollment(batchId, studentId);
  if (existing && existing.status === 'active') {
    throw new Error('Already enrolled');
  }
  
  // Create enrollment
  const enrollment = await db.insert(enrollments).values({
    batchId,
    studentId,
    status: 'active',
    enrolledBy,
    enrolledAt: new Date()
  }).returning();
  
  // Emit event (System Admin hears it and logs)
  eventBus.publish('StudentEnrolled', {
    batchId,
    studentId,
    enrolledBy,
    enrollment: enrollment[0]
  });
  
  return enrollment[0];
}

// ❌ WRONG - Content module should NOT handle enrollment
// ❌ WRONG - Learning module should NOT handle enrollment
// ❌ WRONG - Media module should NOT handle enrollment
```

---

### Example 2: Getting Student Progress for a Chapter

**Question:** Who should provide this?

**Answer:** LEARNING DELIVERY module

```typescript
// ✅ CORRECT - Learning module provides progress queries

// Routes file
app.get('/api/progress/student/:studentId/:chapterId',
  authMiddleware,
  requireRole('instructor', 'admin'),
  async (req, res) => {
    const { studentId, chapterId } = req.params;
    
    // Call Learning service
    const progress = await learningService.getChapterProgress(studentId, chapterId);
    res.json(progress);
  }
);

// Learning module handles it
async getChapterProgress(studentId: string, chapterId: number): Promise<StudentProgress | null> {
  const [progress] = await db
    .select()
    .from(studentProgress)
    .where(
      and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.chapterId, chapterId)
      )
    );
  
  return progress || null;
}

// ❌ WRONG - Content module should NOT expose student progress
// ❌ WRONG - Batch module should NOT provide progress queries
// Content module owns chapters; Learning module owns progress
```

---

### Example 3: Publishing a Chapter

**Question:** Which module should handle this?

**Answer:** CONTENT & PUBLISHING module

```typescript
// ✅ CORRECT - Content module publishes chapters

// Routes file
app.patch('/api/chapters/:chapterId/status',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (req, res) => {
    const { chapterId } = req.params;
    const { status } = req.body;
    
    // Call Content service
    if (status === 'published') {
      const chapter = await contentService.publishChapter(chapterId, req.user.id);
      res.json(chapter);
    }
  }
);

// Content module handles it
async publishChapter(chapterId: number, userId: string): Promise<Chapter> {
  // Validate user is content_manager or admin
  const user = await identityService.getUser(userId);
  if (!user.roles.includes('content_manager') && !user.roles.includes('admin')) {
    throw new Error('Not authorized');
  }
  
  // Get chapter
  const chapter = await this.getChapter(chapterId);
  if (chapter.status !== 'draft') {
    throw new Error('Only draft chapters can be published');
  }
  
  // Update status
  const updated = await db
    .update(chapters)
    .set({ status: 'published', publishedAt: new Date() })
    .where(eq(chapters.id, chapterId))
    .returning();
  
  // Emit event (System Admin hears and logs)
  eventBus.publish('ChapterPublished', {
    chapterId,
    userId,
    chapter: updated[0]
  });
  
  return updated[0];
}

// ❌ WRONG - Batch module should NOT publish chapters
// ❌ WRONG - Learning module should NOT publish chapters
// ❌ WRONG - Media module should NOT publish chapters
// Only Content module owns chapters
```

---

### Example 4: Getting Chapter for Student to Learn

**Question:** Which module?

**Answer:** LEARNING DELIVERY module (reads from Content + Media)

```typescript
// ✅ CORRECT - Learning module provides learning content

// Routes file
app.get('/api/chapter/:chapterId',
  authMiddleware,
  async (req, res) => {
    const { chapterId } = req.params;
    const { script } = req.query;
    
    // Call Learning service
    const chapter = await learningService.getChapterForLearning(
      chapterId, 
      req.user.id,
      script || 'en'
    );
    res.json(chapter);
  }
);

// Learning module handles it (reads from Content + Media)
async getChapterForLearning(chapterId: number, studentId: string, script: string) {
  // Verify student access (published content only)
  const chapter = await contentService.getChapter(chapterId);
  if (chapter.status !== 'published') {
    throw new Error('Chapter not available');
  }
  
  // Get segments for this script
  const segments = await contentService.getSegmentsByChapter(chapterId, script);
  
  // Get mappings (audio timestamps)
  const mappings = await mediaService.getMappingsByChapter(chapterId);
  
  // Get student's progress
  const progress = await this.getChapterProgress(studentId, chapterId);
  
  // Update last accessed
  await db
    .update(studentProgress)
    .set({ lastAccessed: new Date() })
    .where(
      and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.chapterId, chapterId)
      )
    );
  
  return {
    chapter,
    segments,
    mappings,
    progress,
    audioFiles: await mediaService.getAudioFilesByChapter(chapterId)
  };
}

// ✅ CORRECT - Learning module orchestrates reads from multiple modules
// This is allowed - Learning reads everything
```

---

### Example 5: Instructor Updates Student Grade

**Question:** Which module?

**Answer:** LEARNING DELIVERY (Learning module owns progress), with BATCH (verify instructor access)

```typescript
// ✅ CORRECT - Learning module updates progress, Batch verifies access

// Routes file
app.patch('/api/progress/student/:studentId/:chapterId',
  authMiddleware,
  requireRole('instructor', 'admin'),
  async (req, res) => {
    const { studentId, chapterId } = req.params;
    const { batchId, proficiencyLevel, notes } = req.body;
    const instructorId = req.user.id;
    
    // Batch module verifies instructor is assigned to batch
    const isAuthorized = await batchService.isPrimaryInstructor(instructorId, batchId) ||
                         await batchService.isCoInstructor(instructorId, batchId) ||
                         await identityService.isAdmin(instructorId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Verify student is in batch
    const isEnrolled = await batchService.isStudentEnrolledInBatch(studentId, batchId);
    if (!isEnrolled) {
      return res.status(400).json({ error: 'Student not in batch' });
    }
    
    // Learning module updates progress
    const progress = await learningService.updateStudentProgress(
      batchId,
      studentId,
      chapterId,
      proficiencyLevel,
      instructorId,
      notes
    );
    
    res.json(progress);
  }
);

// Learning module updates progress
async updateStudentProgress(
  batchId: number,
  studentId: string,
  chapterId: number,
  proficiencyLevel: number,
  instructorId: string,
  notes?: string
): Promise<StudentProgress> {
  // Update or create progress
  const progress = await db
    .insert(studentProgress)
    .values({
      studentId,
      chapterId,
      batchId,
      proficiencyLevel,
      evaluatedBy: instructorId,
      lastEvaluatedAt: new Date(),
      notes
    })
    .onConflictDoUpdate({
      target: [studentProgress.studentId, studentProgress.chapterId],
      set: {
        proficiencyLevel,
        evaluatedBy: instructorId,
        lastEvaluatedAt: new Date(),
        notes,
        updatedAt: new Date()
      }
    })
    .returning();
  
  // Emit event
  eventBus.publish('ProgressUpdated', {
    studentId,
    chapterId,
    batchId,
    proficiencyLevel,
    evaluatedBy: instructorId
  });
  
  return progress[0];
}

// ✅ CORRECT - Two modules work together:
// - Batch verifies context (instructor assigned to batch)
// - Learning updates the progress
```

---

## 5. Ambiguous Cases - How to Decide

### Q: Should Identity module or Batch module verify instructor assignment?

**Answer:** Both have roles:
- **Identity:** Checks if user has 'instructor' role
- **Batch:** Checks if instructor is assigned to specific batch

```typescript
// Both checks are needed:
const hasInstructorRole = await identityService.hasRole(userId, 'instructor');
const isAssignedToBatch = await batchService.isAssignedToAnyBatch(userId);

// Together they answer: "Is this person an instructor with actual assignment?"
```

---

### Q: Should Content module or Learning module filter drafts?

**Answer:** 
- **Content module:** Provides method to get chapters (with optional filter)
- **Learning module:** Uses it to only show published chapters

```typescript
// Content module provides flexible method
async getChaptersByTrack(trackId: number, publishedOnly?: boolean) {
  const query = db.select().from(chapters).where(eq(chapters.trackId, trackId));
  if (publishedOnly) {
    query.where(eq(chapters.status, 'published'));
  }
  return query;
}

// Learning module uses it with publishedOnly=true
async getPublishedChaptersByTrack(trackId: number) {
  return await contentService.getChaptersByTrack(trackId, true);
}
```

---

### Q: Should Batch module or Learning module own progress?

**Answer:** LEARNING module owns progress
- Batch module is about organizing cohorts (student rosters, instructor assignments)
- Learning module is about tracking development (proficiency levels, notes)

```typescript
// WRONG - Batch module tries to own progress:
// batch_module/service.ts
async updateStudentProgress(...) { ... }  // ❌ NO

// RIGHT - Learning module owns it:
// learning_module/service.ts
async updateStudentProgress(...) { ... }  // ✅ YES

// Batch module can delegate to Learning if needed:
// batch_module/service.ts
async updateStudentProgress(...) {
  return await learningService.updateStudentProgress(...);
}  // ✅ OK (delegation pattern)
```

---

## 6. Cross-Module Communication Pattern

### Rule: Use Events for Loose Coupling

**Instead of direct calls:**
```typescript
// ❌ WRONG - tight coupling
// content module directly calls learning module
await learningService.invalidateCache(chapterId);
```

**Use events:**
```typescript
// ✅ RIGHT - loose coupling
// Content module emits event
eventBus.publish('ChapterPublished', { chapterId, userId });

// Learning module listens (independently)
eventBus.subscribe('ChapterPublished', async (event) => {
  // React to chapter publish
  await invalidateCache(event.chapterId);
});
```

**Benefits:**
- Content module doesn't know Learning exists
- New modules can react to events without modifying existing code
- Easy to add/remove subscribers
- Future: Could move to message queue (Kafka, RabbitMQ) without code changes

---

## 7. Module File Structure (Clear Organization)

```
server/modules/
│
├── identity-access/
│   ├── service.ts           ← MAIN: IdentityService (public API)
│   ├── middleware.ts        ← authMiddleware, requireRole
│   ├── storage.ts           ← DB operations (private)
│   ├── types.ts             ← Module DTOs
│   └── events.ts            ← Events emitted by this module
│
├── content-publishing/
│   ├── service.ts           ← MAIN: ContentService (public API)
│   ├── validation.ts        ← Content validation rules
│   ├── storage.ts           ← DB operations (private)
│   ├── types.ts             ← Content DTOs
│   └── events.ts            ← Events emitted
│
├── media-pipeline/
│   ├── service.ts           ← MAIN: MediaService (public API)
│   ├── upload.ts            ← File upload config
│   ├── storage.ts           ← DB operations (private)
│   ├── types.ts             ← Media DTOs
│   └── events.ts            ← Events emitted
│
├── batch-cohort/
│   ├── service.ts           ← MAIN: BatchService (public API)
│   ├── validation.ts        ← Enrollment rules
│   ├── storage.ts           ← DB operations (private)
│   ├── types.ts             ← Batch DTOs
│   └── events.ts            ← Events emitted
│
├── learning-delivery/
│   ├── service.ts           ← MAIN: LearningService (public API)
│   ├── filters.ts           ← Published-content filters
│   ├── storage.ts           ← DB operations (private)
│   ├── types.ts             ← Progress DTOs
│   └── events.ts            ← Events emitted
│
└── system-admin/
    ├── service.ts           ← AdminService (public API)
    ├── audit.ts             ← AuditService (event listeners)
    ├── storage.ts           ← DB operations (private)
    ├── types.ts             ← Admin DTOs
    └── event-handlers.ts    ← All event subscriptions
```

**Key:** `service.ts` is the ONLY exported file from each module. Everything else is internal.

```typescript
// ✅ CORRECT - Import from service only
import { contentService } from '@/modules/content-publishing/service';

// ❌ WRONG - Don't import internals
import { storage } from '@/modules/content-publishing/storage';  // ❌
import { ContentValidator } from '@/modules/content-publishing/validation';  // ❌
```

---

## 8. Quick Reference - Who Owns What?

| Responsibility | Module | Operations |
|---|---|---|
| **Users & Auth** | Identity | Create, approve, assign roles, verify permissions |
| **Tracks & Chapters** | Content | Create, edit, publish, delete, order |
| **Text Segments** | Content | Create, delete, reorder |
| **Audio Files** | Media | Upload, delete, store metadata |
| **Media Segments** | Media | Create timestamp ranges |
| **Segment Mappings** | Media | Link text segments to audio timestamps |
| **Batches** | Batch | Create, manage, delete, change status |
| **Enrollments** | Batch | Enroll, unenroll, manage status |
| **Co-Instructors** | Batch | Assign, remove |
| **Student Progress** | Learning | Create, update, query proficiency levels |
| **Audit Logs** | Admin | Log all sensitive operations (via events) |
| **System Settings** | Admin | Get, update configuration |

---

## 9. Testing Module Boundaries

When writing tests, respect module boundaries:

```typescript
// ✅ CORRECT - Test module in isolation
describe('ContentService', () => {
  it('publishes chapter', async () => {
    // Mock identityService
    const mockIdentity = { hasRole: jest.fn().mockResolvedValue(true) };
    
    // Test content service independently
    const contentService = new ContentService(db, mockIdentity, eventBus);
    const result = await contentService.publishChapter(1, 'user1');
    
    expect(result.status).toBe('published');
  });
});

// ❌ WRONG - Test doesn't respect boundaries
describe('Integration', () => {
  it('publishes chapter and updates learning cache', async () => {
    // This mixes Content + Learning logic
    // Should be two separate tests or an integration test file
  });
});
```

---

## Summary Checklist

- [ ] Each module owns specific tables (no sharing)
- [ ] Only that module writes to its tables
- [ ] Other modules read via service APIs
- [ ] No circular dependencies
- [ ] Learning module at top (reads everything)
- [ ] Identity module at bottom (read by everything)
- [ ] Events for cross-module communication
- [ ] Clear public API per module (service.ts)
- [ ] No direct DB queries in route handlers
- [ ] All permissions checked at route level
- [ ] Module file structure follows convention

