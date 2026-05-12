# Multi-Tenancy Implementation Docs

This folder is the source of truth for the ongoing multi-tenancy and chameleonization rollout on branch `multi-tenancy`.

It captures both the locked product/architecture decisions and the current as-built execution state, so a new chat can resume from what is already merged rather than treating this work as pre-implementation planning.

---

## Start here (continuing work)

1. Read **[implementation-status.md](./implementation-status.md)** — what is already merged to `multi-tenancy`, current behavior, gaps, and the distinction between the next **foundational** slice and the next **small ready** slice.
2. Follow **[implementation-roadmap.md](./implementation-roadmap.md)** and **[implementation-checklist.md](./implementation-checklist.md)** for execution order.
3. Use **[verification-strategy.md](./verification-strategy.md)** before marking checklist items done.

### Current merged baseline

- Layer **1** expand/seed/bootstrap is merged.
- Layer **2** slices **2.1–2.5** are merged.
- Layer **3** Pass A and Pass B isolation are merged.
- Student Layer **4.1 / 4.2** tenant-config and authenticated shell branding work are merged.
- Admin **5.1–5.4** are merged.
- Checklists **6.1** pilot validation, **6.2** RR isolation smoke, and **6.3** second-org join are now confirmed locally; default next slice is **6.4** (document known gaps), unless you intentionally want the optional broader Layer 4 auth-client follow-up first.

---

## Scope

- Convert NaradaLMS from single-tenant to multi-tenant.
- Support two initial orgs:
  - `slmts` (Sri Lalita Maha Tripura Sundari Pathasala, pilot first)
  - `rr` (Raja Rajeswari Pathasala, onboard after SLMTS pilot)
- Keep one shared codebase for each portal type:
  - one student portal codebase (`apps/student-portal`)
  - one admin portal codebase (`apps/admin-portal`)
- Keep admin portal Narada-branded.
- Keep student portal white-labeled by tenant config.

---

## Current doc set

These Wave 1 foundation docs are now available:

1. [product-context.md](./product-context.md)
2. [architecture-decisions.md](./architecture-decisions.md)

Wave 2 technical design docs are now available:

1. [schema-design.md](./schema-design.md)
2. [api-contract-changes.md](./api-contract-changes.md)

Wave 3 execution docs are now available:

1. [implementation-status.md](./implementation-status.md) — **resume here** (merged work + handoff)
2. [implementation-roadmap.md](./implementation-roadmap.md)
3. [implementation-checklist.md](./implementation-checklist.md)
4. [task-coverage-matrix.md](./task-coverage-matrix.md)
5. [verification-strategy.md](./verification-strategy.md)

Use the roadmap and checklist as the primary execution guide. The root [roadmap.md](../roadmap.md) remains historical context for earlier planning; multi-tenant execution follows this folder.

### Local DB seed order (multi-tenancy dev)

After migrations (`npm run db:migrate` or `npm run db:reset`; the reset path now clears both `public` and Drizzle's `drizzle` schema so fresh-migrate verification is real):

1. `npm run db:seed-orgs` — canonical org rows (`slmts`, `rr`).
2. `npm run db:seed-dev` — super-admin for `ADMIN_EMAIL` plus minimal `user_organizations` (SLMTS active, RR pending); first-time bootstrap needs `DEV_SUPERADMIN_PASSWORD` set (see [environment-setup.md](../../essentials/environment-setup.md)).
3. Optionally `npm run db:seed` — Vedic curriculum structure.

The RR isolation smoke (`npm run test:rr-isolation-smoke`) also uses those seeded super-admin credentials, so keep `DEV_SUPERADMIN_PASSWORD` available in `.env` or pass it inline when running the smoke outside the slice worktree.

---

## Key Principles

- Build once, deploy many.
- Backend-first sequencing: schema -> server -> API -> UI.
- **End of each slice:** commit on the slice branch, `git merge --no-ff` into `multi-tenancy`, `git push origin multi-tenancy`, and confirm `npm run check`.
- Schema changes follow an **expand–contract** pattern: add new tables/columns first (`slice-1.1-org-schema`), migrate application code in Layer 2, then drop legacy columns in `slice-1.4-schema-contract` so the integration branch stays buildable.
- Strict org data isolation.
- Global identity with per-org memberships and per-org roles.
- Super-admin is the only authority for user approval and role/membership management.

---

## Local Development Port Plan

To avoid collisions with existing services:

- Student portal (SLMTS): `3000`
- Student portal (RR): `3010`
- Admin portal: `3001`
- API server: `5000`

This preserves current admin/server behavior while enabling side-by-side tenant verification for student portal.