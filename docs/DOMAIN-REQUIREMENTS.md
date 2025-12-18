# Domain Requirements & Real-World Workflows

**Purpose:** Living document capturing how Veda Pathasala operates today and how it maps to system implementation  
**Audience:** Development team, future contributors, stakeholders  
**Maintenance:** Updated incrementally as workflows are discussed in conversations

---

## Overview: Vedic Learning Model

### Educational Structure
- **8 Sequential Tracks** (self-paced, like semesters but flexible)
- **Target Audience:** Working professionals (household men) pursuing Vedic study as part of Brahmin dharma
- **Institution:** Free, volunteer-run Vedic Pathasala (~130 active students)
- **Pace:** Instructor-driven, not time-bound
- **Prerequisite Model:** Must complete Track N before starting Track N+1 (soft enforcement)

### Core Principles
- **Trust-Based:** Minimal validation, flexibility prioritized over enforcement
- **Admin-Controlled:** All critical assignments happen through admin actions
- **Batch-Centric:** Track/student/instructor relationships defined through batch assignments
- **Progress Preservation:** Student progress preserved even if reassigned between batches

---

## 1. Identity & Access Management

### How It Works Today (Real Pathasala Process)

**User Registration & Approval:**
- Students discover program via word-of-mouth/social channels
- Apply using **Google Forms survey** (external vetting process)
- Admin reviews applications offline
- Admin approves application → requests student to create LMS account
- **Student self-registers** in LMS (open registration, standard signup flow)
- Admin sees approval queue → approves only vetted users → auto-assigns **'student'** role
- Admin can reject/ignore unvetted users (permanently deleted)
- Admin can later assign additional roles as needed

**Role Assignment:**
- **No hierarchy:** Roles are independent checkboxes, not hierarchical
- **Four roles:** student, instructor, content_manager, admin
- **Any combination allowed:** User can be student + instructor simultaneously
- **Flexible assignment:** Admin assigns roles after approval based on need

**Access Control:**
- Unapproved users **cannot log in** (auth blocked until status = 'active')
- Approved students can't see tracks/chapters until assigned to a batch
- Batch assignment gates content access

### What's Built (System Implementation)

✅ **Account Management**
- Open registration with pending_approval status
- Admin approval queue showing all pending accounts
- Approval auto-assigns 'student' role
- Admin can permanently delete rejected/unvetted accounts
- Login blocked for pending_approval users (auth middleware)

✅ **Multi-Role Model**
- Independent role flags (not hierarchical)
- Any combination of: student, instructor, content_manager, admin
- Role-based authorization middleware
- Session management with role context

✅ **Status Tracking**
- Three states: pending_approval, active, inactive
- Status-based login gating
- Approval audit trail (approvedBy, approvedAt)

### Gaps & Future Improvements

- [ ] **Google Forms Integration:** Currently manual vetting; could auto-sync approved applications
- [ ] **Email Notifications:** Send welcome email on approval, rejection notice
- [ ] **Bulk Approval:** For batch intake periods, approve multiple accounts at once
- [ ] **Role Change Notifications:** Notify users when roles are added/removed
- [ ] **Inactive User Cleanup:** Periodic review of pending accounts (delete after 30 days?)

---

## 2. Content Publishing

### How It Works Today (Real Pathasala Process)

**Content Creation:**
- Content managers (volunteers) create tracks/chapters in three scripts (Telugu, Hindi/Devanagari, English/IAST)
- Use rich text editor (TipTap) with multilingual support
- Create text segments for interactive learning
- Upload audio files and map to text segments
- Publish when ready; drafts remain invisible to students

**Content Structure:**
- **8 Tracks** (sequential, like semesters)
- **Chapters per Track** (variable count; each chapter has content in 3 scripts)
- **Text Segments:** Interactive units within chapters (click to play mapped audio)
- **Audio Files:** Recitations mapped to text segments via timestamp ranges

**Publishing Workflow:**
- Drafts invisible to students
- Only content_manager or admin can publish
- Published chapters should not be deleted (data integrity)

### What's Built (System Implementation)

✅ **Content Hierarchy**
- Tracks (8 total, ordered 1-8)
- Chapters with multilingual content (te, hi, en script keys)
- Text segments per script (script-specific segmentation)
- HTML/Text toggle in editor (TipTap WYSIWYG or plain text)

✅ **Publishing System**
- Draft/published status per chapter
- Published chapters visible to all approved students (batch-gated)
- Drafts visible only to content_manager/admin

✅ **Rich Text Editing**
- TipTap editor with multilingual support
- Script switcher (te/hi/en tabs)
- Font rendering: JIMS (Telugu/IAST), Adishila San (Devanagari)
- 28px font size for Vedic text readability

✅ **Text Segmentation**
- Click-drag selection to create segments
- Sticky note aesthetics (amber-50/100)
- Selected segments: indigo-200 background
- Script-specific segmentation (separate segments per script)

### Gaps & Future Improvements

- [ ] **Published Chapter Protection:** Prevent deletion of published chapters (item 4 in TODO-Backend)
- [ ] **Version History:** Track changes to published content (for rollback)
- [ ] **Collaborative Editing:** Multiple content managers editing same chapter
- [ ] **Content Review Workflow:** Approval step before publishing
- [ ] **Search/Filter:** Search across chapters by keyword, script

---

## 3. Media Pipeline

### How It Works Today (Real Pathasala Process)

**Audio Management:**
- Content managers upload audio recitations (MP3 files)
- Extract metadata: duration, reciter name
- Store in uploads/ folder with hash-based filenames (no extensions, MIME validation)
- Serve via /uploads/* static route

**Audio-Text Mapping:**
- Use "Progressive Mapper" interface (interactive click-when-heard approach)
- Play audio; instructor clicks segment when heard
- System captures timestamp range (startTime, endTime)
- Creates mapping: textSegment ↔ audioFile + timestamps
- Mappings stored in audioMappings table (legacy: segmentMappings deprecated)

**Learning Mode:**
- Students click text segment → plays mapped audio portion
- Audio playback with progress bar and timestamp controls
- Visual feedback: segment highlights when audio plays

### What's Built (System Implementation)

✅ **Audio Upload & Management**
- Multer upload config (100MB limit, MIME validation)
- Hash-based filenames (security, no extension)
- Metadata extraction (duration, reciter)
- /uploads static route serving

✅ **Progressive Mapping Interface**
- Click-when-heard workflow
- Three states: Idle (amber-50) → Recording (orange card) → Mapped (green card with timestamp)
- Playback controls: play/pause, seek, volume
- Timestamp display and editing

✅ **Audio-Text Integration**
- audioMappings table (active system)
- Segment-to-audio linking with timestamp ranges
- Preview mode: click segment → plays mapped audio
- Legacy segmentMappings table preserved (reference only)

✅ **Learn Mode**
- Interactive segment playback
- Audio sync with text highlighting
- Script-specific audio (separate mappings per script)

### Gaps & Future Improvements

- [ ] **Media Validation:** Validate uploaded audio duration matches metadata (item 7 in TODO-Backend)
- [ ] **File Cleanup:** Delete orphaned audio files when DB records deleted
- [ ] **Mapping Uniqueness:** Prevent duplicate media segments (item 8 in TODO-Backend)
- [ ] **Batch Upload:** Upload multiple audio files at once
- [ ] **Audio Waveform Visualization:** Visual aid for timestamp mapping

---

## 4. Batch & Cohort Management

### How It Works Today (Real Pathasala Process)

**Batch Formation:**
- Admin creates batch for a specific track (e.g., "Evening Batch - Track 1")
- Assigns **Primary Instructor** (main teacher, one per batch)
- Optionally assigns **Co-Instructors** (additional teachers, NOT TAs - same system privileges)
- Enrolls students into batch (no capacity limits, can start with any number)
- Batch teaches **one track only** (not mixed curriculum)

**Student Assignment:**
- Admin assigns students to batches
- Students can switch batches freely (schedule/convenience) - admin-controlled
- When student switches, they disappear from old batch instructor's view
- Progress is preserved (not batch-scoped, cumulative across batches)

**Instructor Model:**
- **Primary Instructor:** Main teacher (one per batch)
- **Co-Instructors:** Additional teachers (multiple allowed)
- **Identical Privileges:** Both primary and co-instructors have same system permissions
- **Batch-Scoped Authorization:** Instructors can only update students in their assigned batches

**Batch Lifecycle:**
- **Active:** Currently teaching
- **Completed:** Finished instruction
- **Archived:** Historical record

### What's Built (System Implementation)

✅ **Batch CRUD**
- Create batch with track assignment (one track per batch)
- Assign primary instructor (required)
- Assign multiple co-instructors (optional)
- Update batch details (name, description, status)
- Delete batch (cascades to enrollments)

✅ **Enrollment Management**
- Enroll students in batch (admin only)
- Remove students from batch (admin only)
- Track enrollment status: active, dropped, completed
- Enrollment history preserved (audit trail)

✅ **Instructor Assignment**
- Primary instructor field (required)
- Co-instructors junction table (batch_co_instructors)
- Authorization checks: primary OR co-instructor can update progress

✅ **Flexible Reassignment**
- Students can move between batches (admin-controlled)
- Progress preserved when switching batches
- Old batch instructors lose visibility when student leaves

### Gaps & Future Improvements

- [ ] **Batch Dashboard:** Visual overview of all batches (active/completed/archived)
- [ ] **Enrollment Limits:** Optional max capacity per batch (if needed in future)
- [ ] **Batch Start Date:** Track when batch officially begins instruction
- [ ] **Batch Communication:** Announcements/notifications to batch members
- [ ] **Attendance Tracking:** Mark student attendance per session (future)

---

## 5. Learning Delivery & Progress

### How It Works Today (Real Pathasala Process)

**Progress Tracking:**
- **Instructor-driven:** Only primary/co-instructors can set student proficiency levels
- **5-level scale:** 0 (not started) → 1-3 (proficiency) → 4 (mastery/certified)
- **No enforcement:** Levels can move in any direction (0→4, 4→1) - instructor discretion
- **Trust-based:** System doesn't enforce prerequisites or sequential level increases
- **Chapter-level granularity:** Progress tracked per chapter (not segment-level)

**Proficiency Levels:**
- **Level 0:** Not started (initial state)
- **Level 1:** Basic proficiency (instructor-assigned)
- **Level 2:** Working proficiency (gate for next track access)
- **Level 3:** Advanced proficiency (instructor-assigned)
- **Level 4:** Mastery/Certified (typically after oral exam, external process)

**Track Access Gating:**
- Student can access Track N+1 only if **all Track N chapters ≥ level 2**
- System-enforced gate (prevents premature track access)
- Track visibility based on cumulative progress (not batch assignment)

**Batch vs. Progress Distinction:**
- **Batch Assignment:** Social grouping, defines who can evaluate (schedule-based)
- **Progress:** Individual achievement, cumulative across batches (not batch-scoped)
- **Authorization:** Instructors can only update students in their assigned batches
- **Preservation:** Progress preserved when student switches batches

**Certification (External):**
- Level 4 typically assigned after oral exam (Saturday/Sunday slots)
- Oral exam scheduled outside LMS (WhatsApp coordination)
- Certificates generated in Excel, sent via email
- System doesn't enforce oral exam workflow (trust-based)

### What's Built (System Implementation)

✅ **Progress Tracking**
- student_progress table (studentId, chapterId, proficiencyLevel)
- Cumulative across batches (not batch-scoped)
- Instructor-only updates (batch-gated authorization)
- No validation on level changes (0→4, 4→1 allowed)

✅ **Track Access Gating**
- System-enforced gate: Track N+1 requires all Track N chapters ≥ level 2
- getAccessibleTracks() service method
- Student dashboard shows only unlocked tracks

✅ **Instructor Authorization**
- Batch-context authorization: Instructors can only update students in their assigned batches
- Primary and co-instructors have identical privileges
- Verification: check enrollment status before allowing progress update

✅ **Progress Preservation**
- Progress persists when student switches batches
- Student disappears from old batch instructor's view (no longer enrolled)
- New batch instructors can see/update progress immediately

✅ **Progress Queries**
- Get student's own progress (student view)
- Get progress for students in assigned batches (instructor view)
- Progress summary by track (track completion percentage)

### Gaps & Future Improvements

- [ ] **Progress Dashboard:** Visual progress chart for students (track completion %)
- [ ] **Instructor Feedback:** Notes/comments per proficiency update (item exists in schema, UI needed)
- [ ] **Bulk Progress Update:** Update multiple students at once (batch evaluation)
- [ ] **Progress History:** Track proficiency changes over time (audit trail)
- [ ] **Email Notifications:** Notify student when proficiency updated
- [ ] **Certification Module:** Oral exam scheduling + certificate generation (if scale grows beyond 130 students)
- [ ] **Segment-Level Progress:** Finer-grained tracking (currently chapter-level only)

---

## 6. System Administration

### How It Works Today (Real Pathasala Process)

**Admin Responsibilities:**
- Create batches and assign instructors
- Enroll students in batches
- Approve/reject user accounts (pending approval queue)
- Assign roles (student, instructor, content_manager, admin)
- Manage system settings (key-value store)
- Review audit logs (sensitive operations)

**Audit Logging:**
- Track all critical operations: user approval, role assignment, batch creation, enrollment, progress updates
- Store: action, resourceType, resourceId, userId, changes (JSON), timestamp, requestId
- Admin-only access to audit logs

**System Settings:**
- Configuration key-value store
- Examples: batch capacity limits (optional), email templates, feature flags
- Track who updated setting and when

### What's Built (System Implementation)

✅ **User Management**
- Approval queue (list all pending accounts)
- Approve/reject accounts (approval auto-assigns student role)
- Assign/remove roles (any combination)
- Enable/disable users (status: active/inactive)

✅ **Audit Logging**
- 11 domain events tracked (UserApproved, ChapterPublished, AudioUploaded, etc.)
- audit_logs table with full context (action, resourceType, changes JSON)
- Admin-only access to view logs

✅ **System Settings**
- system_settings table (key-value store)
- Update tracking (updatedBy, updatedAt)
- Admin-only access

✅ **Event-Driven Architecture**
- EventBus for cross-module communication
- Event handlers registered in main (identity, content, media, batch, learning, admin modules)

### Gaps & Future Improvements

- [ ] **Admin Dashboard:** Visual overview of users, batches, content, progress
- [ ] **Audit Log Search:** Filter by date range, user, action type, resource
- [ ] **System Health Monitoring:** DB connection, error rates, performance metrics (TODO-Common item 10)
- [ ] **Bulk Operations:** Bulk user import, bulk enrollment
- [ ] **Settings UI:** Admin page for managing system settings (currently direct DB edits)
- [ ] **Role Hierarchy Visualization:** Show role distribution across users

---

## Cross-Cutting Concerns

### Testing & Quality Assurance

**Current State:**
- Manual smoke testing after each feature
- No automated E2E tests
- Minimal unit test coverage

**Gaps (from TODO-Common):**
- [ ] E2E test suite (Playwright/Cypress) - item 1
- [ ] Unit test coverage (70%+ on critical services) - item 2
- [ ] Integration tests (API + DB interactions) - item 3

### Security & Compliance

**Current State:**
- Passport.js local auth (username/password)
- Session management with express-session + connect-pg-simple
- Role-based authorization middleware
- Basic input validation

**Gaps (from TODO-Common):**
- [ ] Security audit (OWASP Top 10, CSRF, rate limiting) - item 12 (HIGH priority)
- [ ] GDPR compliance (data export, deletion cascade) - item 13 (HIGH priority)
- [ ] Password strength enforcement
- [ ] HTTPS configuration (production)
- [ ] Rate limiting on auth endpoints

### Infrastructure & DevOps

**Current State:**
- Neon PostgreSQL (serverless)
- Drizzle ORM with push migrations
- Manual deployment (no CI/CD)
- Local dev environment with .env config

**Gaps (from TODO-Common):**
- [ ] CI/CD pipeline (GitHub Actions) - item 7
- [ ] Environment management (dev/staging/prod) - item 8
- [ ] Database backup & recovery strategy - item 9 (HIGH priority)
- [ ] Logging & observability (structured logs, error tracking) - item 10
- [ ] Release process & versioning - item 14

---

## Future Workflow Enhancements

### Potential Improvements (Not Yet Prioritized)

**Google Forms Integration:**
- Auto-sync approved applications → create LMS accounts
- Reduce manual admin workload

**Certification Module (if scale grows):**
- Oral exam scheduling within LMS
- Certificate generation and email delivery
- Track certification dates and expiration (if applicable)

**Student Communication:**
- Announcements per batch (email/in-app notifications)
- Progress notifications (when instructor updates proficiency)
- Track unlock notifications (when student completes prerequisite)

**Instructor Tools:**
- Attendance tracking per session
- Session notes (what was covered in class)
- Student performance reports (progress over time)

**Content Versioning:**
- Track changes to published content
- Rollback to previous versions
- Content approval workflow (review before publishing)

**Analytics & Reporting:**
- Student progress trends (cohort analysis)
- Track completion rates
- Instructor workload distribution
- Content usage analytics (most-accessed chapters)

---

## Document Maintenance

**How to Update This Document:**
1. When a new workflow is explained in conversation, add bullets to relevant domain section
2. Mark items as "Built" when implemented (move from Gaps to What's Built)
3. Add new gaps as they're discovered
4. Link to related TODO items in backlog
5. Keep bullets succinct (1-2 lines max) - details go in ADRs or implementation docs

**Related Documents:**
- [docs/TODO/TODO-Backend.md](./TODO/TODO-Backend.md) - Backend hardening and gaps
- [docs/TODO/TODO-Frontend.md](./TODO/TODO-Frontend.md) - Frontend enhancements
- [docs/TODO/TODO-Common.md](./TODO/TODO-Common.md) - Testing, security, infrastructure gaps
- [docs/architecture/MODULE-BREAKDOWN-DETAILED.md](./architecture/MODULE-BREAKDOWN-DETAILED.md) - Module responsibilities

---

**Last Updated:** December 18, 2025  
**Status:** Living document - updated as workflows evolve
