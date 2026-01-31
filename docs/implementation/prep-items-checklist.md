# Architecture Review Prep Items Checklist

**Purpose**: Quick fixes to address before Stage 0 execution  
**Estimated Time**: 1.5 hours (documentation only, no code yet)  
**Status**: In Progress

---

## Prep Item Status

| # | Item | Time | Status | Details |
|---|------|------|--------|---------|
| 1 | React Context Audit | 10 min | ✅ Complete | No Context providers found - using React Query |
| 2 | Routing Migration Strategy | 20 min | 🔄 In Progress | Adding DP-1.11 decision point |
| 3 | Image Optimization Strategy | 15 min | 🔄 In Progress | Adding to Stage 1 docs |
| 4 | CORS Configuration | 15 min | 🔄 In Progress | Adding to Stage 1, Phase 3 |
| 5 | Database Access Boundary | 5 min | 🔄 In Progress | Adding to Stage 1 prerequisites |
| 6 | Health Endpoints | 15 min | 🔄 In Progress | Adding to Stage 1, Phase 3 |
| 7 | Update Effort Estimates | 5 min | 🔄 In Progress | Adding buffer to Stage 0 & 1 |
| 8 | Testing Checklist | 30 min | ⏱️ Pending | JWT migration testing |

---

## 1. React Context Audit ✅

**Finding**: No React Context providers in current codebase  
**Evidence**: Search for `createContext` returned 0 results  
**Conclusion**: `useAuth` uses React Query, not Context  
**Action**: None needed - mark as complete

---

## 2. Routing Migration Strategy (wouter → Next.js App Router)

**Current**: Modular monolith uses `wouter` for client-side routing  
**Target**: Next.js 15 App Router (file-based routing)

**Migration Approach**:

1. **Student Portal Routes**:

   ```
   wouter:               Next.js App Router:
   /dashboard      →    app/dashboard/page.tsx
   /learn/:id      →    app/learn/[id]/page.tsx
   ```

2. **Ops Portal Routes**:

   ```
   wouter:               Next.js App Router:
   /users          →    app/users/page.tsx
   /batches        →    app/batches/page.tsx
   /curriculum     →    app/curriculum/page.tsx
   ```

**No Code Changes Needed**: Routes will be created fresh in Next.js App Router format

**Documentation Update**: Add DP-1.11 to decision log

---

## 3. Image Optimization Strategy

**Issue**: Logos and assets should use Next.js `<Image>` component for optimization

**Approach**:

```typescript
// ❌ Current (assumed in monolith)
<img src="/assets/logo.svg" alt="Logo" />

// ✅ After migration
import Image from 'next/image';

<Image 
  src="/assets/logo.svg" 
  alt="Logo" 
  width={120} 
  height={40}
  priority // For logos above the fold
/>
```

**Where**:

- AuthPage logo
- AppLayout logo
- Favicon

**Documentation Update**: Add to Stage 1, Phase 1 & 2 implementation steps

---

## 4. CORS Configuration

**Issue**: Portals (3000, 3001) calling API (5000) will be blocked by browser CORS policy

**Solution**: Configure Express CORS middleware

```typescript
// apps/api/src/index.ts
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'http://localhost:3000', // Student Portal (dev)
  'http://localhost:3001', // Ops Portal (dev)
  process.env.STUDENT_PORTAL_URL, // Production
  process.env.OPS_PORTAL_URL, // Production
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important: allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Documentation Update**: Add section to Stage 1, Phase 3

---

## 5. Database Access Boundary Rule

**Principle**: **Clear separation of concerns**

**Rule**:

```
✅ API Server (apps/api)
   └─ Imports @narada/database ✅
   └─ Executes SQL queries ✅

❌ Next.js Portals (apps/student-portal, apps/ops-portal)
   └─ NEVER import @narada/database ❌
   └─ NEVER execute direct database queries ❌
   └─ ONLY call API endpoints ✅
```

**Why**:

- 🔒 Single point of data access (easier to secure)
- 🧪 Easier to test (mock API, not database)
- 🚀 Enables horizontal scaling (API handles connectionpooling)
- 🛡️ Prevents accidental data leaks

**Enforcement**:

```json
// apps/student-portal/package.json & apps/ops-portal/package.json
// DO NOT add @narada/database to dependencies!
{
  "dependencies": {
    "@narada/ui": "workspace:*",
    "@narada/types": "workspace:*"
    // ❌ "@narada/database": "workspace:*"  // NEVER ADD THIS
  }
}
```

**Documentation Update**: Add to Stage 1 prerequisites

---

## 6. Health Endpoints

**Purpose**: Monitoring, Docker health checks, load balancers

**API Health Endpoint**:

```typescript
// apps/api/src/index.ts

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api',
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      service: 'api',
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

// Same for apps/ops-portal/app/api/health/route.ts
```

**Testing**:

```bash
curl http://localhost:5000/health  # API
curl http://localhost:3000/api/health  # Student Portal
curl http://localhost:3001/api/health  # Ops Portal
```

**Documentation Update**: Add to Stage 1, Phase 3

---

## 7. Update Effort Estimates

**Add 20-30% Buffer for Realistic Planning**

| Stage | Original Estimate | Updated Estimate | Rationale |
|-------|-------------------|------------------|-----------|
| Stage 0 | 3-4 days | **4-5 days** | JWT migration is exploratory |
| Stage 1 | 3-4 days | **4-5 days** | First portal extraction has unknowns |
| **Total** | **6-8 days** | **8-10 days** | More realistic for hands-on work |

**Documentation Update**: Update Stage 0 & Stage 1 overview sections

---

## 8. Testing Checklist (To Create)

**JWT Migration Testing** (Stage 0, Phase 1):

- [ ] Login with email/password succeeds
- [ ] Login with Google OAuth succeeds  
- [ ] Registration creates account and JWT
- [ ] Protected routes return 401 without token
- [ ] Protected routes return 200 with valid token
- [ ] Token expires after configured time
- [ ] Logout clears token
- [ ] WebSocket connects with JWT token
- [ ] Tiptap collaborative editing works

**API Endpoint Testing** (Stage 0, Phase 3):

- [ ] `/api/auth/login` returns JWT
- [ ] `/api/auth/me` returns user data
- [ ] `/api/learning/tracks` returns tracks
- [ ] `/api/curriculum/chapters/:id` returns chapter

**Portal Testing** (Stage 1, Phases 1-2):

- [ ] Student portal loads on port 3000
- [ ] Ops portal loads on port 3001
- [ ] Both portals can call API on port 5000
- [ ] No CORS errors in browser console
- [ ] Shared components render correctly
- [ ] Tiptap editor displays content

---

## Completion Criteria

All prep items complete when:

- [x] Context audit done (no providers found)
- [ ] Decision points added to decision log
- [ ] Stage 1 docs updated with CORS config
- [ ] Stage 1 docs updated with health endpoints
- [ ] Stage 1 docs updated with image optimization
- [ ] Database access boundary documented
- [ ] Effort estimates updated
- [ ] Testing checklists created

**Remaining Time**: ~1 hour to update documentation

**Next Action**: Update strategy documents
