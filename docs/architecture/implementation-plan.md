# 📋 Narada LMS: Parallel Implementation Plan

**Reference:** [Architecture Strategy](../architecture-replatforming-strategy.md) | [Codebase Analysis](./codebase-analysis.md)

This plan models the re-platforming as four parallel tracks to optimize execution velocity.

---

## 🏗️ Stream 1: Infrastructure & Shared Core (Track A)

**Goal:** Establish the foundation for all other tracks.
*Expected Duration: Week 1*

- [ ] **A.1 Monorepo Initialization**
  - [ ] Setup **Turborepo** + **pnpm** workspace in the root.
  - [ ] Configure `pnpm-workspace.yaml`.
- [ ] **A.2 Package Extraction**
  - [ ] **`packages/types`**: Extract Zod schemas/TS interfaces.
  - [ ] **`packages/database`**: Extract Drizzle schema + migration logic.
  - [ ] **`packages/utils`**: Extract shared helper functions.
- [ ] **A.3 Base Docker Configuration**
  - [ ] Define base multi-stage Dockerfiles for Node/Next environments.

---

## ⚙️ Stream 2: Backend & Security (Track B)

**Goal:** Deliver the standalone API with multi-tenancy and JWT Auth.
*Expected Duration: Week 1-2 (Starts after A.2)*

- [ ] **B.1 App Setup: `apps/api`**
  - [ ] Initialize Express service linked to `@narada/database` and `@narada/types`.
- [ ] **B.2 Identity & Security Rewrite**
  - [ ] Replace Session Auth with **JWT** (Access/Refresh pattern).
  - [ ] Implement strict **CORS whitelist middleware** via environment injection.
- [ ] **B.3 The Gatekeeper (Multi-Tenancy)**
  - [ ] Deploy `organization_id` column migration.
  - [ ] Implement `OrganizationGuard` to lock all requests to the tenant context.
- [ ] **B.4 Route Migration**
  - [ ] Port controllers and logic from `server/routes` and `server/modules`.

---

## 🎨 Stream 3: UI & Student Experience (Track C)

**Goal:** Extract the Design System and launch the "Chameleon" Student Portal.
*Expected Duration: Week 2-3 (Starts after A.2)*

- [ ] **C.1 Package Extraction: `packages/ui`**
  - [ ] Move **Gayatri DS** components (Shadcn/UI base).
  - [ ] Implement CSS Variable-based semantic token system.
- [ ] **C.2 App Setup: `apps/student-portal`**
  - [ ] Initialize Next.js app linked to `@narada/ui` and `@narada/types`.
- [ ] **C.3 Chameleon Engine**
  - [ ] Implement **Runtime Environment Injection** (`env.js` pattern).
  - [ ] Implement Theme/Branding switcher based on local environment.
- [ ] **C.4 Port Student Features**
  - [ ] Port Curriculum, Learning, and Profile features.

---

## 🏢 Stream 4: Admin & Management (Track D)

**Goal:** Consolidate Admin, instructor, and Content Manager personas into one portal.
*Expected Duration: Week 3-4 (Starts after C.1)*

- [ ] **D.1 App Setup: `apps/admin-portal`**
  - [ ] Initialize Next.js app optimized for desktop productivity.
- [ ] **D.2 Persona Consolidation**
  - [ ] Integrate features from `admin`, `instructor`, `batches`, and `content` folders.
  - [ ] Unify navigation and UI patterns for professional operators.
- [ ] **D.3 RBAC Validation**
  - [ ] Ensure the portal treats a "Content Manager" differently than a "Super Admin" via frontend gating.

---

## 🏁 Phase 5: Verification & Integration

- [ ] **V.1 End-to-End Orchestration**
  - [ ] Validate full flow via Docker Compose.
- [ ] **V.2 Data Leak Audit**
  - [ ] Verify Org A cannot access Org B data via the common API.
- [ ] **V.3 Deployment Readiness**
  - [ ] CI/CD pipeline verification including Turborepo remote caching.
