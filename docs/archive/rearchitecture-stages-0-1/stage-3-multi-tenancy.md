# Stage 3: Multi-Tenancy (OrgID Data Isolation)

**Version**: 1.0  
**Date**: 2026-01-31  
**Status**: Framework (To Be Detailed)

---

## Overview

**Goal**: Implement organization-based data isolation with OrgID column  
**Duration**: TBD (estimate 3-4 days)  
**Branch**: `stage-3-multi-tenancy`

**Core Principle**: Every database query must be filtered by organization ID to ensure complete data isolation between tenants.

**Why This Stage**: With theming in place (Stage 2), we can now add the data layer to support true multi-tenancy where each organization's data is isolated.

---

## Prerequisites

**Before Starting Stage 3**:

- [ ] **Stage 2 MUST be complete** and merged to `main`
- [ ] All Stage 2 validation criteria passed
- [ ] Theme system working for multiple orgs
- [ ] Create new baseline tag: `git tag baseline-post-stage-2`
- [ ] **CRITICAL**: Backup database before schema changes

---

## Branching Strategy

### Branch Structure

```
main (protected, contains baseline-post-stage-2 tag)
  └── stage-3-multi-tenancy
        ├── phase-3-X-organizations-table
        ├── phase-3-X-schema-migration
        ├── phase-3-X-api-middleware
        ├── phase-3-X-jwt-updates
        └── phase-3-X-validation
```

### Workflow

Same as previous stages: create phase branches, validate, merge to stage branch, get approval.

---

## High-Level Approach

### Database Changes

**Phase 3.1: Create Organizations Table**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create default organization
INSERT INTO organizations (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Narada LMS', 'narada');
```

**Phase 3.2: Add org_id to Core Tables**

From `schema-baseline.md` analysis:

```sql
-- High priority tables
ALTER TABLE tracks ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE chapters ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE batches ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE enrollments ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE student_progress ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE audit_logs ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Backfill with default org
UPDATE tracks SET org_id = '00000000-0000-0000-0000-000000000001';
UPDATE chapters SET org_id = '00000000-0000-0000-0000-000000000001';
UPDATE batches SET org_id = '00000000-0000-0000-0000-000000000001';
UPDATE enrollments SET org_id = '00000000-0000-0000-0000-000000000001';
UPDATE student_progress SET org_id = '00000000-0000-0000-0000-000000000001';
UPDATE audit_logs SET org_id = '00000000-0000-0000-0000-000000000001';

-- Make NOT NULL after backfill
ALTER TABLE tracks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE chapters ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE batches ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE enrollments ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE student_progress ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN org_id SET NOT NULL;

-- Add indexes for performance
CREATE INDEX idx_tracks_org_id ON tracks(org_id);
CREATE INDEX idx_chapters_org_id ON chapters(org_id);
CREATE INDEX idx_batches_org_id ON batches(org_id);
CREATE INDEX idx_enrollments_org_id ON enrollments(org_id);
CREATE INDEX idx_student_progress_org_id ON student_progress(org_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
```

**Phase 3.3: User-Organization Relationship**

Users can belong to multiple organizations:

```sql
CREATE TABLE user_organizations (
  user_id VARCHAR(255) REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  roles JSONB, -- ["student", "instructor", etc.]
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(org_id);
```

### API Middleware Changes

**Phase 3.4: OrgID Filter Middleware**

Create `apps/api/src/middleware/org-filter.middleware.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';

export interface OrgRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    status: string;
    currentOrgId: string; // Added in Stage 3
  };
  orgId?: string;
}

export function orgFilter(req: OrgRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const orgId = req.user.currentOrgId;
  if (!orgId) {
    return res.status(400).json({ error: 'No organization context' });
  }

  req.orgId = orgId;
  next();
}
```

**Apply to all protected routes**:

```typescript
// Before
router.get('/tracks', jwtAuth, getTracksHandler);

// After
router.get('/tracks', jwtAuth, orgFilter, getTracksHandler);
```

**Update handlers to use orgId**:

```typescript
async function getTracksHandler(req: OrgRequest, res: Response) {
  const { orgId } = req;
  
  const tracks = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.orgId, orgId));
  
  res.json(tracks);
}
```

### JWT Payload Changes

**Phase 3.5: Update JWT Structure**

**Current Payload** (Stage 0-2):

```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "roles": ["student"],
  "status": "active"
}
```

**New Payload** (Stage 3):

```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "roles": ["student"],
  "status": "active",
  "currentOrgId": "org-uuid",
  "availableOrgs": [
    { "orgId": "org-uuid-1", "roles": ["student"] },
    { "orgId": "org-uuid-2", "roles": ["instructor"] }
  ]
}
```

**Update `server/auth/jwt.utils.ts`**:

```typescript
export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  status: string;
  currentOrgId: string; // NEW
  availableOrgs?: Array<{ orgId: string; roles: string[] }>; // NEW
}
```

### Frontend Changes

**Phase 3.6: Org Context in Portals**

**Student Portal**:

- User selects org on login (if multiple)
- Org context persisted in localStorage with JWT
- All API calls include orgId (implicitly via JWT)

**Admin Portal**:

- Superadmin can switch between orgs
- Org selector in navbar
- Updates JWT's currentOrgId

---

## Key Decisions

**Decision 3.1**: Can users belong to multiple organizations?

- **Recommendation**: Yes (junction table approach)
- **Rationale**: Instructors may teach at multiple institutions

**Decision 3.2**: How does user switch between orgs?

- **Option A**: Re-login with different org
- **Option B**: In-app org switcher (updates JWT)
- **Recommendation**: Option B for better UX

**Decision 3.3**: Who manages organizations?

- **Recommendation**: Superadmin role (above org-level admin)

**Decision 3.4**: Shared data across orgs?

- **Question**: Can curriculum (tracks/chapters) be shared?
- **Recommendation**: Initially no - each org owns its data. Future: shared library feature.

---

## Tentative Phases

**Phase 3.1**: Create organizations table and default org  
**Phase 3.2**: Add org_id to core tables with backfill  
**Phase 3.3**: Create user_organizations junction table  
**Phase 3.4**: Update API middleware with orgFilter  
**Phase 3.5**: Update JWT payload structure  
**Phase 3.6**: Update all query handlers to filter by orgId  
**Phase 3.7**: Add org switcher UI (for multi-org users)  
**Phase 3.8**: Validation & testing  

---

## Validation Criteria

**Data Isolation**:

- [ ] User in Org A cannot see Org B's tracks
- [ ] User in Org A cannot see Org B's batches
- [ ] User in Org A cannot see Org B's students
- [ ] Audit logs are org-specific

**Multi-Org Users**:

- [ ] User can belong to multiple orgs
- [ ] User can switch between orgs
- [ ] Switching orgs updates JWT
- [ ] Data shown matches selected org

**Superadmin**:

- [ ] Can view all organizations
- [ ] Can create new organizations
- [ ] Can manage themes per org

---

## Stage 3 Completion Gate

**Before declaring Stage 3 complete**:

- [ ] All core tables have org_id
- [ ] All queries filter by org_id
- [ ] JWT includes currentOrgId
- [ ] Org switcher works
- [ ] Data isolation verified via tests
- [ ] No data leakage between orgs

---

## Next Steps

After Stage 3:

- **Celebrate!** 🎉 Full multi-tenant architecture complete
- **Optimize**: Add caching, performance tuning
- **Deploy**: Production rollout
- **Monitor**: Set up observability
- **Iterate**: Gather user feedback

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Owner**: Narada LMS Team  
**Status**: This is a framework document. Detailed implementation plan will be created after Stage 2 completion and user approval.
