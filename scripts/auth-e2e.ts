/* End-to-end auth smoke: register via API, activate in DB, login, /me, logout */
import { Pool } from 'pg';

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
  throw new Error('Missing DATABASE_URL or PG* envs');
}

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

async function activateUser(email: string): Promise<string | null> {
  const url = buildDatabaseUrl();
  const pool = new Pool({ connectionString: url, ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false as any });
  try {
    const res = await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE email = $2 RETURNING id', ['active', email.toLowerCase()]);
    return res.rowCount > 0 ? res.rows[0].id : null;
  } finally {
    await pool.end();
  }
}

async function main() {
  const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:5000';
  const jar = new CookieJar();
  const email = process.env.TEST_EMAIL || `test+${Date.now()}@example.com`;
  const password = process.env.TEST_PASSWORD || 'Passw0rd!';

  console.log('1) Register');
  let res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' })
  });
  const regJson = await res.json().catch(() => ({} as any));
  console.log('  status:', res.status, regJson);
  jar.capture(res as any);

  console.log('2) Activate user in DB');
  const id = await activateUser(email);
  console.log('  activated id:', id);

  console.log('3) Login');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: jar.headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password })
  });
  const loginText = await res.text();
  console.log('  status:', res.status, loginText);
  jar.capture(res as any);

  console.log('4) Me');
  res = await fetch(`${baseUrl}/api/auth/me`, { headers: jar.headers() });
  const meText = await res.text();
  console.log('  status:', res.status, meText);

  console.log('5) Logout');
  res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: jar.headers() });
  console.log('  status:', res.status);

  console.log('Done');
}

main().catch(err => { console.error('E2E failed:', err); process.exit(1); });
