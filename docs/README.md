# NaradaLMS - Documentation

This is the central documentation hub for the NaradaLMS project.

---

## Documentation Structure

```
docs/
├── README.md                    (This file - documentation index)
├── architecture/                (Technical architecture)
│   └── module-contracts.md      (Module boundaries and public APIs)
└── essentials/                  (Core product & domain info)
    ├── product-guide.md         (📖 SINGLE SOURCE OF TRUTH - Complete product guide)
    ├── domain-requirements.md   (Living document of real-world workflows)
    └── project-structure.md     (Codebase organization and patterns)
```

---

## Quick Navigation

### Core Documents

| Document | Purpose |
|----------|---------|
| [product-guide.md](./essentials/product-guide.md) | **Product Basics** - Single source of truth combining vision, features, implementation, and current state. |
| [domain-requirements.md](./essentials/domain-requirements.md) | **Domain Requirements** - Real-world workflows, what's built, gaps. |
| [project-structure.md](./essentials/project-structure.md) | **Project Structure** - Comprehensive guide to codebase organization and patterns. |
| [module-contracts.md](./architecture/module-contracts.md) | **Module Contracts** - Domain boundaries, ownership, public APIs, and events. |

---

## Documentation Principles

1. **Single Source of Truth**: `product-guide.md` is the canonical product documentation.
2. **Current State Focus**: Documentation describes implemented features and the active architecture.
3. **Keep Updated**: Update documents as features are implemented or architecture evolves.
4. **Lean & Maintenance**: Prefer fewer, deeper documents over many fragmented ones.

---

## Major Milestone: Role-Based Architecture ✅

**Date:** January 13, 2026

The NaradaLMS frontend has successfully transitioned to a role-based architecture. The previous "New UI" experiments have been consolidated and merged into the main `features/` directory, which now serves as the foundation for:
- ✅ **Admin**: User management, logs, and settings.
- ✅ **Instructor**: Student tracking and batch management.
- ✅ **Student**: Interactive learning dashboard and chapter study.
- ✅ **Content**: The "Content Studio" for chapter authoring and audio mapping.

---

## Documentation History

| Date | Change |
|------|--------|
| Jan 19, 2026 | **Full Rebrand to NaradaLMS**; overhauled documentation index to remove dead links. |
| Jan 13, 2026 | Role-based architecture integrated into `features/`; AppShell stabilized. |
| Jan 2026 | Chapter Content Page refinements (tab renaming, dark mode fixes). |
| Dec 18, 2025 | Modular Refactoring complete: monolith → 6 discrete backend modules. |
| Dec 16, 2025 | Consolidated PRD and Architecture into core essential docs. |

---

## Current Development Focus

**Primary Objective: MVP 1.0 Stabilization**
- Refining the high-fidelity Vedic learning experience.
- Hardening the modular backend contracts.
- Preparing for initial Pathasala deployment (Mid-March 2026).

**Recent Achievements:**
- ✅ Unified AppShell with role-based navigation.
- ✅ Dark mode support across all core modules.
- ✅ Standardized "Content Studio" for instructors.
- ✅ Robust student progress tracking at the chapter level.

---

**Last Updated:** January 19, 2026
