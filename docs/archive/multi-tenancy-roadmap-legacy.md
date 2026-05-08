# Archived: Legacy Multi-Tenancy & Chameleonization Roadmap

> This file was originally `docs/implementation/roadmap.md`. It predates the config-based theming and super-admin decisions now captured under `docs/implementation/multi-tenancy/`. Kept here for historical context only.

## Original content

# Roadmap: Multi-Tenancy & Chameleonization

**Date**: March 30, 2026
**Status**: Active

---

## Mental Model

Work is organized in **three layers** (stack order matters — lower layers must come first), each broken into **slices** (small testable milestones). After the tenancy scaffold is in place, **frontend tracks** (student portal, admin portal) can progress in **parallel** with each other and with deeper backend work.

```
        ┌──────────────────────────────────────────┐
        │  Layer 3: Deeper Isolation & Polish       │
        │  (remaining tables, audit, edge cases)    │
        ├──────────────────────────────────────────┤
        │  Layer 2: Chameleonization                │
        │  (themes, branding, asset management)     │
        ├──────────────────────────────────────────┤
        │  Layer 1: Tenancy Scaffold                │
        │  (org model, membership, request context) │
        └──────────────────────────────────────────┘
```

---

## Open Decisions

Decide these before or during the first slice that needs them. Record the choice here when made.

| ID | Question | Options | Recommendation | Decision |
|----|----------|---------|----------------|----------|
| **D-1** | Subdomain vs single-domain routing for orgs? | (A) `student.org1.com` per org (B) single domain, org from JWT/session | Start with B (simpler); subdomain can be layered on later | _TBD_ |
| **D-2** | Theme storage? | (A) Database tables (B) Config files in repo (C) External CMS | A — database, for runtime flexibility | _TBD_ |
| **D-3** | Asset storage for org logos/media? | (A) Local `./uploads` with org prefix (B) S3/cloud with org prefix | A for now, B when deploying to production | _TBD_ |
| **D-4** | Per-org roles or global roles? | (A) Roles on `user_organizations` junction (B) Global roles on `users` | A — same user can be admin in one org, student in another | _TBD_ |
| **D-5** | Superadmin concept? | (A) Platform-level superadmin above orgs (B) No superadmin, first admin bootstraps | A — needed to create orgs and manage the platform | _TBD_ |

---

## Layer 1: Tenancy Scaffold

**Goal**: Every request the API handles knows *which organization* it belongs to. The database has a real org model and users are linked to orgs.

This is **foundational** — Layer 2 (themes, branding) and Layer 3 (full isolation) build directly on top of it.

### Slice 1.1 — Organization & Membership Tables

**What**: Add `organizations` table and `user_organizations` junction table to the schema.

- Add `organizations` table: `id` (UUID), `name`, `slug` (unique), `status`, timestamps.
- Add `user_organizations` table: `userId`, `orgId`, `roles` (text array or JSONB), `status`, `joinedAt`.
- Create a default organization and backfill all existing users into it.
- Seed script creates the default org automatically.

**Done when**:
- [ ] `organizations` and `user_organizations` tables exist in schema and DB.
- [ ] All existing users belong to the default org.
- [ ] `npm run dev` still works — no regressions.

### Slice 1.2 — Org Context on JWT & Login

**What**: When a user logs in, the JWT includes `currentOrgId`. If they belong to only one org, it's automatic. If multiple, the login flow picks one (or defaults).

- Update `jwt.utils.ts` payload: add `currentOrgId`.
- Update login handler: look up user's orgs via `user_organizations`, set `currentOrgId`.
- Update `jwtAuth` middleware: `req.user` now carries `currentOrgId`.

**Done when**:
- [ ] JWT payload includes `currentOrgId` after login.
- [ ] `req.user.currentOrgId` is available in all authenticated handlers.
- [ ] Existing login flow works without breaking.

### Slice 1.3 — Org Guard Middleware

**What**: A middleware (`orgGuard`) that rejects any authenticated request missing a valid org context. Applied to all protected route groups.

- Create `server/middleware/org-guard.middleware.ts`.
- Validate that `req.user.currentOrgId` exists and matches a real org.
- Bind `req.orgId` for downstream handlers.
- Mount on all route groups that need org scoping (content, batches, learning, students, admin, media).

**Done when**:
- [ ] Requests without org context get 403.
- [ ] `req.orgId` is available in all scoped handlers.
- [ ] Unscoped routes (auth, CSRF) still work without the guard.

### Slice 1.4 — Scope Core Queries (First Pass)

**What**: Add `orgId` column to the most critical tables and update their queries to filter by `req.orgId`.

Tables for the first pass: `tracks`, `chapters`, `batches`, `enrollments`.

- Add `orgId` (UUID, FK to `organizations`) to each table in the Drizzle schema.
- Write a migration that backfills existing rows with the default org ID, then sets NOT NULL.
- Update all query handlers for these tables to filter by `req.orgId`.
- Add indexes on `orgId` columns.

**Done when**:
- [ ] `tracks`, `chapters`, `batches`, `enrollments` have `orgId` NOT NULL.
- [ ] All CRUD for these tables filters by `req.orgId`.
- [ ] Existing data accessible under the default org — no regression.

---

## Layer 2: Chameleonization

**Goal**: Each organization can have its own branding (colors, logo, name, fonts). The student portal renders the correct brand at runtime.

**Depends on**: Layer 1 slices 1.1–1.3 (org exists, request carries org context).

### Slice 2.1 — Theme Schema & Default Theme

**What**: Add a `themes` table storing per-org branding config.

- `themes` table: `id`, `orgId` (FK, unique — one theme per org), `brandName`, `logoUrl`, `faviconUrl`, `colors` (JSONB: primary, secondary, accent, background, foreground), `typography` (JSONB: fontFamily), `customCss` (optional), timestamps.
- Create a default theme for the default org matching current hardcoded branding.
- API endpoints: `GET /api/themes/:orgId` (public, for portal bootstrap), `PUT /api/themes/:orgId` (admin only).

**Done when**:
- [ ] `themes` table exists with default org theme seeded.
- [ ] `GET /api/themes/:orgId` returns the theme.
- [ ] `PUT /api/themes/:orgId` updates it (admin guard).

### Slice 2.2 — Runtime Theme Injection (Student Portal)

**What**: Student portal loads theme from API on app init and applies it as CSS variables.

- Create a `ThemeConfigProvider` (React Context) that fetches the org theme on mount.
- Inject CSS variables from the theme onto `:root` (e.g. `--brand-primary`, `--brand-background`).
- Replace any hardcoded brand colors in the student portal with CSS variable references.
- Load org logo dynamically from theme data instead of static imports.

**Done when**:
- [ ] Student portal renders correct colors/logo for the org in its JWT context.
- [ ] Changing the theme in the DB is reflected on next page load (no rebuild).
- [ ] Default org looks the same as it does today (no visual regression).

### Slice 2.3 — Theme Editor (Admin Portal)

**What**: Admin portal gets a UI for editing the org's theme.

- Admin settings page with color pickers, logo upload, brand name input, font selector.
- Logo upload via existing media upload endpoint (org-prefixed storage path).
- Live preview panel showing how changes will look.
- Save calls `PUT /api/themes/:orgId`.

**Done when**:
- [ ] Admin can change colors, logo, and brand name from the admin portal.
- [ ] Changes persist and show up in the student portal.

### Slice 2.4 — Admin Portal Branding

**What**: Apply the same runtime theming to the admin portal so it also reflects org branding.

- Reuse `ThemeConfigProvider` from Slice 2.2 in admin portal layout.
- Admin portal header/sidebar show org logo and name.

**Done when**:
- [ ] Admin portal shows org-specific branding.
- [ ] Both portals are visually consistent for the same org.

---

## Layer 3: Deeper Isolation & Polish

**Goal**: Extend org-scoped data isolation to remaining tables, handle edge cases, and add org management features.

**Depends on**: Layer 1 fully complete; can proceed in parallel with Layer 2 later slices.

### Slice 3.1 — Scope Remaining Tables

**What**: Add `orgId` to tables not covered in Slice 1.4.

Tables: `audio_files`, `text_segments`, `media_segments`, `segment_mappings`, `student_progress`, `proficiency_evaluation_log`, `audit_logs`.

- Same pattern: add column, backfill, set NOT NULL, update queries, add indexes.
- `system_settings` may become org-scoped or stay global (decide per setting).

**Done when**:
- [ ] All content and evaluation tables filter by org.
- [ ] No query anywhere returns cross-org data.

### Slice 3.2 — Org Switcher (Multi-Org Users)

**What**: If a user belongs to multiple orgs, they need a way to switch.

- Org switcher dropdown in the portal header/sidebar.
- Switching orgs re-issues the JWT with a new `currentOrgId` (via a dedicated `/api/auth/switch-org` endpoint).
- UI refreshes to show the new org's data and theme.

**Done when**:
- [ ] Multi-org user can switch and sees correct data + branding for each org.
- [ ] Single-org users see no switcher (clean UX).

### Slice 3.3 — Org Management (Superadmin)

**What**: Platform-level admin can create, edit, and deactivate organizations.

- CRUD endpoints for organizations (superadmin only).
- Admin UI for org list, create org form, assign initial admin user.
- Creating an org also creates a default theme (from Slice 2.1).

**Done when**:
- [ ] Superadmin can create a new org from the admin portal.
- [ ] New org gets a default theme and is ready for use.

### Slice 3.4 — Isolation Verification

**What**: Systematic verification that no data leaks between orgs.

- Test with 2+ orgs: user in Org A cannot see Org B's tracks, batches, students, or evaluations.
- Verify theme isolation (Org A's branding doesn't bleed into Org B).
- Verify uploads are org-scoped (org A's logo isn't accessible from Org B's context).

**Done when**:
- [ ] All cross-org access attempts return 403 or empty results.
- [ ] Documented test scenarios pass.

---

## Parallel Tracks (after Layer 1 slices 1.1–1.3)

Once the org model and request context exist, these can run alongside each other:

```
                    time ──────────────────────────────────►

  [ API / DB ]     ████ 1.4 scope core ████ 3.1 scope rest ████ 3.3 org mgmt
  [ Student UI ]       ████ 2.2 theme inject ████
  [ Admin UI ]         ████ 2.3 theme editor ████ 2.4 admin brand ████ 3.2 switcher
  [ Theme API ]        ████ 2.1 theme schema ████
```

Slice numbers indicate dependencies; within each track, order matters. Across tracks, they can overlap.

---

## Branching Strategy

Same pattern as previous work:

1. Create a long-lived branch (e.g. `multi-tenancy-chameleon`) from `main`.
2. Per-slice branches off that (e.g. `slice-1.1-org-tables`).
3. Merge slice branches into the long-lived branch after verification.
4. Merge long-lived branch to `main` only when a full layer (or meaningful milestone) is complete and verified.
5. Tag baselines before and after.

---

## How to Use This Document

- **Starting a work session**: State the **slice** you're working on (e.g. "Slice 1.2 — Org Context on JWT"). That gives AI and collaborators the right scope.
- **After completing a slice**: Check off the "Done when" items, note anything learned, and move to the next slice.
- **When a decision is made**: Fill in the Decision column in the Open Decisions table above.
- **When done with all layers**: Archive this folder (your usual process) and sync the rest of the repo docs.

