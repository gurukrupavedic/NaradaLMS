# Vedic Learning Management System - Documentation

This directory contains architectural decisions, implementation guides, and technical documentation for the Vedic LMS.

## **Directory Structure**

```
docs/
├── architecture/          # Architectural Decision Records (ADRs)
├── implementation/       # Implementation guides and TODOs  
├── api/                 # API documentation (future)
└── deployment/          # Deployment guides (future)
```

## **Architecture Decisions**

### **ADR-001: Authentication Integration Strategy**
**Status:** Accepted  
**Summary:** Defines how to integrate user authentication and role-based access control without breaking existing progressive mapping functionality. Recommends frontend-explicit user attribution approach.

## **Implementation Guides**

### **Authentication Integration TODO**
**Status:** Future Implementation  
**Summary:** Detailed implementation plan for adding user authentication and role-based permissions to the system. Includes migration strategy for current hardcoded "system" user values.

## **Current System Status**

- ✅ **Progressive Mapping:** Backend integration complete with database persistence
- ✅ **Content Management:** Track, chapter, and segment CRUD operations functional
- ✅ **Audio Processing:** File upload and media segmentation working
- 🔄 **Authentication:** Planned for future implementation
- 🔄 **Learning Module:** Student interface planned
- 🔄 **User Roles:** Content manager vs student permissions planned

## **Key Technical Decisions**

1. **Database Schema:** Using PostgreSQL with Drizzle ORM
2. **Frontend:** React with TypeScript, Vite build system
3. **Backend:** Express.js with type-safe API routes
4. **Authentication Strategy:** Frontend-explicit user attribution (see ADR-001)
5. **Storage:** Database-first with graceful fallbacks

## **Development Workflow**

1. **Architecture Changes:** Create ADR in `architecture/`
2. **Feature Implementation:** Create TODO in `implementation/`
3. **API Changes:** Document in `api/` (when created)
4. **Deployment:** Document in `deployment/` (when needed)

---

**Last Updated:** December 23, 2024  
**Maintainer:** Development Team