# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project.

---

## Documentation Structure

```
docs/
├── README.md              (This file - documentation index)
├── ARCHITECTURE.md        (System architecture overview)
├── Requirements.md        (Functional requirements specification)
└── implementation/        (TODO items - features not yet implemented)
    ├── frontend-cleanup-todo.md
    ├── link-status-error-detection.md
    └── TODO-Authentication-Integration.md
```

---

## Quick Navigation

### Core Documents

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data model, technology stack |
| [Requirements.md](./Requirements.md) | Complete functional requirements for all features |

### TODO Items (implementation/)

| Document | Description |
|----------|-------------|
| [frontend-cleanup-todo.md](./implementation/frontend-cleanup-todo.md) | Unused code to remove (Topics 2 & 3 remaining) |
| [link-status-error-detection.md](./implementation/link-status-error-detection.md) | Future: broken link detection and repair |
| [TODO-Authentication-Integration.md](./implementation/TODO-Authentication-Integration.md) | Future: replace `createdBy: "system"` with real users |

---

## Documentation Principles

1. **Current State Only**: Documentation describes implemented features, not plans
2. **Git for History**: Use Git history instead of manual rollback documents
3. **Minimal Maintenance**: Keep docs lean to prevent staleness
4. **Actionable TODOs**: Implementation docs have clear checklists

---

## Documentation History

| Date | Change |
|------|--------|
| Dec 16, 2025 | Created Requirements.md, removed features/ folder |
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

**Last Updated:** December 16, 2025
