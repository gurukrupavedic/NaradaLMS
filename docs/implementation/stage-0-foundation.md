# Stage 0: Foundation Preparation

**Version**: 1.0  
**Date**: 2026-01-31  
**Status**: Ready for Execution

---

## Overview

**Goal**: Resolve architectural dependencies before structural changes  
**Duration**: 4-5 days hands-on (with 20% buffer for JWT migration complexity)  
**Branch**: `stage-0-foundation`

**Core Principle**: Migrate foundational systems (auth, config, routes) in the simpler monolith BEFORE splitting into multiple containers.

**Why This Stage**: Changing authentication and API structure AFTER the split is 3x harder. We solve these problems once in a simpler, unified codebase where testing is easier.

---

## Prerequisites

**Before Starting Stage 0**:

- [ ] All changes committed and pushed
- [ ] Create baseline tag: `git tag baseline-pre-replatform`
- [ ] Backup database: `pg_dump naradalms > backup_$(date +%Y%m%d).sql`
- [ ] Confirm `npm run dev` works perfectly
- [ ] Test login, dashboard, chapter viewing, content editing

---

## Branching Strategy

### Branch Structure

```
main (protected, contains baseline-pre-replatform tag)
  └── stage-0-foundation
        ├── phase-0-1-jwt-migration
        ├── phase-0-2-env-vars
        ├── phase-0-3-api-consolidation
        ├── phase-0-4-upload-strategy
        └── phase-0-5-schema-baseline
```

### Workflow

```bash
# Create Stage 0 branch from main
git checkout main
git checkout -b stage-0-foundation

# For each phase:
git checkout stage-0-foundation
git checkout -b phase-0-X-name
# ... work on phase ...
git checkout stage-0-foundation
git merge phase-0-X-name
git tag phase-0-X-complete
# Get user approval before next phase
```

### Merge Strategy

- ❌ DO NOT merge `stage-0-foundation` to `main` until ALL 5 phases complete
- ✅ DO merge each phase branch into `stage-0-foundation` after validation
- ✅ DO create PR from `stage-0-foundation` to `main` after Stage 0 complete

---

## Phase Overview

| Phase | Goal | Effort | Risk |
|-------|------|--------|------|
| **1** | JWT Migration + WebSocket Auth | 1-1.5 days | High |
| **2** | Environment Variables Standardization | 3 hours | Low |
| **3** | API Route Consolidation | 2-3 hours | Medium |
| **4** | Upload Strategy Confirmation | 30 min | Low |
| **5** | Schema Baseline Documentation | 1 hour | Low |

---

## Phase 1: JWT Migration + WebSocket Auth

**Branch**: `phase-0-1-jwt-migration`

### Objectives

1. Replace session-based authentication with JWT
2. Keep Passport.js for authentication strategies (Google OAuth, local)
3. Update WebSocket authentication for Tiptap collaboration
4. Update frontend to use token-based auth

### Current State Analysis

**Session Flow (Current)**:

```
Login → Passport validates → express-session creates session → 
Save to PostgreSQL → Set cookie → Browser sends cookie with requests → 
Server reads session from PostgreSQL
```

**Problems with Sessions for Multi-Portal**:

- Cookie domain issues (port 3000 vs 5000 vs 5001)
- Session storage overhead (database reads on every request)
- Difficult to scale horizontally

### Target State

**JWT Flow (New)**:

```
Login → Passport validates → Generate JWT → 
Client stores in localStorage → Client sends Authorization header → 
Server validates JWT signature
```

**What We Keep**:

- ✅ Passport.js (handles Google OAuth, email/password validation)
- ✅ Password hashing (bcrypt)
- ✅ User validation logic

**What We Remove**:

- ❌ `express-session`
- ❌ `connect-pg-simple`
- ❌ `sessions` table in PostgreSQL

### Implementation Steps

**Step 1: Install Dependencies**

```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

**Step 2: Create JWT Utilities**

Create `server/auth/jwt.utils.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  status: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'narada-lms',
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'narada-lms',
    }) as JWTPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
```

**Step 3: Create JWT Authentication Middleware**

Create `server/middleware/jwt-auth.middleware.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt.utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    status: string;
  };
}

export function jwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    roles: payload.roles,
    status: payload.status,
  };

  next();
}

export function optionalJwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (payload) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        roles: payload.roles,
        status: payload.status,
      };
    }
  }

  next();
}
```

**Step 4: Update Auth Routes**

Modify `server/routes/identity.routes.ts`:

```typescript
import { Router } from 'express';
import passport from 'passport';
import { generateToken } from '../auth/jwt.utils';
import { jwtAuth } from '../middleware/jwt-auth.middleware';

const router = Router();

// Local login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: user.roles || [],
      status: user.status,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        status: user.status,
      },
    });
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user as any;
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: user.roles || [],
      status: user.status,
    });

    // Redirect to frontend with token in URL
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5000'}?token=${token}`);
  }
);

// Get current user (protected route)
router.get('/me', jwtAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout (client-side only - just delete token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export { router as identityRouter };
```

**Step 5: Update All Protected Routes**

Replace Passport session middleware with JWT middleware:

```typescript
// OLD
import { ensureAuthenticated } from '../middleware/auth';
router.get('/protected', ensureAuthenticated, handler);

// NEW
import { jwtAuth } from '../middleware/jwt-auth.middleware';
router.get('/protected', jwtAuth, handler);
```

**Files to update**:

- `server/routes/admin.routes.ts`
- `server/routes/batch.routes.ts`
- `server/routes/content.routes.ts`
- `server/routes/learning.routes.ts`
- `server/routes/media.routes.ts`
- `server/routes/student.routes.ts`

**Step 6: Update WebSocket Authentication**

Modify WebSocket connection in `server/index.ts`:

```typescript
import { verifyToken } from './auth/jwt.utils';

wss.on('connection', (ws, req) => {
  // Extract token from query parameter or header
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'No token provided');
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    ws.close(1008, 'Invalid token');
    return;
  }

  // Attach user info to WebSocket connection
  (ws as any).user = payload;

  // Rest of WebSocket logic...
});
```

**Step 7: Update Frontend Auth Logic**

Modify `client/src/features/shared/hooks/useAuth.ts`:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  roles: string[];
  status: 'active' | 'pending_approval' | '  inactive';
}

export function useAuth() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('jwt_token');
      
      if (!token) {
        return null;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('jwt_token');
            return null;
          }
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        return data.user as AuthUser;
      } catch (err) {
        console.error('Auth check error', err);
        localStorage.removeItem('jwt_token');
        return null;
      }
    },
    retry: false,
  });

  const logout = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('jwt_token');
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/');
    }
  };

  return {
    user: userData || null,
    isLoading,
    isAuthenticated: !!userData,
    isPendingApproval: userData?.status === 'pending_approval',
    isActive: userData?.status === 'active',
    error,
    logout,
  };
}
```

**Step 8: Update Login/Register Pages**

Modify `client/src/features/shared/pages/AuthPage.tsx` to store JWT:

```typescript
// In LoginForm component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid credentials');
    }

    const data = await response.json();
    
    // Store JWT token
    localStorage.setItem('jwt_token', data.token);
    
    toast({ title: 'Welcome back', description: 'Logged in successfully' });
    onSuccess();
  } catch (err: any) {
    toast({
      title: 'Login failed',
      description: err.message,
      variant: 'destructive',
    });
    setLoading(false);
  }
};
```

**Step 9: Update API Fetch Wrapper**

Create or update `client/src/lib/fetch.ts`:

```typescript
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt_token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
}
```

**Step 10: Remove Session Dependencies**

```bash
# Remove packages
npm uninstall express-session connect-pg-simple

# Remove from server/index.ts:
# - import session from 'express-session';
# - import connectPg from 'connect-pg-simple';
# - app.use(session({ ... }));
# - passport session serialization/deserialization
```

**Step 11: Update Environment Variables**

Add to `.env`:

```env
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRY=7d
FRONTEND_URL=http://localhost:5000
```

Add to `.env.example`:

```env
# JWT Configuration
JWT_SECRET=change-me-in-production
JWT_EXPIRY=7d

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5000
```

### Validation Criteria

**Manual Testing**:

- [ ] Can login with email/password
- [ ] Can login with Google OAuth
- [ ] Can register new account
- [ ] Protected routes return 401 without token
- [ ] Protected routes work with valid token
- [ ] Token expires after 7 days (test with modified expiry)
- [ ] Logout removes token and redirects to login
- [ ] Can access protected pages after login
- [ ] Sessions persist across browser tabs
- [ ] Tiptap collaborative editing works with JWT auth
- [ ] WebSocket connection authenticates successfully

**Code Verification**:

- [ ] No references to `express-session` in codebase
- [ ] No references to `connect-pg-simple` in codebase
- [ ] All routes use `jwtAuth` middleware
- [ ] Frontend always sends Authorization header
- [ ] `localStorage` contains JWT token after login

**Database**:

- [ ] `sessions` table can be dropped (after backup!)
- [ ] No session-related queries in logs

### Rollback Plan

**If JWT breaks critical functionality**:

```bash
# Revert to previous commit
git reset --hard HEAD~1

# Or revert specific files
git checkout HEAD~1 -- server/auth/
git checkout HEAD~1 -- server/middleware/
git checkout HEAD~1 -- server/routes/
git checkout HEAD~1 -- client/src/features/shared/hooks/useAuth.ts

# Reinstall session packages
npm install express-session connect-pg-simple

# Restore server/index.ts session configuration
```

**Tag before starting**:

```bash
git tag phase-0-1-pre-jwt-migration
```

### Estimated Effort

- Implementation: 6-8 hours
- Testing: 2-3 hours
- **Total**: 1-1.5 days

---

## Phase 2: Environment Variables Standardization

**Branch**: `phase-0-2-env-vars`

### Objectives

1. Document all environment variables
2. Ensure no hardcoded URLs or secrets
3. Prepare configuration split for multi-container deployment

### Current State Analysis

**Existing Variables** (from `.env`):

```env
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=... (from Phase 1)
```

**Hardcoding Issues** (need to verify):

- API URLs in frontend (`/api` prefix assumed localhost:5000)
- Port numbers (5000 hardcoded in multiple places)
- Asset paths (upload directory)

### Implementation Steps

**Step 1: Audit Codebase for Hardcoded Values**

Search for:

```bash
# URLs
git grep "http://localhost" client/
git grep "localhost:5000" client/

# Port numbers
git grep "5000" server/

# Paths
git grep "/uploads" server/ client/
```

**Step 2: Create Comprehensive `.env.example`**

```env
# ==============================================================================
# DATABASE
# ==============================================================================
DATABASE_URL=postgresql://user:password@localhost:5432/naradalms

# ==============================================================================
# SERVER
# ==============================================================================
PORT=5000
NODE_ENV=development

# ==============================================================================
# JWT AUTHENTICATION
# ==============================================================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# ==============================================================================
# OAUTH PROVIDERS
# ==============================================================================
# Google OAuth (get credentials from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ==============================================================================
# FRONTEND CONFIGURATION
# ==============================================================================
# Used for OAuth redirects
FRONTEND_URL=http://localhost:5000

# ==============================================================================
# FILE UPLOADS
# ==============================================================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50

# ==============================================================================
# FUTURE: MULTI-CONTAINER SETUP (Stage 1)
# ==============================================================================
# Uncomment and configure when splitting into separate containers

# API Server
# API_URL=http://localhost:5000
# API_PORT=5000

# Student Portal
# STUDENT_PORTAL_URL=http://localhost:3000
# STUDENT_PORTAL_PORT=3000

# Admin Portal
# OPS_PORTAL_URL=http://localhost:3001
# OPS_PORTAL_PORT=3001

# ==============================================================================
# FUTURE: CLOUD STORAGE (Post Stage 1)
# ==============================================================================
# AWS_S3_BUCKET=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
```

**Step 3: Replace Hardcoded Values**

**(A) Server Port**

In `server/index.ts`:

```typescript
// OLD
const port = 5000;

// NEW
const port = parseInt(process.env.PORT || '5000', 10);
```

**(B) Upload Directory**

Create `server/config.ts`:

```typescript
export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
};
```

Update multer configuration:

```typescript
import { config } from './config';

const upload = multer({
  dest: config.uploadDir,
  limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 },
});
```

**(C) Frontend API Calls**

Create `client/src/lib/config.ts`:

```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
};
```

**Step 4: Create Runtime Config Documentation**

Create `docs/implementation/configuration.md`:

```markdown
# Configuration Guide

## Environment Variables

### Required (Must be set in production)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing (min 32 characters)

### Optional (Have defaults)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development | production)
- `JWT_EXPIRY`: Token expiration (default: 7d)

### OAuth (Optional, for social login)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Configuration per Environment

### Development (.env)
```env
DATABASE_URL=postgresql://localhost:5432/naradalms_dev
JWT_SECRET=dev-secret-not-for-production
NODE_ENV=development
```

### Production

Set via environment variables or secrets management:

- Docker: Pass via `-e` flag or docker-compose.yml
- Cloud: Use platform-specific secrets (Fly.io secrets, Heroku config vars, etc.)

```

**Step 5: Validate No Hardcoded Secrets**

Create script `scripts/check-hardcoded-secrets.sh`:

```bash
#!/bin/bash

echo "Checking for hardcoded secrets..."

# Check for potential secrets
git grep -E "sk-[a-zA-Z0-9]{48}" . || echo "✓ No OpenAI keys"
git grep -E "ghp_[a-zA-Z0-9]{36}" . || echo "✓ No GitHub tokens"  
git grep -E "postgresql://.*:.*@" . | grep -v ".env" || echo "✓ No hardcoded DB URLs"

# Check for suspicious patterns
git grep "password.*=.*['\"][^'\"]*['\"]" server/ | grep -v ".env" && echo "⚠ Found potential hardcoded passwords"

echo "✓ Secret scan complete"
```

### Validation Criteria

- [ ] `.env.example` contains all variables with documentation
- [ ] No hardcoded URLs in client or server code
- [ ] `PORT` is configurable via env var
- [ ] Upload directory is configurable
- [ ] No secrets in git history
- [ ] App runs with only `.env.example` renamed to `.env` (after filling values)
- [ ] `scripts/check-hardcoded-secrets.sh` passes

### Rollback Plan

No code changes, only documentation. Safe to abandon if not useful.

### Estimated Effort

- Implementation: 2-3 hours
- Validation: 30 minutes
- **Total**: 3 hours

---

## Phase 3: API Route Consolidation

**Branch**: `phase-0-3-api-consolidation`

### Objectives

1. Standardize API route structure
2. Remove duplicate route mounts
3. Document all endpoints for portals to reference

### Current State Analysis

**Inconsistent Mounting** (from `server/index.ts`):

```typescript
app.use('/api/auth', identityRouter);        // ✓ Good (namespaced)
app.use('/api/admin', adminRouter);          // ✓ Good
app.use('/api', contentRouter);               // ❌ Too generic
app.use('/api/content', contentRouter);       // ❌ Duplicate!
app.use('/api', mediaRouter);                 // ❌ Too generic
app.use('/api', batchRouter);                 // ❌ Too generic
app.use('/api', studentRouter);               // ❌ Too generic
app.use('/api/learning', learningRouter);    // ✓ Good
```

**Problem**: Hard to know which endpoints are where. Risk of conflicts.

### Target State

**Namespaced Pattern**:

```
/api/auth/*
/api/admin/*
/api/batches/*
/api/content/*
/api/learning/*
/api/media/*
/api/students/*
```

### Implementation Steps

**Step 1: Update Route Mounts**

In `server/index.ts`:

```typescript
// OLD
app.use('/api/auth', identityRouter);
app.use('/api/admin', adminRouter);
app.use('/api', contentRouter);              // ❌
app.use('/api/content', contentRouter);       // ❌ Duplicate
app.use('/api', mediaRouter);                 // ❌
app.use('/api', batchRouter);                 // ❌
app.use('/api', studentRouter);               // ❌
app.use('/api/learning', learningRouter);

// NEW
app.use('/api/auth', identityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);      // ✓ Single mount
app.use('/api/media', mediaRouter);          // ✓ Namespaced
app.use('/api/batches', batchRouter);        // ✓ Namespaced
app.use('/api/students', studentRouter);     // ✓ Namespaced
app.use('/api/learning', learningRouter);
```

**Step 2: Update Route Definitions**

Each router should NOT include the prefix (it's in the mount):

```typescript
// server/routes/batch.routes.ts
// OLD
router.get('/batches', handler);
router.get('/batches/:id', handler);

// NEW
router.get('/', handler);           // Mounted at /api/batches
router.get('/:id', handler);        // Becomes /api/batches/:id
```

**Step 3: Update Frontend API Calls**

Search and replace in `client/`:

```typescript
// OLD
fetch('/api/tracks')

// NEW (if route changed)
fetch('/api/content/tracks')
```

**Step 4: Create API Endpoint Documentation**

Create `docs/implementation/api-endpoints.md`:

```markdown
# API Endpoints Reference

## Authentication (`/api/auth`)

### POST /api/auth/login
**Purpose**: Email/password login  
**Auth**: None  
**Body**: `{ email: string, password: string }`  
**Response**: `{ token: string, user: User }`

### POST /api/auth/register
**Purpose**: Create new user account  
**Auth**: None  
**Body**: `{ email, password, firstName, lastName }`  
**Response**: `{ user: User }`

### GET /api/auth/me
**Purpose**: Get current user  
**Auth**: Required (JWT)  
**Response**: `{ user: User }`

### POST /api/auth/logout
**Purpose**: Logout (client-side only)  
**Auth**: Optional  
**Response**: `{ message: string }`

### GET /api/auth/google
**Purpose**: Initiate Google OAuth flow  
**Auth**: None  
**Redirects**: To Google OAuth consent screen

### GET /api/auth/google/callback
**Purpose**: Google OAuth callback  
**Auth**: None  
**Redirects**: To frontend with token

## Content Management (`/api/content`)

### GET /api/content/tracks
**Purpose**: List all tracks  
**Auth**: Required  
**Query**: None  
**Response**: `Track[]`

### GET /api/content/tracks/:trackId/chapters
**Purpose**: Get chapters for a track  
**Auth**: Required  
**Params**: `trackId: number`  
**Response**: `Chapter[]`

### POST /api/content/tracks
**Purpose**: Create new track  
**Auth**: Required (content_manager role)  
**Body**: `{ title, description }`  
**Response**: `Track`

### GET /api/content/chapters/:chapterId
**Purpose**: Get chapter details  
**Auth**: Required  
**Params**: `chapterId: number`  
**Response**: `Chapter`

### PUT /api/content/chapters/:chapterId
**Purpose**: Update chapter content  
**Auth**: Required (content_manager role)  
**Body**: `{ content: { te?, hi?, en? } }`  
**Response**: `Chapter`

### POST /api/content/chapters/:chapterId/publish
**Purpose**: Publish a draft chapter  
**Auth**: Required (content_manager role)  
**Response**: `Chapter`

## Media (`/api/media`)

### POST /api/media/upload
**Purpose**: Upload audio file  
**Auth**: Required (content_manager role)  
**Body**: FormData with file  
**Response**: `AudioFile`

### DELETE /api/media/:fileId
**Purpose**: Delete audio file  
**Auth**: Required (content_manager role)  
**Params**: `fileId: number`  
**Response**: `{ success: boolean }`

### GET /api/media/segments/:chapterId
**Purpose**: Get text/media segments for chapter  
**Auth**: Required  
**Params**: `chapterId: number`  
**Response**: `{ textSegments, mediaSegments, mappings }`

## Batches (`/api/batches`)

### GET /api/batches
**Purpose**: List batches (filtered by role)  
**Auth**: Required  
**Response**: `Batch[]`

### POST /api/batches
**Purpose**: Create new batch  
**Auth**: Required (admin role)  
**Body**: `{ batchCode, batchName, trackId?, ... }`  
**Response**: `Batch`

### GET /api/batches/:id
**Purpose**: Get batch details  
**Auth**: Required  
**Params**: `id: number`  
**Response**: `Batch`

### PUT /api/batches/:id
**Purpose**: Update batch  
**Auth**: Required (admin role)  
**Params**: `id: number`  
**Body**: Partial batch data  
**Response**: `Batch`

### POST /api/batches/:id/enroll
**Purpose**: Enroll student in batch  
**Auth**: Required (admin/instructor role)  
**Body**: `{ studentId: string }`  
**Response**: `Enrollment`

## Learning (`/api/learning`)

### GET /api/learning/chapters
**Purpose**: Get chapters for student's batch  
**Auth**: Required (student role)  
**Response**: `Chapter[]`

### GET /api/learning/chapters/:chapterId
**Purpose**: Get chapter content for learning  
**Auth**: Required (student role)  
**Params**: `chapterId: number`  
**Response**: `Chapter`

### POST /api/learning/chapters/:chapterId/access
**Purpose**: Track chapter access  
**Auth**: Required (student role)  
**Params**: `chapterId: number`  
**Response**: `{ success: boolean }`

### GET /api/learning/progress
**Purpose**: Get student progress  
**Auth**: Required (student role)  
**Query**: `chapterId?: number, studentId?: string`  
**Response**: `StudentProgress[]`

## Admin (`/api/admin`)

### GET /api/admin/users
**Purpose**: List all users  
**Auth**: Required (admin role)  
**Query**: `status?: string, role?: string`  
**Response**: `User[]`

### POST /api/admin/users/:id/approve
**Purpose**: Approve pending user  
**Auth**: Required (admin role)  
**Params**: `id: string`  
**Body**: `{ roles: string[] }`  
**Response**: `User`

### PUT /api/admin/users/:id
**Purpose**: Update user  
**Auth**: Required (admin role)  
**Params**: `id: string`  
**Body**: Partial user data  
**Response**: `User`

### DELETE /api/admin/users/:id
**Purpose**: Delete/deactivate user  
**Auth**: Required (admin role)  
**Params**: `id: string`  
**Response**: `{ success: boolean }`

### GET /api/admin/logs
**Purpose**: Get audit logs  
**Auth**: Required (admin role)  
**Query**: `userId?: string, action?: string, limit?: number`  
**Response**: `AuditLog[]`

## Students (`/api/students`)

### GET /api/students
**Purpose**: List students (for instructors)  
**Auth**: Required (instructor/admin role)  
**Query**: `batchId?: number`  
**Response**: `User[]`

### GET /api/students/:id
**Purpose**: Get student details  
**Auth**: Required (instructor/admin role)  
**Params**: `id: string`  
**Response**: `User & { progress: StudentProgress[] }`

## Static Files

### GET /uploads/:filename
**Purpose**: Serve uploaded media files  
**Auth**: None (consider adding in future)  
**Returns**: File stream
```

### Validation Criteria

- [ ] All routes follow `/api/<module>/<endpoint>` pattern
- [ ] No duplicate route mounts
- [ ] Frontend API calls updated to match new routes
- [ ] `api-endpoints.md` documents all endpoints
- [ ] All existing features still work
- [ ] No 404 errors in browser network tab

### Rollback Plan

Routes are just mounting points. Easy to revert:

```bash
git checkout HEAD~1 -- server/index.ts
git checkout HEAD~1 -- server/routes/
```

### Estimated Effort

- Implementation: 1-2 hours
- Documentation: 1 hour
- Testing: 30 minutes
- **Total**: 2-3 hours

---

## Phase 4: Upload Strategy Confirmation

**Branch**: `phase-0-4-upload-strategy`

### Objectives

1. Document current upload mechanism
2. Confirm this works for multi-container setup
3. Plan future cloud storage migration (not implemented now)

### Current State Analysis

**How Uploads Work**:

1. Client uploads file via `/api/media/upload`
2. Multer saves to `./uploads` directory
3. Express serves files via `app.use('/uploads', express.static('uploads'))`
4. Frontend requests `/uploads/filename.mp3`

**Storage Location**: Local file system at `./uploads`

### Target State (For Stage 1)

**Option A: Keep Local (Recommended for Stage 1)**

- API server continues serving uploads
- Both portals proxy `/uploads/*` to API server
- Simple, works for development

**Option B: Cloud Storage (Future, post-Stage 1)**

- Upload to S3/Cloud Storage
- Return CDN URL
- More scalable, but complex

### Implementation Steps

**Step 1: Document Current Upload Flow**

Create `docs/implementation/upload-strategy.md`:

```markdown
# Upload Strategy

## Current Implementation (Stage 0-1)

### Upload Flow
```

Client → POST /api/media/upload (multipart/form-data) →
Multer → Save to ./uploads/ →
Response: { filename: string }

```

### Retrieval Flow
```

Client → GET /uploads/filename.mp3 →
Express static middleware → File stream

```

### Storage
- **Location**: Local file system `./uploads`
- **Max Size**: 50MB (configurable via `MAX_FILE_SIZE_MB`)
- **Cleanup**: Manual (no automatic cleanup of old files)

## Stage 1 Considerations

When splitting into 3 containers:
- **API Server**: Continues serving uploads via `/uploads/*`
- **Student Portal**: Proxies `/uploads/*` to API server
- **Admin Portal**: Proxies `/uploads/*` to API server

**Next.js Rewrite** (for both portals):
```typescript
// next.config.ts
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: process.env.API_URL + '/uploads/:path*',
    },
  ];
}
```

## Future: Cloud Storage Migration

### When to Migrate

- After Stage 1 complete
- When uploads exceed 1GB
- When deploying to multiple API instances (horizontal scaling)

### Recommended Approach

1. Install `@aws-sdk/client-s3` or equivalent
2. Create upload service abstraction
3. Update `/api/media/upload` to use cloud storage
4. Return CDN URL instead of local path
5. Update frontend to use CDN URLs

### Migration Checklist

- [ ] Set up S3 bucket or equivalent
- [ ] Configure CORS for bucket
- [ ] Update upload route
- [ ] Migrate existing files
- [ ] Update database records (if paths stored)
- [ ] Test upload/download
- [ ] Remove local uploads directory

```

**Step 2: Verify Current Implementation**

Test upload flow:
1. Upload an audio file via Admin Portal
2. Verify file saved to `./uploads`
3. Play audio in Student Portal LearnChapter page
4. Confirm WebAudio API can fetch the file

**Step 3: Add Upload Directory to .gitignore**

Ensure `.gitignore` includes:
```

uploads/
!uploads/.gitkeep

```

Create `uploads/.gitkeep` to preserve directory:
```bash
mkdir -p uploads
touch uploads/.gitkeep
```

### Validation Criteria

- [ ] Upload works in current monolith
- [ ] Files saved to `./uploads`
- [ ] Audio playback works
- [ ] `upload-strategy.md` documents current and future state
- [ ] `.gitignore` excludes upload files

### Rollback Plan

No code changes. Documentation only.

### Estimated Effort

- 30 minutes (documentation and verification)

---

## Phase 5: Schema Baseline Documentation

**Branch**: `phase-0-5-schema-baseline`

### Objectives

1. Document current database schema
2. Tag schema baseline for Stage 0
3. Identify tables that will need OrgID in Stage 3

### Implementation Steps

**Step 1: Generate Schema Documentation**

Create script `scripts/generate-schema-docs.ts`:

```typescript
import fs from 'fs';
import * as schema from '../shared/schema';

const markdown: string[] = [];
markdown.push('# Database Schema Baseline (Stage 0)\n');
markdown.push('**Generated**: ' + new Date().toISOString() + '\n');
markdown.push('**Purpose**: Baseline schema before Stage 3 multi-tenancy\n\n');
markdown.push('## Tables\n\n');

const tables = Object.keys(schema).filter(key => !key.endsWith('Relations'));
markdown.push(`**Total Tables**: ${tables.length}\n\n`);

for (const tableName of tables) {
  markdown.push(`### ${tableName}\n\n`);
  markdown.push('*Schema details available in `shared/schema.ts`*\n\n');
}

fs.writeFileSync('docs/implementation/schema-baseline.md', markdown.join(''));
console.log('✓ Schema documentation generated');
```

Run: `npx tsx scripts/generate-schema-docs.ts`

**Step 2: Document Multi-Tenancy Preparation**

Add section to `docs/implementation/schema-baseline.md`:

```markdown
## Stage 3: Multi-Tenancy Changes

### Tables Requiring OrgID Column

**High Priority** (core business data):
- `tracks`: Curriculum specific to organization
- `chapters`: Content specific to organization
- `batches`: Cohorts specific to organization
- `enrollments`: Student enrollments specific to organization
- `studentProgress`: Learning data specific to organization

**Medium Priority** (user data):
- `users`: Users can belong to multiple organizations (junction table needed)

**Low Priority** (metadata):
- `audioFiles`: Shared or org-specific (TBD)
- `textSegments`: Shared or org-specific (TBD)
- `mediaMappings`: Specific to org chapters
- `auditLogs`: Org-specific

**Shared** (no OrgID needed):
- `sessions`: Deprecated (removed in Phase 1)

### Migration Strategy (Stage 3)
1. Add `org_id` column (nullable initially)
2. Create `organizations` table
3. Backfill existing data with default org
4. Make `org_id` not null
5. Add indexes on `org_id`
6. Update all queries to filter by `org_id`
```

**Step 3: Tag Schema Baseline**

```bash
# Run migration to ensure schema is current
npm run db:push

# Tag current state
git tag schema-baseline-stage-0
```

### Validation Criteria

- [ ] `schema-baseline.md` exists and is comprehensive
- [ ] All 16 tables documented
- [ ] Multi-tenancy preparation section complete
- [ ] Git tag created (`schema-baseline-stage-0`)

### Rollback Plan

Documentation only. No rollback needed.

### Estimated Effort

- 1 hour

---

## Stage 0 Completion Gate

**Before proceeding to Stage 1, validate ALL of the following**:

### Phase Completion

- [ ] Phase 1 (JWT) complete and tagged (`phase-0-1-complete`)
- [ ] Phase 2 (Env Vars) complete and tagged (`phase-0-2-complete`)
- [ ] Phase 3 (API Routes) complete and tagged (`phase-0-3-complete`)
- [ ] Phase 4 (Uploads) complete and tagged (`phase-0-4-complete`)
- [ ] Phase 5 (Schema) complete and tagged (`phase-0-5-complete`)

### Functional Validation

- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] All protected routes require JWT
- [ ] JWT expires correctly
- [ ] File uploads work
- [ ] Audio playback works
- [ ] Tiptap collaborative editing works
- [ ] All API endpoints respond correctly

### Code Quality

- [ ] No TypeScript errors (`npm run check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] No hardcoded secrets
- [ ] All env vars documented in `.env.example`

### Documentation

- [ ] `.env.example` complete
- [ ] `configuration.md` created
- [ ] `api-endpoints.md` created
- [ ] `upload-strategy.md` created
- [ ] `schema-baseline.md` created

### Git Hygiene

- [ ] All phase branches merged to `stage-0-foundation`
- [ ] All phases tagged (`phase-0-1-complete` through `phase-0-5-complete`)
- [ ] `stage-0-foundation` ready for final validation

### User Testing

- [ ] Can login as student
- [ ] Can view dashboard and chapters
- [ ] Can login as admin
- [ ] Can manage users and batches
- [ ] Can edit content (Tiptap works)
- [ ] No console errors in browser
- [ ] No 5xx errors in server logs

### User Approval

- [ ] **EXPLICIT WRITTEN APPROVAL FROM USER REQUIRED**

---

## Merge to Main

**Only after ALL Stage 0 validation passes**:

```bash
# Tag Stage 0 completion
git checkout stage-0-foundation
git tag stage-0-complete

# Push everything
git push origin stage-0-foundation --tags

# Create PR to main
# Title: "Stage 0: Foundation Preparation Complete"
# Description: Reference this document and validation checklist
```

**User Action**: Create GitHub PR for team review before merging to main.

---

## Next Steps

After Stage 0 merges to `main`:

1. **Pause and Reflect**: Document any learnings or issues encountered
2. **Update Decision Log**: Add any new decisions made during execution
3. **Prepare for Stage 1**: Review `docs/implementation/stages/stage-1-structural-split.md`
4. **Create Stage 1 Branch**: `git checkout main && git checkout -b stage-1-replatform`

**Stage 1 will focus on**: Splitting the monolith into 3 independent containers (Student Portal, Admin Portal, API) using the clean JWT auth foundation we've built.

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Owner**: Narada LMS Team
