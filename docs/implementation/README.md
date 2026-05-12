# Implementation: Multi-Tenancy & Chameleonization

**Active goal:** Continue the multi-tenancy rollout on branch `multi-tenancy`, with pilot closeout complete through `6.4` and the Layer `4.4` tenant-aware OAuth follow-up now implemented; the next foundational slice remains blocked on `1.4-contract`, while checklist `2.12` stays deferred unless Google OAuth becomes real product scope.

**Execution & handoff:** [multi-tenancy/README.md](./multi-tenancy/README.md) and especially [multi-tenancy/implementation-status.md](./multi-tenancy/implementation-status.md)

**Archive:** Previous implementation docs (Stages 0–1, hardening, code-cleanup, reshuffle) are in `docs/archive/rearchitecture-stages-0-1/`.

---

## Current As-Built Baseline

### Architecture

| Component | Location | Runtime |
| --------- | -------- | ------- |
| **API** | `server/` | Express on port `5000` |
| **Student Portal** | `apps/student-portal/` | Next.js 15 App Router, tenant-aware local instances on `3000` (SLMTS) and `3010` (RR) |
| **Admin Portal** | `apps/admin-portal/` | Next.js 15 App Router on `3001` |

The repo is orchestrated by **Turborepo** (`turbo.json`) with **npm workspaces** across `apps/*` and `packages/*`.

### Shared Packages

| Package | Purpose |
| ------- | ------- |
| `@narada/types` | Drizzle schema, Zod schemas, shared types/constants |
| `@narada/ui` | Shared components, `AppShell`, `BrandHeader`, theme support, Tiptap editor |
| `@narada/api-client` | `apiRequest()` wrapper with CSRF + cookie forwarding support |
| `@narada/tailwind-config` | Shared Tailwind preset |
| `@narada/eslint-config` | Shared ESLint config |
| `@narada/typescript-config` | Shared TypeScript base configs |

### Multi-Tenancy Progress Snapshot

The codebase is no longer at a pre-tenancy baseline. As of `multi-tenancy`:

- **Layer 1** expand/seed/bootstrap is in place:
  - `organizations`
  - `user_organizations`
  - `users.is_super_admin`
- **Layer 2** slices `2.1`–`2.5` are merged:
  - membership-first auth
  - JWT org context
  - `/api/auth/switch-org`
  - super-admin governance APIs
  - governance event/audit alignment
- **Layer 3** Pass A and Pass B are merged:
  - physical `org_id` coverage across core, media, progress, and audit tables
  - org-scoped query/handler enforcement
- **Layer 4** student portal foundation plus auth propagation follow-up are merged:
  - typed tenant config for `slmts` / `rr`
  - tenant-branded auth form area, root metadata, authenticated shell, and pending page
  - shared Narada branding intentionally preserved on the left auth hero
  - Google OAuth initiation/callback now preserve the originating tenant and post-auth return target for portal-initiated flows
- **Admin portal** `5.1`–`5.4` are in place:
  - super-admin user-management gate
  - user-management org filter
  - org switcher
  - governance route restrictions for org admins

Use [multi-tenancy/implementation-status.md](./multi-tenancy/implementation-status.md) for the detailed slice-by-slice handoff.

### Authentication And Session Model

- **Passport.js** supports Local (email/password) and Google OAuth strategies, `session: false`.
- **JWT** lives in the HttpOnly `auth_token` cookie.
- JWT/session context is now membership-aware:
  - `isSuperAdmin`
  - `currentOrgId`
  - `orgRoles`
  - optional `orgMembershipStatus`
- **`GET /api/auth/me`** returns the session user plus `memberships[]` and `hasActiveMembership`.
- Portal-initiated Google OAuth now carries tenant/return-to state so student logins can round-trip back to the originating tenant instance instead of relying only on the server default tenant or a single frontend URL.
- **CSRF** still uses the double-submit pattern via `csrf-csrf`.

### Roles And Authority

- Global authority is `users.is_super_admin`.
- Org-scoped roles live on `user_organizations.roles`:
  - `admin`
  - `instructor`
  - `student`
- Org-scoped membership status also lives on `user_organizations`.
- Legacy `users.roles` / `users.status` still physically exist and remain tracked for the deferred `1.4` contract slice.

### Database And Isolation

Schema lives in `packages/types/src/schema.ts` (Drizzle + PostgreSQL).

The platform now has:

- `organizations`
- `user_organizations`
- physical `org_id` scoping on the core tenant-owned tables, including:
  - `tracks`, `chapters`, `batches`, `enrollments`
  - `audio_files`, `text_segments`, `media_segments`, `segment_mappings`
  - `student_progress`, `proficiency_evaluation_log`, `audit_logs`

`system_settings` remains global for this phase.

### Branding And Portal Behavior

- **Student portal** is white-labeled by tenant config.
- **Admin portal** remains Narada-branded.
- Student branding is intentionally split:
  - auth page **left hero** stays Narada-branded across tenants
  - auth form area, metadata, authenticated shell, and pending page are tenant-branded
- There is still **no DB-backed theming system** or theme editor in this phase.

### File Uploads

- Uploads still use the local filesystem (`./uploads`) served by Express.
- Both portals proxy `/uploads` to the API server through Next rewrites.

### Configuration And Local Dev

- `server/config.ts` handles env, host, port, frontend URL, CORS origins, database URL, JWT config, upload config, Google OAuth, admin email, and `DEFAULT_TENANT_SLUG`.
- Student portal tenant selection is driven by `TENANT`, with client-runtime mirroring handled in `next.config.ts`.
- Student portal local dev now supports side-by-side tenant instances and tenant-specific Next build output directories to avoid collisions.
- Portals use `NEXT_PUBLIC_API_URL` for API calls.

### Key Decisions Still In Force

1. **Build once, deploy many** — runtime configuration, not per-tenant code forks.
2. **Backend-first sequencing** — schema -> server -> API -> UI.
3. **Global identity with per-org membership** — one user can belong to multiple orgs.
4. **Strict org isolation** — tenant-owned rows and routes must carry org context.
5. **Super-admin-only governance** — user approvals and role/membership management stay centralized.
6. **Local uploads now, cloud storage later** — S3/object storage remains a later operational concern.

