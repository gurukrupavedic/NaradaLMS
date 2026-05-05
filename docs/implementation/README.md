# Implementation: Multi-Tenancy & Chameleonization

**Active Goal**: Make NaradaLMS a multi-tenant, white-label platform.

**Active Plan**: [roadmap.md](./roadmap.md)

**Archive**: Previous implementation docs (Stages 0–1, hardening, code-cleanup, reshuffle) are in `docs/archive/rearchitecture-stages-0-1/`.

---

## As-Built Baseline (current state of the codebase)

### Architecture


| Component          | Location               | Runtime                          |
| ------------------ | ---------------------- | -------------------------------- |
| **API**            | `server/` (repo root)  | Express on port 5000             |
| **Student Portal** | `apps/student-portal/` | Next.js 15 App Router, port 3000 |
| **Admin Portal**   | `apps/admin-portal/`   | Next.js 15 App Router, port 3001 |


Orchestrated by **Turborepo** (`turbo.json`) with **npm workspaces** (`apps/`*, `packages/*`).

### Packages


| Package                     | Purpose                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@narada/types`             | Drizzle schema, Zod schemas, shared types/constants                                                     |
| `@narada/ui`                | Shared components (shadcn-style), AppShell, BrandHeader, ThemeProvider (dark/light only), Tiptap editor |
| `@narada/api-client`        | `apiRequest()` with CSRF + cookie forwarding for SSR                                                    |
| `@narada/tailwind-config`   | Shared Tailwind preset                                                                                  |
| `@narada/eslint-config`     | Shared ESLint config                                                                                    |
| `@narada/typescript-config` | Shared TS base configs                                                                                  |


### Authentication

- **Passport.js** with Local (email/password) and Google OAuth strategies, `session: false`.
- **JWT** in HttpOnly cookie (`auth_token`), HS256, issuer `narada-lms`.
- Payload: `{ userId, email, roles, status }`.
- **CSRF**: Double-submit via `csrf-csrf`; state-changing requests require `X-CSRF-Token`.
- Role guards: `requireAdmin`, `requireInstructor` in `server/shared/middleware/auth.ts`.

### Roles

Three roles (text array on `users` table): **admin**, **instructor**, **student**.

### Database (Single-Tenant)

Schema lives in `packages/types/src/schema.ts` (Drizzle + PostgreSQL).

**Tables**: `users`, `tracks`, `chapters`, `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `batches`, `enrollments`, `batch_co_instructors`, `student_progress`, `proficiency_evaluation_log`, `audit_logs`, `system_settings`.

**No organization, tenant, or theme tables exist yet.**

### Theming (current)

- `next-themes` provides dark/light mode toggle only.
- Branding assets (logos, patterns) are hardcoded in `@narada/ui` and per-app `src/assets/branding/`.
- No runtime theming per organization.

### File Uploads

- Local filesystem (`./uploads`), served via Express static middleware.
- Both portals proxy `/uploads` to the API server via Next.js rewrites.

### Config

- `server/config.ts`: env, host, port, frontendUrl, corsOrigins, database.url, jwt.secret/expiry, uploads.dir/maxSize, Google OAuth, adminEmail.
- Portals use `NEXT_PUBLIC_API_URL` for API calls.

### Key Decisions Already Made

These carry forward from completed Stages 0–1:

1. **Build Once, Deploy Many** — one Docker image per app, configured at runtime via env vars.
2. **Runtime config injection** — not per-org rebuilds (env vars + React Context).
3. **CSS variables for semantic theming** — `--primary` tokens, not hardcoded Tailwind classes.
4. **Users can belong to multiple orgs** — junction table, not a single `orgId` column on `users`.
5. **Gatekeeper middleware pattern** — every protected request must carry org context.
6. **Local uploads now, S3 later** — cloud storage when needed for scale.

