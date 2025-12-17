import { spawn } from 'child_process';

const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:5000';

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

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function smoke() {
  const jar = new CookieJar();
  const email = `test+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  console.log('1) Register');
  let res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' })
  });
  console.log('  status:', res.status);
  jar.capture(res as any);

  console.log('2) Me (expect 401)');
  res = await fetch(`${baseUrl}/api/auth/me`, { headers: jar.headers() });
  console.log('  status:', res.status);

  console.log('3) Login (expect 401 pending)');
  res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: jar.headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password })
  });
  console.log('  status:', res.status);

  console.log('4) Logout');
  res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: jar.headers() });
  console.log('  status:', res.status);
}

async function main() {
  console.log('Starting dev server...');
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

  // Wait until ready or timeout
  const start = Date.now();
  while (!ready && Date.now() - start < 30000) {
    await sleep(500);
  }
  if (!ready) {
    throw new Error('Server did not start in time');
  }
  // Small settle delay
  await sleep(500);

  try {
    await smoke();
  } finally {
    console.log('Stopping dev server...');
    child.kill('SIGINT');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
