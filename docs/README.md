# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project.

---

## Documentation Structure

```
docs/
├── README.md              (This file - documentation index)
├── PRD.md                 (Product Requirements - what the system does)
├── ARCHITECTURE.md        (Technical Architecture - how it's built)
└── implementation/        (TODO items - features not yet implemented)
    ├── frontend-cleanup-todo.md
    └── link-status-error-detection.md
```

---

## Quick Navigation

### Core Documents

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | **Product Requirements** - Functional specifications, user flows, UI requirements |
| [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | **Technical Architecture** - Tech stack, data model, API patterns, component structure |

### TODO Items (implementation/)

| Document | Description |
|----------|-------------|
| [frontend-cleanup-todo.md](./implementation/frontend-cleanup-todo.md) | Unused code to remove (Topics 2 & 3 remaining) |
| [link-status-error-detection.md](./implementation/link-status-error-detection.md) | Future: broken link detection and repair |
| (removed) | Authentication integration doc removed after implementation was completed |

---

## Document Scope

### PRD.md (What)
- Executive summary and core capabilities
- Content hierarchy (tracks, chapters, audio, segments)
- Typography system (fonts, sizes, scenarios)
- Rich text editor specification
- Text segmentation workflow
- Audio-text mapping workflow
- Learning experience (Learn Mode toggle)
- User interface requirements
- User flows
- Testing checklists

### ARCHITECTURE.md (How)
- Technology stack (React, Express, PostgreSQL, etc.)
- Application structure and path aliases
- Data model with entity relationships
- API architecture and endpoints
- State management approach
- Frontend routes and components
- Development commands

---

## Documentation Principles

1. **Separation of Concerns**: PRD for requirements, ARCHITECTURE for implementation
2. **Current State Only**: Documentation describes implemented features, not plans
3. **Git for History**: Use Git history instead of manual rollback documents
4. **Actionable TODOs**: Implementation docs have clear checklists

---

## Documentation History

| Date | Change |
|------|--------|
| Dec 16, 2025 | Split PRD.md and ARCHITECTURE.md into separate documents |
| Dec 16, 2025 | Created consolidated PRD.md, removed features/ folder |
| Dec 16, 2025 | Major cleanup: removed 14 outdated files, created ARCHITECTURE.md |
| Oct 28, 2025 | Font standardization documentation |

---

**Last Updated:** December 16, 2025
