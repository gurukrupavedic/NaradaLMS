# Re-Architecture Decision Log

**Project**: Narada LMS Re-Platform  
**Version**: 1.0  
**Date Started**: 2026-01-31

---

## Purpose

This document records all major architectural decisions made during the Narada LMS re-architecture from Modular Monolith to Multi-Tenant Monorepo. Each decision includes context, options considered, final decision, rationale, and implementation details.

---

## Decision Index

**Stage 0 Decisions**:

- [DP-0.1: Authentication Architecture Strategy](#dp-01-authentication-architecture-strategy)
- [DP-0.2: Passport.js + JWT Integration](#dp-02-passportjs--jwt-integration)
- [DP-0.3: Pre-Work Before Structural Split](#dp-03-pre-work-before-structural-split)

**Stage 1 Decisions**:

- [DP-1.1: Asset Location Strategy](#dp-11-asset-location-strategy)
- [DP-1.2: API Connection Method](#dp-12-api-connection-method)
- [DP-1.3: Session Cookie Domain (Deprecated by JWT)](#dp-13-session-cookie-domain-deprecated-by-jwt)
- [DP-1.4: useAuth Hook Location](#dp-14-useauth-hook-location)
- [DP-1.5: Portal Naming Convention](#dp-15-portal-naming-convention)
- [DP-1.6: Tiptap Editor Location](#dp-16-tiptap-editor-location)
- [DP-1.7: Admin vs Instructor Portal Split](#dp-17-admin-vs-instructor-portal-split)
- [DP-1.8: Content Management Portal](#dp-18-content-management-portal)
- [DP-1.9: Docker Timing](#dp-19-docker-timing)
- [DP-1.10: Upload Storage Strategy](#dp-110-upload-storage-strategy)
- [DP-1.11: Routing Migration Strategy](#dp-111-routing-migration-strategy)
- [DP-1.12: Image Optimization Strategy](#dp-112-image-optimization-strategy)
- [DP-1.13: CORS Configuration](#dp-113-cors-configuration)
- [DP-1.14: Database Access Boundary](#dp-114-database-access-boundary)
- [DP-1.15: Health Check Endpoints](#dp-115-health-check-endpoints)

**Branching & Process Decisions**:

- [DP-P.1: Branching Strategy](#dp-p1-branching-strategy)
- [DP-P.2: Merge Approval Process](#dp-p2-merge-approval-process)

**Stage 2 Decisions** (TBD)

**Stage 3 Decisions** (TBD)

---

## Stage 0 Decisions

### DP-0.1: Authentication Architecture Strategy

**Context**  
Current authentication uses Passport.js with session-based cookies stored in PostgreSQL. After splitting into 3 containers (Student Portal on port 3000, Ops Portal on port 3001, API on port 5000), cookie domain issues will arise.

**Problem Statement**  
How do we handle authentication across multiple containers running on different ports/domains?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Session + nginx Proxy** | Keep sessions, use nginx to make all containers appear on same domain | No auth code changes | Complex deployment, still have session overhead |
| **B: JWT + Passport.js** | Replace sessions with JWT, keep Passport strategies | Stateless, portable, aligns with final architecture | Requires auth refactor |
| **C: Remove Passport, Pure JWT** | Build custom JWT auth system | Full control | Rebuilding functionality Passport already provides |

**Decision**  
**Option B: JWT + Passport.js**

**Rationale**

1. **Passport is good at authentication**: Google OAuth, email/password validation, future strategies
2. **JWT is good at authorization**: Stateless tokens, no cookie domain issues, scalable
3. **Separation of concerns**: Passport validates credentials, JWT manages sessions
4. **Future-proof**: Works across any number of containers, subdomains, or cloud deployments
5. **Lower total risk**: Migrate auth BEFORE structural split (safer in monolith)

**Implementation**

- **Stage**: 0, Phase 1
- **Effort**: 1-1.5 days
- **Affects**: `server/auth/`, `server/routes/`, `client/src/features/shared/hooks/useAuth.ts`

**Alternatives Rejected**

- ❌ Option A: Adds nginx complexity without solving long-term problem (JWT needed for cloud anyway)
- ❌ Option C: Throws away well-tested OAuth flows Passport provides

**Date**: 2026-01-31  
**Stakeholders**: User, Dev Team

---

### DP-0.2: Passport.js + JWT Integration

**Context**  
Decision DP-0.1 chose JWT + Passport.js. Need to clarify integration approach.

**Problem Statement**  
Should we keep Passport.js or replace it entirely with custom JWT logic?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Passport for Auth, JWT for Sessions** | Passport validates credentials → Generate JWT → Client stores token | Best of both worlds | None significant |
| **B: Remove Passport** | Custom auth logic + JWT | Full control | Reimplementing OAuth flows |

**Decision**  
**Option A: Passport for Auth, JWT for Sessions**

**Rationale**

1. **Passport handles complex flows**: Google OAuth redirect dance is non-trivial
2. **JWT handles portability**: Tokens work across containers without cookie issues
3. **Minimal refactor**: Keep passport strategies, just change session mechanism
4. **Proven libraries**: Both Passport and jsonwebtoken are battle-tested

**Implementation Details**

```typescript
// Passport validates
passport.authenticate('local', (err, user) => {
  // Generate JWT (NEW)
  const token = jwt.sign({ userId: user.id, roles: user.roles }, SECRET);
  res.json({ token, user });
});
```

**What We Keep**:

- ✅ Passport strategies (local, google-oauth20)
- ✅ Password hashing (bcrypt)
- ✅ User validation logic

**What We Remove**:

- ❌ express-session
- ❌ connect-pg-simple
- ❌ sessions table

**Date**: 2026-01-31  
**Stakeholders**: User, Dev Team

---

### DP-0.3: Pre-Work Before Structural Split

**Context**  
Initially planned to start with structural split (Stage 1). Identified that some architectural dependencies should be resolved first.

**Problem Statement**  
What foundational work should happen BEFORE splitting the monolith?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Minimal (JWT only)** | Just migrate to JWT, then split | Faster to Stage 1 | May discover config/routing issues mid-split |
| **B: Thorough (5 phases)** | JWT + Env Vars + API Routes + Uploads + Schema docs | Clean foundation, easier Stage 1 | 1-2 extra days upfront |

**Decision**  
**Option B: Thorough Stage 0 Preparation (5 Phases)**

**Rationale**

1. **One change at a time**: Solve auth, config, routing in simpler monolith
2. **Validated foundation**: Know exactly what we're splitting
3. **Clearer migration**: No confusion about endpoints or configuration during split
4. **Knowledge bridge**: Documentation created now helps Stage 2/3 planning

**Stage 0 Phases**:

1. ✅ **Phase 1**: JWT Migration + WebSocket Auth (~1.5 days)
2. ✅ **Phase 2**: Environment Variables Standardization (~3 hours)
3. ✅ **Phase 3**: API Route Consolidation (~2-3 hours)
4. ✅ **Phase 4**: Upload Strategy Confirmation (~30 min)
5. ✅ **Phase 5**: Schema Baseline Documentation (~1 hour)

**Total Effort**: 3-4 days

**Impact on Timeline**

- **Without Stage 0**: Stage 1 encounters auth issues, config confusion → Hidden debugging time
- **With Stage 0**: Stage 1 is purely folder reorganization → Predictable, surgical

**Date**: 2026-01-31  
**Stakeholders**: User

---

## Stage 1 Decisions

### DP-1.1: Asset Location Strategy

**Context**  
AuthPage and other components use brand assets (logo, stacked logo). Need to decide where these assets live in monorepo structure.

**Problem Statement**  
Where should brand assets (logos, icons) be stored?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: packages/ui/src/assets** | Bundle with UI package | Assets travel with components | Can't theme per portal |
| **B: Portal-specific public/** | Each portal has own assets | Prepares for Stage 2 theming | Duplication for now |

**Decision**  
**Option B: Portal-specific `public/` directories**

**Rationale**

1. **Prepares for Stage 2**: Chameleonization will need different logos per portal/org
2. **Portal autonomy**: Each portal controls its branding
3. **Next.js pattern**: `public/` is the standard for static assets
4. **Flexibility**: Easy to override per-portal without changing shared package

**Implementation**

```
apps/student-portal/public/
  └── assets/
      ├── logo.svg
      └── logo-stacked.svg

apps/ops-portal/public/
  └── assets/
      ├── logo.svg
      └── logo-stacked.svg
```

**Stage 2 Note**: When implementing themes, assets will be dynamically loaded based on tenant config.

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.2: API Connection Method

**Context**  
After structural split, Student Portal (port 3000) and Ops Portal (port 3001) need to communicate with API Server (port 5000).

**Problem Statement**  
How should portals send API requests?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Next.js Proxy (rewrite)** | Portal rewrites `/api/*` to API server | Simple, transparent | Extra hop |
| **B: Direct Fetch** | Client-side fetch to `NEXT_PUBLIC_API_URL` | Direct, faster | CORS complexity |

**Decision**  
**Initially Option A, but DEPRECATED by DP-0.1 (JWT Decision)**

**Rationale**  
With JWT authentication (DP-0.1), this decision becomes less important:

- JWT in `Authorization` header works for both proxy and direct
- No cookie domain issues

**Recommended Approach**: **Direct Fetch**

```typescript
// client/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt_token');
  
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

**Why This Works**:

- ✅ JWT in header, no cookies
- ✅ CORS easily configured on API server
- ✅ Simpler deployment (no proxy needed)
- ✅ Faster (no intermediary hop)

**Date**: 2026-01-31  
**Status**: Simplified by JWT decision  
**Stakeholders**: User, Dev Team

---

### DP-1.3: Session Cookie Domain (Deprecated by JWT)

**Context**  
Originally identified as a problem: cookies from port 5000 don't work on port 3000/3001.

**Problem Statement**  
~~How to make session cookies work across multiple ports?~~

**Decision**  
**DEPRECATED - Not applicable with JWT authentication**

**Rationale**  
DP-0.1 (JWT Migration) eliminated cookie-based sessions entirely. This decision point is no longer relevant.

**For Historical Reference Only**: Original options considered nginx proxy or cookie domain tricks.

**Date**: 2026-01-31  
**Status**: Deprecated  
**Superseded By**: DP-0.1

---

### DP-1.4: useAuth Hook Location

**Context**  
`useAuth.ts` hook manages authentication state. Both Student Portal and Ops Portal need it.

**Problem Statement**  
Should `useAuth` be shared or duplicated per portal?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Shared (packages/ui/hooks)** | One implementation, both portals import | DRY, consistent auth logic | If broken, affects both |
| **B: Duplicate per portal** | Independent implementations | Portal independence | Duplicate bugs, duplicate fixes |

**Decision**  
**Option A: Shared in `packages/ui/src/hooks/useAuth.ts`**

**Rationale**

1. **JWT makes it stateless**: Hook just reads token from localStorage and validates
2. **Auth logic should be identical**: Both portals authenticate the same way
3. **Single source of truth**: Bug fix benefits both portals immediately
4. **Simpler maintenance**: One test suite for auth

**Implementation**

```typescript
// packages/ui/src/hooks/useAuth.ts
export function useAuth() {
  const token = localStorage.getItem('jwt_token');
  const payload = token ? verifyJWT(token) : null;
  
  return {
    user: payload?.user || null,
    isAuthenticated: !!payload,
    logout: () => localStorage.removeItem('jwt_token'),
  };
}

// Both portals import
import { useAuth } from '@narada/ui/hooks/useAuth';
```

**Portal-Specific Extension** (if needed in future):

```typescript
// apps/student-portal/hooks/useStudentAuth.ts
import { useAuth } from '@narada/ui/hooks/useAuth';

export function useStudentAuth() {
  const auth = useAuth();
  
  // Student-specific logic here
  return { ...auth, isStudent: true };
}
```

**Date**: 2026-01-31  
**Stakeholders**: User, Dev Team

---

### DP-1.5: Portal Naming Convention

**Context**  
Initially referred to second portal as "Admin Portal", but it serves admin, instructor, and content manager roles.

**Problem Statement**  
What should the non-student portal be called?

**Options**  

- "Admin Portal" (too narrow)
- "Instructor Portal" (excludes admins)
- "Management Portal" (too generic)
- **"Ops Portal"** (operations - encompasses all back-office roles)

**Decision**  
**"Ops Portal" (Operations Portal)**

**Rationale**

1. **Accurate**: Covers admin, instructor, content manager roles
2. **Clear distinction**: Student-facing vs. operations
3. **Professional**: "Ops" is standard industry term
4. **Neutral**: Doesn't privilege one role over another

**Naming Throughout Codebase**:

- **Folder**: `apps/ops-portal`
- **Package**: Not published (app, not library)
- **Documentation**: "Ops Portal" or "Operations Portal"
- **UI**: "Pathasala Operations Portal" (per user request)

**Left Nav Behavior**: Role-based - shows only relevant sections per user's roles.

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.6: Tiptap Editor Location

**Context**  
Tiptap editor (132 files) is used by:

- **Student Portal**: Read-only chapter view (`LearnChapterPage`)
- **Ops Portal**: Full editing (`ChapterContentPage`)

**Problem Statement**  
Should this complex component be shared or duplicated?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Shared (packages/ui)** | One copy, both portals import | DRY, single source of truth | If broken, affects both |
| **B: Duplicate per portal** | Two independent copies | Portal independence | 132 files duplicated! |

**Decision**  
**Option A: Shared in `packages/ui/src/tiptap-editor/`**

**Rationale**

1. **Too large to duplicate**: 132 files is unmaintainable if duplicated
2. **Both portals need it**: Student reads, Ops edits - same component, different props
3. **Single bug fix location**: If Tiptap upstream changes, one update point
4. **Props control behavior**: `disabled={true}` for student view, `disabled={false}` for ops edit

**Implementation**

```bash
# Move entire directory
cp -r client/src/components/ui/tiptap-editor packages/ui/src/tiptap-editor

# Both portals use
import { TiptapEditor } from '@narada/ui/tiptap-editor';

# Student Portal (read-only)
<TiptapEditor content={content} disabled={true} />

# Ops Portal (editable)
<TiptapEditor content={content} disabled={false} onChange={handleChange} />
```

**Migration Risk Mitigation**:

- Move in single atomic commit
- Test immediately in both portals
- Keep old version in git history for rollback

**Date**: 2026-01-31  
**Stakeholders**: User, Dev Team

---

### DP-1.7: Admin vs Instructor Portal Split

**Context**  
Ops Portal serves multiple roles: admin, instructor, content_manager.

**Problem Statement**  
Should these be separate portals or one role-based portal?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Single role-based portal** | One app, sidebar adapts to user roles | Matches current UX, simpler deployment | Tightly coupled roles |
| **B: Separate portals** | ops-portal-admin, ops-portal-instructor | Maximum separation | Duplicate components, complex routing |

**Decision**  
**Option A: Single Ops Portal with Role-Based UI**

**Rationale**

1. **Matches current UX**: Users don't see separate apps today
2. **Roles overlap**: Instructors can be admins, admins can be content managers
3. **Simpler deployment**: One portal to manage
4. **Can split later**: If needed, easier to split from monorepo than merge separate apps

**Implementation**:

- Sidebar shows/hides sections based on `user.roles` array
- Route guards check roles on protected pages
- Same pattern as current `AppShell`

**Future Option**: If roles diverge significantly in Stage 2/3, can create separate portals.

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.8: Content Management Portal

**Context**  
Content management (tracks, chapters, editing) used by both instructors and admins.

**Problem Statement**  
Where should content management features live?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: In Ops Portal** | Admin/instructor both access via Ops Portal | Consolidated | None significant |
| **B: Separate content portal** | Dedicated app for content management | Clean separation | Overkill for current needs |
| **C: Duplicate in both** | Student views, Ops edits | Separate codebases | Massive duplication |

**Decision**  
**Option A: Content Management in Ops Portal**

**Rationale**

1. **Content managers are operations users**: Not student-facing
2. **Avoids duplication**: Single codebase for Tiptap editing
3. **Simpler permissions**: Content manager is a role, not a separate portal
4. **Current pattern**: Already works this way in monolith

**Implementation**:

- Ops Portal includes all content management routes
- Role guards ensure only `content_manager` role can edit
- Students never see content management features (in Student Portal)

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.9: Docker Timing

**Context**  
Dockerization enables deployment but adds complexity during development.

**Problem Statement**  
When should we create Docker configuration?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: During Stage 1** | Build Docker config as we create containers | Production-ready from start | Extra complexity during migration |
| **B: After Stage 3** | Focus on code structure first, Docker later | Simpler migration | Might discover deployment issues late |
| **C: After Stage 1, Before Deployment** | Document during Stage 1, build before first deploy | Balanced approach | Requires discipline to not deploy early |

**Decision**  
**Option C: Document in Stage 1, Implement Before Production Deployment**

**Rationale**

1. **No pressure**: Not deploying until after Stage 3 anyway
2. **Focus**: Stage 1 is complex enough without Docker
3. **Learning**: Understand final architecture better by Stage 3
4. **Safe timing**: Between Stage 3 and deployment is perfect window

**Implementation Plan**:

- **Stage 1, Phase 4**: Create `docs/implementation/docker-setup.md` documenting requirements
- **Post-Stage-3**: Execute Docker setup as dedicated task
- **Before First Deploy**: Validate Docker configuration

**Documentation Will Include**:

- 3 Dockerfiles (api, student-portal, ops-portal)
- docker-compose.yml for local development
- Environment variable mapping
- Nginx reverse proxy config (if needed)

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.10: Upload Storage Strategy

**Context**  
Currently files upload to local `./uploads` directory, served by Express.

**Problem Statement**  
Should we migrate to cloud storage (S3) during re-architecture?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Keep local for now** | Continue using ./uploads | Simple, works for development | Not scalable long-term |
| **B: Migrate to cloud now** | S3/Cloud Storage in Stage 0 | Production-ready | Extra complexity, cost, testing |
| **C: Hybrid** | Local for dev, cloud adapter ready | Best of both | Requires abstraction layer |

**Decision**  
**Option A: Keep Local Storage Through Stage 1, Plan Cloud Migration Post-Stage-1**

**Rationale**

1. **Separation of concerns**: Re-architecture is already complex
2. **Current volume**: No immediate pressure to move to cloud
3. **Easy upgrade path**: API serves uploads, portals proxy - changing storage doesn't affect portals
4. **Cost**: Local storage is free for development

**Implementation for Stage 1**:

```typescript
// API continues serving uploads
app.use('/uploads', express.static('uploads'));

// Both portals proxy (Next.js)
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: process.env.API_URL + '/uploads/:path*',
    },
  ];
}
```

**Future Cloud Migration**:

- Create abstraction: `StorageService` interface
- Implement S3/Cloud provider
- Update `/api/media/upload` to use cloud
- Migrate existing uploads
- Remove local directory

**Trigger for Migration**:

- Uploads exceed 1GB
- Deploying to multiple API instances (horizontal scaling)
- User requests cloud storage

**Date**: 2026-01-31  
**Stakeholders**: User

---

### DP-1.11: Routing Migration Strategy

**Context**  
Current modular monolith uses `wouter` for client-side routing. Next.js 15 uses file-based App Router.

**Problem Statement**  
How do we migrate from wouter to Next.js App Router during structural split?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Keep wouter in portals** | Install wouter in both Next.js portals | Minimal code changes | Fighting Next.js conventions |
| **B: Migrate to App Router** | Create pages in `app/` directory | Next.js native, better DX | Must recreate route structure |

**Decision**  
**Option B: Migrate to Next.js 15 App Router**

**Rationale**

1. **Next.js conventions**: App Router is the modern Next.js pattern
2. **Better features**: Server components, layouts, loading states built-in
3. **SEO**: File-based routing easier to document and maintain
4. **Future-proof**: wouter not needed when framework handles routing

**Implementation**

**Student Portal Routes**:

```
wouter (old):             Next.js App Router (new):
/dashboard          →    app/dashboard/page.tsx
/learn/:id          →    app/learn/[id]/page.tsx
```

**Ops Portal Routes**:

```
wouter (old):             Next.js App Router (new):
/users              →    app/users/page.tsx
/batches            →    app/batches/page.tsx
/curriculum/tracks  →    app/curriculum/tracks/page.tsx
/curriculum/chapters/:id → app/curriculum/chapters/[id]/page.tsx
/content/segmentation → app/content/segmentation/page.tsx
/admin/audit        →    app/admin/audit/page.tsx
```

**Migration Steps** (Stage 1, Phases 1-2):

1. Create new page files in App Router structure
2. Copy component logic from old routes
3. Test each route works
4. No wouter dependency needed

**Date**: 2026-01-31  
**Stakeholders**: User  
**Status**: Active

---

### DP-1.12: Image Optimization Strategy

**Context**  
Logos, icons, and static assets currently served as plain `<img>` tags. Next.js provides `<Image>` component for automatic optimization.

**Problem Statement**  
Should we use Next.js Image component for static assets?

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Plain <img> tags** | Keep using regular img elements | Simple, no changes | No optimization, larger bundles |
| **B: Next.js <Image>** | Use next/image component | Automatic optimization, lazy loading | Requires width/height |

**Decision**  
**Option B: Use Next.js `<Image>` Component**

**Rationale**

1. **Performance**: Automatic image optimization (WebP, AVIF)
2. **Lazy loading**: Images load only when in viewport
3. **Layout stability**: Prevents Cumulative Layout Shift (CLS)
4. **Best practice**: Recommended by Next.js for all images

**Implementation**

```typescript
// ❌ OLD (plain img)
<img src="/assets/logo.svg" alt="Narada LMS" />

// ✅ NEW (Next.js Image)
import Image from 'next/image';

<Image 
  src="/assets/logo.svg"
  alt="Narada LMS"
  width={120}
  height={40}
  priority  // For above-the-fold images (logos)
/>
```

**Where to Apply**:

- AuthPage logo
- AppLayout logo
- AppSidebar logo
- Favicon (use next/head)

**Exceptions** (use plain img):

- SVGs that need to be styled with CSS
- User-uploaded images (use Image with dynamic src)

**Date**: 2026-01-31  
**Stakeholders**: User  
**Status**: Active

---

### DP-1.13: CORS Configuration

**Context**  
After structural split, portals (localhost:3000, localhost:3001) will call API (localhost:5000). Browser CORS policy will block cross-origin requests.

**Problem Statement**  
How do we configure CORS to allow portals to call API?

**Decision**  
**Configure Express CORS Middleware with Origin Whitelist**

**Rationale**

1. **Security**: Only allow known origins (portals)
2. **Flexibility**: Works for local dev and production
3. **Standard**: Express `cors` package is industry standard

**Implementation**

```typescript
// apps/api/src/index.ts
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',      // Student Portal (dev)
  'http://localhost:3001',      // Ops Portal (dev)
  process.env.STUDENT_PORTAL_URL,  // Production
  process.env.OPS_PORTAL_URL,   // Production
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,  // Allow Authorization header
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Environment Variables** (add to `.env`):

```env
STUDENT_PORTAL_URL=https://student.naradalms.com
OPS_PORTAL_URL=https://ops.naradalms.com
```

**Testing**:

- [ ] Student portal can fetch from API
- [ ] Ops portal can fetch from API
- [ ] Unknown origin gets rejected
- [ ] Authorization header passes through

**Date**: 2026-01-31  
**Stakeholders**: User  
**Status**: Active

---

### DP-1.14: Database Access Boundary

**Context**  
After structural split, we have API server and 2 Next.js portals. Need clear rule for database access.

**Problem Statement**  
Which containers can access the database directly?

**Decision**  
**Only API Server Accesses Database - Portals Call API Only**

**Rationale**

1. **Single source of truth**: One layer handles all data logic
2. **Security**: Easier to audit and secure single entry point
3. **Scalability**: API can manage connection pooling efficiently
4. **Testing**: Mock API endpoints, not database queries
5. **Prevents leaks**: Portals can't accidentally expose database

**Rules**

```
✅ apps/api/
   └─ Imports @narada/database ✅
   └─ Executes SQL queries ✅
   └─ Handles all CRUD operations ✅

❌ apps/student-portal/
   └─ NEVER import @narada/database ❌
   └─ NEVER query database directly ❌
   └─ ONLY call /api/* endpoints ✅

❌ apps/ops-portal/
   └─ NEVER import @narada/database ❌
   └─ NEVER query database directly ❌
   └─ ONLY call /api/* endpoints ✅
```

**Enforcement**

```json
// apps/student-portal/package.json (DO NOT add database)
{
  "dependencies": {
    "@narada/ui": "workspace:*",
    "@narada/types": "workspace:*"
    // ❌ "@narada/database": "workspace:*"  // FORBIDDEN
  }
}
```

**Validation Checklist** (Stage 1):

- [ ] API package.json includes @narada/database
- [ ] Student portal package.json does NOT include @narada/database
- [ ] Ops portal package.json does NOT include @narada/database
- [ ] All portal data fetching uses fetch() or API client

**Date**: 2026-01-31  
**Stakeholders**: User  
**Status**: Active

---

### DP-1.15: Health Check Endpoints

**Context**  
Need monitoring, Docker health checks, load balancer healthchecks for all 3 containers.

**Problem Statement**  
What should health check endpoints look like?

**Decision**  
**Implement `/health` Endpoint in All Services**

**Rationale**

1. **Monitoring**: Allows uptime checks
2. **Docker**: Enables health checks in `docker-compose.yml`
3. **Load balancers**: Required for AWS ALB, Google Cloud Load Balancing
4. **Standard pattern**: Industry standard endpoint name

**Implementation**

**API Health Endpoint**:

```typescript
// apps/api/src/index.ts
import { sql } from 'drizzle-orm';

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api',
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      service: 'api',
      database: 'disconnected',
    });
  }
});
```

**Portal Health Endpoints**:

```typescript
// apps/student-portal/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'student-portal',
  });
}

// apps/ops-portal/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ops-portal',
  });
}
```

**Testing**:

```bash
curl http://localhost:5000/health          # → {"status":"healthy",...}
curl http://localhost:3000/api/health      # → {"status":"healthy",...}
curl http://localhost:3001/api/health      # → {"status":"healthy",...}
```

**Docker Compose Usage**:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Date**: 2026-01-31  
**Stakeholders**: User  
**Status**: Active

---

## Process Decisions

### DP-P.1: Branching Strategy

**Context**  
Need to isolate work, allow rollback, and prevent main branch corruption.

**Problem Statement**  
How should git branches be structured for safe migration?

**Decision**  
**Hierarchical Stage → Phase Branching**

**Structure**:

```
main (protected)
  └── stage-0-foundation
        ├── phase-0-1-jwt-migration
        ├── phase-0-2-env-vars
        └── ... (5 phases total)
  
  └── stage-1-replatform
        ├── phase-1-0-monorepo-setup
        ├── phase-1-1-student-portal
        └── ... (4 phases total)
```

**Workflow**:

1. Create Stage branch from main
2. Create Phase branch from Stage
3. Work on Phase
4. Merge Phase → Stage (after validation)
5. Merge Stage → main (only after ALL phases complete + user approval)

**Rationale**:

- **Safety**: main always deployable
- **Isolation**: Phases don't interfere with each other
- **Rollback**: Can abandon phase without losing stage progress
- **Team Review**: Stage → main merge becomes PR for team review

**Rules**:

- ❌ Never commit directly to main
- ❌ Never merge Stage to main mid-work
- ✅ Always tag after phase completion
- ✅ Always validate at Stage gates before proceeding

**Date**: 2026-01-31  
**Stakeholders**: User, Collaborators

---

### DP-P.2: Merge Approval Process

**Context**  
User has collaborators who will review before merging to main.

**Problem Statement**  
Who approves merges and at what levels?

**Decision**  
**Phase Merges: Auto (After Gate Check) | Stage Merges: Manual PR Review**

**Approval Matrix**:

| Merge Type | Approver | Process |
|------------|----------|---------|
| Phase → Stage | User (via gate checks) | Automated merge after validation checklist passed |
| Stage → main | Team (via PR) | GitHub PR review + approval before merge |

**Workflow**:

1. **Phase Complete**: AI completes gate checks, gets user approval, merges to Stage branch
2. **Stage Complete**: User creates PR from Stage to main, team reviews, approves, merges

**Rationale**:

- User validates each phase (gate checks)
- Team validates each stage (PR review)
- Main branch protected from accidents
- Collaboration encouraged at stage boundaries

**PR Template** (for Stage → main):

```markdown
## Stage X Complete

**Summary**: [Brief description]

**Phases Completed**:
- [x] Phase 1: [Name]
- [x] Phase 2: [Name]
...

**Validation Evidence**:
- [x] All gate checks passed
- [x] User testing completed
- [x] Documentation updated

**Breaking Changes**: [None | List]

**Next Steps**: [Stage Y begins]
```

**Date**: 2026-01-31  
**Stakeholders**: User, Collaborators

---

## Decision Review Schedule

This decision log should be reviewed:

- **After each Stage completion**: Validate decisions, update if patterns changed
- **Before starting new Stage**: Reference prior decisions to maintain consistency
- **When issues arise**: Check if decision needs revisiting

---

## Appendix: Decision Template

```markdown
### DP-X.Y: Decision Title

**Context**  
[What situation led to this decision being needed?]

**Problem Statement**  
[What specific question needs answering?]

**Options Considered**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | ... | ... | ... |
| **B** | ... | ... | ... |

**Decision**  
**Option [X]: [Short description]**

**Rationale**
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**Implementation**
[Technical details, code samples, or file paths affected]

**Alternatives Rejected**
- ❌ Option [Y]: [Why rejected]

**Date**: YYYY-MM-DD  
**Stakeholders**: [Who was involved in decision]
**Status**: [Active | Deprecated | Superseded]
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Maintainer**: Narada LMS Team
