# Multi-Tenancy Implementation Docs

This folder is the source of truth for the upcoming multi-tenancy and chameleonization implementation.

It captures the finalized product and architecture decisions before coding, then breaks implementation into a predictable execution path.

---

## Start here (continuing work)

1. Read **[implementation-status.md](./implementation-status.md)** — what is already merged to `multi-tenancy`, current behavior, gaps, and the distinction between the next **foundational** slice and the next **small ready** slice.
2. Follow **[implementation-roadmap.md](./implementation-roadmap.md)** and **[implementation-checklist.md](./implementation-checklist.md)** for execution order.
3. Use **[verification-strategy.md](./verification-strategy.md)** before marking checklist items done.

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

## Current Wave

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

After migrations (`npm run db:migrate` or `npm run db:reset`):

1. `npm run db:seed-orgs` — canonical org rows (`slmts`, `rr`).
2. `npm run db:seed-dev` — super-admin for `ADMIN_EMAIL` plus minimal `user_organizations` (SLMTS active, RR pending); see [environment-setup.md](../../essentials/environment-setup.md).
3. Optionally `npm run db:seed` — Vedic curriculum structure.

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