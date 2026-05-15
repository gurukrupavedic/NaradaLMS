/**
 * ============================================================================
 * AUTHENTICATION TEST SUITE
 * ============================================================================
 * 
 * WHAT IS THIS?
 * A comprehensive testing tool for the authentication system. It can run
 * different types of tests depending on what you need - from quick checks
 * to full end-to-end testing.
 * 
 * CREATED: December 2024 (consolidated from 3 separate test files)
 * 
 * PURPOSE:
 * To verify the authentication system works correctly by testing:
 * - User registration
 * - Membership approval (with database)
 * - Login/logout functionality
 * - Protected route access
 * - Basic API endpoint responses
 * 
 * ============================================================================
 * HOW TO RUN IT:
 * ============================================================================
 * 
 * Quick Test (no database needed, 2-3 seconds):
 *   npx tsx scripts/test/smoke/auth-test.ts --quick
 *   
 * Full Test (with database membership approval, 5 seconds):
 *   npx tsx scripts/test/smoke/auth-test.ts --full
 *   
 * Auto Test (starts server automatically, 10-15 seconds):
 *   npx tsx scripts/test/smoke/auth-test.ts --auto
 *   npx tsx scripts/test/smoke/auth-test.ts --quick --auto
 *   npx tsx scripts/test/smoke/auth-test.ts --full --auto
 *   
 * Show Help:
 *   npx tsx scripts/test/smoke/auth-test.ts --help
 * 
 * ============================================================================
 * TEST MODES EXPLAINED:
 * ============================================================================
 * 
 * --quick (SMOKE TEST)
 *   What it does: Quick check if API endpoints are responding
 *   Requirements: Dev server running
 *   Time: 2-3 seconds
 *   Database: Not needed
 *   Expected results:
 *     - Register: 200 (account created)
 *     - Me: 401 (not logged in yet - correct!)
 *     - Login: 200 (session created even while membership is pending)
 *     - Logout: 200
 *   When to use:
 *     - Quick sanity check during development
 *     - Before starting work each day
 *     - After minor code changes
 * 
 * --full (END-TO-END TEST)
 *   What it does: Complete test including database membership approval
 *   Requirements: Dev server + database running
 *   Time: 5 seconds
 *   Database: Required (approves memberships)
 *   Expected results:
 *     - Register: 200 (account created)
 *     - Approve membership: SLMTS membership activated in database
 *     - Login: 200 (login successful)
 *     - Me: 200 (can access profile)
 *     - Logout: 200
 *   When to use:
 *     - Before deploying to production
 *     - After authentication code changes
 *     - When testing the complete user flow
 * 
 * --auto (AUTO SERVER START)
 *   What it does: Automatically starts/stops server for you
 *   Requirements: Port 5000 available
 *   Time: 10-15 seconds (includes server startup)
 *   Combine with: --quick or --full
 *   When to use:
 *     - Automated testing (CI/CD)
 *     - When server isn't already running
 *     - One-command full testing
 * 
 * ============================================================================
 * WHAT HAPPENS STEP BY STEP:
 * ============================================================================
 * 
 * QUICK MODE:
 *   1. Register new test user
 *   2. Try to access /me (should fail - not logged in)
 *   3. Try to login (should fail - needs approval)
 *   4. Logout
 *   ✓ Verifies API endpoints work
 * 
 * FULL MODE:
 *   1. Register new test user
 *   2. Activate user directly in database (skip approval)
 *   3. Login with credentials
 *   4. Access /me endpoint (verify logged in)
 *   5. Logout
 *   ✓ Verifies complete authentication flow
 * 
 * AUTO MODE:
 *   1. Start dev server (npm run dev)
 *   2. Wait for server to be ready (~5 seconds)
 *   3. Run chosen test (quick or full)
 *   4. Stop dev server automatically
 *   ✓ Fully automated, no manual setup
 * 
 * ============================================================================
 * REQUIREMENTS:
 * ============================================================================
 * 
 * For --quick:
 *   ✓ Dev server running (npm run dev)
 *   ✓ .env file configured
 * 
 * For --full:
 *   ✓ Dev server running
 *   ✓ Database running and accessible
 *   ✓ .env file with database credentials
 * 
 * For --auto:
 *   ✓ Port 5000 available
 *   ✓ All dependencies installed (npm install)
 *   ✓ Database running (if using --full)
 * 
 * ============================================================================
 * TROUBLESHOOTING:
 * ============================================================================
 * 
 * "Port 5000 already in use"
 *   → Stop existing dev server first
 *   → Or use without --auto flag
 * 
 * "Connection refused"
 *   → Make sure dev server is running
 *   → Check if port is correct (should be 5000)
 * 
 * "Database error" (only in --full mode)
 *   → Check .env file has correct DATABASE_URL or PG* variables
 *   → Make sure database is running
 *   → Try: npm run db:reset, then re-run the needed seed commands
 * 
 * "Server did not start in time"
 *   → Check for compilation errors: npm run check
 *   → Database might be down
 *   → Check server logs for errors
 * 
 * All tests pass but 401 errors shown
 *   → This is correct for --quick mode!
 *   → 401 means the server rejected credentials or the session, not pending membership
 *   → Use --full mode if you want successful login
 * 
 * ============================================================================
 */

import { Pool } from 'pg';
import { spawn } from 'child_process';

const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:5000';

// ============================================================================
// COMMAND LINE ARGUMENT PARSING
// ============================================================================

const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const quickMode = args.includes('--quick');
const fullMode = args.includes('--full');
const autoMode = args.includes('--auto');

if (showHelp) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VedicLMS Authentication Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE:
  npx tsx scripts/test/smoke/auth-test.ts [OPTIONS]

OPTIONS:
  --quick       Quick smoke test (2-3 seconds, no database needed)
  --full        Full end-to-end test (5 seconds, requires database)
  --auto        Auto-start/stop server (combine with --quick or --full)
  --help, -h    Show this help message

EXAMPLES:
  npx tsx scripts/test/smoke/auth-test.ts --quick              # Quick test, server running
  npx tsx scripts/test/smoke/auth-test.ts --full               # Full test, server running
  npx tsx scripts/test/smoke/auth-test.ts --quick --auto       # Quick test, auto server
  npx tsx scripts/test/smoke/auth-test.ts --full --auto        # Full test, auto server
  npx tsx scripts/test/smoke/auth-test.ts --auto               # Auto server (defaults to quick)

DEFAULT:
  If no mode specified, runs --quick mode

REQUIREMENTS:
  --quick:  Dev server must be running
  --full:   Dev server + database must be running
  --auto:   Port 5000 must be available

TIME:
  --quick:  ~2-3 seconds
  --full:   ~5 seconds
  --auto:   ~10-15 seconds (includes server startup)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  process.exit(0);
}

// Default to quick mode if nothing specified
const mode = fullMode ? 'full' : 'quick';

// ============================================================================
// UTILITY CLASSES
// ============================================================================

class CookieJar {
  private cookie = '';
  
  capture(res: Response) {
    const setCookie = (res.headers as any).get?.('set-cookie');
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : String(setCookie).split(/,(?=[^;]+;)/);
      const parts = cookies.map((c: string) => c.split(';')[0].trim());
      this.cookie = parts.join('; ');
    }
  }
  
  headers(init?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = { ...(init as any) };
    if (this.cookie) headers['Cookie'] = this.cookie;
    return headers;
  }
}

// ============================================================================
// DATABASE UTILITIES (for full mode)
// ============================================================================

function buildDatabaseUrl(): string {
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const port = process.env.PGPORT || '5432';
    const encodedPassword = encodeURIComponent(process.env.PGPASSWORD);
    const host = process.env.PGHOST;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const sslSuffix = isLocal ? '?sslmode=disable' : '?sslmode=require';
    return `postgresql://${process.env.PGUSER}:${encodedPassword}@${host}:${port}/${process.env.PGDATABASE}${sslSuffix}`;
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error('Missing DATABASE_URL or PG* environment variables');
}

async function activateUser(email: string): Promise<string | null> {
  const url = buildDatabaseUrl();
  const pool = new Pool({ 
    connectionString: url, 
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false as any 
  });
  try {
    const res = await pool.query(
      `UPDATE user_organizations uo
       SET status = 'active',
           approved_at = NOW(),
           updated_at = NOW()
       FROM users u
       JOIN organizations o ON o.slug = 'slmts'
       WHERE uo.user_id = u.id
         AND uo.org_id = o.id
         AND u.email = $1
       RETURNING u.id`,
      [email.toLowerCase()]
    );
    return res.rowCount > 0 ? res.rows[0].id : null;
  } finally {
    await pool.end();
  }
}

// ============================================================================
// TEST IMPLEMENTATIONS
// ============================================================================

async function quickTest() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 QUICK SMOKE TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const jar = new CookieJar();
  const email = `test+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  console.log('1️⃣  Register new user');
  let res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' })
  });
  const regBody = await res.json().catch(() => ({}));
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');
  console.log('   Response:', regBody);
  jar.capture(res as any);

  console.log('\n2️⃣  Access /me endpoint (expect 401 - not logged in)');
  res = await fetch(`${baseUrl}/api/auth/me`, { headers: jar.headers() });
  console.log('   Status:', res.status, res.status === 401 ? '✓' : '✗');

  console.log('\n3️⃣  Login attempt (expect 200 - pending membership still allows auth)');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: jar.headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password })
  });
  let loginText = await res.text();
  try { loginText = JSON.stringify(JSON.parse(loginText)); } catch {}
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');
  console.log('   Response:', loginText);
  jar.capture(res as any);

  console.log('\n4️⃣  Logout');
  res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: jar.headers() });
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Quick smoke test complete!');
  console.log('Note: successful login is expected even while membership is pending');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function fullTest() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔬 FULL END-TO-END TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const jar = new CookieJar();
  const email = `test+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  console.log('1️⃣  Register new user');
  let res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' })
  });
  const regJson = await res.json().catch(() => ({} as any));
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');
  console.log('   Response:', regJson);
  jar.capture(res as any);

  console.log('\n2️⃣  Approve SLMTS membership in database');
  const userId = await activateUser(email);
  console.log('   Approved user ID:', userId, userId ? '✓' : '✗');

  console.log('\n3️⃣  Login with credentials');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: jar.headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password })
  });
  const loginText = await res.text();
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');
  console.log('   Response:', loginText);
  jar.capture(res as any);

  console.log('\n4️⃣  Access /me endpoint (verify logged in)');
  res = await fetch(`${baseUrl}/api/auth/me`, { headers: jar.headers() });
  const meText = await res.text();
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');
  console.log('   Response:', meText);

  console.log('\n5️⃣  Logout');
  res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: jar.headers() });
  console.log('   Status:', res.status, res.status === 200 ? '✓' : '✗');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Full end-to-end test complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================================================
// SERVER AUTO-START (for --auto mode)
// ============================================================================

async function sleep(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

async function runWithAutoServer(testFn: () => Promise<void>) {
  console.log('\n🚀 Starting dev server...\n');
  
  const child = spawn('npm', ['run', 'dev'], {
    shell: true,
    env: { ...process.env, SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-123' },
  });

  let ready = false;
  child.stdout.on('data', (d) => {
    const s = d.toString();
    process.stdout.write(s);
    if (s.includes('serving on port 5000')) ready = true;
  });
  child.stderr.on('data', (d) => process.stderr.write(d.toString()));

  // Wait until ready or timeout (30 seconds)
  const start = Date.now();
  while (!ready && Date.now() - start < 30000) {
    await sleep(500);
  }
  
  if (!ready) {
    child.kill('SIGINT');
    throw new Error('Server did not start in time (30 second timeout)');
  }
  
  // Small settle delay
  await sleep(500);

  try {
    await testFn();
  } finally {
    console.log('🛑 Stopping dev server...\n');
    child.kill('SIGINT');
    await sleep(500);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const testFn = mode === 'full' ? fullTest : quickTest;
  
  if (autoMode) {
    await runWithAutoServer(testFn);
  } else {
    await testFn();
  }
}

main().catch(err => { 
  console.error('\n❌ Test failed:', err.message); 
  console.error('\nRun with --help for usage information\n');
  process.exit(1); 
});
