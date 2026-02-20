# Narada LMS - Technical Context & Analysis

**Version**: 2.0 (Post–Stage 1)
**Date**: February 19, 2026
**Status**: Active Reference — Codebase aligned with Stage 1 + cleanup + hardening + reshuffle

---

## 1. Current Codebase Layout & Monorepo Mapping

This section describes the **current** structure after Stage 1 structural split, code cleanup, hardening, and reshuffle. The API remains at repository root; Student and Admin are Next.js apps in `apps/`.

### 1.1 Component Mapping (Current)

| Component | Location | Responsibilities |
| :--- | :--- | :--- |
| **API** | `server/` (root) | Express API, Auth (JWT + Passport), business logic, module routes. Port 5000. |
| **Student Portal** | `apps/student-portal/` | Next.js 15 App Router. Student learning, instructor views (batches, students). Port 3000. |
| **Admin Portal** | `apps/admin-portal/` | Next.js 15 App Router. Admin dashboard, users, batches, content, logs, settings. Port 3001. |
| **@narada/ui** | `packages/ui/` | Shared UI (primitives, Tiptap editor, layouts, auth page, hooks e.g. useAuth, useToast). |
| **@narada/types** | `packages/types/` | Drizzle schema, Zod schemas, TS types, constants, text-segmentation types/utils. |
| **@narada/api-client** | `packages/api-client/` | Typed API client: `apiRequest()`, CSRF handling, cookie forwarding for SSR. |
| **@narada/tailwind-config** | `packages/tailwind-config/` | Shared Tailwind preset. |
| **@narada/eslint-config**, **@narada/typescript-config** | `packages/` | Shared lint and TS config. |

**Note**: There is no separate `packages/database`. Schema and migrations live in `@narada/types`; the server imports schema from `@narada/types` and Drizzle is configured to use `packages/types/src/schema.ts`.

### 1.2 Infrastructure (Current)

- **Package manager**: npm workspaces (`apps/*`, `packages/*`).
- **Orchestration**: Turborepo (`turbo.json`) for `build`, `dev`, `lint`, `check`, `test`.
- **API**: Single Express app in `server/`; no static SPA — portals are separate Next.js apps.
- **Build**: Root `npm run dev` runs the API (`tsx server/index.ts`). Portals: `npm run dev` in each app (3000, 3001).

---

## 2. Next.js 15 Compatibility (Stage 2 Readiness)

**Status**: **GREEN** — Student and Admin portals run on Next.js 15 App Router.

### 2.1 Risks & Mitigations (Reference)

1. **Tiptap Editor**
   - Use `next/dynamic` with `ssr: false` where the editor is used to avoid hydration issues.
2. **Recharts / client-only UI**
   - Wrap in Client Components where needed.
3. **React 19**
   - Codebase uses React 18; upgrade path is unchanged (e.g. gradual refactor of `forwardRef` in `@narada/ui` when moving to React 19).

---

## 3. Architecture Decision Log (ADL)

### Stage 0 (Foundation)

- **DP-0.1**: **Authentication** — JWT + Passport.js for stateless, multi-domain-friendly auth.
- **DP-0.3**: **Pre-Work** — Stage 0 (Auth, Config, Routes) executed in monolith before split.

### Stage 1 (Structural Split)

- **DP-1.1**: **Asset location** — Portal-specific `public/` (and assets) for future Chameleon (Stage 2) tenant theming.
- **DP-1.2**: **API connection** — Direct client fetch with JWT (cookies) and CSRF; no Next.js proxy required.
- **DP-1.4**: **useAuth** — Shared in `@narada/ui` for consistent auth across portals.
- **DP-1.5**: **Portal naming** — **Admin Portal** for back-office (admin/instructor/content); **Student Portal** for learners (and instructor-facing views).
- **DP-1.6**: **Tiptap** — Shared in `@narada/ui`; single implementation for both portals.
- **DP-1.9**: **Docker** — Documented in Stage 1; full production Docker later (post–Stage 3).
- **DP-1.10**: **Uploads** — Local `./uploads` with optional shared Docker volumes; S3 in Stage 2/3.
- **DP-1.11**: **Routing** — Next.js App Router in both portals (no wouter).

---

## 4. Route & Module Quick Reference

- **API base**: `http://localhost:5000` (or `NEXT_PUBLIC_API_URL` for clients).
- **Auth**: `POST/GET /api/auth/*` (register, login, logout, me, Google OAuth, admin user actions).
- **Admin**: `GET/PUT /api/admin/*` (audit-logs, settings, stats).
- **Content**: `GET/POST/PUT/PATCH/DELETE /api/content/*` (tracks, chapters, segments).
- **Media**: `PATCH /api/audio-files/:id`, `GET/POST/PATCH/DELETE /api/media-segments/*`, etc.
- **Batches**: `GET/POST/PATCH/DELETE /api/batches/*`, `/api/batches/:id/enrollments`, co-instructors, progress.
- **Students**: `GET /api/students/:studentId/progress`, `.../track-progress`.
- **Learning**: `GET/POST /api/learning/*` (my-progress, my-details, chapters, tracks, chapter access).
- **CSRF**: `GET /api/csrf-token` (before state-changing requests).
- **Static**: `/uploads` for uploaded files; `public/` for API server static assets.

Server modules (domain logic) live under `server/modules/`: identity-access, content-publishing, media-pipeline, batch-cohort, learning-delivery, system-admin. Routes in `server/routes/` mount these under the paths above.
