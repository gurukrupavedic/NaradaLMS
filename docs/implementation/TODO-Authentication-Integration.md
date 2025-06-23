# Authentication Integration Implementation Guide

**Status:** Future Implementation  
**Prerequisites:** ADR-001 Authentication Integration Strategy  
**Estimated Effort:** 2-3 weeks  
**Priority:** Medium (after core learning features complete)

## **Implementation Phases**

### **Phase 1: Authentication Foundation (Week 1)**

#### **1.1 Authentication Library Setup**
- [ ] Choose authentication provider (Auth0, NextAuth.js, or custom)
- [ ] Install and configure authentication library
- [ ] Set up environment variables for auth configuration
- [ ] Test basic login/logout flow

#### **1.2 User Context Infrastructure**
- [ ] Create `contexts/AuthContext.tsx` with user state management
- [ ] Implement `useAuth()` hook for component access
- [ ] Add authentication loading states and error handling
- [ ] Create user type definitions and role enums

```typescript
// Example implementation structure
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  status: 'active' | 'pending' | 'disabled';
}

enum UserRole {
  ADMIN = 'admin',
  CONTENT_MANAGER = 'content_manager', 
  TEACHER = 'teacher',
  STUDENT = 'student'
}
```

#### **1.3 Permission System Foundation**
- [ ] Create `utils/permissions.ts` with role checking logic
- [ ] Implement `hasPermission(user, action, resource)` utility
- [ ] Define permission matrix for different user roles
- [ ] Add permission checking hooks

### **Phase 2: Frontend Integration (Week 2)**

#### **2.1 Progressive Mapping Authentication**
**Files to Update:**
- [ ] `client/src/pages/ChapterEditor.tsx` - Lines 2102-2107
- [ ] Update all mapping mutations to use `currentUser.id`
- [ ] Add permission checks for mapping creation/deletion
- [ ] Handle authentication errors gracefully

**Before:**
```typescript
createMappingMutation.mutate({
  segmentId: parseInt(mapping.segmentId),
  audioFileId: selectedAudioFile.id,
  startTime: mapping.startTime,
  endTime: mapping.endTime,
  createdBy: "system" // ← Remove this
});
```

**After:**
```typescript
const { currentUser } = useAuth();
createMappingMutation.mutate({
  segmentId: parseInt(mapping.segmentId),
  audioFileId: selectedAudioFile.id,
  startTime: mapping.startTime,
  endTime: mapping.endTime,
  createdBy: currentUser?.id || "system"
});
```

#### **2.2 Content Management Authentication**
**Track Management:**
- [ ] `client/src/pages/TracksPage.tsx` - Add authentication to track creation
- [ ] Add role-based visibility for edit/delete buttons
- [ ] Implement permission checks for track operations

**Chapter Management:**
- [ ] `client/src/pages/ChapterView.tsx` - Add authentication to chapter editing
- [ ] Update chapter creation/update mutations
- [ ] Add content manager role requirements

**Audio File Management:**
- [ ] Update audio upload mutations with user context
- [ ] Add permission checks for file upload/deletion
- [ ] Implement ownership-based access control

#### **2.3 UI Components for Authentication**
- [ ] Create login/logout components
- [ ] Add user profile display
- [ ] Implement role-based navigation
- [ ] Add "Access Denied" error components

### **Phase 3: Backend Validation (Week 2-3)**

#### **3.1 API Endpoint Protection**
**Progressive Mapping Endpoints:**
- [ ] `POST /api/mappings` - Validate user permissions
- [ ] `PATCH /api/mappings/:segmentId` - Check mapping ownership
- [ ] `DELETE /api/mappings/:audioFileId/:segmentId` - Verify delete permissions

**Content Management Endpoints:**
- [ ] All track operations (`/api/tracks/*`)
- [ ] All chapter operations (`/api/chapters/*`) 
- [ ] Audio file operations (`/api/audio-files/*`)
- [ ] Text segment operations (`/api/segments/*`)

#### **3.2 Validation Implementation**
```typescript
// Example endpoint protection
app.post('/api/mappings', async (req, res) => {
  const { createdBy } = req.body;
  
  // Validate user exists
  const user = await storage.getUser(createdBy);
  if (!user) {
    return res.status(401).json({ error: 'Invalid user' });
  }
  
  // Check permissions
  if (!user.roles.includes('content_manager')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Proceed with operation
  const mapping = await storage.createAudioMapping(req.body);
  res.json(mapping);
});
```

#### **3.3 Session Management**
- [ ] Implement session validation middleware
- [ ] Add JWT token handling if using token-based auth
- [ ] Set up session storage (Redis or database)
- [ ] Implement session expiration and renewal

### **Phase 4: Testing and Refinement (Week 3)**

#### **4.1 Integration Testing**
- [ ] Test complete authentication flow
- [ ] Verify all mutations work with real user IDs
- [ ] Test role-based permission restrictions
- [ ] Validate audit trail functionality

#### **4.2 User Experience Testing**
- [ ] Test login/logout user experience
- [ ] Verify permission denied states are user-friendly
- [ ] Test role transitions (student → content manager)
- [ ] Validate session persistence across browser refreshes

#### **4.3 Security Validation**
- [ ] Test that users cannot spoof other user IDs
- [ ] Verify all endpoints reject unauthorized requests
- [ ] Test session security and expiration
- [ ] Validate role-based access controls

## **Critical Files to Update**

### **High Priority (Core Functionality)**
1. `client/src/pages/ChapterEditor.tsx` - Progressive mapping (lines 2102-2107)
2. `server/routes-simple.ts` - All mutation endpoints
3. `client/src/pages/TracksPage.tsx` - Track management
4. `client/src/pages/ChapterView.tsx` - Chapter editing

### **Medium Priority (Supporting Features)**
5. All audio file upload components
6. Text segmentation components
7. Media segment management
8. Student progress tracking

### **Low Priority (Enhancement)**
9. Admin user management interfaces
10. Bulk operations
11. Data export/import features

## **Testing Strategy**

### **Unit Tests**
- [ ] Authentication context and hooks
- [ ] Permission checking utilities
- [ ] User role validation functions

### **Integration Tests**
- [ ] End-to-end authentication flow
- [ ] Progressive mapping with authenticated users
- [ ] Role-based access control scenarios

### **Manual Testing Scenarios**
1. **Content Manager Flow:**
   - Login as content manager
   - Create track, chapter, upload audio
   - Create text segments and mappings
   - Verify all operations succeed

2. **Student Flow:**
   - Login as student
   - Attempt to access content management
   - Verify access denied appropriately
   - Confirm learning module access works

3. **Permission Transition:**
   - Change user role from student to content manager
   - Verify new permissions take effect
   - Test all previously restricted operations

## **Rollback Plan**

If authentication integration causes issues:

1. **Quick Rollback:** Revert to `createdBy: "system"` in all mutations
2. **Partial Rollback:** Keep authentication but disable permission checks
3. **Full Rollback:** Remove authentication context and restore previous state

**Rollback Detection:**
- Monitor error rates on mapping creation
- Check for 401/403 errors in logs
- User reports of broken functionality

## **Success Metrics**

- [ ] All existing functionality works with authenticated users
- [ ] Role-based permissions properly restrict access
- [ ] Audit trail shows real user attribution
- [ ] No regression in progressive mapping performance
- [ ] User-friendly authentication experience

## **Dependencies**

- Authentication library choice (Auth0, NextAuth.js, etc.)
- User management UI/UX designs
- Role definition and permission matrix
- Session storage infrastructure decisions

---

**Owner:** Development Team  
**Next Review:** Before authentication implementation begins  
**Related Docs:** ADR-001 Authentication Integration Strategy