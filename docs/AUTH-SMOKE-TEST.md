# Auth Smoke Test (Phase 0)

Minimal manual verification for the new session-based auth routes. Run after setting environment variables.

## Required env
- `SESSION_SECRET` (strong random)
- `DATABASE_URL` (or PG* vars in `.env`)
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google OAuth (not needed for Phase 0)

Tip: Phase 0 uses local-only auth. Make sure `.env` exists and contains:

```
DATABASE_URL=postgresql://postgres:welcome@localhost:5432/vediclms_dev
SESSION_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=welcome
PGDATABASE=vediclms_dev
```

## Reset dev database (optional but recommended)
Run this when schema prompts appear or after major changes:

```
npm run db:reset
```

## Start the server
```
npm run dev
```

## Local account flow (automated)
Use the Node script that starts the server, registers a user, flips to `active`, logs in, hits `/me`, and logs out:

```
npm run auth:test
```

## Local account flow (manual)
1) Register (pending approval by design):

Windows PowerShell (recommended):
```
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -ContentType 'application/json' -Body '{"email":"test@example.com","password":"Passw0rd!","firstName":"Test","lastName":"User"}'
```
Expect 200 with message "Account created. Awaiting admin approval.".

2) Mark user active (temporarily, until admin UI exists): update `users.status='active'` for the email above.

3) Login:
```
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"test@example.com","password":"Passw0rd!"}'
```
Expect 200.

4) Me endpoint:
```
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get
```
Expect 200 with user payload when session cookie is present.

5) Logout:
```
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/logout" -Method Post
```
Expect 200 with message "Logged out".

## Google OAuth (optional)
- Skip in Phase 0. Configure later when app is stable.

## Notes
- Approval gating: new users start as `pending_approval`; activate manually until the admin UI is built.
- For PowerShell, prefer `Invoke-RestMethod` over `curl` to avoid alias quirks.
