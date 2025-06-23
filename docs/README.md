# Vedic Learning Management System - Documentation

This directory contains architectural decisions, implementation guides, troubleshooting docs, and technical documentation for the Vedic LMS.

## **Directory Structure**

```
docs/
├── architecture/          # Architectural Decision Records (ADRs)
├── implementation/       # Implementation guides and TODOs  
├── troubleshooting/      # Bug fixes and technical issue resolution
├── features/            # Feature specifications and implementation plans
├── rollback/           # Rollback points and restoration guides
├── deprecated-ideas/    # Historical documentation of deprecated approaches
├── planning/           # Future planning documents (reserved)
└── README.md           # This file
```

## **Architecture Decisions (ADRs)**

### **ADR-001: Authentication Integration Strategy**
**Status:** Accepted  
**Summary:** Defines how to integrate user authentication and role-based access control without breaking existing progressive mapping functionality. Recommends frontend-explicit user attribution approach.

### **ADR-002: Code Cleanup Roadmap**
**Status:** Planning Document  
**Summary:** Comprehensive analysis of code cleanup tasks for ChapterEditor architecture simplification and component separation.

### **ADR-003: URL Structure and File Naming**
**Status:** Planning Document  
**Summary:** Architectural plan for cleaner URL structure and file naming conventions for future code cleanup phases.

## **Implementation Guides**

### **Authentication Integration TODO**
**Status:** Future Implementation  
**Summary:** Detailed implementation plan for adding user authentication and role-based permissions to the system. Includes migration strategy for current hardcoded "system" user values.

## **Feature Documentation**

### **Link Status Error Detection**
**Status:** Implementation Plan  
**Summary:** Comprehensive error detection for segment-to-audio mappings to identify broken links and display indicators in the UI.

## **Troubleshooting & Issues**

### **Text Segmentation Selection-Time Normalization**
**Status:** Critical TODO  
**Summary:** Fix for text corruption in segmentation functionality due to position calculation mismatches between browser selection and stored content.

### **Migration Gap Analysis**
**Status:** Documentation  
**Summary:** Analysis of critical gaps from experimental-to-production migration and future resolution plan.

## **Rollback Documentation**

### **Visual Integration Rollback Point**
**Status:** Production-ready  
**Summary:** Backend mapping integration with timestamp pill display - complete restoration guide.

### **Progressive Mapping Rollback Point**
**Status:** Production-ready  
**Summary:** Complete progressive mapping backend integration with full rollback procedures.

### **System Rollback Points**
**Status:** Safety checkpoints  
**Summary:** 8 comprehensive rollback points for admin path cleanup, migration, and feature implementations.

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

## **Quick Navigation**

- **📋 [Complete Index](./INDEX.md)** - All documents organized by type, priority, and component
- **🚀 [Quick Reference](./QUICK_REFERENCE.md)** - When to use which document
- **📝 [Development TODOs](./TODO.md)** - Current action items

---

**Last Updated:** December 23, 2024  
**Maintainer:** Development Team