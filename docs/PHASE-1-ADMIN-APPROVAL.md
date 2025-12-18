# Phase 1: Admin Approval Workflow

**Branch:** `phase1-admin-approval`  
**Goal:** Implement user registration approval workflow with minimal admin UI  
**Decisions Made:**
- ✅ No role gating for /manage (all authenticated users can access)
- ✅ Minimal waiting screen for pending_approval users
- ✅ Admin users page at `/manage/users`
- ✅ First admin via ADMIN_EMAIL env var

---

## Implementation Checklist

### Backend Changes

#### 1. Update .env for first admin
- [ ] Add `ADMIN_EMAIL=<your-email>` to .env
- [ ] Restart server
- [ ] Test: Register with ADMIN_EMAIL → should auto-activate as admin

#### 2. Create admin approval API endpoint
**File:** `server/routes/auth.routes.ts`
- [ ] Add `POST /api/admin/users/:userId/approve`
- [ ] Role guard: Check `req.user.roles.includes('admin')`
- [ ] Update user: Set `status = 'active'`, add roles `['student']` if not exists
- [ ] Return: Updated user object
- [ ] Error handling: 403 if not admin, 404 if user not found

#### 3. Update registration to check ADMIN_EMAIL
**File:** `server/routes/auth.routes.ts` (in POST /register)
- [ ] If `email === process.env.ADMIN_EMAIL`:
  - Set `status = 'active'`
  - Set `roles = ['admin']`
- [ ] Else: Set `status = 'pending_approval'`

#### 4. Create admin users query endpoint
**File:** `server/routes/auth.routes.ts`
- [ ] Add `GET /api/admin/users`
- [ ] Role guard: Check admin role
- [ ] Return: List of all users (pending + active)
- [ ] Include: id, email, status, roles, createdAt

---

### Frontend Changes

#### 5. Update useAuth hook for real auth
**File:** `client/src/hooks/useAuth.ts`
- [ ] Replace mock user with real API call
- [ ] Call `GET /api/auth/me` on mount
- [ ] Handle: Loading state, user data, error (redirect to landing if 401)
- [ ] Cache with TanStack Query

#### 6. Create Login page
**File:** `client/src/pages/Login.tsx`
- [ ] Email + password form
- [ ] Submit: `POST /api/auth/login`
- [ ] On success: Redirect to dashboard
- [ ] On error: Show error message
- [ ] Link to Register page

#### 7. Create Register page
**File:** `client/src/pages/Register.tsx`
- [ ] Email + password + confirm password form
- [ ] Validation: Email format, password strength (8+ chars)
- [ ] Submit: `POST /api/auth/register`
- [ ] On success: Redirect to "Pending Approval" screen
- [ ] On error: Show error message
- [ ] Link to Login page

#### 8. Create Pending Approval screen
**File:** `client/src/pages/PendingApproval.tsx`
- [ ] Show when `user.status === 'pending_approval'`
- [ ] Message: "Account pending admin approval"
- [ ] Logout button
- [ ] (Optional: Show when user is pending)

#### 9. Update Landing page
**File:** `client/src/pages/Landing.tsx`
- [ ] Remove "Enter Vedic LMS" button
- [ ] Add "Login" button → `/login`
- [ ] Add "Register" button → `/register`

#### 10. Create Admin Users page
**File:** `client/src/pages/ManageUsers.tsx`
- [ ] Role guard: Only visible to admins
- [ ] Fetch: `GET /api/admin/users` on mount
- [ ] Display:
  - Table with columns: Email | Status | Roles | Created | Action
  - Pending users with "Approve" button
  - Active users showing roles
- [ ] On Approve click:
  - Call `POST /api/admin/users/:userId/approve`
  - Refetch user list (TanStack Query)
  - Show toast: "User approved"

#### 11. Update SimpleDashboard
**File:** `client/src/components/SimpleDashboard.tsx`
- [ ] Add route link to `/manage/users` (admin only)
- [ ] Show in nav or as card
- [ ] Only visible if `user.roles.includes('admin')`

#### 12. Update App.tsx routes
**File:** `client/src/App.tsx`
- [ ] Add route: `/login` → Login
- [ ] Add route: `/register` → Register
- [ ] Add route: `/manage/users` → ManageUsers
- [ ] Add route: `/pending-approval` → PendingApproval
- [ ] Redirect logic:
  - If not authenticated → Landing
  - If authenticated + pending_approval → PendingApproval
  - If authenticated + active → Dashboard/manage/learn routes

#### 13. Update useAuth hook logic
**File:** `client/src/hooks/useAuth.ts` (after real API integration)
- [ ] Handle pending_approval status in hook
- [ ] Return `isPendingApproval` flag
- [ ] Used by App.tsx for redirect logic

---

### Testing

#### 14. Manual smoke test
- [ ] Fresh DB: `npm run db:reset`
- [ ] Add `ADMIN_EMAIL=test@admin.com` to .env
- [ ] Start server: `npm run dev`
- [ ] Register as admin@test.com → Should auto-activate + see admin page
- [ ] Register as student@test.com → Should see pending screen
- [ ] Login as admin → Go to `/manage/users` → Approve student
- [ ] Login as student → Should see dashboard now

#### 15. Update auth smoke test
- [ ] Ensure auth smoke coverage lives in automated `npm run auth:test` and inline release notes; the old `AUTH-SMOKE-TEST.md` doc was retired.

---

## File Structure Summary

```
New Files:
  client/src/pages/Login.tsx              (new)
  client/src/pages/Register.tsx           (new)
  client/src/pages/PendingApproval.tsx    (new)
  client/src/pages/ManageUsers.tsx        (new)

Modified Files:
  client/src/hooks/useAuth.ts             (mock → real API)
  client/src/pages/Landing.tsx            (buttons update)
  client/src/components/SimpleDashboard.tsx (nav update)
  client/src/App.tsx                      (routes + redirect logic)
  server/routes/auth.routes.ts            (new endpoints + ADMIN_EMAIL check)
  .env                                    (add ADMIN_EMAIL)
```

---

## Estimated Effort

- **Backend:** 1-2 hours (auth routes, ADMIN_EMAIL logic, approval endpoint)
- **Frontend:** 2-3 hours (pages, hooks, redirect logic, component updates)
- **Testing:** 30 mins
- **Total:** ~4-5 hours

---

## Success Criteria

- ✅ Register → Pending screen works for non-admin emails
- ✅ Register with ADMIN_EMAIL → Auto-activates as admin
- ✅ Admin can see `/manage/users` page
- ✅ Admin can approve pending users
- ✅ Approved users can login → See dashboard
- ✅ Unauthenticated users → Redirected to landing
- ✅ No broken existing routes (/manage/tracks, /tracks, etc.)

