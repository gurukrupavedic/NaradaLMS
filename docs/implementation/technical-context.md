# Narada LMS - Technical Context & Analysis

**Version**: 1.0 (Consolidated)
**Date**: February 12, 2026
**Status**: Active Analysis

---

## 1. Codebase Analysis & Monorepo Mapping

This section maps the monolithic codebase to the target Monorepo structure (Stage 1).

### 1.1 Component Mapping

| Target Component | Source Path | Responsibilities |
| :--- | :--- | :--- |
| **`apps/api`** | `server/` | API, Auth, Business Logic |
| **`apps/student-portal`** | `client/src/features/student` | Student experience, Chameleon theming |
| **`apps/admin-portal`** | `client/src/features/{admin,batches}` | Admin, Instructor, Content Management |
| **`packages/ui`** | `client/src/components/ui` | Gayatri Design System, Tiptap Editor |
| **`packages/database`** | `shared/schema.ts` | Drizzle ORM schemas, Migrations |
| **`packages/types`** | `shared/types.ts` | Zod schemas, TS interfaces |

### 1.2 Infrastructure Impact

- **Build Tool**: Moving from Vite (SPA) to **Next.js 15** (App Router) + **Turborepo** orchestration.
- **Dependency Mgmt**: Moving to **pnpm** workspaces.
- **Deployment**: Multi-container Docker (Student, Ops, API) vs single container.

---

## 2. Next.js 15 Compatibility Audit

**Status**: **YELLOW (Proceed with Caution)**
**Key Findings**: Codebase is 90% ready, with 10% risk in complex UI libraries.

### 2.1 Critical Risks & Mitigations

1. **Tiptap Editor (High Risk)**
    - *Issue*: DOM-heavy, not SSR-friendly. Causes hydration mismatch.
    - *Mitigation*: Must use `next/dynamic` with `ssr: false` for the editor component.
2. **Recharts (Medium Risk)**
    - *Issue*: SVG generation differs on server/client.
    - *Mitigation*: Wrap charts in Client Components.
3. **React 19 Breaking Changes**
    - *Issue*: `forwardRef` deprecation in React 19.
    - *Mitigation*: Run in React 18 compatibility mode initially; refactor `packages/ui` gradually.

---

## 3. Architecture Decision Log (ADL)

### Stage 0 Decisions (Foundation)

- **DP-0.1: Authentication**: Adopt **JWT + Passport.js**. Replaces stateful sessions to allow multi-domain scalability and simpler containerization.
- **DP-0.3: Pre-Work**: Execute a thorough "Stage 0" (Auth, Config, Routes) inside the monolith before splitting.

### Stage 1 Decisions (Structural Split)

- **DP-1.1: Asset Location**: Use portal-specific `public/assets` folders. Prepares for "Chameleon" (Stage 2) where assets vary by tenant.
- **DP-1.2: API Connection**: Use **Direct Client Fetch** with JWT headers. No Next.js proxy/rewrites needed due to stateless auth.
- **DP-1.4: useAuth Hook**: Shared implementation in `packages/ui` to ensure consistent auth logic across both portals.
- **DP-1.5: Portal Naming**: **"Admin Portal"** chosen for the admin/instructor app to encompass all back-office roles.
- **DP-1.6: Tiptap Editor**: Shared in `packages/ui`. Too large (132 files) to duplicate.
- **DP-1.9: Docker Timing**: Document Docker setup in Stage 1, implement fully before production deployment (Post-Stage 3).
- **DP-1.10: Uploads**: Keep local storage (`./uploads`) for Stage 1 using shared Docker volumes. Migrate to S3 in Stage 2/3.
- **DP-1.11: Routing**: Migrate from `wouter` to **Next.js App Router** during the split.
