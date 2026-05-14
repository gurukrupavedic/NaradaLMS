# Phase 0: Safety Net

> **Objective**: Establish automated verification scripts that confirm the application works. These scripts will be run after every subsequent phase to catch regressions.
>
> **Prerequisites**: [Branching setup complete](README.md#before-you-start-one-time-setup): `main` tagged as `baseline-pre-hardening`, `hardening` branch created from `main`. No code changes on `main` from this point on.
>
> **Risk**: None. This phase only adds new files; it changes nothing existing.

---

## Branch (start of Phase 0)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-0
```

All tasks and commits for Phase 0 happen on `hardening-phase-0`.

---

## Why This Phase Exists

Before making any structural changes to the codebase, we need a reliable way to verify that "the app still works." Currently, there are smoke tests under `scripts/test/` but they:
- Require manual server startup
- Don't cover portal-side functionality
- Don't have a single "run everything" command

This phase creates a unified verification script that can be run after every phase.

---

## Task 0.1: Create a Unified API Smoke Test Script

**File to create**: `scripts/test/api-smoke-test.ts`

This script tests every major API endpoint by calling the server directly. It requires the server to be running.

```typescript
/**
 * Unified API Smoke Test
 * 
 * Tests all major API endpoints to verify the server is functioning correctly.
 * Run with: npx tsx scripts/test/api-smoke-test.ts
 * 
 * Prerequisites:
 * - Server running on http://localhost:5000 (npm run dev)
 * - Database seeded with at least one admin user, one track, one batch
 * 
 * Exit codes:
 * - 0: All tests passed
 * - 1: One or more tests failed
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

interface TestResult {
    name: string;
    passed: boolean;
    status?: number;
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: Date.now() - start });
        console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    } catch (err: any) {
        results.push({ name, passed: false, error: err.message, duration: Date.now() - start });
        console.log(`  ✗ ${name}: ${err.message} (${Date.now() - start}ms)`);
    }
}

async function fetchJson(path: string, options?: RequestInit): Promise<{ status: number; data: any }> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

// Cookie jar for authenticated requests
let authCookie = '';

async function authenticatedFetch(path: string, options?: RequestInit): Promise<{ status: number; data: any }> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie,
            ...options?.headers,
        },
    });
    // Capture cookies
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        authCookie = setCookie.split(';')[0];
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  NaradaLMS API Smoke Test');
    console.log('══════════════════════════════════════════════════════════\n');
    console.log(`  Target: ${BASE_URL}\n`);

    // ── Section 1: Public endpoints ──
    console.log('── Public Endpoints ──');

    await test('GET /api/auth/me returns 401 when not authenticated', async () => {
        const { status } = await fetchJson('/api/auth/me');
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    await test('POST /api/auth/logout returns 200', async () => {
        const { status } = await fetchJson('/api/auth/logout', { method: 'POST' });
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    });

    // ── Section 2: Auth flow ──
    console.log('\n── Authentication Flow ──');

    const testEmail = `smoketest+${Date.now()}@test.local`;
    const testPassword = 'SmokeTest123!';

    await test('POST /api/auth/register creates account', async () => {
        const { status, data } = await fetchJson('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                firstName: 'Smoke',
                lastName: 'Test',
            }),
        });
        if (status !== 200 && status !== 201) throw new Error(`Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    });

    // Note: Login will return 401 because new users need approval.
    // This is correct behavior.
    await test('POST /api/auth/login returns 401 for pending user (expected)', async () => {
        const { status } = await fetchJson('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: testEmail, password: testPassword }),
        });
        if (status !== 401) throw new Error(`Expected 401 for pending user, got ${status}`);
    });

    // ── Section 3: Data endpoints (unauthenticated - expect 401) ──
    console.log('\n── Protected Endpoints (expect 401 without auth) ──');

    await test('GET /api/batches returns 401 without auth', async () => {
        const { status } = await fetchJson('/api/batches');
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    await test('GET /api/content/tracks returns 401 without auth', async () => {
        const { status } = await fetchJson('/api/content/tracks');
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    await test('GET /api/learning/my-progress returns 401 without auth', async () => {
        const { status } = await fetchJson('/api/learning/my-progress');
        if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    });

    // ── Section 4: Authenticated data endpoints ──
    // To test these, we need to login as an existing seeded user.
    // If the database has seeded users, attempt login with known credentials.
    // This section is conditional - it runs only if login succeeds.
    console.log('\n── Authenticated Data Endpoints ──');
    console.log('  (Attempting login with seeded admin user...)');

    // Try to login as a seeded admin. Adjust credentials to match your seed data.
    // Common seed: admin@naradalms.com / admin123 or similar
    const adminEmails = ['admin@naradalms.com', 'admin@test.com', 'admin@narada.local'];
    const adminPasswords = ['admin123', 'Admin123!', 'password'];
    let adminLoggedIn = false;

    for (const email of adminEmails) {
        for (const password of adminPasswords) {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const setCookie = res.headers.get('set-cookie');
            if (res.status === 200 && setCookie) {
                authCookie = setCookie.split(';')[0];
                adminLoggedIn = true;
                console.log(`  Logged in as: ${email}`);
                break;
            }
        }
        if (adminLoggedIn) break;
    }

    if (!adminLoggedIn) {
        console.log('  ⚠ Could not login with any known seed credentials.');
        console.log('  Skipping authenticated endpoint tests.');
        console.log('  To enable these tests, seed the database with a known admin user.');
    } else {
        await test('GET /api/auth/me returns user data', async () => {
            const { status, data } = await authenticatedFetch('/api/auth/me');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
            if (!data.user) throw new Error('Response missing "user" field');
            if (!data.user.roles) throw new Error('User missing "roles" field');
        });

        await test('GET /api/batches returns batch list', async () => {
            const { status, data } = await authenticatedFetch('/api/batches');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
            if (!data.items || !Array.isArray(data.items)) throw new Error('Response missing "items" array');
            if (typeof data.pagination?.total !== 'number') throw new Error('Response missing pagination.total');
        });

        await test('GET /api/content/tracks returns track list', async () => {
            const { status, data } = await authenticatedFetch('/api/content/tracks');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
            if (!Array.isArray(data)) throw new Error('Expected array response');
        });

        await test('GET /api/admin/users returns user list', async () => {
            const { status, data } = await authenticatedFetch('/api/auth/admin/users');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
            if (!data.users || !Array.isArray(data.users)) throw new Error('Response missing "users" array');
        });

        await test('GET /api/admin/audit-logs returns logs', async () => {
            const { status, data } = await authenticatedFetch('/api/admin/audit-logs');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        });

        // Logout
        await test('POST /api/auth/logout clears session', async () => {
            const { status } = await authenticatedFetch('/api/auth/logout', { method: 'POST' });
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        });

        await test('GET /api/auth/me returns 401 after logout', async () => {
            const { status } = await authenticatedFetch('/api/auth/me');
            if (status !== 401) throw new Error(`Expected 401 after logout, got ${status}`);
        });
    }

    // ── Summary ──
    console.log('\n══════════════════════════════════════════════════════════');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    if (failed === 0) {
        console.log(`  ✅ All ${total} tests passed`);
    } else {
        console.log(`  ❌ ${failed}/${total} tests failed:`);
        results.filter(r => !r.passed).forEach(r => {
            console.log(`     - ${r.name}: ${r.error}`);
        });
    }
    console.log('══════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Smoke test runner failed:', err);
    process.exit(1);
});
```

### Verification for Task 0.1
1. Start the server: `npm run dev`
2. Run the script: `npx tsx scripts/test/api-smoke-test.ts`
3. Confirm it exits with code 0 (or reports expected failures for authenticated tests if no seed data)

---

## Task 0.2: Create a Portal Build Verification Script

**File to create**: `scripts/test/build-check.ps1`

This script verifies that both portals and the server build without errors.

```powershell
#!/usr/bin/env pwsh
<#
BUILD VERIFICATION SCRIPT
Checks that all workspaces compile without errors.
Run: powershell -ExecutionPolicy Bypass -File scripts/test/build-check.ps1
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Build Check ===" -ForegroundColor Green
Set-Location $RepoRoot

$failed = $false

# Check 1: TypeScript compilation (root monolith)
Write-Host "`n[1/4] Checking root TypeScript compilation..." -ForegroundColor Cyan
$result = npm run check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Root TypeScript check" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 2: Student Portal build
Write-Host "`n[2/4] Checking student-portal build..." -ForegroundColor Cyan
Set-Location "$RepoRoot/apps/student-portal"
$result = npx next build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Student portal build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 3: Admin Portal build
Write-Host "`n[3/4] Checking admin-portal build..." -ForegroundColor Cyan
Set-Location "$RepoRoot/apps/admin-portal"
$result = npx next build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Ops portal build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 4: Server ESBuild
Write-Host "`n[4/4] Checking server build..." -ForegroundColor Cyan
Set-Location $RepoRoot
$result = npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Server build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

Set-Location $RepoRoot

if ($failed) {
    Write-Host "`nBuild check FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nAll builds passed" -ForegroundColor Green
    exit 0
}
```

### Verification for Task 0.2
1. Run: `powershell -ExecutionPolicy Bypass -File scripts/test/build-check.ps1`
2. Confirm all 4 checks pass (or note any pre-existing failures to track)

---

## Task 0.3: Create a Quick Verification Checklist Script

**File to create**: `scripts/test/verify.ps1`

A single script that runs all verification steps in sequence.

```powershell
#!/usr/bin/env pwsh
<#
MASTER VERIFICATION SCRIPT
Run after every phase to verify nothing is broken.
Usage: powershell -ExecutionPolicy Bypass -File scripts/test/verify.ps1

Requires:
- Server running on http://localhost:5000
- PostgreSQL running
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path,
    [switch]$SkipBuild,
    [switch]$SkipSmoke
)

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       NaradaLMS Verification Suite               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

Set-Location $RepoRoot
$allPassed = $true

# Step 1: Build check
if (-not $SkipBuild) {
    Write-Host "`n── Step 1: Build Verification ──" -ForegroundColor Yellow
    powershell -ExecutionPolicy Bypass -File scripts/test/build-check.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build verification FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "`n── Step 1: Build Verification (SKIPPED) ──" -ForegroundColor DarkGray
}

# Step 2: API Smoke test
if (-not $SkipSmoke) {
    Write-Host "`n── Step 2: API Smoke Tests ──" -ForegroundColor Yellow
    npx tsx scripts/test/api-smoke-test.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "API smoke tests FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "`n── Step 2: API Smoke Tests (SKIPPED) ──" -ForegroundColor DarkGray
}

# Step 3: Content smoke test (existing)
Write-Host "`n── Step 3: Content Module Smoke Test ──" -ForegroundColor Yellow
npx tsx scripts/test/content-smoke.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Content smoke test FAILED" -ForegroundColor Red
    $allPassed = $false
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "║  ✅ ALL VERIFICATION CHECKS PASSED               ║" -ForegroundColor Green
} else {
    Write-Host "║  ❌ SOME VERIFICATION CHECKS FAILED              ║" -ForegroundColor Red
}
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $allPassed) { exit 1 }
```

### Verification for Task 0.3
1. Start the server: `npm run dev`
2. Run: `powershell -ExecutionPolicy Bypass -File scripts/test/verify.ps1`
3. Observe the output. Note any pre-existing failures — these are your baseline.

---

## Task 0.4: Add Verification Scripts to package.json

**File to modify**: `package.json` (root)

Add these scripts to the `"scripts"` section:

```json
"test:smoke": "tsx scripts/test/api-smoke-test.ts",
"test:content": "tsx scripts/test/content-smoke.ts",
"test:build": "powershell -ExecutionPolicy Bypass -File scripts/test/build-check.ps1",
"verify": "powershell -ExecutionPolicy Bypass -File scripts/test/verify.ps1"
```

**Before** (relevant section of package.json scripts):
```json
"scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx server/db-seeding/seed-vedic-curriculum.ts",
    "db:reset": "powershell -ExecutionPolicy Bypass -File scripts/test/db-reset.ps1",
    "auth:test": "tsx scripts/test/auth-test.ts",
    "smoke:batches": "tsx tests/admin-batches-smoke.ts",
    "lint": "eslint ."
}
```

**After**:
```json
"scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx server/db-seeding/seed-vedic-curriculum.ts",
    "db:reset": "powershell -ExecutionPolicy Bypass -File scripts/test/db-reset.ps1",
    "auth:test": "tsx scripts/test/auth-test.ts",
    "smoke:batches": "tsx tests/admin-batches-smoke.ts",
    "test:smoke": "tsx scripts/test/api-smoke-test.ts",
    "test:content": "tsx scripts/test/content-smoke.ts",
    "test:build": "powershell -ExecutionPolicy Bypass -File scripts/test/build-check.ps1",
    "verify": "powershell -ExecutionPolicy Bypass -File scripts/test/verify.ps1",
    "lint": "eslint ."
}
```

### Verification for Task 0.4
1. Run: `npm run test:smoke` (with server running)
2. Run: `npm run verify` (with server running)

---

## Phase 0 Completion Checklist

- [ ] `scripts/test/api-smoke-test.ts` created and runs successfully
- [ ] `scripts/test/build-check.ps1` created and runs successfully
- [ ] `scripts/test/verify.ps1` created and runs successfully
- [ ] `package.json` scripts updated
- [ ] Baseline failures documented (if any)
- [ ] All files committed on `hardening-phase-0`:  
  `git add scripts/test/api-smoke-test.ts scripts/test/build-check.ps1 scripts/test/verify.ps1 package.json && git commit -m "Phase 0: Add safety net verification scripts"`

---

## Merge (end of Phase 0)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-0 --no-ff -m "Merge hardening-phase-0: Safety net verification scripts"
git tag hardening-phase-0-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 1](phase-1-monolith-removal.md) on the `hardening` branch (create `hardening-phase-1` from `hardening` when starting Phase 1).
