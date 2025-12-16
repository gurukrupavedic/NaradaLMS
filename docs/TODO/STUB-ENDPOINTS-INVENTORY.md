# Stub API Endpoints Inventory

**Created:** December 16, 2025  
**Purpose:** Comprehensive documentation of all stub/mock API endpoints that exist only to support experiment pages  
**Status:** Active stubs (to be removed when experiments are cleaned up)

---

## Overview

These endpoints were added to `server/routes-simple.ts` (lines 673-725) to prevent 404 errors when visiting experiment dashboard pages. They return mock data and perform NO database operations.

**⚠️ CRITICAL WARNING:**
- These are NOT production endpoints
- They have NO authentication
- They have NO validation
- They perform NO database operations
- They exist ONLY to make experiment pages render without errors

---

## User Management Endpoints (AdminPanel Experiments)

### 1. GET /api/users
**File:** `server/routes-simple.ts` (line ~676)  
**Used By:** 
- `client/src/components/AdminPanel.tsx` (line 82 - query: `fetchUsers`)
- Experiment route: `/experiments/admin-panel`

**Returns:**
```json
[]
```

**Real Implementation Would:**
- Query `users` table via `storage.getAllUsers()`
- Filter by role
- Include user metadata (name, email, role, status)
- Implement pagination

---

### 2. POST /api/invite-user
**File:** `server/routes-simple.ts` (line ~681)  
**Used By:**
- `client/src/components/AdminPanel.tsx` (line 113 - mutation: `sendInviteMutation`)
- Experiment route: `/experiments/admin-panel`

**Expected Request Body:**
```typescript
{
  email: string;
  role: 'student' | 'instructor' | 'admin';
  firstName?: string;
  lastName?: string;
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Mock invite sent"
}
```

**Real Implementation Would:**
- Validate email format
- Check if user already exists
- Generate invitation token
- Send invitation email
- Create pending user record with `invitedBy` field
- Return user details

---

### 3. PUT /api/users/:id
**File:** `server/routes-simple.ts` (line ~689)  
**Used By:**
- `client/src/components/AdminPanel.tsx` (line 142 - mutation: `updateUserMutation`)
- Experiment route: `/experiments/admin-panel`

**URL Parameters:**
- `id` - User ID

**Expected Request Body:**
```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'student' | 'instructor' | 'admin';
}
```

**Returns:**
```json
{
  "success": true,
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Real Implementation Would:**
- Validate user ID exists
- Validate role permissions (admins can edit users)
- Validate email uniqueness if changed
- Update user record via `storage.updateUser()`
- Return updated user object

---

### 4. PUT /api/users/:id/status
**File:** `server/routes-simple.ts` (line ~697)  
**Used By:**
- `client/src/components/AdminPanel.tsx` (line 171 - mutation: `changeUserStatusMutation`)
- Experiment route: `/experiments/admin-panel`

**URL Parameters:**
- `id` - User ID

**Expected Request Body:**
```typescript
{
  status: 'active' | 'inactive' | 'suspended';
}
```

**Returns:**
```json
{
  "success": true,
  "user": { "id": 1, "status": "active" }
}
```

**Real Implementation Would:**
- Validate user ID exists
- Validate status value
- Check permissions (prevent self-suspension)
- Update user status in database
- Log status change for audit trail
- Return updated user object

---

## Instructor Management Endpoints

### 5. GET /api/instructor/student-progress
**File:** `server/routes-simple.ts` (line ~705)  
**Used By:**
- `client/src/components/InstructorPanel.tsx` (line 44 - query: `fetchStudentProgress`)
- Experiment route: `/experiments/instructor-panel`

**Returns:**
```json
[]
```

**Real Implementation Would:**
- Query student-chapter progress data
- Filter by instructor's assigned students
- Join with user data (student names, emails)
- Include progress metrics (chapters completed, study time, last active)
- Implement sorting and filtering

---

### 6. PUT /api/instructor/student-progress
**File:** `server/routes-simple.ts` (line ~710)  
**Used By:**
- `client/src/components/InstructorPanel.tsx` (line 74 - mutation: `updateProgressMutation`)
- Experiment route: `/experiments/instructor-panel`

**Expected Request Body:**
```typescript
{
  studentId: number;
  chapterId: number;
  progressData: {
    completed?: boolean;
    notes?: string;
    grade?: string;
  };
}
```

**Returns:**
```json
{
  "success": true
}
```

**Real Implementation Would:**
- Validate student and chapter IDs
- Check instructor permissions
- Create/update progress record
- Store instructor notes
- Log progress change
- Return updated progress object

---

## Student Dashboard Endpoints

### 7. GET /api/student-stats
**File:** `server/routes-simple.ts` (line ~715)  
**Used By:**
- `client/src/components/StudentDashboard.tsx` (line 30 - query: `fetchStudentStats`)
- `client/src/components/Dashboard.tsx` (line 35 - query: `fetchStudentStats`)
- Experiment routes: `/experiments/student-dashboard`, `/experiments/dashboard`

**Returns:**
```json
{
  "totalStudyTime": 0,
  "chaptersCompleted": 0,
  "currentStreak": 0,
  "highestLevel": 1
}
```

**Real Implementation Would:**
- Query user's chapter completion records
- Calculate total study time from activity logs
- Calculate current streak (consecutive days active)
- Determine highest completed level/track
- Include recent activity data
- Cache results for performance

---

### 8. GET /api/student-progress
**File:** `server/routes-simple.ts` (line ~720)  
**Used By:**
- `client/src/components/Dashboard.tsx` (line 53 - query: `fetchStudentProgress`)
- Experiment route: `/experiments/dashboard`

**Returns:**
```json
[]
```

**Real Implementation Would:**
- Query student's progress across all chapters
- Join with track/chapter metadata
- Include completion percentage
- Include last activity timestamp
- Sort by recent activity or track order
- Return array of progress objects

---

## Endpoint Dependencies Map

```
AdminPanel.tsx (612 lines)
├── GET /api/users (line 82)
├── POST /api/invite-user (line 113)
├── PUT /api/users/:id (line 142)
└── PUT /api/users/:id/status (line 171)

InstructorPanel.tsx (312 lines)
├── GET /api/instructor/student-progress (line 44)
└── PUT /api/instructor/student-progress (line 74)

StudentDashboard.tsx (277 lines)
├── GET /api/tracks (production endpoint - KEEP)
└── GET /api/student-stats (line 30)

Dashboard.tsx (303 lines)
├── GET /api/tracks (production endpoint - KEEP)
├── GET /api/student-progress (line 53)
└── GET /api/student-stats (line 35)
```

---

## Cleanup Instructions

### When to Remove These Stubs

Remove these endpoints when:
1. You delete the experiment dashboard components (Topic 2 in TODO-frontend-cleanup.md)
2. You implement real role-based authentication and dashboard
3. You've extracted any useful patterns from the experiments

### How to Remove Safely

1. **Locate the stub block** in `server/routes-simple.ts`:
   ```typescript
   // =============================================================================
   // EXPERIMENT ENDPOINTS - Stubs for dashboard ideation components
   // =============================================================================
   ```

2. **Delete lines ~673-725** (the entire stub section)

3. **Search for any usage** (should only be in experiment components):
   ```bash
   grep -r "api/users" client/src --include="*.tsx" --include="*.ts"
   grep -r "api/invite-user" client/src --include="*.tsx" --include="*.ts"
   grep -r "api/instructor/student-progress" client/src --include="*.tsx" --include="*.ts"
   grep -r "api/student-stats" client/src --include="*.tsx" --include="*.ts"
   grep -r "api/student-progress" client/src --include="*.tsx" --include="*.ts"
   ```

4. **Verify no production code uses these endpoints**

5. **Test:** After deletion, visiting `/experiments/*` routes should 404 (which is fine since you'll delete those too)

---

## Real Implementation Guidance

When you're ready to implement these features properly:

### User Management (AdminPanel)
- Use `storage.getAllUsers()` for GET /api/users
- Implement proper invitation system with email tokens
- Add role-based middleware (admin-only)
- Add audit logging for user changes

### Instructor Features (InstructorPanel)
- Create instructor-student relationship table
- Implement progress tracking with detailed metrics
- Add comment/feedback system
- Restrict to instructor role

### Student Progress (StudentDashboard/Dashboard)
- Create user_progress table with timestamps
- Track study time via activity logging
- Implement streak calculation logic
- Cache stats for performance

---

## Production Endpoints (DO NOT REMOVE)

These endpoints are used by the main app and should NEVER be removed:

```
GET    /api/tracks                         - Used by LearnTracks, SimpleDashboard
GET    /api/tracks/:trackId                - Used by track detail pages
GET    /api/tracks/:trackId/chapters       - Used by LearnChapters
GET    /api/chapters/:chapterId            - Used by StudyChapter, EditChapter
POST   /api/chapters                       - Used by ManageTrack
PUT    /api/chapters/:chapterId            - Used by EditChapter
DELETE /api/chapters/:chapterId            - Used by ManageTrack
GET    /api/text-segments/:chapterId       - Used by EditChapter, StudyChapter
POST   /api/text-segments                  - Used by EditChapter
POST   /api/mappings                       - Used by Progressive Mapper
... (many more - see routes-simple.ts)
```

**Verification:** These endpoints have active usage in production components and should return real data from the database.

---

## Testing Checklist

Before removing stubs, verify:

- [ ] All experiment routes are removed from App.tsx
- [ ] All experiment components are deleted
- [ ] No production code imports experiment components
- [ ] grep search shows no usage of stub endpoints
- [ ] App compiles without errors
- [ ] All production features still work (tracks, chapters, editing, mapping)

---

## Related Documentation

- [TODO-frontend-cleanup.md](./TODO-frontend-cleanup.md) - Parent cleanup document
- [TODO-Authentication-Integration.md](./TODO-Authentication-Integration.md) - Real auth implementation plan

---

## Questions for Future Implementation

When implementing real endpoints, consider:

1. **Authentication:** Will you use Replit Auth, or implement your own?
2. **Authorization:** How will role-based access control work?
3. **User Invitations:** Email-based or link-based invitations?
4. **Progress Tracking:** Real-time or batch updates?
5. **Instructor Assignment:** How are students assigned to instructors?
6. **Admin Hierarchy:** Can admins have different permission levels?
7. **Audit Logging:** What user actions should be logged?

---

**Last Updated:** December 16, 2025  
**Total Stub Endpoints:** 8  
**Total Lines of Stub Code:** ~53 lines (routes-simple.ts:673-725)
