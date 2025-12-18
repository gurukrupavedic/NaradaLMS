# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project.

---

## Documentation Structure

```
docs/
├── README.md                    (This file - documentation index)
├── PRD.md                       (Product Requirements)
├── PROJECT_DOCUMENTATION.md     (Comprehensive feature docs)
├── domain-requirements.md       (Living document of real-world workflows)
│
├── architecture/                (Technical architecture)
├── todo/                        (Active backlog)
└── archive/                     (Completed work)
    └── modular-refactoring-2025/
```

---

## Quick Navigation

### Core Documents

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | **Product Requirements** - Functional specifications, user flows |
| [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) | **Feature Encyclopedia** - Comprehensive system documentation (1421 lines) |
| [domain-requirements.md](./domain-requirements.md) | **Domain Requirements** - Real-world workflows, what's built, gaps |
| [architecture/architecture.md](./architecture/architecture.md) | **Technical Architecture** - Front-door overview, stack, routes |
| [architecture/module-contracts.md](./architecture/module-contracts.md) | **Module Contracts** - Boundaries, ownership, public APIs, events |

### Active Work

| Document | Description |
|----------|-------------|
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

1. **Separation of Concerns**: PRD for requirements, ARCHITECTURE for implementation, TODO for active work
2. **Current State Focus**: Documentation describes implemented features, not future plans
3. **Archive Completed Work**: Major initiatives archived with summary docs (see archive/)
4. **Living Architecture**: Architecture docs evolve with system (use ADRs for major decisions)
5. **Actionable TODOs**: TODO backlog has clear metadata (type, criticality, risk, effort, dependencies)

---

## Major Milestone: Modular Architecture ✅

**Date:** December 18, 2025

VedicLMS completed a comprehensive modular refactoring initiative, transforming from a monolithic codebase (1253 lines in 2 files) into a domain-driven architecture with 6 independent modules:

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
| Dec 18, 2025 | Archived modular refactoring docs (2025 initiative complete); updated structure |
| Dec 18, 2025 | Reorganized TODO folder with metadata-driven backlog (Backend/Frontend/Common) |
| Dec 16, 2025 | Split PRD.md and ARCHITECTURE.md into separate documents |
| Dec 16, 2025 | Created consolidated PRD.md, removed features/ folder |
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

**Last Updated:** December 16, 2025
