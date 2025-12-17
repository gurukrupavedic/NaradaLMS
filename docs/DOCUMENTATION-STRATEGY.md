# Documentation Cleanup & Consolidation Strategy

**Date:** December 17, 2025  
**Status:** Proposed Strategy (Not yet implemented)

---

## Current State: The Mess

### Problems Identified

1. **Duplicates & Versions:**
   - `PHASE-0-COMPLETE.md` vs `PHASE-0-COMPLETE-v2.md` (which one is current?)
   - README.md references old folder structure (`implementation/`) that doesn't match actual folders

2. **Outdated Content:**
   - `braindump.md` - Appears to be old design thinking, unclear purpose
   - `MIGRATION-ROADMAP.md` - Phase 0 was already done; is this still relevant?
   - `OPTION-B-VISUAL-GUIDE.md` - Phase 1 design decisions were made; is this still needed?
   - TODO folder vs scattered Phase completion docs
   - `GIT-BRANCHING-STRATEGY.md` - After Phase 1 merge, workflow may have evolved

3. **Unclear Hierarchy:**
   - Architecture docs scattered: `ARCHITECTURE.md`, `ADR-*.md` in subfolder, `MODULE-*.md`
   - Phase docs at root level mixed with strategic docs
   - No clear "current state" reference document

4. **Missing:** 
   - Single source of truth for system state (what's done, what's pending)
   - Clear entry point for new developers
   - Separation of: completed work (historical) vs active work (current phase) vs future work

---

## Proposed Folder Structure

```
docs/
├── README.md                           # Single entry point - quick nav + current status
├── INDEX.md                            # Comprehensive doc registry (all files + purpose)
├── 00-GETTING-STARTED.md              # For new developers: setup, key concepts, where to read
│
├── 01-SYSTEM/                         # What the system does
│   ├── SYSTEM-OVERVIEW.md             # Features, user roles, workflows (from PRD)
│   ├── DATABASE-SCHEMA.md             # Current schema, relationships, design decisions
│   └── API-REFERENCE.md               # All endpoints, request/response, auth requirements
│
├── 02-ARCHITECTURE/                   # How it's built
│   ├── TECH-STACK.md                  # Languages, frameworks, versions, why chosen
│   ├── PROJECT-STRUCTURE.md           # Folder layout, file organization, naming conventions
│   ├── DESIGN-SYSTEM.md               # UI components, colors, typography, Tailwind config
│   ├── DEVELOPMENT-WORKFLOW.md        # npm scripts, dev server, build process, debugging
│   └── ADRs/                          # Architecture Decision Records (lightweight, dated)
│       ├── ADR-001-Modular-Monolith.md
│       ├── ADR-002-Auth-Strategy.md
│       └── ... (one file per decision, ~2-3 pages each)
│
├── 03-IMPLEMENTATION-GUIDES/          # How to implement new features
│   ├── ADDING-FEATURES.md             # Step-by-step template for new features
│   ├── DATABASE-MIGRATIONS.md         # How to add tables/columns, testing
│   ├── API-ENDPOINT-PATTERN.md        # How to add new API routes
│   ├── COMPONENT-DEVELOPMENT.md       # React component patterns, styling guide
│   └── TESTING-STRATEGY.md            # Manual vs automated, what to test
│
├── 04-PHASES/                         # Completed work (historical record)
│   ├── PHASE-0.md                     # Consolidated: what was delivered, PRs involved
│   ├── PHASE-1.md                     # Consolidated: what was delivered, testing summary
│   ├── PHASE-2-PLAN.md                # Planned: scope, options, decision framework
│   └── ... (one file per phase, read-only historical record)
│
├── 05-TROUBLESHOOTING/                # How to fix common problems
│   ├── COMMON-ERRORS.md               # TypeScript errors, runtime issues, how to fix
│   ├── DATABASE-ISSUES.md             # Connection problems, migrations, resets
│   ├── BUILD-ISSUES.md                # npm run build failures, dependency conflicts
│   └── ROLLBACK-PROCEDURES.md         # How to revert breaking changes (Phase 0, 1, etc.)
│
├── 06-REFERENCE/                      # Quick lookups
│   ├── CONSTANTS.md                   # All config constants (SCRIPTS, ROLES, etc.)
│   ├── TYPE-GLOSSARY.md               # All TypeScript types used in codebase
│   ├── COMMIT-CONVENTION.md           # Git commit message format (your standard)
│   └── NAMING-CONVENTIONS.md          # Variable, function, component naming rules
│
└── _ARCHIVE/                          # Old docs (kept for reference, not active)
    ├── PHASE-0-COMPLETE.md
    ├── PHASE-0-COMPLETE-v2.md
    ├── braindump.md
    ├── GIT-BRANCHING-STRATEGY.md
    ├── MIGRATION-ROADMAP.md
    ├── OPTION-B-VISUAL-GUIDE.md
    ├── TODO/                          # Old task tracking
    └── architecture/ (old ADRs)
```

---

## Consolidation Plan

### Phase 2A: Quick Wins (1-2 hours)

**Move to Archive:**
- [x] `PHASE-0-COMPLETE.md` → `_ARCHIVE/PHASE-0-COMPLETE.md` (superseded by PHASE-0-COMPLETE-v2)
- [x] `PHASE-0-COMPLETE-v2.md` → Keep but rename to `04-PHASES/PHASE-0.md` (consolidate & update)
- [x] `TODO/` folder → `_ARCHIVE/TODO/` (Phase 1 is done; tasks are historical)
- [x] `OPTION-B-VISUAL-GUIDE.md` → `_ARCHIVE/` (Phase 1 decisions made)
- [x] `braindump.md` → `_ARCHIVE/` (appears to be old thinking)
- [x] `GIT-BRANCHING-STRATEGY.md` → `_ARCHIVE/` (update with new PR-based workflow)
- [x] `MIGRATION-ROADMAP.md` → `_ARCHIVE/` (replaced by Phase-based docs)
- [x] `architecture/` subfolder → `02-ARCHITECTURE/ADRs/` (flatten structure)

**Create New Root Files:**
1. **`INDEX.md`** - Comprehensive registry of all docs with 1-line summaries
2. **`00-GETTING-STARTED.md`** - New developer onboarding (30 min read)

**Update Existing:**
- `README.md` - Simplify to quick nav + link to INDEX.md + current status section

---

### Phase 2B: Consolidation (2-3 hours)

**Consolidate by Topic:**

1. **Authentication** (Scattered across ADR-002, AUTH-SMOKE-TEST, etc.)
   - Create: `02-ARCHITECTURE/AUTHENTICATION.md`
   - Include: strategy, OAuth config, session management, approval workflow, testing steps
   - Delete: `AUTH-SMOKE-TEST.md` → Move content to `05-TROUBLESHOOTING/TESTING-STRATEGY.md` or `03-IMPLEMENTATION-GUIDES/TESTING-STRATEGY.md`

2. **Architecture Docs** (ADR-001 + ADR-002 + MODULE-*.md + ARCHITECTURE.md)
   - Keep existing `ADR-*.md` files (they're good reference material)
   - Create: `02-ARCHITECTURE/PROJECT-STRUCTURE.md` (explain folder layout, not duplicated elsewhere)
   - Create: `02-ARCHITECTURE/DESIGN-SYSTEM.md` (from PROJECT_DOCUMENTATION.md section)
   - Rename: `ARCHITECTURE.md` → `02-ARCHITECTURE/TECH-STACK.md` (clarify scope)

3. **Phase Docs** (PHASE-0, PHASE-1, PRD, braindump, etc.)
   - Consolidate `PHASE-0-COMPLETE-v2.md` + implementation notes → `04-PHASES/PHASE-0.md`
   - Create `04-PHASES/PHASE-1.md` from Phase 1 commit message + AUTH-SMOKE-TEST.md
   - Create `04-PHASES/PHASE-2-PLAN.md` from options offered to user
   - Archive old versions

4. **Reference Material** (PRD, PROJECT_DOCUMENTATION, design system info)
   - Keep `PROJECT_DOCUMENTATION.md` at root (it's 1400+ lines; good reference)
   - Create: `01-SYSTEM/SYSTEM-OVERVIEW.md` (distill PRD + PROJECT_DOCUMENTATION into ~200 lines)
   - Create: `06-REFERENCE/TYPE-GLOSSARY.md` (from shared/types.ts)

---

### Phase 2C: New Templates & Docs (3-4 hours)

**Create Implementation Guides:**
1. `03-IMPLEMENTATION-GUIDES/ADDING-FEATURES.md` - Feature checklist template
2. `03-IMPLEMENTATION-GUIDES/DATABASE-MIGRATIONS.md` - How to modify schema safely
3. `03-IMPLEMENTATION-GUIDES/API-ENDPOINT-PATTERN.md` - Express route structure
4. `03-IMPLEMENTATION-GUIDES/COMPONENT-DEVELOPMENT.md` - React patterns from codebase
5. `03-IMPLEMENTATION-GUIDES/TESTING-STRATEGY.md` - Manual + automated testing

**Create Reference Docs:**
1. `06-REFERENCE/CONSTANTS.md` - All exported constants (SCRIPTS, ROLES, colors)
2. `06-REFERENCE/NAMING-CONVENTIONS.md` - Your standards (file naming, component naming)
3. `06-REFERENCE/COMMIT-CONVENTION.md` - Git message format

**Create Troubleshooting Docs:**
1. `05-TROUBLESHOOTING/COMMON-ERRORS.md` - TypeScript errors, import issues, build failures
2. `05-TROUBLESHOOTING/DATABASE-ISSUES.md` - Connection, migration, reset problems
3. `05-TROUBLESHOOTING/BUILD-ISSUES.md` - npm run build, vite, esbuild errors
4. `05-TROUBLESHOOTING/ROLLBACK-PROCEDURES.md` - Phase 0/1 rollback steps (from rollback/ folder)

---

## Implementation Order

### Priority 1: Entry Point (1 hour)
1. Create `00-GETTING-STARTED.md` (new developer onboarding)
2. Create `INDEX.md` (doc registry)
3. Update `README.md` (simple nav)

### Priority 2: Archive Old Docs (30 min)
1. Create `_ARCHIVE/` folder
2. Move all superseded docs
3. Add README to `_ARCHIVE/` explaining content

### Priority 3: Consolidate Core Architecture (2 hours)
1. Flatten `architecture/` → `02-ARCHITECTURE/ADRs/`
2. Create `02-ARCHITECTURE/PROJECT-STRUCTURE.md`
3. Create `02-ARCHITECTURE/DESIGN-SYSTEM.md`
4. Consolidate ARCHITECTURE.md → TECH-STACK.md

### Priority 4: Consolidate Phases (1.5 hours)
1. Create `04-PHASES/PHASE-0.md` (from v2 + v1)
2. Create `04-PHASES/PHASE-1.md` (from commit message + tests)
3. Create `04-PHASES/PHASE-2-PLAN.md` (from your notes)

### Priority 5: Create Implementation Guides (3 hours)
1. Extract patterns from existing code
2. Create 5 guide templates
3. Add examples from codebase

### Priority 6: Create Reference Docs (2 hours)
1. Extract constants → `CONSTANTS.md`
2. Extract types → `TYPE-GLOSSARY.md`
3. Codify your standards → `NAMING-CONVENTIONS.md`

**Total Time Estimate:** 9-11 hours (can spread across multiple sessions)

---

## Success Criteria

✅ New developer can read `00-GETTING-STARTED.md` and understand the system in 30 min  
✅ `INDEX.md` lists every doc with 1-line purpose  
✅ No more than 2-3 files for each topic (no scattered duplication)  
✅ Phase docs are read-only historical records (clear what was delivered)  
✅ Implementation guides have real code examples  
✅ All old versions in `_ARCHIVE/` with clear reason why archived  
✅ README.md links to correct starting point based on user role:
  - New developer → `00-GETTING-STARTED.md`
  - Feature implementer → `03-IMPLEMENTATION-GUIDES/`
  - System questions → `01-SYSTEM/`
  - Bug fixer → `05-TROUBLESHOOTING/`

---

## Decision Points for User

### Option A: Start with Priority 1 + 2 (Quick cleanup)
- Just organize what exists, move to archive
- Minimal new writing
- **Time:** 1.5 hours
- **Result:** Cleaner structure, but fewer guides

### Option B: Full Consolidation (Recommended)
- Do Priority 1-6 over 2-3 sessions
- Creates complete knowledge base
- **Time:** 9-11 hours total
- **Result:** Professional documentation, easy onboarding

### Option C: Hybrid (Balanced)
- Do Priority 1-4 now (5 hours)
- Do Priority 5-6 as new features are implemented
- **Time:** Spread over time
- **Result:** Docs grow with project

---

## Which approach should we take?

