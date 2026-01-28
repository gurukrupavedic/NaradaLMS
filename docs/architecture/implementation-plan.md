# 📋 Narada LMS: Re-Platforming Implementation Plan

**Reference:** [Architecture Strategy](../architecture-replatforming-strategy.md)
**Objective:** Execute the transition to Monorepo Micro-services ("Golden Path").

---

## 📅 Phased Execution Roadmap

### Phase 1: Foundation & Monorepo Setup (Week 1)

**Goal:** Establish the Turborepo structure and extract shared code without breaking the existing app.

- [ ] **1.1 Initialize Turborepo**
  - [ ] Install `turbo` and setup workspace root `package.json`.
  - [ ] Configure `pnpm-workspace.yaml`.
  - [ ] Move existing `client`, `server`, `shared` into `apps/temp-legacy` (to keep reference).

- [ ] **1.2 Extract `packages/types`**
  - [ ] Create `packages/types` workspace.
  - [ ] Move all Zod schemas from `shared` to this package.
  - [ ] Move global TS interfaces to this package.
  - [ ] Publish internal package `@narada/types`.

- [ ] **1.3 Extract `packages/database`**
  - [ ] Create `packages/database` workspace.
  - [ ] Move Drizzle Config, Schema definitions, and DB connection logic here.
  - [ ] Ensure migrations can run from this package.
  - [ ] Publish internal package `@narada/database`.

- [ ] **1.4 Extract `packages/ui` (Gayatri vNext)**
  - [ ] Create `packages/ui` workspace.
  - [ ] Setup Tailwind + PostCSS config in this package.
  - [ ] Move core atoms (Button, Card, Input) from legacy client.
  - [ ] Set up "Theme Provider" dummy context (prep for Chameleon mode).
  - [ ] Publish internal package `@narada/ui`.

---

### Phase 2: Backend Transformation (Week 2)

**Goal:** Create the standalone API service with multi-tenancy awareness.

- [ ] **2.1 Initialize `apps/api`**
  - [ ] Setup Express + TypeScript project.
  - [ ] Install dependencies (`express`, `cors`, `@narada/database`, `@narada/types`).

- [ ] **2.2 Implement Multi-Tenancy (The Gatekeeper)**
  - [ ] Add `organization_id` column to `users`, `courses`, `batches` tables (migration in `packages/database`).
  - [ ] Create `OrganizationGuard` middleware.
    - [ ] Read `x-org-id` header.
    - [ ] Validate against allowed list (`slmts`, `rr`).
    - [ ] Mount to `req.ctx`.

- [ ] **2.3 Port & Refactor Endpoints**
  - [ ] Move controller logic from legacy server to `apps/api`.
  - [ ] **CRITICAL:** Find and Replace all DB queries to include `where(eq(schema.table.orgId, req.ctx.orgId))`.
  - [ ] Verify Authentication (adjust JWT/Session to work across subdomains if needed).

---

### Phase 3: Frontend Splitting (Weeks 3-4)

**Goal:** Create distinct Student and Admin portals using the shared packages.

- [ ] **3.1 Initialize `apps/student-portal`**
  - [ ] Setup Next.js (or Vite) project.
  - [ ] Link `@narada/ui`, `@narada/types`.

- [ ] **3.2 Implement "Chameleon" Config**
  - [ ] Create `ConfigContext`.
  - [ ] Implement `public/env.js` loader in `_document.tsx` (Next.js) or `index.html` (Vite).
  - [ ] Setup Tailwind to read colors from CSS variables injected by Config.

- [ ] **3.3 Port Student Features**
  - [ ] Port "Curriculum View", "Tests", "Profile" pages.
  - [ ] Ensure all API calls verify the endpoint using the Config's Org ID.

- [ ] **3.4 Initialize `apps/admin-portal`**
  - [ ] Setup Next.js project (Desktop optimized).
  - [ ] Port all "Admin", "Instructor", "Content Manager" pages here.
  - [ ] **Refinement:** Unify the navigation to support the consolidated personas.

---

### Phase 4: Infrastructure & Cleanup (Week 5)

**Goal:** Dockerize and Verify.

- [ ] **4.1 Docker Strategy**
  - [ ] Create `Dockerfile` for `apps/api`.
  - [ ] Create `Dockerfile` for `apps/student-portal` (The Chameleon Build).
  - [ ] Create `docker-entrypoint.sh` script to generate `env.js` at runtime.

- [ ] **4.2 CI/CD Pipeline**
  - [ ] Setup GitHub Actions with `turbo build`.
  - [ ] Implement caching to prevent rebuilding unchanged apps.

- [ ] **4.3 Verification**
  - [ ] **Testing:** Run "Cross-Pollination" tests (SLMTS user trying to access RR data).
  - [ ] **Audit:** Decommission `apps/temp-legacy`.

---

## 🛠️ Developer Workflow (Post-Migration)

### starting the project

```bash
# Start everything in dev mode
pnpm dev

# Start only student portal
pnpm dev --filter=student-portal
```

### Making Changes

1. **Modify UI:** Update `packages/ui` -> Changes reflect in both apps instantly.
2. **Modify DB:** Update `packages/database` -> Run migration -> Update `apps/api`.
