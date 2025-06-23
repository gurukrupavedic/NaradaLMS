# Vedic Learning Management System - Documentation

This is the central documentation hub for the Vedic LMS project. Use this guide to understand the documentation structure and find the right document for your needs.

## **Documentation Organization**

### **When to Create Documents**

**Architecture Changes** → `architecture/ADR-XXX-Title.md`
- Major technical decisions affecting system design
- Authentication strategies, database choices, API structures
- Format: Date, Status, Decision, Rationale, Consequences

**Implementation Tasks** → `implementation/TODO-Feature-Name.md`
- Step-by-step implementation guides for planned features
- Detailed task breakdowns with timelines and dependencies
- Code examples and migration strategies

**Bug Fixes & Issues** → `troubleshooting/issue-description.md`
- Technical problem analysis and solutions
- Root cause investigations with reproduction steps
- Fix implementation and testing procedures

**New Features** → `features/feature-name.md`
- Feature specifications and requirements
- Implementation plans and technical considerations
- User experience and API design documentation

**System Rollbacks** → `rollback/FEATURE_ROLLBACK_POINT.md`
- Complete restoration procedures for major changes
- File snapshots and verification checklists
- Emergency recovery instructions

**Historical Reference** → `deprecated-ideas/feature-analysis.md`
- Documentation of abandoned approaches
- Restoration guides for previous implementations
- Decision rationale for deprecation

## **Current System Status**

- Progressive Mapping: Backend integration complete with database persistence
- Content Management: Track, chapter, and segment CRUD operations functional
- Audio Processing: File upload and media segmentation working
- Authentication: Planned for future implementation (see ADR-001)
- Learning Module: Student interface planned
- User Roles: Content manager vs student permissions planned

## **Key Technical Decisions**

1. **Database Schema:** PostgreSQL with Drizzle ORM
2. **Frontend:** React with TypeScript, Vite build system
3. **Backend:** Express.js with type-safe API routes
4. **Authentication Strategy:** Frontend-explicit user attribution (ADR-001)
5. **Storage:** Database-first with graceful fallbacks

## **Quick Navigation by Need**

**Need to implement authentication?**
→ `implementation/TODO-Authentication-Integration.md`

**Planning code refactoring?**
→ `architecture/ADR-002-Code-Cleanup-Roadmap.md`

**System broken or unstable?**
→ `rollback/` (find appropriate rollback point)

**Experiencing text segmentation issues?**
→ `troubleshooting/text-segmentation-selection-time-normalization.md`

**Researching past implementations?**
→ `deprecated-ideas/`

**Making architectural decisions?**
→ Create new ADR in `architecture/`

---

**Last Updated:** December 23, 2024  
**Maintainer:** Development Team