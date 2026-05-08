# Multi-Tenancy Implementation Docs

This folder is the source of truth for the upcoming multi-tenancy and chameleonization implementation.

It captures the finalized product and architecture decisions before coding, then breaks implementation into a predictable execution path.

---

## Scope

- Convert NaradaLMS from single-tenant to multi-tenant.
- Support two initial orgs:
  - `slmts` (Sri Lalita Maha Tripura Sundari Patasala, pilot first)
  - `rr` (Raja Rajeswari Patasala, onboard after SLMTS pilot)
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

1. [implementation-roadmap.md](./implementation-roadmap.md)
2. [implementation-checklist.md](./implementation-checklist.md)
3. [task-coverage-matrix.md](./task-coverage-matrix.md)
4. [verification-strategy.md](./verification-strategy.md)

Use the roadmap and checklist as the primary execution guide. The root [roadmap.md](../roadmap.md) remains historical context for earlier planning; multi-tenant execution follows this folder.

---

## Key Principles

- Build once, deploy many.
- Backend-first sequencing: schema -> server -> API -> UI.
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