# Stage 2: Chameleonization (Multi-Branding)

**Version**: 1.0  
**Date**: 2026-01-31  
**Status**: Framework (To Be Detailed)

---

## Overview

**Goal**: Enable theme-based multi-branding for student portals  
**Duration**: TBD (estimate 2-3 days)  
**Branch**: `stage-2-chameleon`

**Core Principle**: Transform the student portal into a "chameleon" that adapts its look and feel based on organization configuration without duplicating code.

**Why This Stage**: Before adding multi-tenancy data isolation (Stage 3), we need the frontend infrastructure to support organization-specific branding.

---

## Prerequisites

**Before Starting Stage 2**:

- [ ] **Stage 1 MUST be complete** and merged to `main`
- [ ] All Stage 1 validation criteria passed
- [ ] 3-container architecture running smoothly
- [ ] Create new baseline tag: `git tag baseline-post-stage-1`
- [ ] Backup database: `pg_dump naradalms > backup_stage2_$(date +%Y%m%d).sql`

---

## Branching Strategy

### Branch Structure

```
main (protected, contains baseline-post-stage-1 tag)
  └── stage-2-chameleon
        ├── phase-2-X-theme-schema
        ├── phase-2-X-theme-loader
        ├── phase-2-X-asset-management
        └── phase-2-X-validation
```

### Workflow

Same as Stage 0 and Stage 1: create phase branches, validate, merge to stage branch, get approval.

---

## High-Level Approach

### Key Decisions Needed

**Decision 2.1**: Subdomain vs. Single Domain

- **Option A**: `student.org1.com`, `student.org2.com` (subdomain-based routing)
- **Option B**: `student.narada.com` → Theme loaded from DB by user's orgID
- **Recommendation**: TBD based on deployment architecture

**Decision 2.2**: Theme Storage

- **Option A**: Database (themes table)
- **Option B**: Config files committed to repo
- **Option C**: External CMS/storage
- **Recommendation**: Database for flexibility

**Decision 2.3**: Asset Storage

- **Option A**: S3/Cloud storage with org-specific prefixes
- **Option B**: Local storage with org-specific folders
- **Recommendation**: Cloud storage (prepare for scale)

### Tentative Phases

**Phase 2.1: Theme Schema & Data Model**

- Create `organizations` table
- Create `themes` table
- Define theme structure (colors, logo URLs, brand name)

**Phase 2.2: Theme Loader & Runtime Injection**

- Middleware to detect org (subdomain or user context)
- Load theme from database
- Inject CSS variables at runtime

**Phase 2.3: Asset Management**

- Upload org-specific logos
- Store in cloud storage with org prefix
- Update AuthPage to use org logo

**Phase 2.4: Validation & Testing**

- Test with 2+ mock organizations
- Verify theme switching works
- Ensure no cross-contamination

### Example Theme Structure

```typescript
interface Theme {
  id: string;
  orgId: string;
  brandName: string;
  logoUrl: string;
  logoStackedUrl: string;
  faviconUrl: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };
  typography: {
    fontFamily: string;
  };
  customCss?: string; // advanced customization
}
```

---

## API Changes Needed

- `GET /api/themes/:orgId` - Fetch theme for organization
- `PUT /api/themes/:orgId` - Update theme (admin only)
- `POST /api/media/upload/logo` - Upload org logo

---

## Frontend Changes Needed

**Student Portal**:

- Theme loader hook (`useTheme`)
- CSS variable injection
- Logo dynamic loading
- Brand name substitution

**Ops Portal** (Admin):

- Theme editor UI
- Logo uploader
- Color picker
- Preview mode

---

## Stage 2 Completion Gate

**Before proceeding to Stage 3**:

- [ ] Can create new organization with custom theme
- [ ] Student portal displays org-specific branding
- [ ] Logo, colors, brand name all customizable
- [ ] Theme changes reflect immediately
- [ ] No theme leakage between orgs

---

## Next Steps

After Stage 2:

- **Proceed to Stage 3**: Multi-tenancy with data isolation

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Owner**: Narada LMS Team  
**Status**: This is a framework document. Detailed implementation plan will be created after Stage 1 completion and user approval.
