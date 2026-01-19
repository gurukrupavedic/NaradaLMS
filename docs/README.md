# NaradaLMS - Documentation

This is the central documentation hub for the NaradaLMS project.

---

## Documentation Structure

```
docs/
├── README.md                    (This file - documentation index)
├── product-guide.md             (📖 SINGLE SOURCE OF TRUTH - Complete product guide)
├── domain-requirements.md       (Living document of real-world workflows)
│
├── architecture/                (Technical architecture)
├── todo/                        (Active backlog)
└── archive/                     (Historical documents)
    ├── prd.md                   (Superseded by product-guide.md)
    ├── project-documentation.md (Superseded by product-guide.md)
    └── modular-refactoring-2025/
```

---

## Quick Navigation

### Core Documents

| Document | Purpose |
|----------|---------|
| [product-guide.md](./product-guide.md) | **📖 PRODUCT BIBLE** - Single source of truth combining vision, features, implementation, and current state (10,500 words) |
| [domain-requirements.md](./domain-requirements.md) | **Domain Requirements** - Real-world workflows, what's built, gaps |
| [architecture/architecture.md](./architecture/architecture.md) | **Technical Architecture** - Front-door overview, stack, routes |
| [architecture/module-contracts.md](./architecture/module-contracts.md) | **Module Contracts** - Boundaries, ownership, public APIs, events |

### Active Work

| Document | Description |
|----------|-------------|
| [implementation/ChapterContentPage-Phased-Development-Plan.md](./implementation/ChapterContentPage-Phased-Development-Plan.md) | **Chapter Content Page** - Phases 1-7 ✅ Complete (tab refinements, dark mode, read-only UX) |
| **New UI Architecture** | **🎯 Active Milestone** - Modern AppShell with role-based organization, dark mode support |
| [implementation/mvp-implementation-plan.md](./implementation/mvp-implementation-plan.md) | MVP 1.0 - Target: Mid-March 2026 |
| [todo/todo-backend.md](./todo/todo-backend.md) | Backend hardening, cleanup, and enhancements (14 items) |
| [todo/todo-frontend.md](./todo/todo-frontend.md) | Frontend cleanup and UX improvements (7 items) |
| [todo/todo-common.md](./todo/todo-common.md) | Testing, security, infrastructure, and monitoring (14 items) |

### Architecture & ADRs

| Document | Description |
|----------|-------------|
| [architecture/architecture.md](./architecture/architecture.md) | Front-door architecture overview |
| [architecture/module-contracts.md](./architecture/module-contracts.md) | Module boundaries, ownership, public APIs |

### Completed Work (Archived)

| Document | Description |
|----------|-------------|
| [archive/modular-refactoring-2025/00-REFACTORING-SUMMARY.md](./archive/modular-refactoring-2025/00-REFACTORING-SUMMARY.md) | **📜 Modular Refactoring Journey** (Nov 2024 - Dec 18, 2025) - Complete story of monolith → 6 modules transformation |
| [archive/modular-refactoring-2025/ADR-002-Authentication-Strategy.md](./archive/modular-refactoring-2025/ADR-002-Authentication-Strategy.md) | Auth decision record (Passport.js local + Google) |

---

## Documentation Principles

1. **Single Source of Truth**: product-guide.md is the canonical product documentation (updated continuously)
2. **Current State Focus**: Documentation describes implemented features, not future plans
3. **Archive Superseded Docs**: Old docs moved to archive/ when replaced (see prd.md, project-documentation.md)
4. **Living Architecture**: Architecture docs evolve with system (use ADRs for major decisions)
5. **Actionable TODOs**: TODO backlog has clear metadata (type, criticality, risk, effort, dependencies)
6. **Keep Updated**: Update product-guide.md and domain-requirements.md as features are implemented

---

## Major Milestone: Modular Architecture ✅

**Date:** December 18, 2025

NaradaLMS completed a comprehensive modular refactoring initiative, transforming from a monolithic codebase (1253 lines in 2 files) into a domain-driven architecture with 6 independent modules:

- ✅ Identity & Access
- ✅ Content Publishing
- ✅ Media Pipeline
- ✅ Batch & Cohort
- ✅ Learning Delivery
- ✅ System Admin

**Result:** Production-ready modular architecture with TypeScript clean compile, audit logging, and clear domain boundaries.

**Full Story:** [archive/modular-refactoring-2025/00-REFACTORING-SUMMARY.md](./archive/modular-refactoring-2025/00-REFACTORING-SUMMARY.md)

---

## Documentation History

| Date | Change |
|------|--------|
| Jan 19, 2026 | Rebranded to NaradaLMS; updated documentation structure |
| Jan 13, 2026 | New UI architecture introduced (AppShell, role-based pages, dark mode) |
| Jan 2026 | Chapter Content Page refinements (tab renaming, dark mode fixes, standardized read-only UX) |
| Dec 18, 2025 | Archived modular refactoring docs (2025 initiative complete); updated structure |
| Dec 18, 2025 | Reorganized TODO folder with metadata-driven backlog (Backend/Frontend/Common) |
| Dec 16, 2025 | Split PRD.md and ARCHITECTURE.md into separate documents |
| Dec 16, 2025 | Created consolidated PRD.md, removed features/ folder |
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

## Current Development Focus

**Primary Milestone:** Migration to New UI Architecture
- Transitioning from feature-based structure to role-based AppShell pattern
- Building modern, accessible interface with dark mode support
- Target: Complete migration before MVP 1.0 (Mid-March 2026)

**Recent Achievements:**
- ✅ New UI foundation with AppShell, sidebar navigation, theming
- ✅ Content Studio migrated (ChapterContentPage with enhanced UX)
- ✅ Dark mode implementation across all tabs
- ✅ Admin, Instructor, and Student page structure

---

**Last Updated:** January 19, 2026
