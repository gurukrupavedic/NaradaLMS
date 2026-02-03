# 🏗️ Stage 1: Structural Split - Detailed Implementation Plan

**Based on:** `stage-1-execution-plan.md` v3.0  
**Incorporating:** `stage-1-tech-council-review.md` findings

---

## 🛑 Critical Constraints

1. **Zero Regression:** The current monolith must remain functional throughout Phases 1 & 2.
2. **No Schema Changes:** We utilize the *existing* database schema. Multitenancy (`organization_id`) is deferred to Stage 2.
3. **Security First:** `HttpOnly` cookies are non-negotiable.

---

## Phase 0: Foundation & Security (8h) - [COMPLETED]

### 0.1 Infrastructure Setup

- [x] **Initialize Turborepo**
  - [x] Run `npx turbo@latest init` (skip install, manual setup)
  - [x] Create `turbo.json` with pipeline config (build, dev, check, lint, test).
  - [x] Configure `package.json` workspaces: `["apps/*", "packages/*"]`.
- [x] **Shared Configuration Packages** (Tech Council Req #1)
  - [x] Create `packages/tailwind-config/tailwind.config.ts`.
  - [x] Create `packages/eslint-config/api.js`, `react.js`, `next.js`.
  - [x] Create `packages/typescript-config/base.json`, `nextjs.json`.

### 0.2 Security Hardening

- [x] **Environment Management**
  - [x] Install `dotenv-cli` in root.
  - [x] Add `.env.example` filtering to `.gitignore`.
  - [x] Add pre-commit hook to block `.env` commits.
- [x] **Legacy Frontend Patch** (Tech Council Req #2)
  - [x] Modify `client/src/api/axios.ts` (or equivalent) to set `withCredentials: true`.
  - [x] Verify existing Express backend can handle this before strictly enforcing it.
- [x] **CORS & Helmets**
  - [x] Add `helmet` to Express server (`server/src/app.ts`).
  - [x] Configure `cors` middleware with strictly typed origin list from `process.env.ALLOWED_ORIGINS`.

### 0.3 Docker Baseline

- [x] **Base Dockerfile**
  - [x] Create `Dockerfile.base` for Node 20 + Turborepo global install.
  - [x] Setup `docker-compose.yml` for local dev (Postgres, Redis).

### 📝 Verification: Phase 0

- [x] Run `npx turbo build` -> Success.
- [x] Run `docker-compose up` -> DB functional.
- [x] Legacy App: Login -> Check Network Tab -> Cookie received? (Even if not HttpOnly yet, ensure flow works).

---

## Phase 1: Student Portal (Next.js 15) (7h) - [COMPLETED]

### 1.1 App Initialization

- [x] **Scaffold App**
  - [x] `npx create-next-app@latest apps/student-portal --typescript --tailwind --eslint`.
  - [x] Update `tailwind.config.ts` to extend `packages/tailwind-config`.
  - [x] Update `tsconfig.json` to extend `packages/typescript-config`.
- [x] **Package Consumption**
  - [x] Move generic UI components (Button, Input, Slider, Tabs, Dropdown) to `packages/ui` (Updated to include all required components).
  - [x] Update `apps/student-portal` to consume `@narada/ui`.

### 1.2 Tiptap Wrapper (The Adapter)

- [x] **Extract Logic**
  - [x] Copy `client/src/components/ui/tiptap-editor` to `packages/ui/src/editor`.
- [x] **Create Adapter**
  - [x] Create `packages/ui/src/editor/TiptapProvider.tsx`.
  - [x] Mock/Wrap `useQuery` and `useRouter` contexts that the legacy component expects.

### 1.3 Feature Port (Student)

- [x] **Routes:** `/dashboard`, `/courses`, `/learning` (Chapter workflow verified).
- [x] **API Proxy:**
  - [x] Create `apps/student-portal/src/lib/api.ts`.
  - [x] Point to `http://localhost:5000` (Legacy API) for data.
  - [x] Ensure `Cookie` header is passed in server-side requests.
- [x] **Type Migration:**
  - [x] Migrated Text Segmentation types and shared utilities to `@narada/types` and `apps/student-portal/lib`.

### 📝 Verification: Phase 1

- [x] `http://localhost:3000` loads Student Portal.
- [x] Login redirects to Dashboard.
- [x] Course usage fetches data from Monolith API (:5000).
- [x] Audio Player and Text Selection work in Chapter view.

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
