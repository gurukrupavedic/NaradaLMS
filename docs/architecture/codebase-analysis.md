# 🔍 Codebase Analysis: Narada LMS Re-Platforming

This document provides a granular mapping of the current monolithic codebase to the proposed Monorepo structure.

## 1. Monorepo Component Mapping

| Proposed Component | Source Path | Key Responsibilities |
| :--- | :--- | :--- |
| **`apps/api`** | `server/` | Request handling, Business logic, Auth, CORS. |
| **`apps/student-portal`** | `client/src/features/student` | Learning experience, chameleon theming. |
| **`apps/admin-portal`** | `client/src/features/{admin,batches,content,instructor}` | Management, Content creation, Evaluator dashboards. |
| **`packages/ui`** | `client/src/components/ui` | Gayatri Design System components. |
| **`packages/database`** | `shared/schema.ts` | Drizzle ORM schemas, Migrations. |
| **`packages/types`** | `shared/types.ts` | Shared Zod schemas and TypeScript interfaces. |
| **`packages/utils`** | `shared/utils`, `server/utils` | Shared helper functions. |

---

## 2. Infrastructure & Build Impact

### Current State (Vite Monolith)

* **Build Tool:** Vite (Client), Esbuild (Server).
* **Dependency Management:** `npm` (Single `package.json`).
* **Shared Code:** Folder-based imports (`import { ... } from "@/shared/..."`).

### Future State (Turborepo Monorepo)

* **Orchestrator:** **Turborepo** for build caching and task pipelines.
* **Dependency Management:** **pnpm** (Workspace-based).
* **Shared Code:** Workspace-based packages (`import { ... } from "@narada/ui"`).
* **Deployment:** Multi-container Docker (API, Student, Admin).

---

## 3. Migration Detail: The "Surgery"

### 3.1 Backend Extraction (`apps/api`)

* **Relocation:** Move `server/routes` and `server/modules` to the new app.
* **Refactor:**
  * Replace `express-session` with **JWT** (Reflections of the Strategy doc).
  * Apply `OrganizationGuard` to all routes.
  * Centralize CORS whitelist in environment injection.

### 3.2 UI Library Extraction (`packages/ui`)

* **Requirement:** Move `client/src/components/ui` and associated tailwind/postcss configurations.
* **Shared System:** Ensure `packages/ui` handles CSS variable definitions for chameleon theming.

### 3.3 Persona Migration (`apps/admin-portal`)

* **Consolidation:** The `features/admin`, `features/instructor`, and `features/content` will be merged into a single Next.js/Vite application.
* **Access Control:** The existing RBAC (Admin/Instructor/ContentManager) will remain internal to this app's routing and API interactions.

---

## 4. Work Stream Modeling (Orchestration)

To accomplish this in parallel, we divide the work into "Tracks":

### Track A: Infrastructure & Shared (DevOps + Architect)

* Setup Turborepo root.
* Setup `packages/types` and `packages/database`.
* Setup Docker base images.

### Track B: Backend (Backend Specialist + Security)

* Initialize `apps/api`.
* Implement `OrganizationGuard` and JWT Auth.
* Port database logic to `@narada/database`.

### Track C: UI & Student (Frontend Specialist)

* Initialize `packages/ui`.
* Initialize `apps/student-portal`.
* Implement Chameleon theming and runtime config.

### Track D: Admin Implementation (Frontend Specialist)

* Initialize `apps/admin-portal`.
* Port and consolidate admin/management personas.

---

## 5. Risk Log & Mitigations

* **Risk:** Loss of type safety during migration.
  * **Mitigation:** `packages/types` must be the very first thing extracted and finalized.
* **Risk:** Broken Auth during split.
  * **Mitigation:** Track B must deliver a working JWT implementation before Track C and D start integration.
* **Risk:** Missing shared utilities.
  * **Mitigation:** Identify and move `shared/utils` to `packages/utils` early in Phase 1.
