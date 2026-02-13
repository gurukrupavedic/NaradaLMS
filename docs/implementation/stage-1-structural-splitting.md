# Stage 1: Structural Split - Consolidated Master Plan

**Version**: 4.0 (Consolidated)
**Status**: In Progress (Phase 0 & 1 Complete)
**Date**: 2026-02-12

---

## 1. Overview

**Goal**: Migrate from modular monolith to 3-container monorepo (Student Portal, Ops Portal, API) with **ZERO logic/UI changes** and **Zero Regression**.
**Core Principle**: Pure refactoring. Reorganizing folders without changing functionality.
**Architecture**:

- **Monorepo**: Turborepo
- **Apps**:
  - `apps/student-portal` (Next.js 15, Port 3000)
  - `apps/ops-portal` (Next.js 15, Port 3001)
  - `apps/api` (Express, Port 5000 - extracted from monolith)
- **Packages**:
  - `@narada/ui` (Shared components, Tiptap editor)
  - `@narada/database` (Drizzle ORM, Schema)
  - `@narada/types` (Shared TS types)
  - `@narada/tailwind-config` & `@narada/eslint-config`

---

## 2. Git Strategy

**Branching**:

- Main Branch: `main` (Tag: `baseline-post-stage-0`)
- Working Branch: `stage-1-structural-split`
- Phase Branches: `stage-1-phase-N-name`

**Merge Policy**:

- **DO NOT** merge `stage-1-structural-split` to `main` until ALL phases are complete.
- Each phase is merged into `stage-1-structural-split` after validation.

**Rollback**:

- Phase Level: `git reset --hard HEAD~1` on working branch.
- Emergency: Revert to `baseline-stage-0` tag.

---

## 3. Phase 0: Foundation & Security [COMPLETED]

**Objective**: Production-grade monorepo setup with security hardening.

### 3.1 Infrastructure

- [x] **Turborepo**: Initialized with `build`, `dev`, `check`, `lint` pipelines.
- [x] **Workspaces**: Configured `apps/*` and `packages/*`.
- [x] **Shared Configs**: Created `@narada/tailwind-config`, `@narada/eslint-config`, `@narada/typescript-config`.

### 3.2 Security Hardening

- [x] **Environment**: Installed `dotenv-cli`, blocked `.env` commits.
- [x] **Legacy Patch**: Updated legacy client to support `withCredentials: true`.
- [x] **CORS & Helmets**: Configured strict CORS with `process.env.ALLOWED_ORIGINS` and added Helmet.
- [x] **Docker**: Created `Dockerfile.base` and `docker-compose.yml`.

---

## 4. Phase 1: Student Portal (Next.js 15) [COMPLETED]

**Objective**: Port Student views to Next.js app running on port 3000 alongside monolith.

### 4.1 Architecture & Packages

- [x] **Scaffold**: Created `apps/student-portal`.
- [x] **@narada/ui**:
  - Extracted 41 primitive UI components (Button, Input, etc.).
  - **Tiptap Adapter**: Created `TiptapProvider.tsx` to wrap the legacy editor and mock `useQuery`/`useRouter` contexts.
  - Moved shared layouts (`AppLayout`, `AppSidebar`) and pages (`AuthPage`).
- [x] **@narada/types**: Migrated shared types and constants.

### 4.2 Feature Porting

- [x] **Routes Ported**: `/dashboard`, `/courses`, `/learning` (Chapter view).
- [x] **Data Fetching**: implemented API proxy pointing to `http://localhost:5000`.
- [x] **Verification**:
  - Login redirects correctly.
  - Legacy API serves data via proxy.
  - Audio Player and Text Selection operational.

---

## 5. Phase 2: Ops Portal (Next.js 15) [PENDING]

**Objective**: Port Admin, Instructor, and Content Manager views to Next.js app on port 3001.

### 5.1 Initialization

- [ ] **Scaffold**: `npx create-next-app@latest apps/ops-portal`.
- [ ] **Configuration**: Extend shared Tailwind, ESLint, and TS configs.
  - *Note*: Verify `use client` strategy for complex admin pages.

### 5.2 Feature Porting

- [ ] **Routes to Port**:
  - `/admin` (User Management, Audit Logs)
  - `/instructor` (Batch Management)
  - `/content` (Curriculum, Segmentation)
- [ ] **File Uploads**: Implement and test `validateAudioUpload` middleware (30MB limit).
- [ ] **Auth**: Configure `AuthPage` to redirect to Ops dashboard.

### 5.3 Verification

- [ ] Ops Portal loads on `http://localhost:3001`.
- [ ] Admin Dashboard fetches data from Monolith API.
- [ ] File uploads work successfully.

---

## 6. Phase 3: API Extraction [PENDING]

**Objective**: Isolate the Express backend and remove the legacy frontend.

### 6.1 Separation

- [ ] **Extract Express**: Move `server/` content to `apps/api/`.
- [ ] **Dependencies**: Update `apps/api/package.json` to include all root dependencies.
- [ ] **Standalone Run**: Verify `turbo run dev --filter=api` works.

### 6.2 Cleanup

- [ ] **Delete Legacy**: Remove `client/` and `server/` folders from root.
- [ ] **Database**: Update `drizzle.config.ts` paths.

### 6.3 Security Finalization

- [ ] **CSP**: Update Helmet to allow Tiptap scripts (verify `unsafe-inline` necessity).
- [ ] **Cookies**: Enforce `HttpOnly` cookie requirement on API.
- [ ] **WebSockets**: Verify WS authentication with new cookie structure.

### 6.4 Verification

- [ ] `http://localhost:5000` serves API only (no static frontend).
- [ ] Student and Ops portals connect to extracted API.
- [ ] CSRF protection verified.

---

## 7. Component Mapping Reference

### 7.1 Component Destination Rubric

| Component Type | Source Location | Destination | Notes |
|----------------|-----------------|-------------|-------|
| **UI Primitives** | `client/src/components/ui/` | `packages/ui/src/components/` | All 41 components (Button, Card, etc.) |
| **Tiptap Editor** | `client/src/components/ui/tiptap-editor/` | `packages/ui/src/tiptap-editor/` | Wrapped in `TiptapProvider` |
| **Shared Pages** | `client/src/features/shared/` | `packages/ui/src/pages/` | `AuthPage.tsx` |
| **Shared Layouts** | `client/src/components/layout/` | `packages/ui/src/layouts/` | `AppLayout`, `AppSidebar` |
| **Hooks** | `client/src/.../hooks/` | `packages/ui/src/hooks/` | `useAuth`, `use-toast` |

### 7.2 Portal-Specific Pages

| Portal | Source Path | New Path |
|--------|-------------|----------|
| **Student** | `features/learning/pages/LearningDashboardPage` | `apps/student-portal/app/dashboard/page.tsx` |
| **Student** | `features/learning/pages/LearnChapterPage` | `apps/student-portal/app/learn/[chapterId]/page.tsx` |
| **Ops** | `features/admin/pages/UserManagementPage` | `apps/ops-portal/app/users/page.tsx` |
| **Ops** | `features/curriculum/pages/TrackManagementPage` | `apps/ops-portal/app/curriculum/tracks/page.tsx` |
| **Ops** | `features/content-manager/pages/SegmentationPage` | `apps/ops-portal/app/content/segmentation/page.tsx` |

---

## 8. Technical Decisions & Constraints

1. **Zero Regression**: Monolith must remain functional until Phase 3.
2. **No Schema Changes**: Database schema changes are deferred to Stage 2.
3. **Security**:
    - `HttpOnly` cookies for auth.
    - Strict CORS.
    - Environment variables injected at runtime (Docker).
4. **Tiptap Strategy**:
    - Use `TiptapProvider` to bridge legacy context dependencies.
    - Student Portal: Read-only mode.
    - Ops Portal: Full editing mode.

---

## 9. Final Verification Checklist

- [ ] **Docker**: Run `turbo prune --scope=student-portal --docker` to verify build optimization.
- [ ] **E2E Flow**:
    1. Login as Admin (Ops Portal).
    2. Upload Content.
    3. Login as Student (Student Portal).
    4. View Content.
- [ ] **Security Scan**: Verify no exposed secrets or weak CORS configurations.
