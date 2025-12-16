# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project.

---

## Documentation Structure

```
docs/
├── README.md              (This file - documentation index)
├── ARCHITECTURE.md        (System architecture overview)
├── features/              (Feature specifications)
│   ├── font-requirements.md
│   ├── link-status-error-detection.md
│   └── rich-text-editor-requirements.md
└── implementation/        (Active TODOs and technical analysis)
    ├── frontend-cleanup-todo.md
    ├── dual-mapping-system-analysis.md
    └── TODO-Authentication-Integration.md
```

---

## Quick Navigation

### Understanding the System
**Start here** → [ARCHITECTURE.md](./ARCHITECTURE.md)  
Complete overview of the technology stack, data model, user flows, and key components.

### Active Implementation Work

| Document | Description |
|----------|-------------|
| [frontend-cleanup-todo.md](./implementation/frontend-cleanup-todo.md) | Unused code to remove (Topics 2 & 3 remaining) |
| [dual-mapping-system-analysis.md](./implementation/dual-mapping-system-analysis.md) | Technical debt: two parallel mapping systems |
| [TODO-Authentication-Integration.md](./implementation/TODO-Authentication-Integration.md) | Future: replace `createdBy: "system"` with real users |

### Feature Specifications

| Document | Description |
|----------|-------------|
| [font-requirements.md](./features/font-requirements.md) | Typography system for Telugu, Devanagari, IAST scripts |
| [rich-text-editor-requirements.md](./features/rich-text-editor-requirements.md) | TipTap editor configuration and behavior |
| [link-status-error-detection.md](./features/link-status-error-detection.md) | Content validation and error detection |

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
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

**Last Updated:** December 16, 2025
