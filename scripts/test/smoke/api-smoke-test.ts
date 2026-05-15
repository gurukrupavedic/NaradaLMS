/**
 * Unified API Smoke Test
 *
 * Tests all major API endpoints to verify the server is functioning correctly.
 * Run with: npx tsx scripts/test/smoke/api-smoke-test.ts
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

// CSRF token and cookie for state-changing requests
let csrfToken = '';
let csrfCookie = '';

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
    const method = (options?.method || 'GET').toUpperCase();
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };
    if (needsCsrf && csrfToken) headers['x-csrf-token'] = csrfToken;
    const cookies = [csrfCookie, authCookie].filter(Boolean).join('; ');
    if (cookies) headers['Cookie'] = cookies;
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

// Cookie jar for authenticated requests
let authCookie = '';

async function authenticatedFetch(path: string, options?: RequestInit): Promise<{ status: number; data: any }> {
    const method = (options?.method || 'GET').toUpperCase();
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cookie': [csrfCookie, authCookie].filter(Boolean).join('; '),
        ...(options?.headers as Record<string, string>),
    };
    if (needsCsrf && csrfToken) headers['x-csrf-token'] = csrfToken;
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
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

    // Fetch CSRF token (required for POST/PUT/DELETE)
    const csrfRes = await fetch(`${BASE_URL}/api/csrf-token`);
    const csrfData = await csrfRes.json().catch(() => ({}));
    csrfToken = csrfData.csrfToken || '';
    const setCookie = csrfRes.headers.get('set-cookie');
    if (setCookie) csrfCookie = setCookie.split(';')[0];

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
            headers: { 'X-Tenant-Slug': 'slmts' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                firstName: 'Smoke',
                lastName: 'Test',
            }),
        });
        if (status !== 200 && status !== 201) throw new Error(`Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
        if (data.membership?.status !== 'pending') {
            throw new Error(`Expected pending org membership, got ${JSON.stringify(data.membership)}`);
        }
    });

    await test('POST /api/auth/login succeeds for pending-membership user (200 + cookie)', async () => {
        const { status, data } = await authenticatedFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: testEmail, password: testPassword }),
        });
        if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
        if (data.loginState?.hasActiveMembership !== false) {
            throw new Error('Expected hasActiveMembership false for pending membership');
        }
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

    await test('POST /api/auth/switch-org returns 401 without auth', async () => {
        const { status } = await fetchJson('/api/auth/switch-org', {
            method: 'POST',
            body: JSON.stringify({ orgId: '00000000-0000-4000-8000-000000000001' }),
        });
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
            if (typeof data.user.isSuperAdmin !== 'boolean') {
                throw new Error('User missing isSuperAdmin (JWT session shape)');
            }
        });

        await test('POST /api/auth/switch-org returns 403 for random org', async () => {
            const { status } = await authenticatedFetch('/api/auth/switch-org', {
                method: 'POST',
                body: JSON.stringify({ orgId: '00000000-0000-4000-8000-000000000099' }),
            });
            if (status !== 403) throw new Error(`Expected 403, got ${status}`);
        });

        await test('POST /api/auth/switch-org succeeds for active RR org', async () => {
            const { status: meStatus, data: meData } = await authenticatedFetch('/api/auth/me');
            if (meStatus !== 200) throw new Error(`Expected 200 from /me, got ${meStatus}`);
            const rr = (meData.memberships as { orgSlug: string; orgId: string; status: string }[] | undefined)?.find(
                (m) => m.orgSlug === 'rr' && m.status === 'active'
            );
            if (!rr) {
                throw new Error('Expected active RR membership in seed for admin user');
            }
            const { status, data } = await authenticatedFetch('/api/auth/switch-org', {
                method: 'POST',
                body: JSON.stringify({ orgId: rr.orgId }),
            });
            if (status !== 200) throw new Error(`Expected 200 for active RR org, got ${status}: ${JSON.stringify(data)}`);
            if (data.user?.currentOrgId !== rr.orgId) {
                throw new Error('switch-org response should echo RR org as currentOrgId');
            }
        });

        await test('POST /api/auth/switch-org succeeds for active SLMTS org', async () => {
            const { status: meStatus, data: meData } = await authenticatedFetch('/api/auth/me');
            if (meStatus !== 200) throw new Error(`Expected 200 from /me, got ${meStatus}`);
            const slmts = (meData.memberships as { orgSlug: string; orgId: string; status: string }[] | undefined)?.find(
                (m) => m.orgSlug === 'slmts' && m.status === 'active'
            );
            if (!slmts) {
                throw new Error('Expected active SLMTS membership in seed for admin user');
            }
            const { status, data } = await authenticatedFetch('/api/auth/switch-org', {
                method: 'POST',
                body: JSON.stringify({ orgId: slmts.orgId }),
            });
            if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
            if (data.user?.currentOrgId !== slmts.orgId) {
                throw new Error('switch-org response should echo active org as currentOrgId');
            }
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

        await test('GET /api/auth/admin/users returns governance list (super-admin)', async () => {
            const { status, data } = await authenticatedFetch('/api/auth/admin/users');
            if (status !== 200) throw new Error(`Expected 200, got ${status}`);
            if (!data.users || !Array.isArray(data.users)) throw new Error('Response missing "users" array');
            if (data.users[0] && !Array.isArray(data.users[0].memberships)) {
                throw new Error('Expected each user to include memberships[]');
            }
        });

        await test('GET /api/admin/directory/users returns org-scoped directory', async () => {
            const { status, data } = await authenticatedFetch(
                '/api/admin/directory/users?membershipRole=student&limit=50'
            );
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
