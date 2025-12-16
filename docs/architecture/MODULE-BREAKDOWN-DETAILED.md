# Detailed Module Breakdown with Domain Context

Based on the Veda Pathasala operational model, here's a comprehensive breakdown of the 6 domain modules with their responsibilities, interdependencies, and workflows.

---

## Module Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                             │
│           (Express routes + middleware + validation)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────────┐           ┌────────────────────────┐
│  IDENTITY & ACCESS    │           │  SYSTEM ADMIN          │
│  (Foundation Layer)   │           │  (Cross-cutting)       │
│                       │           │                        │
│ • User auth          │           │ • Audit logs           │
│ • Account approval   │           │ • Settings             │
│ • Role assignment    │◄──────────┤ • User management UI   │
│ • Permission checks  │  (depends on Identity)               │
│                       │           │                        │
└───────────┬───────────┘           └────────────────────────┘
            │
            │ (All modules depend on Identity)
            │
    ┌───────┴────────────────────────────────────────┐
    │                                                │
    ▼                                                ▼
┌─────────────────────┐                  ┌──────────────────────┐
│ CONTENT &           │                  │ MEDIA PIPELINE       │
│ PUBLISHING          │                  │                      │
│                     │                  │ • Audio uploads      │
│ • Tracks (8)        │                  │ • Media segments     │
│ • Chapters          │◄─────────────────┤ • Segment mappings   │
│ • Text segments     │  (uses for       │ • Metadata extraction│
│ • Draft/published   │   interactive)   │                      │
│                     │                  │                      │
└──────────┬──────────┘                  └──────────────────────┘
           │
           │ (reads published only)
           │
    ┌──────┴──────────────────────────────────────┐
    │                                             │
    ▼                                             ▼
┌────────────────────────┐           ┌──────────────────────┐
│ BATCH & COHORT         │           │ LEARNING DELIVERY    │
│                        │           │                      │
│ • Batch lifecycle      │           │ • Student progress   │
│ • Enrollments          │──────────►│ • Progress updates   │
│ • Primary instructor   │ (manages) │ • Content access     │
│ • Co-instructors       │           │ • Progress queries   │
│ • Roster management    │           │                      │
│                        │           │                      │
└────────────────────────┘           └──────────────────────┘

        Events flow across all modules via EventBus
```

---

## 1. Identity & Access Module

### Purpose
Central hub for user authentication, account management, and role-based authorization. Handles the complete user lifecycle from account approval to role assignment.

### Core Responsibilities

**User Lifecycle:**
- Account approval (pending_approval → active)
- Auto-assign 'student' role on account approval
- Assign/remove additional roles (instructor, content_manager, admin)
- Enable/disable user accounts (active ↔ inactive)
- User profile management (email, name, profile image)

**Authentication:**
- Session management via Replit Auth
- Login/logout workflows
- Session validation on protected routes
- Session expiration handling

**Authorization:**
- Role-based permission checking (simple flags: student, instructor, content_manager, admin)
- Context-aware permission checks (e.g., "can instructor update progress in batch X?")
- Admin verification
- User status validation (active/inactive)

### Database Entities
```typescript
users {
  id: string;              // UUID or auth provider ID
  email: string;           // Unique, used for login
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  roles: string[];         // JSON array: ['student'] or ['instructor', 'content_manager'] etc
  status: enum;            // 'pending_approval' | 'active' | 'inactive'
  invitedBy: string;       // admin who invited
  invitedAt: timestamp;
  lastLoginAt: timestamp;
  createdAt: timestamp;
  updatedAt: timestamp;
}

sessions {
  sid: string;             // Session ID from Replit Auth
  sess: object;            // Session data JSON
  expire: timestamp;       // Session expiration
}
```

### Key Operations & Workflows

#### **Workflow 1: User Account Approval (External → System)**
```
Admin Reviews Google Form → Identifies approved candidate →
  ↓
AdminService.inviteUser(email, roles=['student'])
  • Creates user with status='pending_approval'
  • Sends invitation email/link to candidate
  ↓
User clicks link → Replit Auth flow → Logs in
  ↓
AuthService.approveAccount(userId)
  • Sets status='active'
  • Auto-assigns ['student'] role if not already assigned
  • Emits UserAccountApproved event
  ↓
UserActivated → Sees student dashboard
```

#### **Workflow 2: Role Assignment (Admin assigns volunteers)**
```
Admin wants to make John an instructor:
  ↓
IdentityService.assignRole(userId='john', role='instructor')
  • Gets user, checks user.roles
  • Adds 'instructor' to roles array
  • Updates user with new roles: ['student', 'instructor']
  • Emits UserRoleChanged event
  ↓
John now has instructor permissions throughout system
```

#### **Workflow 3: Permission Checking (Throughout system)**
```
Request arrives at protected endpoint:
  ↓
authMiddleware checks:
  1. Session exists? (validate with Replit)
  2. User exists in DB?
  3. User status === 'active'?
  4. Attach user to req.user
  ↓
requireRole('instructor') middleware:
  1. Check: user.roles.includes('instructor')
  2. If not → 403 Forbidden
  ✓ If yes → continue to handler
  ↓
Handler-specific checks:
  1. Is instructor assigned to this batch?
  2. Emit audit event
  3. Process request
```

### Service Interface
```typescript
class IdentityService {
  // Authentication
  authenticate(sessionId: string): Promise<User | null>;
  createSession(userId: string): Promise<Session>;
  destroySession(sessionId: string): Promise<void>;
  
  // Account Management
  createUser(email: string, firstName: string, lastName: string): Promise<User>;
  approveAccount(userId: string): Promise<User>;  // pending_approval → active + student role
  disableUser(userId: string): Promise<User>;
  enableUser(userId: string): Promise<User>;
  getUser(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  
  // Role Management
  assignRole(userId: string, role: UserRole): Promise<User>;
  removeRole(userId: string, role: UserRole): Promise<User>;
  updateRoles(userId: string, roles: UserRole[]): Promise<User>;
  hasRole(userId: string, role: UserRole): boolean;
  
  // Permissions
  isAdmin(userId: string): boolean;
  isInstructor(userId: string): boolean;
  isContentManager(userId: string): boolean;
  isStudent(userId: string): boolean;
  canUpdateProgressInBatch(userId: string, batchId: number): Promise<boolean>;
  canEditContent(userId: string): boolean;
}
```

### Authorization Model

**Simple Role Flags:**
- `student` → Can view published content, track own progress
- `instructor` → Can update student progress in assigned batches, view rosters
- `content_manager` → Can create/edit/publish content
- `admin` → Full system access

**No Hierarchy:** User can have multiple roles independently. A user with `['student', 'instructor']` has permissions from BOTH roles.

**Context-Aware Checks:** Some permissions require additional context:
```typescript
// Can instructor update student progress?
canUpdateProgressInBatch(instructorId, batchId) {
  // 1. Must have 'instructor' role
  // 2. Must be assigned to batch (primary or co-instructor)
  return hasRole('instructor') && (isPrimaryInstructor || isCoInstructor);
}

// Can content_manager edit chapter?
canEditContent(userId) {
  // Just needs role
  return hasRole('content_manager') || isAdmin();
}

// Can user approve accounts?
canApproveAccounts(userId) {
  // Only admins
  return isAdmin();
}
```

### Domain Events
- `UserCreated`: New user invited (pending_approval)
- `UserAccountApproved`: Account approved and activated
- `UserRoleChanged`: Role added/removed
- `UserStatusChanged`: Enabled/disabled
- `UserLoggedIn`: User logged in (optional, for analytics)

### Important Constraints
- ✅ Email is unique per user
- ✅ User status must be 'active' to access system
- ✅ At least one role required (default: 'student')
- ⚠️ No automatic role relationships (e.g., instructor role doesn't require student role)

### Interactions with Other Modules
- **Batch & Cohort:** Validates user has 'instructor' role before assigning to batch
- **Content & Publishing:** Checks 'content_manager' role before edit operations
- **Learning Delivery:** Checks 'student' role and batch enrollment for progress access
- **System Admin:** Requires 'admin' role for all admin operations

---

## 2. Content & Publishing Module

### Purpose
Manage the Vedic curriculum structure (8 tracks, multiple chapters per track) and multilingual content in three scripts (Telugu, Hindi/Devanagari, English/IAST).

### Core Responsibilities

**Curriculum Structure:**
- Track management (8 tracks, ordered)
- Chapter management per track (ordered, titled)
- Content in 3 scripts: Telugu (te), Hindi (hi), English (en)
- Draft/published workflow (protect published from deletion)
- Content versioning/audit trail

**Text Segmentation:**
- Script-specific segmentation (each script can have different segments)
- Segment ordering/sequencing
- Segment position tracking (start/end character position)

### Database Entities
```typescript
tracks {
  id: number;              // Primary key
  title: string;           // Unique, e.g., "Track 1: Rigveda Basics"
  description: string;     // Purpose and overview
  order: number;           // Sequence 1-8
  createdBy: string;       // User ID
  createdAt: timestamp;
  updatedAt: timestamp;
}

chapters {
  id: number;
  trackId: number;         // Foreign key to tracks
  title: string;           // Chapter title (single source of truth)
  order: number;           // Order within track
  status: enum;            // 'draft' | 'published'
  content: jsonb;          // { te?: string, hi?: string, en?: string }
  publishedAt: timestamp;  // When status changed to published
  lastEditedBy: string;
  createdBy: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}

textSegments {
  id: number;
  chapterId: number;       // Foreign key
  script: enum;            // 'te' | 'hi' | 'en'
  startPosition: number;   // Character position in content
  endPosition: number;
  order: number;           // Sequence within script
  createdBy: string;
  createdAt: timestamp;
}
```

### Key Operations & Workflows

#### **Workflow 1: Publisher Creates Chapter**
```
Admin/ContentManager navigates to Track 1 → "Add Chapter"
  ↓
ContentService.createChapter(trackId=1, title='Chapter 1: Basics', createdBy=userId)
  • Creates chapter with status='draft'
  • Sets order=next_available
  • Returns empty chapter
  ↓
Publisher opens Chapter Editor (5-tab interface):
  Tab 1: Content Editor
    • Selects script (te/hi/en)
    • Uses TipTap WYSIWYG editor
    • Types/pastes content
    • Saves → ContentService.updateChapterContent(chapterId, script='te', htmlContent)
  ↓
  Tab 2: Audio Management
    • Uploads audio file (handled by Media Pipeline module)
  ↓
  Tab 3: Text Segmentation
    • Selects text in editor
    • Clicks "Create Segment"
    • SegmentService.createTextSegment(chapterId, script='te', start=0, end=50)
  ↓
  Tab 4: Audio Mapping
    • Maps text segments to audio timestamps
    • (handled by Media Pipeline)
  ↓
  Tab 5: Preview
    • Preview in Learn Mode
```

#### **Workflow 2: Publisher Publishes Chapter**
```
Publisher clicks "Publish" on draft chapter
  ↓
ContentService.publishChapter(chapterId, userId)
  • Validates: chapter.status === 'draft'
  • Updates: status='draft' → 'published', publishedAt=now
  • Emits ChapterPublished event
  ↓
AuditService (listening to event) logs:
  { action: 'PUBLISH', resource: 'chapter', resourceId: chapterId }
  ↓
LearningService (listening to event) updates cached student-visible chapters
  ↓
Chapter now visible to students in published content list
```

#### **Workflow 3: Try to Delete Published Chapter**
```
Admin clicks "Delete" on published chapter
  ↓
ContentService.canDeleteChapter(chapterId)
  • Checks: chapter.status === 'published'?
  • Returns: false
  ↓
API returns 403: "Cannot delete published chapters"
UI shows: "Unpublish this chapter first"
```

### Service Interface
```typescript
class ContentService {
  // Track Management
  getAllTracks(): Promise<Track[]>;
  getTrack(trackId: number): Promise<Track>;
  createTrack(title: string, description: string, createdBy: string): Promise<Track>;
  updateTrack(trackId: number, updates: Partial<Track>): Promise<Track>;
  deleteTrack(trackId: number): Promise<void>;  // Cascade deletes chapters
  reorderTracks(trackId: number, direction: 'up' | 'down'): Promise<void>;
  
  // Chapter Management
  getChaptersByTrack(trackId: number, publishedOnly?: boolean): Promise<Chapter[]>;
  getChapter(chapterId: number): Promise<Chapter>;
  createChapter(trackId: number, title: string, createdBy: string): Promise<Chapter>;
  updateChapter(chapterId: number, updates: Partial<Chapter>): Promise<Chapter>;
  updateChapterContent(chapterId: number, script: 'te'|'hi'|'en', content: string): Promise<Chapter>;
  publishChapter(chapterId: number, userId: string): Promise<Chapter>;
  unpublishChapter(chapterId: number, userId: string): Promise<Chapter>;
  deleteChapter(chapterId: number): Promise<void>;  // Only if draft
  canDeleteChapter(chapterId: number): Promise<boolean>;
  reorderChapters(chapterId: number, direction: 'up' | 'down'): Promise<void>;
  
  // Text Segmentation
  createTextSegment(chapterId: number, script: string, start: number, end: number): Promise<TextSegment>;
  getSegmentsByChapter(chapterId: number, script?: string): Promise<TextSegment[]>;
  deleteTextSegment(segmentId: number): Promise<void>;
  reorderSegments(chapterId: number, segmentOrders: Array<{id, order}>): Promise<void>;
}
```

### Content Structure (Multilingual)
**3 Scripts per Chapter:**
- **Telugu (te):** Vedic text in Telugu script (Font: JIMS Telugu, fallback: Noto Sans Telugu, size: 28px)
- **Hindi (hi):** Vedic text in Devanagari script (Font: Adishila San, fallback: Noto Sans Devanagari, size: 28px)
- **English (en):** IAST transliteration (Font: standard serif, size: 28px)

Each script can have independent:
- Content (different translations/transliterations)
- Segments (different boundaries for same content)
- Audio mappings (same audio, different text segment boundaries)

### Domain Events
- `TrackCreated`: New track added
- `ChapterPublished`: Draft chapter → published
- `ChapterUnpublished`: Published chapter → draft
- `ContentUpdated`: Chapter content modified
- `SegmentCreated`: New text segment created
- `SegmentDeleted`: Text segment removed

### Important Constraints
- ✅ Track titles are unique
- ✅ Published chapters cannot be deleted
- ✅ Text segments have ordered positions (start < end)
- ✅ Chapters must have at least one segment to be published? (TBD - decide if required)
- ⚠️ No version control initially (can add later)

### Interactions with Other Modules
- **Media Pipeline:** Chapters have audio files; segments map to timestamps
- **Learning Delivery:** Reads published chapters and segments for student content
- **System Admin:** Audit logs track publish/unpublish operations

---

## 3. Media Pipeline Module

### Purpose
Handle all audio-related operations: file uploads, metadata extraction, media segment creation, and mapping text segments to audio timestamps for interactive learning.

### Core Responsibilities

**Audio Management:**
- File upload with validation (audio/* MIME types, 50MB max)
- Metadata extraction (duration, file size, mime type)
- Display name and reciter attribution
- Audio file deletion (cascade to segments/mappings)

**Media Segments:**
- Create timestamp ranges within audio files
- Track start/end timestamps (in seconds)
- Optional segment naming

**Segment Mapping:**
- Link text segments (from Content module) to media segments (audio timestamps)
- Enable interactive playback: click text → play corresponding audio

### Database Entities
```typescript
audioFiles {
  id: number;
  chapterId: number;       // Foreign key
  filename: string;        // Original uploaded filename
  displayName: string;     // User-friendly name
  reciter: string;         // Who recited this audio (optional)
  duration: number;        // In seconds
  fileSize: number;        // In bytes
  mimeType: string;        // e.g., 'audio/mpeg'
  uploadedBy: string;      // User ID
  createdAt: timestamp;
}

mediaSegments {
  id: number;
  audioFileId: number;     // Foreign key
  startTimestamp: number;  // In seconds (e.g., 12.5)
  endTimestamp: number;    // In seconds (e.g., 18.3)
  segmentName: string;     // Optional, e.g., "Opening mantra"
  createdBy: string;
  createdAt: timestamp;
}

segmentMappings {
  id: number;
  mediaSegmentId: number;  // Foreign key (audio timestamp)
  textSegmentId: number;   // Foreign key (text segment)
  createdBy: string;
  createdAt: timestamp;
  // Together: "when user clicks text segment X, play audio from Y to Z seconds"
}
```

### Key Operations & Workflows

#### **Workflow 1: Publisher Uploads Audio**
```
Admin in Chapter Editor → Tab 2: Audio Management
  ↓
Selects MP3 file (or other audio format)
  ↓
Upload button → multer middleware → file saved to /uploads
  ↓
MediaService.uploadAudio(chapterId, file, uploadedBy=userId)
  • Parse audio file with music-metadata library
  • Extract duration, file size, MIME type
  • Create audioFiles record
  • Return { id, filename, displayName, duration, mimeType }
  ↓
Emits AudioUploaded event
  ↓
AuditService logs: { action: 'UPLOAD_AUDIO', resource: 'audio_file', resourceId: audioId }
  ↓
UI displays audio in list with duration
```

#### **Workflow 2: Publisher Creates Audio Mapping**
```
Publisher in Tab 4: Audio Mapping
  • Selects audio file (dropdown)
  • Audio player shows waveform
  • Text segments displayed on side
  ↓
Publisher clicks text segment → audio plays that segment (if already mapped) or starts playing
  ↓
Publisher hears the segment they want and clicks "Create Mapping" when audio reaches that point
  OR manually enters start/end timestamps
  ↓
MediaService.createMapping(textSegmentId, audioFileId, startTime=12.5, endTime=18.3)
  • Creates mediaSegment { audioFileId, startTime, endTime }
  • Creates segmentMapping { mediaSegmentId, textSegmentId }
  • Returns MappingWithTimestamps
  ↓
Emits MappingCreated event
  ↓
UI updates segment badge: "Mapped" (green)
```

#### **Workflow 3: Student Plays Interactive Segment**
```
Student in Learn Mode views chapter with segments and audio
  ↓
Student clicks text segment
  ↓
LearningService looks up mapping:
  SELECT mediaSegments, textSegments
  WHERE textSegment.id = clicked_segment
  AND segmentMapping links them
  ↓
AudioPlayer:
  • Seeks to mediaSegment.startTimestamp (e.g., 12.5s)
  • Plays until mediaSegment.endTimestamp (18.3s)
  • Highlights text segment during playback
  ↓
User hears recitation of that specific segment
```

### Service Interface
```typescript
class MediaService {
  // Audio Management
  uploadAudio(chapterId: number, file: Express.Multer.File, uploadedBy: string): Promise<AudioFile>;
  getAudioFilesByChapter(chapterId: number): Promise<AudioFile[]>;
  updateAudioFile(audioId: number, updates: Partial<AudioFile>): Promise<AudioFile>;
  deleteAudioFile(audioId: number): Promise<void>;  // Cascade to segments/mappings
  
  // Media Segments
  createMediaSegment(audioFileId: number, startTime: number, endTime: number): Promise<MediaSegment>;
  getMediaSegmentsByAudioFile(audioFileId: number): Promise<MediaSegment[]>;
  updateMediaSegment(segmentId: number, updates: Partial<MediaSegment>): Promise<MediaSegment>;
  deleteMediaSegment(segmentId: number): Promise<void>;
  
  // Segment Mappings
  createMapping(textSegmentId: number, audioFileId: number, startTime: number, endTime: number): Promise<SegmentMapping>;
  getMappingsByChapter(chapterId: number): Promise<MappingWithTimestamps[]>;
  getMappingsByAudioFile(audioFileId: number): Promise<MappingWithTimestamps[]>;
  deleteMapping(mappingId: number): Promise<void>;
  deleteMappin gByTextSegment(textSegmentId: number, audioFileId: number): Promise<void>;
}

// Return type for student-facing APIs
interface MappingWithTimestamps {
  textSegmentId: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  audioUrl: string;        // Path to audio file
}
```

### File Storage
- **Current:** Local filesystem at `/uploads` (served via Express static route)
- **Future:** S3/GCS with CDN integration
- **Constraints:** 50MB max file size per constants.ts

### Domain Events
- `AudioUploaded`: New audio file uploaded
- `MappingCreated`: Text ↔ Audio mapping created
- `MappingDeleted`: Mapping removed
- `AudioDeleted`: Audio file deleted (cascade)

### Important Constraints
- ✅ Audio files linked to specific chapters
- ✅ Media segments must have start < end timestamp
- ✅ Segment mappings are 1:1 (one text segment → one audio timestamp range)
- ✅ File size limit: 50MB
- ⚠️ No transcoding/format conversion initially (can add later)
- ⚠️ No auto-segmentation (AI-based) - all manual

### Interactions with Other Modules
- **Content & Publishing:** Chapters can have audio files; text segments from chapters are mapped
- **Learning Delivery:** Reads mappings for interactive playback
- **System Admin:** Audit logs track uploads/deletions

---

## 4. Learning Delivery Module

### Purpose
Provide student-facing APIs for consuming published content and tracking their progress chapter-by-chapter. Focus is read-heavy and simple, no complex gates or validation.

### Core Responsibilities

**Content Access:**
- Expose published tracks/chapters only
- Filter out drafts for non-admin users
- Provide segments + mappings for interactive playback
- Support multiple script views (te/hi/en)

**Progress Tracking:**
- Students can view their own progress across all chapters
- Instructors/admins update student progress per chapter
- Track last accessed date per chapter
- Store proficiency level (0-4) with notes from instructor

**Progress Queries:**
- Summary: How many chapters per track done?
- Detail: Specific chapter progress + evaluator notes
- Cross-batch: Progress from previous batches visible

### Database Entities
```typescript
studentProgress {
  id: number;
  studentId: string;       // User ID
  chapterId: number;
  batchId: number;         // Context: which batch was this assessed in?
  proficiencyLevel: enum;  // 0 | 1 | 2 | 3 | 4
  lastEvaluatedAt: timestamp;
  evaluatedBy: string;     // Instructor or admin who set level
  notes: string;           // Instructor feedback, e.g., "Good pace, needs more practice"
  createdAt: timestamp;
  updatedAt: timestamp;
}

// No schema changes - uses existing studentProgress table
```

### Key Operations & Workflows

#### **Workflow 1: Student Views Published Content**
```
Student logs in → navigates to /tracks
  ↓
LearningService.getPublishedTracks()
  • Queries tracks with published chapters
  • Filters: only chapters with status='published'
  • Returns: [{ trackId, title, chapters: [...] }]
  ↓
UI displays:
  Track 1: Rigveda Basics [3/10 chapters completed]
  Track 2: Yajurveda Intro [0/8 chapters]
  ...
```

#### **Workflow 2: Student Opens Chapter in Learn Mode**
```
Student clicks "Track 1 → Chapter 1"
  ↓
LearningService.getChapterForLearning(chapterId, studentId)
  • Validates: chapter.status === 'published'
  • Fetches chapter content (te/hi/en)
  • Fetches text segments for selected script
  • Fetches segment mappings (timestamps)
  • Fetches student's current progress for this chapter
  • Updates lastAccessed timestamp
  • Emits ChapterAccessed event
  ↓
Returns to frontend:
  {
    chapter: { id, title, content: { te: '...', hi: '...', en: '...' } },
    segments: [{ id, startPos, endPos, order }, ...],
    mappings: [{ textSegmentId, audioFileId, startTime, endTime }, ...],
    progress: { proficiencyLevel: 2, lastEvaluatedAt, evaluatedBy, notes: 'Good!' }
  }
  ↓
Frontend renders:
  • Text in selected script (with segment highlighting)
  • Audio player with waveform
  • Interactive playback: click segment → play audio range
  • Current proficiency level badge
```

#### **Workflow 3: Instructor Updates Student Progress**
```
Instructor in Batch Roster page sees student list
  ↓
Clicks student → sees all chapters + current progress
  ↓
Clicks chapter "Update Proficiency"
  ↓
Modal opens: [Level 0] [Level 1] [Level 2] [Level 3] [Level 4]
  Instructor selects "Level 3"
  Enters notes: "Good recitation, ready for oral exam prep"
  ↓
ProgressService.updateStudentProgress(
  batchId, studentId, chapterId, 
  proficiencyLevel=3, 
  instructorId, 
  notes='Good recitation, ready...'
)
  • Validates: instructor assigned to batch
  • Validates: student enrolled in batch
  • Creates or updates studentProgress record
  • Sets evaluatedBy=instructorId, lastEvaluatedAt=now
  • Emits ProgressUpdated event
  ↓
AuditService logs: { action: 'UPDATE_PROGRESS', student, chapter, level }
  ↓
Student now sees proficiency level updated in their progress dashboard
  ↓
Instructor roster refreshes to show Level 3
```

#### **Workflow 4: Student Drops Out, Returns Later**
```
Student enrolled in Track 2 Batch A
Progress: [Ch1: L2, Ch2: L1, Ch3: L0] (3 chapters)
  ↓
Student drops out (life got busy)
Enrollment status changes to 'dropped'
  ↓
6 months later, student returns
Admin checks progress summary: "Track 2 70% done, 3 chapters progress saved"
  ↓
Admin creates new batch for Track 2 (different cohort)
Admin enrolls student in new batch: "Track 2 Batch C"
  ↓
Student's old progress from Batch A is preserved in DB
New progress entries are tied to Batch C
  ↓
Instructor in Batch C can:
  • See student is not starting from scratch
  • Review old progress/notes from previous instructor
  • Decide to continue from L0 or retake from L1
  ↓
Student can view: "Previously in Track 2 Batch A: Ch1 L2, Ch2 L1, Ch3 L0"
```

### Service Interface
```typescript
class LearningService {
  // Content Access
  getPublishedTracks(): Promise<Track[]>;
  getPublishedChaptersByTrack(trackId: number): Promise<Chapter[]>;
  getChapterForLearning(chapterId: number, studentId: string): Promise<ChapterWithProgress>;
  getSegmentsForLearning(chapterId: number, script: string): Promise<TextSegment[]>;
  getMappingsForChapter(chapterId: number): Promise<MappingWithTimestamps[]>;
  
  // Progress Tracking
  updateStudentProgress(
    batchId: number,
    studentId: string,
    chapterId: number,
    proficiencyLevel: number,
    instructorId: string,
    notes?: string
  ): Promise<StudentProgress>;
  
  // Progress Queries
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;  // All progress
  getStudentProgressByBatch(studentId: string, batchId: number): Promise<StudentProgress[]>;
  getStudentProgressByTrack(studentId: string, trackId: number): Promise<StudentProgress[]>;
  getChapterProgress(studentId: string, chapterId: number): Promise<StudentProgress | null>;
  
  // Summary/Reporting
  getStudentProgressSummary(studentId: string): Promise<{
    allProgress: StudentProgress[],
    progressByTrack: { trackId, completedChapters, totalChapters, avgLevel }[],
    currentBatch: Batch | null
  }>;
  
  // Instructor Views
  getBatchRoster(batchId: number): Promise<RosterEntry[]>;  // Students + their progress in this batch
}

interface RosterEntry {
  studentId: string;
  studentName: string;
  enrolledAt: timestamp;
  progressByChapter: { chapterId, level, lastEvaluated, notes }[]
  overallProgress: number;  // % chapters at level 2+
}
```

### Important Constraints
- ✅ Students see only published chapters
- ✅ Draft chapters hidden from students (except admins)
- ✅ Progress is chapter-level granularity (no segment-level tracking)
- ✅ Progress tied to batch for context
- ⚠️ No progress gates enforced ("can't progress to next track if level < 2")
- ⚠️ No track progression logic in system (admin decides when student moves to next track)
- ⚠️ Progress preserved even if student drops out

### Domain Events
- `ChapterAccessed`: Student viewed chapter
- `ProgressUpdated`: Student proficiency level changed
- `ChapterCompleted`: Student reached level 4 (informational only)

### Interactions with Other Modules
- **Content & Publishing:** Reads published chapters, text segments
- **Media Pipeline:** Reads mappings for interactive playback
- **Batch & Cohort:** Reads enrollments to determine batch roster
- **Identity & Access:** Checks student/instructor roles

---

## 5. Batch & Cohort Module

### Purpose
Organize students into learning groups (batches) with assigned instructors. Manage enrollments flexibly—students can move between batches, drop out and return, all without losing progress.

### Core Responsibilities

**Batch Lifecycle:**
- Create batches (track-specific, no capacity limits)
- Assign primary instructor
- Assign co-instructors (teaching assistants with same privileges)
- Update/delete batches
- Simple status workflow: active → completed → archived (no "forming" status)

**Enrollment Management:**
- Add/remove students to/from batches
- Track enrollment status (active, dropped, completed)
- Prevent duplicate enrollments (one student can't enroll twice in same batch)
- Support re-enrollment (student can re-enroll in different batch for same track)

**Roster & Reporting:**
- Get batch roster with current enrollments
- Query batches by instructor (for instructor dashboard)
- Query batches by track
- Get student's current/past batches

### Database Entities
```typescript
batches {
  id: number;
  trackId: number;         // Which track does this batch teach? (1-8)
  name: string;            // "Track 2 Batch A - Fall 2025"
  description: string;     // Optional notes
  instructorId: string;    // Primary instructor (user ID)
  status: enum;            // 'active' | 'completed' | 'archived'
  createdBy: string;       // Admin who created
  createdAt: timestamp;
  updatedAt: timestamp;
}

enrollments {
  id: number;
  batchId: number;         // Which batch?
  studentId: string;       // Which student?
  status: enum;            // 'active' | 'dropped' | 'completed'
  enrolledAt: timestamp;
  enrolledBy: string;      // Admin who enrolled
  UNIQUE(batchId, studentId);  // Can't enroll twice in same batch
}

batchCoInstructors {
  id: number;
  batchId: number;
  instructorId: string;    // Co-instructor (also user with 'instructor' role)
  assignedAt: timestamp;
  assignedBy: string;      // Admin who assigned
  UNIQUE(batchId, instructorId);
}
```

### Key Operations & Workflows

#### **Workflow 1: Admin Creates Batch and Assigns Instructors**
```
Admin navigates to Batches → "Create New Batch"
  ↓
Form:
  • Select Track: [Track 1, Track 2, Track 3, ...]
  • Batch Name: "Track 2 Fall 2025"
  • Primary Instructor: [dropdown of users with 'instructor' role]
  ↓
Submits
  ↓
BatchService.createBatch(trackId=2, name='Track 2 Fall 2025', instructorId='john')
  • Creates batches record
  • Emits BatchCreated event
  ↓
AuditService logs: { action: 'CREATE_BATCH', resource: 'batch', resourceId: batchId }
  ↓
Batch created and assigned to John (primary instructor)
```

#### **Workflow 2: Admin Assigns Co-Instructors (TAs)**
```
Admin clicks batch → "Add Co-Instructors"
  ↓
Searches/selects "Sarah" (also has 'instructor' role)
  ↓
BatchService.assignCoInstructor(batchId, instructorId='sarah', assignedBy=adminId)
  • Creates batchCoInstructors record
  • Emits CoInstructorAssigned event
  ↓
Sarah now has same privileges as John:
  • View batch roster
  • Update student progress
  • View student notes
  • (Can't delete/modify batch itself - admin only)
```

#### **Workflow 3: Admin Enrolls Students**
```
Admin clicks batch → "Enroll Students" → search/select students
  ↓
Selects: [Alice, Bob, Charlie, ...]
  ↓
BatchService.enrollStudents(batchId, studentIds=[...], enrolledBy=adminId)
  • For each student:
    • Check: not already enrolled in this batch
    • Create enrollments record with status='active'
    • Emit StudentEnrolled event
  ↓
AuditService logs each enrollment
  ↓
Students now part of batch
  ↓
Instructor sees them in roster
```

#### **Workflow 4: Student Drops Out Mid-Batch**
```
Student is enrolled in batch with status='active'
Some time passes, student stops attending
  ↓
Option 1 (Student initiates):
  Student clicks "Leave Batch"
  → EnrollmentService.dropOutStudent(batchId, studentId)
  → Updates enrollment.status = 'dropped'
  → Emits StudentUnenrolled event

Option 2 (Admin manages):
  Admin right-clicks student in roster → "Mark as Dropped"
  → Same outcome
  ↓
Student's progress is preserved:
  • All studentProgress records still exist
  • Shows their proficiency levels achieved
  • If they re-enroll in new Track 2 batch later, old progress visible
```

#### **Workflow 5: Instructor Views Batch Roster**
```
Instructor logs in → "My Batches"
  ↓
Shows batches where:
  • instructorId === userId (primary)
  OR
  • userId in batchCoInstructors (co-instructor)
  ↓
Clicks batch → "Roster"
  ↓
BatchService.getBatchRoster(batchId)
  • Queries enrollments where status='active'
  • For each student, fetches studentProgress records for chapters in batch.trackId
  • Joins with user info
  ↓
Returns:
  [
    { studentId, name, email, proficiencyByChapter: {...}, overallProgress: 60% },
    ...
  ]
  ↓
Instructor sees:
  ┌─────────────────────────────────────────────┐
  │ Batch: Track 2 Batch A                      │
  ├──────────┬─────┬─────┬─────┬───────────────┤
  │ Student  │ Ch1 │ Ch2 │ Ch3 │ Overall       │
  ├──────────┼─────┼─────┼─────┼───────────────┤
  │ Alice    │  2  │  1  │  0  │ 30% done      │
  │ Bob      │  3  │  2  │  1  │ 60% done      │
  │ Charlie  │  X  │  X  │  X  │ Not started   │
  └──────────┴─────┴─────┴─────┴───────────────┘
  
  (X = not started, 0-4 = level)
```

### Service Interface
```typescript
class BatchService {
  // Batch Management
  createBatch(trackId: number, name: string, description: string, createdBy: string): Promise<Batch>;
  getBatch(batchId: number): Promise<Batch>;
  updateBatch(batchId: number, updates: Partial<Batch>): Promise<Batch>;
  deleteBatch(batchId: number): Promise<void>;
  getAllBatches(): Promise<Batch[]>;
  getBatchesByTrack(trackId: number): Promise<Batch[]>;
  getBatchesByInstructor(instructorId: string): Promise<Batch[]>;  // Primary + co-instructors
  
  // Instructor Assignment
  assignPrimaryInstructor(batchId: number, instructorId: string): Promise<Batch>;
  assignCoInstructor(batchId: number, instructorId: string, assignedBy: string): Promise<void>;
  removeCoInstructor(batchId: number, instructorId: string): Promise<void>;
  
  // Enrollment Management
  enrollStudent(batchId: number, studentId: string, enrolledBy: string): Promise<Enrollment>;
  unenrollStudent(batchId: number, studentId: string): Promise<void>;
  dropoutStudent(batchId: number, studentId: string): Promise<void>;  // Mark as dropped, preserve data
  getEnrollmentsByBatch(batchId: number, statusFilter?: string): Promise<Enrollment[]>;
  getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>;  // All batches student is in
  
  // Roster
  getBatchRoster(batchId: number): Promise<RosterEntry[]>;
  getStudentBatchSummary(studentId: string): Promise<{
    activeBatches: Batch[],
    completedBatches: Batch[],
    progressByBatch: { batchId, trackId, progressSummary }[]
  }>;
}
```

### Batch Status Workflow
```
Create → 'active'
  ↓
Work with students, update progress
  ↓
Admin decides batch is done → 'completed'
  (No automatic trigger; admin decision)
  ↓
Optionally archive for historical records → 'archived'
```

**Note:** No "forming" status. Batches start immediately upon creation with no capacity constraints.

### Important Constraints
- ✅ Batch is track-specific (batch.trackId is immutable)
- ✅ Each batch must have primary instructor
- ✅ Co-instructors must have 'instructor' role
- ✅ No duplicate enrollments in same batch (UNIQUE constraint)
- ✅ Students can drop out without losing progress
- ✅ No capacity limits

### Domain Events
- `BatchCreated`: New batch created
- `StudentEnrolled`: Student added to batch
- `StudentUnenrolled`/`StudentDropped`: Student removed or dropped
- `CoInstructorAssigned`: TA assigned to batch
- `BatchCompleted`: Batch status changed to completed

### Interactions with Other Modules
- **Identity & Access:** Validates users have required roles
- **Learning Delivery:** Queries batches for roster; updates progress in batch context
- **System Admin:** Audit logs track all enrollment changes

---

## 6. System Admin Module

### Purpose
Cross-cutting module for system-wide operations: audit logging, settings management, and admin-facing tools.

### Core Responsibilities

**Audit Logging:**
- Automatic logging of sensitive operations (publish, enroll, update progress, assign roles, etc.)
- Capture: who, what, when, where (resource), changes (before/after)
- Search/filter audit logs by user, action, resource type, date range
- Compliance trail for institutional records

**Settings Management:**
- Store system configuration as key-value pairs
- Examples: `enable_self_enrollment` (future), `maintenance_mode`, `max_batch_size` (future)
- Simple key/value store, not initially used (kept for future flexibility)

**User Management UI Support:**
- List all users (with roles and status)
- Admin can approve pending accounts
- Admin can assign/remove roles
- Admin can enable/disable users
- Search users by email/name

### Database Entities
```typescript
auditLogs {
  id: number;
  userId: string;          // Who performed action
  action: string;          // 'CREATE', 'UPDATE', 'PUBLISH', 'ENROLL', etc.
  resourceType: string;    // 'chapter', 'batch', 'enrollment', 'user', etc.
  resourceId: string;      // ID of affected resource
  changes: jsonb;          // { before: {...}, after: {...} }
  ipAddress: string;       // For security tracking (optional)
  userAgent: string;       // Browser info (optional)
  createdAt: timestamp;
}

systemSettings {
  key: string;             // Primary key, e.g., 'enable_self_enrollment'
  value: jsonb;            // Any JSON value
  description: string;     // Human-readable description
  updatedBy: string;       // Last admin who changed
  updatedAt: timestamp;
}
```

### Key Operations & Workflows

#### **Workflow 1: Automatic Audit Logging (via Events)**
```
Admin publishes chapter:
  ↓
ContentService.publishChapter(chapterId, userId)
  • Updates chapter.status='published'
  • Emits ChapterPublished event
  ↓
AuditService (listening to ChapterPublished):
  ↓
AuditService.logAction({
  userId: adminId,
  action: 'PUBLISH',
  resourceType: 'chapter',
  resourceId: chapterId,
  changes: { status: { from: 'draft', to: 'published' } },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
})
  ↓
Creates auditLogs record
  ↓
Audit trail captured automatically without explicit call
```

#### **Workflow 2: Admin Approves User Account**
```
User account created with status='pending_approval'
  ↓
Admin navigates to Users → Pending Approvals
  ↓
AdminService.getAllUsers({ statusFilter: 'pending_approval' })
  ↓
Admin clicks "Approve" on user "john@example.com"
  ↓
IdentityService.approveAccount(userId)
  • Sets status='active'
  • Auto-assigns ['student'] role
  • Emits UserAccountApproved event
  ↓
AuditService logs:
  { action: 'APPROVE_ACCOUNT', userId, changes: { status: { from: 'pending', to: 'active' } } }
  ↓
User can now log in
```

#### **Workflow 3: Admin Views Audit Trail**
```
Admin navigates to Admin Panel → Audit Logs
  ↓
AdminService.getAuditLogs({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  actionFilter: 'PUBLISH',
  resourceType: 'chapter',
  limit: 50
})
  ↓
Returns:
  [
    {
      timestamp: '2025-01-15 14:30:45',
      userId: 'admin1@example.com',
      action: 'PUBLISH',
      resource: 'chapter:42',
      changes: { status: { from: 'draft', to: 'published' } }
    },
    ...
  ]
  ↓
Admin can:
  • View complete audit trail
  • Filter by user/action/resource
  • Export for compliance
  • Trace who made what changes when
```

### Service Interface
```typescript
class AdminService {
  // User Management
  getAllUsers(filters?: { statusFilter?, roleFilter? }): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  getUsersWithRole(role: UserRole): Promise<User[]>;
  
  // Settings Management
  getSetting(key: string): Promise<Setting | null>;
  getAllSettings(): Promise<Setting[]>;
  updateSetting(key: string, value: any, updatedBy: string): Promise<Setting>;
  
  // Reporting
  getAuditLogs(filters: {
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    action?: string,
    resourceType?: string,
    resourceId?: string
  }, pagination?: { page, limit }): Promise<AuditLog[]>;
  getAuditLogsForUser(userId: string): Promise<AuditLog[]>;
  getAuditLogsForResource(resourceType: string, resourceId: string): Promise<AuditLog[]>;
  exportAuditLogs(format: 'csv' | 'json'): Promise<Buffer>;
}

class AuditService {
  // Called by event subscribers
  logAction(action: string, userId: string, resourceType: string, resourceId: string, changes?: any): Promise<void>;
}
```

### Domain Events Monitored
AdminService subscribes to ALL domain events and logs them:
- `UserCreated` → action: 'CREATE_USER'
- `UserAccountApproved` → action: 'APPROVE_ACCOUNT'
- `UserRoleChanged` → action: 'UPDATE_ROLES'
- `ChapterPublished` → action: 'PUBLISH'
- `ChapterUnpublished` → action: 'UNPUBLISH'
- `StudentEnrolled` → action: 'ENROLL'
- `StudentUnenrolled` → action: 'UNENROLL'
- `ProgressUpdated` → action: 'UPDATE_PROGRESS'
- (All other events...)

### Important Constraints
- ✅ Audit logs are immutable (never deleted, only created)
- ✅ Settings are simple key-value (not hierarchical)
- ✅ Audit trail captures enough info for compliance/debugging
- ⚠️ No automatic retention policy yet (can add later)

### Interactions with Other Modules
- **All Modules:** Subscribes to their domain events for audit logging
- **Identity & Access:** Supports admin user management tools
- **Batch & Cohort:** Logs all enrollment/instructor assignment changes

---

## Cross-Module Communication Pattern

### EventBus (In-Process)

All modules communicate via an event-driven architecture for loose coupling:

```typescript
// Example: When chapter is published
// Content module emits event:
eventBus.publish('ChapterPublished', {
  chapterId: 42,
  trackId: 2,
  userId: 'admin1',
  timestamp: new Date()
});

// System Admin module listens:
eventBus.subscribe('ChapterPublished', async (event) => {
  await auditService.logAction('PUBLISH', event.userId, 'chapter', event.chapterId, {
    status: { from: 'draft', to: 'published' }
  });
});

// Learning Delivery module listens:
eventBus.subscribe('ChapterPublished', async (event) => {
  // Optionally: invalidate cached student-visible chapters
  // Or notify subscribed students of new content
});
```

**Benefits:**
- Modules don't directly call each other
- Easy to add new subscribers without modifying event source
- Future: could be swapped for message queue (RabbitMQ, Kafka) for async processing or scaling

---

## Permission Summary

**Identity & Access decides:**
- WHO can access the system (authentication)
- WHAT roles they have (role flags)

**Each Module enforces:**
- WHO can perform their operations (authorization checks)
- Example: "Can instructor X update progress in batch Y?"

**Example Permission Flow:**

```typescript
// Route: PATCH /api/progress/student/:studentId/:chapterId
app.patch('/api/progress/student/:studentId/:chapterId',
  authMiddleware,                    // ← Identity: validates session, attaches user
  requireRole('instructor', 'admin'), // ← Identity: checks role
  async (req, res) => {
    const { instructorId } = req.user;
    const { studentId, chapterId } = req.params;
    const { batchId } = req.body;
    
    // ← Learning Delivery: context-aware permission
    const batch = await batchService.getBatch(batchId);
    if (batch.instructorId !== instructorId && batch.coInstructorIds.includes(instructorId)) {
      if (!isAdmin(instructorId)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }
    
    // ← Learning Delivery: context-aware permission
    const enrollment = await batchService.getEnrollment(batchId, studentId);
    if (!enrollment || enrollment.status !== 'active') {
      return res.status(400).json({ error: 'Student not in batch' });
    }
    
    // ← Learning Delivery: perform operation
    const progress = await learningService.updateStudentProgress(
      batchId, studentId, chapterId, 
      req.body.proficiencyLevel,
      instructorId,
      req.body.notes
    );
    
    res.json(progress);
  }
);
```

---

## Summary Table

| Module | Owns | Key Entities | Primary Users | No Enforcement |
|--------|------|--------------|---------------|----------------|
| **Identity & Access** | Auth, roles | users, sessions | All | Role hierarchy |
| **Content & Publishing** | Curriculum | tracks, chapters, textSegments | Content Managers, Admins | No versioning |
| **Media Pipeline** | Audio, mappings | audioFiles, mediaSegments, segmentMappings | Content Managers, Admins | No transcoding |
| **Learning Delivery** | Progress | studentProgress | Students, Instructors, Admins | No progress gates |
| **Batch & Cohort** | Cohorts | batches, enrollments, batchCoInstructors | Admins, Instructors | No capacity limits |
| **System Admin** | Logs, settings | auditLogs, systemSettings | Admins | N/A |

---

## Next Steps

1. Review this breakdown for accuracy against your actual domain
2. Confirm module boundaries and responsibilities
3. Validate examples and workflows match your processes
4. Clarify any edge cases or additional workflows
5. Proceed to implementation starting with Phase 1 (Foundation + Auth)

