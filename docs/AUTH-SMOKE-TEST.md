# Auth Smoke Test (Phase 1)

Verification for session-based auth with approval workflow and admin user management UI.

## Required env
- `SESSION_SECRET` (strong random)
- `DATABASE_URL` (or PG* vars in `.env`)
- `ADMIN_EMAIL` (email that auto-activates as admin on first registration)

## .env example
```
DATABASE_URL=postgresql://postgres:welcome@localhost:5432/vediclms_dev
SESSION_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
ADMIN_EMAIL=kashyap.kuchipudi@gmail.com
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=welcome
PGDATABASE=vediclms_dev
```

## Reset dev database
```
npm run db:reset
```

## Automated testing
Start server and run e2e tests:
```
npm run auth:test
```

## Manual testing flow (Phase 1)

### Step 1: Register as admin (auto-activates)
```powershell
$adminBody = @{
  email = "kashyap.kuchipudi@gmail.com"
  password = "adminpass123"
  firstName = "Admin"
  lastName = "User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST -ContentType "application/json" -Body $adminBody -Credentials $null
```

Expected: `status: "active"` (auto-approved since email matches ADMIN_EMAIL)

### Step 2: Register as pending user
```powershell
$studentBody = @{
  email = "student@example.com"
  password = "studentpass123"
  firstName = "Student"
  lastName = "User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST -ContentType "application/json" -Body $studentBody
```

Expected: `status: "pending_approval"`

### Step 3: Admin logs in
```powershell
$loginBody = @{
  email = "kashyap.kuchipudi@gmail.com"
  password = "adminpass123"
} | ConvertTo-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginResp = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $loginBody `
  -WebSession $session -SessionVariable "session"

$session  # Save for next requests
```

Expected: Returns user object with `roles: ["admin"]`

### Step 4: Admin views pending users
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users" `
  -Method GET -WebSession $session
```

Expected: List of all users with pending and active status

### Step 5: Admin approves student
```powershell
# Get student ID from step 4 response
$studentId = "..." # from previous response

Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users/$studentId/approve" `
  -Method POST -WebSession $session
```

Expected: Student status changed to `"active"` with `roles: ["student"]`

### Step 6: Student logs in (now active)
```powershell
$studentLoginBody = @{
  email = "student@example.com"
  password = "studentpass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $studentLoginBody
```

Expected: 200 OK (now approved)

### Step 7: Check /me endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
  -Method GET
```

Expected: User payload with active status

## UI Flow
1. Unauthenticated user → Landing page (/login and /register buttons)
2. Click "Create Account" → Register page
3. Register with admin email → Auto-login possible, admin dashboard visible
4. Register with other email → Redirected to PendingApproval page (hourglass, wait message)
5. Admin logs in → SimpleDashboard shows "Manage Users" card
6. Click "Manage Users" → Shows pending users table with Approve buttons
7. Click Approve → User marked active, refetch list shows in active section
8. Pending user logs in again → Redirected to PendingApproval (still waiting)
9. After approval, user sees full dashboard

## Notes
- Approval gating enforced: `pending_approval` users can't access /manage, /tracks, /chapter routes
- Role-based admin access: `/manage/users` returns 403 unless user has `admin` role
- Email uniqueness enforced: duplicate registrations rejected with 400

