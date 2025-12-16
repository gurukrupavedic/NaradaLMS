# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project.

---

## Documentation Structure

```
docs/
├── README.md              (This file - documentation index)
├── PRD.md                 (Complete Product Requirements Document)
└── implementation/        (TODO items - features not yet implemented)
    ├── frontend-cleanup-todo.md
    ├── link-status-error-detection.md
    └── TODO-Authentication-Integration.md
```

---

## Quick Navigation

### Core Document

**[PRD.md](./PRD.md)** - Complete Product Requirements Document

Contains everything about the system:
- Executive summary and core capabilities
- Technology stack (React, Express, PostgreSQL)
- Data model and entity relationships
- Typography system (3 scripts with custom fonts)
- Rich text editor specification
- Text segmentation workflow
- Audio-text mapping system
- Learning experience (Learn Mode toggle)
- User interface and routes
- API reference
- Testing checklists
- Component reference

### TODO Items (implementation/)

| Document | Description |
|----------|-------------|
| [frontend-cleanup-todo.md](./implementation/frontend-cleanup-todo.md) | Unused code to remove (Topics 2 & 3 remaining) |
| [link-status-error-detection.md](./implementation/link-status-error-detection.md) | Future: broken link detection and repair |
| [TODO-Authentication-Integration.md](./implementation/TODO-Authentication-Integration.md) | Future: replace `createdBy: "system"` with real users |

---

## Documentation Principles

1. **Single Source of Truth**: All requirements in PRD.md
2. **Current State Only**: Documentation describes implemented features, not plans
3. **Git for History**: Use Git history instead of manual rollback documents
4. **Actionable TODOs**: Implementation docs have clear checklists

---

## Documentation History

| Date | Change |
|------|--------|
| Dec 16, 2025 | Consolidated ARCHITECTURE.md + Requirements.md into PRD.md |
| Dec 16, 2025 | Created Requirements.md, removed features/ folder |
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

**Last Updated:** December 16, 2025
