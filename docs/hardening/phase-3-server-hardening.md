# Phase 3: Server Hardening

> **Objective**: Fix security vulnerabilities, consolidate auth middleware, standardize error handling, and clean up the event system.
>
> **Prerequisites**: Phase 2 completed and merged into `hardening`. You must be on the `hardening` branch.
>
> **Risk**: Medium. Auth middleware changes affect access control. Test thoroughly.
>
> **Can run in parallel with**: Phase 4 (Portal Refactoring) — server and portal changes are independent.
>
> **Note**: Phase 3 is server-only. If `npm run verify` fails due to `@narada/ui` type errors (e.g. `SidebarMenuButton`), that is a pre-existing portal/UI issue; Phase 4 Task 4.7 addresses it. Use `npm run test:smoke` and server-side checks to verify Phase 3.

---

## Branch (start of Phase 3)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-3
```

All tasks and commits for Phase 3 happen on `hardening-phase-3`.

---

## Task 3.1: Consolidate Auth Middleware

### Problem

There are **two competing auth middleware files** with different semantics:

1. `server/shared/middleware/auth.ts` — `requireInstructor` checks for exactly `"instructor"` role
2. `server/middleware/role-auth.middleware.ts` — `requireInstructor` checks for `['instructor', 'admin']`

This means admins can access some instructor routes but not others depending on which file a route imports from.

### Solution

Keep ONE auth middleware file. Use the `role-auth.middleware.ts` approach (array-based) because it correctly handles role hierarchies.

### Step 1: Update `server/shared/middleware/auth.ts`

**Before**:
```typescript
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    const userRoles = user?.roles ?? [];
    const allowed = roles.length === 0 || roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireInstructor = requireRole("instructor");
export const requireContentManager = requireRole("content_manager");
```

**After**:
```typescript
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
    }

    const userRoles = user.roles ?? [];
    const allowed = roles.length === 0 || roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

// Role hierarchy: admin has access to everything
export const requireAdmin = requireRole("admin");
export const requireInstructor = requireRole("instructor", "admin");
export const requireContentManager = requireRole("content_manager", "admin");
```

### Step 2: Remove the duplicate middleware file

Search for all imports from `server/middleware/role-auth.middleware.ts`:
```bash
rg "role-auth.middleware" server/ --files-with-matches
```

Update each importing file to use `server/shared/middleware/auth.ts` instead:

**Before**:
```typescript
import { requireAdmin, requireInstructor } from '../middleware/role-auth.middleware';
```

**After**:
```typescript
import { requireAdmin, requireInstructor } from '../shared/middleware/auth';
```

Then delete:
```
DELETE: server/middleware/role-auth.middleware.ts
```

### Step 3: Consolidate `Express.User` type declaration

There are two competing declarations:

- `server/shared/middleware/index.ts`: `interface User { id: string; email?: string; roles?: string[]; }`
- `server/middleware/jwt-auth.middleware.ts`: `interface User extends JWTPayload { }`

Keep the one in `jwt-auth.middleware.ts` (more complete) and remove the one in `shared/middleware/index.ts`. Or consolidate into a single declaration in a dedicated types file:

**Create file**: `server/shared/types.ts`
```typescript
declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            roles: string[];
            status: string;
        }
    }
}

export {};
```

Remove the `declare global` blocks from both `shared/middleware/index.ts` and `jwt-auth.middleware.ts`.

### Verification for Task 3.1
1. Run: `npx tsc --noEmit` from root
2. Run: `npm run test:smoke` — all endpoints should still respond correctly
3. Verify: Login as admin → access batch routes (should work)
4. Verify: Login as instructor → access batch routes (should work)
5. Verify: Login as student → batch routes return 403

---

## Task 3.2: Add Authorization to Unprotected Content Routes

**File**: `server/routes/content.routes.ts`

Currently, only track-level CRUD has `requireContentManager`. All chapter, segment, audio, and mapping write routes are accessible to any authenticated user.

### Step 1: Apply `requireContentManager` to write routes

Add `requireContentManager` middleware to all POST, PUT, PATCH, DELETE routes. The existing imports already include `requireContentManager` from `server/shared/middleware/auth.ts`.

For each write route that's missing authorization, add the middleware:

**Pattern**:
```typescript
// BEFORE:
router.post('/chapters', async (req, res, next) => { ... });

// AFTER:
router.post('/chapters', requireContentManager, async (req, res, next) => { ... });
```

**Apply `requireContentManager` to these routes** (find each one and add the middleware):
- `POST /chapters` (legacy create)
- `POST /tracks/:trackId/chapters` (new create)
- `PATCH /chapters/:id` (update)
- `PATCH /chapters/:chapterId` (update alias)
- `DELETE /chapters/:id` (delete)
- `DELETE /chapters/:chapterId` (delete alias)
- `POST /chapters/:chapterId/publish` (publish)
- `POST /chapters/:chapterId/unpublish` (unpublish)
- `POST /segments` (create segment)
- `POST /chapters/:chapterId/segments` (create segment under chapter)
- `PUT /segments/:id` (update segment)
- `PATCH /segments/:chapterId/reorder` (reorder segments)
- `POST /chapters/:chapterId/segments/reorder` (reorder alias)
- `DELETE /segments/:id` (delete segment)
- All audio upload routes (`POST /chapters/:chapterId/audio`)
- All mapping routes (`POST /mappings`, `DELETE /mappings/:id`, etc.)

**Leave as read-only** (no middleware needed beyond `jwtAuth`):
- `GET /tracks`
- `GET /tracks/:id`
- `GET /chapters/:trackId` (legacy list)
- `GET /tracks/:trackId/chapters` (list)
- `GET /chapters/:chapterId` (detail)
- `GET /segments/:chapterId/:script`

### Step 2: Apply authorization to batch routes

**File**: `server/routes/batch.routes.ts`

Currently, batch routes have no write authorization beyond `jwtAuth`.

Add `requireAdmin` or `requireInstructor` to write routes:

```typescript
// Import at top of file:
import { requireAdmin, requireInstructor } from "../shared/middleware/auth";

// Apply to these routes:
router.post('/batches', requireAdmin, async (req, res, next) => { ... });
router.patch('/batches/:id', requireAdmin, async (req, res, next) => { ... });
router.delete('/batches/:id', requireAdmin, async (req, res, next) => { ... });
router.post('/batches/:id/enrollments', requireInstructor, async (req, res, next) => { ... });
router.patch('/enrollments/:id/drop', requireInstructor, async (req, res, next) => { ... });
router.post('/batches/:id/co-instructors', requireAdmin, async (req, res, next) => { ... });
router.delete('/batches/:id/co-instructors/:instructorId', requireAdmin, async (req, res, next) => { ... });
```

### Verification for Task 3.2
1. Run: `npm run test:smoke`
2. Try accessing write endpoints without appropriate roles — should get 403
3. Try accessing read endpoints as any authenticated user — should work
4. Test in ops portal: content studio should still allow creating/editing tracks and chapters when logged in as admin/content_manager

---

## Task 3.3: Fix `createdBy` Spoofing

Multiple routes accept `createdBy` from the request body instead of using the authenticated user.

### Fix in content routes

**File**: `server/routes/content.routes.ts`

**Before** (track creation):
```typescript
const track = await contentService.createTrack({
    title,
    description,
    createdBy: req.body.createdBy || "system"
});
```

**After**:
```typescript
const user = req.user as Express.User;
const track = await contentService.createTrack({
    title,
    description,
    createdBy: user.id
});
```

Apply the same fix to:
- Chapter creation (`createdBy: req.body.createdBy` → `createdBy: user.id`)
- Segment creation (`createdBy: req.body.createdBy` → `createdBy: user.id`)
- Audio upload (`uploadedBy: 'system'` → `uploadedBy: user.id`)
- Mapping creation (`createdBy: req.body.createdBy` → `createdBy: user.id`)

**Search pattern**:
```bash
rg "createdBy.*req.body" server/routes/
rg "uploadedBy.*system" server/routes/
rg "createdBy.*system" server/routes/
```

### Fix in batch routes

**File**: `server/routes/batch.routes.ts`

Apply the same pattern — use `req.user.id` instead of `req.body.createdBy`.

### Verification for Task 3.3
1. Run: `npm run test:content` — smoke test should pass (it uses 'system' as createdBy in direct service calls, not through routes)
2. Create a track/chapter via the ops portal — verify `createdBy` field in the database matches the logged-in user's ID

---

## Task 3.4: Standardize Error Handling

### Problem

Three different error patterns exist:
1. `throw Object.assign(new Error('msg'), { status: 400 })` — uses `.status`
2. `throw new AppError('msg', 401)` — uses `.statusCode`
3. Inline `res.status(400).json(...)` — no central handling

The centralized `errorHandler` middleware only handles `AppError` and `ZodError`. Errors with `.status` are treated as unhandled 500s.

### Step 1: Update the error handler to handle all patterns

**File**: `server/middleware/error.middleware.ts`

Update the error handler to recognize multiple error shapes:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { Logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    // Already sent response
    if (res.headersSent) {
        return next(err);
    }

    // AppError (our custom error class)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { message: err.message, code: err.code }
        });
    }

    // Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: err.errors,
            }
        });
    }

    // Errors with .status or .statusCode (from Object.assign pattern)
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error';

    if (statusCode >= 500) {
        Logger.error('Unhandled server error:', err);
    }

    return res.status(statusCode).json({
        error: { message, code: err.code || 'SERVER_ERROR' }
    });
}
```

### Step 2: Remove duplicate `ApiErrorResponse` and `createErrorResponse` helpers

These are copy-pasted into `content.routes.ts`, `media.routes.ts`, and `batch.routes.ts`.

**Create a shared helper**: `server/shared/utils/api-response.ts`

```typescript
export interface ApiErrorResponse {
    error: {
        message: string;
        code?: string;
        details?: unknown;
        timestamp: string;
        requestId: string;
    };
}

export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createErrorResponse(message: string, code?: string, details?: unknown): ApiErrorResponse {
    return {
        error: {
            message,
            code,
            details,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId(),
        },
    };
}
```

Then update `content.routes.ts`, `media.routes.ts`, and `batch.routes.ts` to import from this shared file instead of defining their own copies:

```typescript
import { createErrorResponse } from '../shared/utils/api-response';
```

Remove the local `ApiErrorResponse`, `generateRequestId`, and `createErrorResponse` definitions from each route file.

### Verification for Task 3.4
1. Run: `npx tsc --noEmit`
2. Run: `npm run test:smoke` — all endpoints respond correctly
3. Test an invalid request (e.g., POST to create a batch with missing fields) — should get a structured error response

---

## Task 3.5: Move Request Logger Before Route Handlers

**File**: `server/index.ts`

The HTTP request logger middleware is currently placed AFTER all route handlers (around line 121). Since routes call `res.json()` and end the request, the logger only executes for unmatched routes.

### Fix: Move the logger block BEFORE the route mounts

Find the logger middleware block (starts with `app.use((req, res, next) => { const start = Date.now();`) and move it to just after the Passport initialization, BEFORE the route mounts.

**After** (the correct position):
```typescript
// Passport
configurePassport();
app.use(passport.initialize());

// Request Logger (must be before routes)
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            Logger.http(req.method, path, res.statusCode, duration);
        }
    });

    next();
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));
// ... route mounts follow ...
```

### Verification for Task 3.5
1. Start server: `npm run dev`
2. Make any API request
3. Check server console — should now log the request with method, path, status, and duration

---

## Task 3.6: Clean Up the Event System

### Problem

The event system has three issues:
1. **Dead subscriptions**: `system-admin/events.ts` subscribes to events that are never published
2. **Event name mismatch**: Constants use different names than what's subscribed to
3. **Handler shape mismatch**: `UserRoleChanged` handler accesses wrong fields

### Step 1: Fix event name constants to match subscriptions

**File**: `server/modules/batch-cohort/events.ts`

**Before**:
```typescript
export const BATCH_EVENTS = {
    created: 'batch.created',
    updated: 'batch.updated',
    enrollmentAdded: 'batch.enrollment.added',
    enrollmentDropped: 'batch.enrollment.dropped',
    coInstructorAssigned: 'batch.coinstructor.assigned',
    coInstructorRemoved: 'batch.coinstructor.removed',
} as const;
```

**After** (match what system-admin subscribes to):
```typescript
export const BATCH_EVENTS = {
    created: 'BatchCreated',
    updated: 'BatchUpdated',
    enrollmentAdded: 'StudentEnrolled',
    enrollmentDropped: 'StudentDropped',
    coInstructorAssigned: 'CoInstructorAssigned',
    coInstructorRemoved: 'CoInstructorRemoved',
} as const;
```

**File**: `server/modules/learning-delivery/events.ts`

**Before**:
```typescript
export const LEARNING_DELIVERY_EVENTS = {
    CHAPTER_ACCESSED: 'learning.chapter_accessed',
    PROGRESS_VIEWED: 'learning.progress_viewed',
} as const;
```

**After**:
```typescript
export const LEARNING_DELIVERY_EVENTS = {
    CHAPTER_ACCESSED: 'ChapterAccessed',
    PROGRESS_UPDATED: 'ProgressUpdated',
} as const;
```

### Step 2: Add `eventBus.publish()` calls to services

This is the most involved change. For each module that defines events but never publishes them, add publish calls at the appropriate service methods.

**File**: `server/modules/batch-cohort/service.ts` (or `index.ts`)

Add publish calls after successful operations:

```typescript
import { eventBus } from '../../shared/events/event-bus';
import { BATCH_EVENTS } from './events';

// After creating a batch:
eventBus.publish(BATCH_EVENTS.created, {
    batchId: batch.id,
    trackId: batch.trackId,
    createdBy: batch.createdBy,
    timestamp: new Date().toISOString(),
});

// After enrolling a student:
eventBus.publish(BATCH_EVENTS.enrollmentAdded, {
    batchId,
    studentId,
    enrolledBy: userId,
    timestamp: new Date().toISOString(),
});

// After dropping a student:
eventBus.publish(BATCH_EVENTS.enrollmentDropped, {
    batchId,
    studentId,
    timestamp: new Date().toISOString(),
});

// After assigning co-instructor:
eventBus.publish(BATCH_EVENTS.coInstructorAssigned, {
    batchId,
    instructorId,
    timestamp: new Date().toISOString(),
});
```

**Important**: Search for the exact method names in the service file to know where to add these calls. The publish should happen AFTER the database operation succeeds, inside the same try block.

Similarly for **media-pipeline** and **learning-delivery** — add publish calls to `uploadAudioFile`, `createMapping`, `deleteMappingById`, `recordChapterAccess`, and `updateProgress` methods.

### Step 3: Fix `UserRoleChanged` handler shape

**File**: `server/modules/system-admin/events.ts`

**Before**:
```typescript
eventBus.subscribe('UserRoleChanged', async (event: any) => {
    await adminService.logAction(
        event.userId,
        event.added ? 'ROLE_ASSIGNED' : 'ROLE_REMOVED',
        'user',
        event.userId,
        { role: event.role, timestamp: event.timestamp }
    );
});
```

Check what the identity-access service actually publishes for this event. Search:
```bash
rg "UserRoleChanged" server/modules/identity-access/
```

Match the handler to the actual event shape. If the publisher sends `{ userId, newRoles, changedBy, timestamp }`, update the handler:

**After**:
```typescript
eventBus.subscribe('UserRoleChanged', async (event: any) => {
    await adminService.logAction(
        event.changedBy || event.userId,
        'ROLE_CHANGED',
        'user',
        event.userId,
        { newRoles: event.newRoles, timestamp: event.timestamp }
    );
});
```

### Verification for Task 3.6
1. Start the server
2. Create a batch via API or ops portal — check server logs for event handler output
3. Enroll a student — check audit logs (`GET /api/admin/audit-logs`) for the enrollment event
4. Run: `npm run test:smoke`

---

## Task 3.7: Fix OAuth Upsert Conflict Target

**File**: `server/modules/identity-access/storage.ts`

The `upsertUser` method conflicts on `users.id`, but OAuth users get auto-generated IDs. The conflict should be on `email`.

**Before** (around line 71):
```typescript
.onConflictDoUpdate({
    target: users.id,
    set: {
        email: userData.email,
        // ...
    }
})
```

**After**:
```typescript
.onConflictDoUpdate({
    target: users.email,
    set: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        roles: userData.roles ?? sql`excluded.roles`,
        status: userData.status ?? sql`excluded.status`,
        provider: userData.provider ?? sql`excluded.provider`,
        updatedAt: new Date(),
    }
})
```

**Note**: Ensure the `email` column has a UNIQUE constraint in the schema. Check `packages/types/src/schema.ts` for the users table definition.

### Verification for Task 3.7
1. Run: `npm run dev`
2. If Google OAuth is configured, login with Google — should create or update the user
3. Login again — should NOT create a duplicate user

---

## Task 3.8: Remove Debug Console Logs

Search for and remove all debug console.log statements in the server:

```bash
rg "console\.log\(\`?\[DEBUG\]" server/ --files-with-matches
rg "console\.log" server/routes/ --files-with-matches
```

**Known locations**:
- `server/routes/student.routes.ts`: Multiple `console.log('[DEBUG]...')` calls

Replace debug logging with proper Logger calls or remove entirely:

**Before**:
```typescript
console.log(`[DEBUG] GET /students/${studentId}/progress - Requesting User: ${user.id}`);
```

**After** (either remove or use Logger):
```typescript
Logger.debug(`GET /students/${studentId}/progress - Requesting User: ${user.id}`);
```

### Verification for Task 3.8
1. Run: `rg "console\.log" server/routes/` — should return zero results
2. Server should still function normally

---

## Phase 3 Completion Checklist

- [ ] Auth middleware consolidated into single file with role hierarchy
- [ ] Duplicate `role-auth.middleware.ts` deleted
- [ ] `Express.User` type consolidated into single declaration
- [ ] Authorization added to all content write routes
- [ ] Authorization added to all batch write routes
- [ ] `createdBy` spoofing fixed — uses `req.user.id` everywhere
- [ ] Error handler updated to handle all error patterns
- [ ] Duplicate error response helpers consolidated
- [ ] Request logger moved before route handlers
- [ ] Event name constants standardized (PascalCase)
- [ ] Event publish calls added to batch-cohort, media-pipeline, learning-delivery
- [ ] `UserRoleChanged` handler shape fixed
- [ ] OAuth upsert conflict target fixed (email instead of id)
- [ ] Debug console.logs removed from server routes
- [ ] `npm run verify` passes
- [ ] All work committed on `hardening-phase-3`

---

## Merge (end of Phase 3)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-3 --no-ff -m "Merge hardening-phase-3: Server hardening"
git tag hardening-phase-3-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 5](phase-5-performance.md): create `hardening-phase-5` from `hardening` when starting Phase 5 (Phase 4 may be merged in any order).
