# 🏗️ Stage 1: Structural Split - Detailed Implementation Plan

**Based on:** `stage-1-execution-plan.md` v3.0  
**Incorporating:** `stage-1-tech-council-review.md` findings

---

## 🛑 Critical Constraints

1. **Zero Regression:** The current monolith must remain functional throughout Phases 1 & 2.
2. **No Schema Changes:** We utilize the *existing* database schema. Multitenancy (`organization_id`) is deferred to Stage 2.
3. **Security First:** `HttpOnly` cookies are non-negotiable.

---

## Phase 0: Foundation & Security (8h)

### 0.1 Infrastructure Setup

- [ ] **Initialize Turborepo**
  - [ ] Run `npx turbo@latest init` (skip install, manual setup)
  - [ ] Create `turbo.json` with pipeline config (build, dev, check, lint, test).
  - [ ] Configure `package.json` workspaces: `["apps/*", "packages/*"]`.
- [ ] **Shared Configuration Packages** (Tech Council Req #1)
  - [ ] Create `packages/tailwind-config/tailwind.config.ts`.
  - [ ] Create `packages/eslint-config/api.js`, `react.js`, `next.js`.
  - [ ] Create `packages/typescript-config/base.json`, `nextjs.json`.

### 0.2 Security Hardening

- [ ] **Environment Management**
  - [ ] Install `dotenv-cli` in root.
  - [ ] Add `.env.example` filtering to `.gitignore`.
  - [ ] Add pre-commit hook to block `.env` commits.
- [ ] **Legacy Frontend Patch** (Tech Council Req #2)
  - [ ] Modify `client/src/api/axios.ts` (or equivalent) to set `withCredentials: true`.
  - [ ] Verify existing Express backend can handle this before strictly enforcing it.
- [ ] **CORS & Helmets**
  - [ ] Add `helmet` to Express server (`server/src/app.ts`).
  - [ ] Configure `cors` middleware with strictly typed origin list from `process.env.ALLOWED_ORIGINS`.

### 0.3 Docker Baseline

- [ ] **Base Dockerfile**
  - [ ] Create `Dockerfile.base` for Node 20 + Turborepo global install.
  - [ ] Setup `docker-compose.yml` for local dev (Postgres, Redis).

### 📝 Verification: Phase 0

- [ ] Run `npx turbo build` -> Success.
- [ ] Run `docker-compose up` -> DB functional.
- [ ] Legacy App: Login -> Check Network Tab -> Cookie received? (Even if not HttpOnly yet, ensure flow works).

---

## Phase 1: Student Portal (Next.js 15) (7h)

### 1.1 App Initialization

- [ ] **Scaffold App**
  - [ ] `npx create-next-app@latest apps/student-portal --typescript --tailwind --eslint`.
  - [ ] Update `tailwind.config.ts` to extend `packages/tailwind-config`.
  - [ ] Update `tsconfig.json` to extend `packages/typescript-config`.
- [ ] **Package Consumption**
  - [ ] Move generic UI components (Button, Input) to `packages/ui`.
  - [ ] Update `apps/student-portal` to consume `@narada/ui`.

### 1.2 Tiptap Wrapper (The Adapter)

- [ ] **Extract Logic**
  - [ ] Copy `client/src/components/ui/tiptap-editor` to `packages/ui/src/editor`.
- [ ] **Create Adapter**
  - [ ] Create `packages/ui/src/editor/TiptapProvider.tsx`.
  - [ ] Mock/Wrap `useQuery` and `useRouter` contexts that the legacy component expects.

### 1.3 Feature Port (Student)

- [ ] **Routes:** `/dashboard`, `/courses`, `/learning`.
- [ ] **API Proxy:**
  - [ ] Create `apps/student-portal/src/lib/api.ts`.
  - [ ] Point to `http://localhost:5000` (Legacy API) for data.
  - [ ] Ensure `Cookie` header is passed in server-side requests.

### 📝 Verification: Phase 1

- [ ] `http://localhost:3000` loads Student Portal.
- [ ] Login redirects to Dashboard.
- [ ] Course usage fetches data from Monolith API (:5000).

---

## Phase 2: Ops Portal (Next.js 15) (5h)

### 2.1 App Initialization

- [ ] **Scaffold App**
  - [ ] `npx create-next-app@latest apps/ops-portal`.
  - [ ] Extend shared configs.
  - [ ] Force `use client` in root layout if migration complexity is high (Tech Council Note).

### 2.2 Feature Port (Admin/Instructor)

- [ ] **Routes:** `/admin`, `/instructor`, `/content`.
- [ ] **File Uploads**
  - [ ] Implement `validateAudioUpload` middleware in Monolith API.
  - [ ] Test upload flow from Ops Portal.

### 📝 Verification: Phase 2

- [ ] `http://localhost:3001` loads Ops Portal.
- [ ] Admin Dashboard renders data from Monolith API.
- [ ] File Upload (30MB) works.

---

## Phase 3: API Extraction (4h)

### 3.1 Separation

- [ ] **Extract Express App**
  - [ ] Move `server/` content to `apps/api/`.
  - [ ] Update `apps/api/package.json` with dependencies from root.
  - [ ] Ensure `apps/api` can start independently (`turbo run dev --filter=api`).

### 3.2 Cleanup

- [ ] **Delete Legacy**
  - [ ] Delete `client/` folder.
  - [ ] Delete `server/` folder (since it moved).
  - [ ] Update `drizzle.config.ts` path (now likely in `packages/database` or `apps/api`).

### 3.3 Security Finalization

- [ ] **CSP Config:** Update Helmet config to allow Tiptap scripts (`unsafe-inline` if necessary).
- [ ] **Cookie Enforcement:** Switch API to *require* `HttpOnly` cookie.

### 📝 Verification: Phase 3

- [ ] `http://localhost:5000` serves API only (no static frontend).
- [ ] `apps/student-portal` still works.
- [ ] `apps/ops-portal` still works.
- [ ] CSRF attack on API endpoint fails.

---

## Phase 4: Migration & Documentation (2.5h)

### 4.1 Documentation

- [ ] Create `docs/stage-1-migration-guide.md`.
- [ ] Update `README.md` with new `turbo` commands.

### 4.2 Final Verification

- [ ] Run `turbo prune --scope=student-portal --docker` to verify Docker optimization (Tech Council Req #3).
- [ ] Full E2E check: Login as Admin -> Upload Content -> Login as Student -> View Content.

---

## 📅 Execution Order

1. **Phase 0:** Tonight/Tomorrow Morning.
2. **Phase 1:** Day 2.
3. **Phase 2:** Day 3.
4. **Phase 3:** Day 4.
5. **Phase 4 & Merge:** Day 5.
