# Stage 1: Structural Split - Final Execution Plan

**Version**: 3.0 (Security-Hardened)  
**Date**: 2026-01-31  
**Status**: ✅ Approved - Ready to Execute  
**Timeline**: 24-28 hours over 4-5 days

---

## Overview

This plan integrates findings from **6 specialist reviews** (Frontend, Backend, Database, CI/CD, Project Planner, Security Auditor) to execute a **zero-regression structural split** with **security-first architecture**.

**Key Changes**:

- JWT → HttpOnly cookies (prevents XSS)
- CSRF protection implemented
- Turborepo with complete CI/CD pipeline
- Docker from Day 1
- Tiptap adapter layer for safe migration
- All 27 critical findings addressed

---

## Git Branching Strategy

### Branch Structure

```
main (baseline-stage-0)
└─ stage-1-structural-split
   ├─ stage-1-phase-0-foundation
   ├─ stage-1-phase-1-student-portal
   ├─ stage-1-phase-2-ops-portal
   ├─ stage-1-phase-3-api-extraction
   └─ stage-1-phase-4-documentation
```

### Workflow Per Phase

```bash
# Start Phase N
git checkout stage-1-structural-split
git checkout -b stage-1-phase-N-name
# ... make changes ...
git add .
git commit -m "feat(phase-N): description"

# Merge back to parent
git checkout stage-1-structural-split
git merge stage-1-phase-N-name
git branch -d stage-1-phase-N-name

# Request user validation before next phase
```

### 🔴 CRITICAL: Final Merge Policy

- **DO NOT merge `stage-1-structural-split` into `main` automatically**
- Each phase requires user validation approval
- Final merge to `main` only after **explicit user command**

---

## Phase 0: Foundation + Security (7.75h)

**Branch**: `stage-1-phase-0-foundation`  
**Goal**: Production-grade monorepo with security-first architecture

### Part A: Security Hardening (2.5h)

#### 1. JWT Migration to HttpOnly Cookies (2h)

**Backend Changes**:

```typescript
// apps/api/src/routes/identity.routes.ts
router.post('/api/auth/login', async (req, res) => {
  const user = await authenticateUser(req.body);
  const token = generateJWT(user);
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  
  res.json({ user });
});

// Update middleware
export const jwtAuth = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyJWT(token);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```

**Frontend Changes**:

- Remove ALL `localStorage.getItem('jwt_token')`
- Remove ALL `Authorization: Bearer ${token}` headers
- Add `credentials: 'include'` to all fetch calls

#### 2. CSRF Protection (30m)

```bash
npm install csurf cookie-parser
```

```typescript
// apps/api/src/index.ts
import csrf from 'csurf';
app.use(csrf({ cookie: { httpOnly: true, secure: true } }));

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// packages/ui/src/lib/apiClient.ts
export async function apiRequest(endpoint, options = {}) {
  const csrfToken = await getCsrfToken();
  return fetch(`/api${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken,
      ...options.headers,
    },
  });
}
```

### Part B: Infrastructure (2.5h)

#### 3. Turborepo Pipeline (45m)

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build", "check"],
      "outputs": ["dist/**", ".next/**"]
    },
    "check": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

#### 4. Environment Management (30m)

```bash
npm install dotenv-cli --save-dev

# Root .env
DATABASE_URL=postgresql://localhost:5432/naradalms
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# apps/api/package.json
{
  "scripts": {
    "dev": "dotenv -e ../../.env -e .env.local -- tsx watch src/index.ts"
  }
}
```

#### 5. Secret Protection (15m)

```bash
# .gitignore
.env
.env.local
.env.production
**/.env
!.env.example

# .git/hooks/pre-commit
if git diff --cached --name-only | grep -E '\.env$'; then
  echo "ERROR: Attempting to commit .env file"
  exit 1
fi
chmod +x .git/hooks/pre-commit
```

#### 6. CORS Validation (30m)

```typescript
// apps/api/src/config.ts
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS required in production');
}

// apps/api/src/index.ts
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400,
}));
```

#### 7. Database Protection (15m)

```typescript
// packages/database/src/client.ts
if (process.env.APP_TYPE !== 'api') {
  throw new Error('Direct database access only allowed in API');
}

// packages/database/src/version.ts
export const SCHEMA_VERSION = '1.0.0';
```

#### 8. Docker Setup (1h)

Create Dockerfiles for all 3 apps + docker-compose.yml (see full plan for details).

### Part C: Codebase Sanitation (Audit Findings) (1.5h)

#### 9. Legacy Cleanup (30m)

- Remove `session-file-store`, `express-session` dependencies.
- Audit `mediaRouter`, `batchRouter`, `studentRouter` for flat routing issues.
- Consolidate legacy middleware.

#### 10. Configuration & Storage (1h)

- Centralize all env vars in `server/config.ts`.
- Implement startup validation for `JWT_SECRET`.
- Create `StorageService` interface to abstract `uploads/` logic (pre-req for Ops Portal).

### Part D: Package Setup (30m)

Initialize `@narada/database`, `@narada/types`, `@narada/ui` stub packages.

### Validation Checklist

- [ ] `document.cookie` doesn't show `auth_token`
- [ ] POST without CSRF token → 403
- [ ] `git add .env` → pre-commit error
- [ ] CORS blocks `http://evil.com`
- [ ] `npx turbo run check` passes
- [ ] Portal importing `@narada/database` → throws error
- [ ] `docker-compose up` starts all services
- [ ] Can login (receive cookie)

---

## Phase 1: Student Portal (6.5h)

**Branch**: `stage-1-phase-1-student-portal`  
**Goal**: Next.js portal on :3000, dual-boot with monolith

### Pre-Work (3h)

#### 1. Tiptap Dependency Audit (1h)

```bash
grep -r "useRouter\|useQuery" client/src/components/ui/tiptap-editor/
```

Document all dependencies in `tiptap-dependencies.md`.

#### 2. Tiptap Adapter Layer (1.5h)

```typescript
// packages/ui/src/tiptap-editor/TiptapProvider.tsx
export function TiptapProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 3. File Mapping (30m)

```bash
npx madge --circular --extensions ts,tsx client/src
```

Create `unmapped-files.md` with ALL files classified.

### Implementation (3.5h)

- Create Next.js 15 app in `apps/student-portal`
- Extract student routes
- Move UI components to `packages/ui`
- Update all routes to use `apiRequest` helper

### Validation

- [ ] Student portal runs on :3000
- [ ] Monolith still runs on :5000
- [ ] Login works (both email & OAuth)
- [ ] AuthPage visually identical
- [ ] Tiptap renders content
- [ ] No console errors

---

## Phase 2: Ops Portal (4.5h)

**Branch**: `stage-1-phase-2-ops-portal`  
**Goal**: Ops portal on :3001 for admin/instructor/content

### Pre-Work (2h)

#### 1. AuthPage Refactor (30m)

```typescript
// packages/ui/src/pages/AuthPage.tsx
interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}
```

#### 2. File Upload Validation (1h)

```typescript
// apps/api/src/middleware/file-validation.ts
export async function validateAudioUpload(req, res, next) {
  // Magic byte validation
  // Metadata parsing
  // Filename sanitization
}
```

### Implementation (2.5h)

- Create Next.js app in `apps/ops-portal`
- Extract admin/content routes
- Configure AuthPage with ops redirect
- Test file uploads

### Validation

- [ ] Ops portal runs on :3001
- [ ] Both portals + monolith run together
- [ ] Tiptap editor allows editing
- [ ] 30MB audio upload succeeds
- [ ] AuthPage redirects correctly

---

## Phase 3: API Extraction (4h)

**Branch**: `stage-1-phase-3-api-extraction`  
**Goal**: Standalone API, remove Vite, delete monolith

### Pre-Work (1.5h)

#### 1. WebSocket Authentication (1h)

```typescript
// apps/api/src/websocket.ts
const wss = new WebSocketServer({
  verifyClient: (info, callback) => {
    const cookies = parseCookie(info.req.headers.cookie);
    const token = cookies.auth_token;
    if (verifyJWT(token)) callback(true);
    else callback(false, 403);
  },
});
```

#### 2. Security Headers (30m)

```bash
npm install helmet
```

```typescript
app.use(helmet({ /* config */ }));
```

### Implementation (2.5h)

- Extract Express routes to `apps/api`
- Remove Vite frontend
- Delete `client/`, `server/`, `shared/`
- Verify both portals connect to API

### Validation

- [ ] API runs on :5000 without frontend
- [ ] Both portals connect successfully
- [ ] WebSocket works
- [ ] Security headers present
- [ ] Health check returns all green

---

## Phase 4: Documentation (2.5h)

**Branch**: `stage-1-phase-4-documentation`  
**Goal**: Comprehensive migration docs

Create:

- `docs/stage-1-migration-guide.md`
- `docs/security/authentication-flow.md`
- `docs/deployment/stage-1-deploy.md`
- `docs/troubleshooting.md`
- Update `README.md`

---

## Final Merge (User Approval Required)

After ALL phases complete and validate:

```bash
# STOP - Request user approval first
git checkout main
git merge stage-1-structural-split
git tag baseline-stage-1
git push origin main --tags
```

**User must explicitly approve this merge.**

---

## Rollback Procedures

### Phase-Level Rollback

```bash
git checkout stage-1-structural-split
git reset --hard HEAD~1
```

### Emergency Rollback

```bash
git checkout baseline-stage-0
npm install
npm run dev
```

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0 | 7.75h | 7.75h |
| Phase 1 | 6.5h | 14.25h |
| Phase 2 | 4.5h | 18.75h |
| Phase 3 | 4h | 22.75h |
| Phase 4 | 2.5h | 25.25h |

**With 20% buffer**: 30 hours = **4-5 working days**

---

## Ready to Execute

✅ All 27 findings integrated  
✅ Branching strategy defined  
✅ Validation checklists prepared  
✅ Rollback procedures documented  

**Start Phase 0 when ready.**
