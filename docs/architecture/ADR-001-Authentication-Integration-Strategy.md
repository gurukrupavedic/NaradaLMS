# ADR-001: Authentication Integration Strategy for Progressive Mapping

**Date:** December 23, 2024  
**Status:** Accepted  
**Deciders:** Development Team  
**Context:** Progressive mapping backend integration completed, preparing for future authentication system

## **Context and Problem Statement**

The Vedic Learning Management System currently uses hardcoded `createdBy: "system"` values for all database operations. We need to define how to integrate user authentication and role-based access control without breaking existing functionality.

**Key Requirements:**
- Support Content Managers (create/edit content) vs Students (read-only learning)
- Maintain audit trail of who created/modified content
- Implement role-based permissions
- Preserve existing progressive mapping functionality

## **Decision Drivers**

1. **Minimal Breaking Changes** - Preserve current working progressive mapping
2. **Clear Audit Trail** - Know who performed what actions
3. **Role-Based Security** - Different permissions for different user types
4. **Development Simplicity** - Easy to implement and maintain
5. **Future Flexibility** - Support evolving authentication requirements

## **Considered Options**

### **Option A: Frontend-Explicit User Attribution (CHOSEN)**
Frontend explicitly provides user ID in all mutations.

**Current State:**
```typescript
createMappingMutation.mutate({
  segmentId: parseInt(mapping.segmentId),
  audioFileId: selectedAudioFile.id,
  startTime: mapping.startTime,
  endTime: mapping.endTime,
  createdBy: "system" // ← Hardcoded for now
});
```

**With Authentication:**
```typescript
const { currentUser } = useAuth();
createMappingMutation.mutate({
  segmentId: parseInt(mapping.segmentId),
  audioFileId: selectedAudioFile.id,
  startTime: mapping.startTime,
  endTime: mapping.endTime,
  createdBy: currentUser.id // ← Replace with real user
});
```

### **Option B: Backend-Implicit User Injection (REJECTED)**
Backend automatically injects user ID from session context.

**Would Require:**
```typescript
// Backend middleware for every route
app.use(async (req, res, next) => {
  req.user = await getUserFromSession(req);
  next();
});

// Frontend sends no user ID
createMappingMutation.mutate({
  segmentId: parseInt(mapping.segmentId),
  audioFileId: selectedAudioFile.id,
  startTime: mapping.startTime,
  endTime: mapping.endTime
  // ← Backend injects createdBy
});
```

## **Decision Outcome**

**Chosen Option:** Frontend-Explicit User Attribution (Option A)

### **Rationale**

1. **Minimal Migration Effort** - Simple find-and-replace of `"system"` with `currentUser.id`
2. **Explicit Control Flow** - Clear visibility of which user is performing actions
3. **Role-Based UI Restrictions** - Easy to implement permission checks at component level
4. **Debugging Clarity** - Network requests show exactly which user is attributed
5. **Backend Simplicity** - No complex middleware or session management required

### **Trade-offs Accepted**

- Frontend must handle user context (acceptable with React Context/hooks)
- Slightly more verbose mutation calls (explicit is better than implicit)
- Frontend could theoretically spoof user IDs (mitigated by backend validation)

## **Implementation Strategy**

### **Phase 1: Authentication Context Setup**

**Create Authentication Context:**
```typescript
// contexts/AuthContext.tsx
export const AuthContext = createContext<{
  currentUser: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}>({
  currentUser: null,
  login: async () => {},
  logout: () => {},
  hasRole: () => false,
});

export const useAuth = () => useContext(AuthContext);
```

### **Phase 2: Progressive Migration**

**Replace Hardcoded Values:**
```typescript
// Before (current working state)
createdBy: "system"

// After (with authentication)
const { currentUser } = useAuth();
createdBy: currentUser?.id || "system" // Fallback for safety
```

**Apply to All CRUD Operations:**
- Track creation/updates
- Chapter creation/updates  
- Audio file uploads
- Text segment creation
- Mapping creation/updates
- Media segment operations

### **Phase 3: Role-Based Permissions**

**UI-Level Permission Checks:**
```typescript
const ProtectedMappingInterface = () => {
  const { currentUser, hasRole } = useAuth();
  
  if (!hasRole('content_manager')) {
    return <div>Access denied. Only content managers can create mappings.</div>;
  }
  
  return <ProgressiveMapper onMappingCreate={...} />;
};
```

**Backend Validation:**
```typescript
// Add to all mutation endpoints
app.post('/api/mappings', async (req, res) => {
  const { createdBy } = req.body;
  
  // Validate user exists and has permission
  const user = await getUserById(createdBy);
  if (!user || !user.roles.includes('content_manager')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  const mapping = await storage.createAudioMapping(req.body);
  res.json(mapping);
});
```

## **Database Schema Considerations**

### **Current Schema (Keep As-Is)**
```sql
createdBy: varchar("created_by").notNull().references(() => users.id)
```

**Rationale for No Changes:**
- Foreign key constraint ensures data integrity
- "system" user already exists in users table
- No migration required
- Audit trail preserved

### **Future User Types**
- `system` - Automated/seed data operations
- `admin-{id}` - Administrative users  
- `teacher-{id}` - Content managers
- `student-{id}` - Learning module users

## **Migration Checklist**

### **Authentication Setup**
- [ ] Implement AuthContext and useAuth hook
- [ ] Add login/logout functionality
- [ ] Create user session management
- [ ] Add role-based permission system

### **Frontend Updates**
- [ ] Replace all `createdBy: "system"` with `currentUser.id`
- [ ] Add permission checks to UI components
- [ ] Handle authentication loading states
- [ ] Add user-friendly error messages for permission denied

### **Backend Updates**
- [ ] Add user validation to all mutation endpoints
- [ ] Implement role-based permission checks
- [ ] Add proper error responses for unauthorized access
- [ ] Update API documentation with authentication requirements

### **Files Requiring Updates**
- `client/src/pages/ChapterEditor.tsx` - Mapping mutations
- `client/src/pages/TracksPage.tsx` - Track creation
- `client/src/pages/ChapterView.tsx` - Chapter editing
- All components with CRUD operations

## **Benefits of This Approach**

1. **Incremental Implementation** - Can add authentication gradually
2. **Clear Audit Trail** - Every action traced to specific user
3. **Flexible Permissions** - Easy to implement complex role logic
4. **Debugging Friendly** - Clear visibility of user context
5. **Future-Proof** - Scales to complex authentication requirements

## **Risks and Mitigations**

| Risk | Mitigation |
|------|-----------|
| User ID spoofing | Backend validation of user permissions |
| Session management complexity | Use established libraries (NextAuth, Auth0) |
| Missing user context | Graceful fallbacks and error handling |
| Permission check inconsistency | Centralized permission utilities |

## **References**

- Progressive Mapping Implementation: `PROGRESSIVE_MAPPING_ROLLBACK_POINT.md`
- Database Schema: `shared/schema.ts`
- Current Storage Implementation: `server/database-storage.ts`

---

**Next Review:** When implementing authentication system  
**Owner:** Development Team  
**Related ADRs:** None yet