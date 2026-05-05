# Phase 6: Deployment Readiness

> **Objective**: Make the application deployable to a real environment where people other than you can test it. This includes environment configuration, Docker setup, build verification, and production safety checks.
>
> **Prerequisites**: Phases 0–5 completed and merged into `hardening`. You must be on the `hardening` branch. **All build-blocking type errors must be resolved** (Phase 4 wrap-up and Phase 5 Task 5.8): root `npx tsc --noEmit`, student-portal build, and admin-portal build must pass, and `npm run verify` must pass. Phase 6 Task 6.4 (production build script) and Task 6.8 (final verification) depend on this.
>
> **Risk**: Low. This phase adds configuration; it doesn't change application logic.

---

## Branch (start of Phase 6)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-6
```

All tasks and commits for Phase 6 happen on `hardening-phase-6`.

---

## Task 6.1: Create a Centralized Environment Configuration

### Problem

Environment variables are scattered and inconsistent:
- `packages/api-client/` uses `NEXT_PUBLIC_API_URL`
- `apps/admin-portal/next.config.ts` hardcodes `http://localhost:5000` for rewrites
- The server uses `.env` with `PGHOST`, `PGUSER`, etc.
- No single document describes all required environment variables

### Step 1: Create environment variable documentation

**Create file**: `docs/essentials/environment-variables.md`

```markdown
# Environment Variables

All environment variables required by NaradaLMS.

## Server (Express API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development`, `production`, or `test` |
| `PORT` | No | `5000` | Port the API server listens on |
| `DATABASE_URL` | Yes* | — | PostgreSQL connection string |
| `PGHOST` | Yes* | `localhost` | PostgreSQL host |
| `PGPORT` | No | `5432` | PostgreSQL port |
| `PGUSER` | Yes* | — | PostgreSQL username |
| `PGPASSWORD` | Yes* | — | PostgreSQL password |
| `PGDATABASE` | Yes* | — | PostgreSQL database name |
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `JWT_EXPIRY` | No | `7d` | JWT token expiration |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3001` | Comma-separated allowed origins |
| `FRONTEND_URL` | No | `http://localhost:3000` | URL of the student portal |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | — | Google OAuth callback URL |

*Either `DATABASE_URL` or individual `PG*` variables must be set.

## Student Portal (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | — | Full URL to the API (e.g., `http://localhost:5000/api`) |

## Admin Portal (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | — | Full URL to the API (e.g., `http://localhost:5000/api`) |
| `NEXT_PUBLIC_UPLOADS_URL` | No | — | URL for uploaded files (if different from API) |
```

### Step 2: Create `.env.example` at root

**Create file**: `.env.example`

```bash
# ============================================
# NaradaLMS Environment Configuration
# ============================================
# Copy this file to .env and fill in the values

# Server
NODE_ENV=development
PORT=5000

# Database (use either DATABASE_URL or individual PG* variables)
# DATABASE_URL=postgresql://user:password@localhost:5432/naradalms
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=naradalms

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Google OAuth (optional)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Step 3: Make `next.config.ts` environment-driven

**File**: `apps/admin-portal/next.config.ts`

**Before**:
```typescript
const nextConfig: NextConfig = {
    transpilePackages: ["@narada/ui"],
    async rewrites() {
        return [
            {
                source: '/uploads/:path*',
                destination: 'http://localhost:5000/uploads/:path*',
            },
            {
                source: '/api/:path*',
                destination: 'http://localhost:5000/api/:path*',
            },
        ];
    },
};
```

**After**:
```typescript
const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
    transpilePackages: ["@narada/ui"],
    async rewrites() {
        return [
            {
                source: '/uploads/:path*',
                destination: `${API_SERVER_URL}/uploads/:path*`,
            },
            {
                source: '/api/:path*',
                destination: `${API_SERVER_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
```

**File**: `apps/admin-portal/.env.local`

Add:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
API_SERVER_URL=http://localhost:5000
```

**File**: `apps/student-portal/next.config.ts`

Add the same rewrite pattern if the student portal needs to proxy API or upload requests. Otherwise, ensure it uses `NEXT_PUBLIC_API_URL` consistently.

### Verification for Task 6.1
1. Delete `.env.local` files — portals should fail gracefully (show error about missing env var, not redirect to localhost:5000)
2. Recreate `.env.local` files from `.env.example` — portals should work
3. Environment docs should be complete and accurate

---

## Task 6.2: Update `docker-compose.yml` for the New Architecture

### Problem

The current `docker-compose.yml` has a placeholder API service and doesn't include the portals.

### Update

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    container_name: narada_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: naradalms
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - narada-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (for future session/queue use)
  redis:
    image: redis:7-alpine
    container_name: narada_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - narada-net

networks:
  narada-net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

**Note**: For the first deployment, running the server and portals via `npm run dev` (or `npm run build && npm start`) is sufficient. Full Docker containerization of the app itself is a Stage 2 concern. The docker-compose is primarily for database infrastructure.

### Verification for Task 6.2
1. Run: `docker-compose up -d postgres` — PostgreSQL should start
2. Run: `npm run dev` — server should connect to the Docker PostgreSQL
3. Both portals should function correctly

---

## Task 6.3: Create a Development Quick-Start Script

**Create file**: `scripts/dev-start.ps1`

This script starts all three processes (server, student portal, ops portal) for local development.

```powershell
#!/usr/bin/env pwsh
<#
DEVELOPMENT QUICK START
Starts the API server and both portal apps for local development.
Usage: powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Development Start ===" -ForegroundColor Green

# Check if PostgreSQL is running
try {
    $pgCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
    if (-not $pgCheck) {
        Write-Host "PostgreSQL not running on port 5432. Start it first:" -ForegroundColor Red
        Write-Host "  docker-compose up -d postgres" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Could not check PostgreSQL status. Continuing..." -ForegroundColor Yellow
}

Write-Host "Starting API server (port 5000)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $RepoRoot -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Student Portal (port 3000)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$RepoRoot\apps\student-portal" -WindowStyle Normal

Write-Host "Starting Admin Portal (port 3001)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$RepoRoot\apps\admin-portal" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`nAll services starting:" -ForegroundColor Green
Write-Host "  API Server:      http://localhost:5000" -ForegroundColor White
Write-Host "  Student Portal:  http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Portal:   http://localhost:3001" -ForegroundColor White
Write-Host "`nWait 5-10 seconds for Next.js to compile..." -ForegroundColor Yellow
```

Add to `package.json`:
```json
"dev:all": "powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1"
```

### Verification for Task 6.3
1. Run: `npm run dev:all`
2. Wait for all three processes to start
3. Verify all three URLs respond

---

## Task 6.4: Create a Production Build Script

**Create file**: `scripts/build-all.ps1`

```powershell
#!/usr/bin/env pwsh
<#
PRODUCTION BUILD
Builds the API server and both portal apps for deployment.
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Production Build ===" -ForegroundColor Green
Set-Location $RepoRoot

$failed = $false

# Build server
Write-Host "`n[1/3] Building API server..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Server build FAILED" -ForegroundColor Red
    $failed = $true
}

# Build student portal
Write-Host "`n[2/3] Building Student Portal..." -ForegroundColor Cyan
Set-Location "$RepoRoot\apps\student-portal"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Student portal build FAILED" -ForegroundColor Red
    $failed = $true
}

# Build admin portal
Write-Host "`n[3/3] Building Admin Portal..." -ForegroundColor Cyan
Set-Location "$RepoRoot\apps\admin-portal"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Admin portal build FAILED" -ForegroundColor Red
    $failed = $true
}

Set-Location $RepoRoot

if ($failed) {
    Write-Host "`nBuild FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n=== All builds successful ===" -ForegroundColor Green
    Write-Host "Artifacts:" -ForegroundColor White
    Write-Host "  Server:          dist/" -ForegroundColor White
    Write-Host "  Student Portal:  apps/student-portal/.next/" -ForegroundColor White
    Write-Host "  Admin Portal:   apps/admin-portal/.next/" -ForegroundColor White
    exit 0
}
```

### Verification for Task 6.4
1. Run: `powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1`
2. All three builds should succeed
3. Artifacts should be present in the listed directories

---

## Task 6.5: Add CORS Configuration for Deployed Portals

### Problem

The server's CORS configuration is hardcoded for development. When deployed, the portals will be on different URLs.

### Solution

**File**: `server/config.ts`

Ensure `corsOrigins` is configurable via environment:

```typescript
export const config = {
    // ...existing config...
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
        .split(',')
        .map(s => s.trim()),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
```

Verify that `server/index.ts` uses `config.corsOrigins` in the CORS middleware (it likely already does based on the code we read).

### Verification for Task 6.5
1. Set `CORS_ORIGINS=http://localhost:3000,http://localhost:3001` in `.env`
2. Start server and portals
3. API calls from both portals should work without CORS errors

---

## Task 6.6: Security Checklist Before First Deployment

### Review and verify these items:

1. **JWT_SECRET**: Ensure `.env` has a strong, unique JWT secret (not the default). Add a startup check:

   **File**: `server/index.ts` or `server/config.ts`
   ```typescript
   if (config.env === 'production' && (!config.jwtSecret || config.jwtSecret === 'your-secret-key-change-in-production')) {
       throw new Error('JWT_SECRET must be set to a secure value in production');
   }
   ```

2. **Cookie settings**: Ensure cookies use `secure: true` and `sameSite: 'strict'` in production. Check `server/auth/` for cookie configuration.

3. **Helmet CSP**: Review the Content Security Policy in `server/index.ts`. For production, remove `'unsafe-inline'` from `scriptSrc` if possible.

4. **Rate limiting**: Verify `express-rate-limit` is applied to auth routes (login, register). Check `server/routes/identity.routes.ts`.

5. **File upload limits**: Verify `multer` has size limits configured. Check `server/routes/content.routes.ts` and `server/routes/media.routes.ts`.

6. **No `.env` in git**: Verify `.gitignore` includes:
   ```
   .env
   .env.local
   .env.*.local
   ```

### Verification for Task 6.6
1. Run: `rg "\.env" .gitignore` — verify `.env` is gitignored
2. Review: `git status` should NOT show any `.env` or `.env.local` files
3. If any secrets are in git history, note them for cleanup (but don't rewrite history now)

---

## Task 6.7: Update README for the New Architecture

**File**: `README.md` (root)

Update the README to reflect the current architecture after all hardening phases:

- Remove references to the monolith frontend (`client/`)
- Update the project structure section
- Add quick-start instructions for all three apps
- Document the environment setup
- Link to the hardening docs

Key sections to update:
- Architecture diagram (now shows: Server + Student Portal + Admin Portal + Shared Packages)
- Quick Start (now includes `npm run dev:all`)
- Environment Setup (link to `docs/essentials/environment-variables.md`)
- Project Structure (remove `client/`, update `shared/` status)

### Verification for Task 6.7
1. Read the README — should accurately describe the current project state
2. A new developer should be able to set up the project by following the README

---

## Task 6.8: Final End-to-End Verification

Run the complete verification suite one final time:

### Step 1: Clean install
```bash
rm -rf node_modules apps/student-portal/node_modules apps/admin-portal/node_modules packages/*/node_modules
npm install
```

### Step 2: Build everything
```bash
powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1
```

### Step 3: Start services
```bash
docker-compose up -d postgres
npm run dev     # In terminal 1
cd apps/student-portal && npm run dev  # In terminal 2
cd apps/admin-portal && npm run dev      # In terminal 3
```

### Step 4: Run all tests
```bash
npm run verify
```

### Step 5: Manual verification
Follow the "Core Verification Flows" from `docs/hardening/README.md`:
- Student Portal: Login → Dashboard → Chapter view → Audio playback
- Admin Portal: Login → Admin dashboard → Batch list → Batch details → Content Studio
- API: Auth flow → Protected endpoints → Data operations

### Step 6: Check for no regressions
- No console errors in browser dev tools
- No unhandled errors in server logs
- All pages load without SSR errors
- All navigation works correctly

---

## Phase 6 Completion Checklist

- [ ] Environment variable documentation created
- [ ] `.env.example` created at root
- [ ] `.env.local` and `.env.example` created for both portals
- [ ] `next.config.ts` files use environment variables (no hardcoded URLs)
- [ ] `docker-compose.yml` updated
- [ ] Dev quick-start script created
- [ ] Production build script created
- [ ] CORS configuration is environment-driven
- [ ] Security checklist reviewed
- [ ] README updated for new architecture
- [ ] Clean install + build passes
- [ ] Full verification suite passes
- [ ] Manual end-to-end flows verified
- [ ] All work committed on `hardening-phase-6`

---

## Merge (end of Phase 6)

Merge this phase into `hardening` only. **Do not merge into `main` yet.** The merge to `main` happens only in the **Hardening Complete Gate** below.

```bash
git checkout hardening
git merge hardening-phase-6 --no-ff -m "Merge hardening-phase-6: Deployment readiness"
git tag hardening-phase-6-complete   # optional
git push origin hardening --tags    # if using a remote
```

---

## Hardening Complete Gate (only time to merge into `main`)

**This is the only point at which code is merged from `hardening` into `main`.** Do not merge to `main` at any other time during the hardening effort.

Before merging to `main`, all of the following must be true:

- [ ] All phases 0–6 are complete and merged into `hardening`.
- [ ] Full verification suite has been run on `hardening` and passed:  
  `npm run verify`
- [ ] Manual end-to-end flows have been verified (see [Core Verification Flows](README.md#core-verification-flows-manual) in the hardening README).
- [ ] You have full confidence in the hardened codebase (no known regressions, tests pass, builds succeed).

When all of the above are satisfied:

```bash
git checkout main
git pull origin main        # ensure main is up to date (no one else should have pushed)
git merge hardening --no-ff -m "Merge hardening: Pre-deploy cleanup and hardening complete"
git tag baseline-post-hardening
# Or use a version tag, e.g.:  git tag v0.2.0-pre-deploy
git push origin main --tags
```

If you use pull requests: open a PR from `hardening` into `main`, run the verification suite as a status check, get approval, then merge. After merge, tag `main` as above and push the tag.

**After this:**

- `main` contains the fully hardened, deployment-ready codebase.
- The tag `baseline-post-hardening` (or your version tag) marks the first deployable baseline.
- Future work (e.g. Stage 2: Chameleonization) should branch from `main` from this point forward.

---

## What's Next: Stage 2 (Chameleonization)

After all 6 phases, the codebase is:
- **Clean**: No dead code, no duplicate type systems, no legacy frontend
- **Secure**: Auth middleware consolidated, routes protected, no createdBy spoofing
- **Performant**: Database-level pagination, no N+1 queries, transactional operations
- **Deployable**: Environment-driven configuration, working build pipeline
- **Well-tested**: Verification scripts catch regressions

This clean foundation is exactly what's needed for Stage 2 (multi-branding/chameleonization), where you'll need to:
- Add theme tokens that can vary per brand
- Configure portal routing per deployment
- Abstract brand-specific assets and content

With the hardened codebase, these changes will be additive rather than fighting against existing technical debt.
