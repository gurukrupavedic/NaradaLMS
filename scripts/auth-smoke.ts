/* Simple auth smoke test against running dev server */
const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:5000';

class CookieJar {
  private cookie: string = '';
  capture(res: Response) {
    const setCookie = (res.headers as any).get ? (res.headers as any).get('set-cookie') : undefined;
    if (setCookie) {
      // Support multiple cookies separated by comma
      const cookies = Array.isArray(setCookie) ? setCookie : String(setCookie).split(/,(?=[^;]+;)/);
      const parts = cookies.map((c: string) => c.split(';')[0].trim());
      this.cookie = parts.join('; ');
    }
  }
  headers(init?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = { ...(init as Record<string, string>) };
    if (this.cookie) headers['Cookie'] = this.cookie;
    return headers;
  }
}

async function main() {
  const jar = new CookieJar();
  const email = `test+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  console.log('1) Register');
  let res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' })
  });
  const regBody = await res.json().catch(() => ({}));
  console.log('  status:', res.status, regBody);
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
  let loginText = await res.text();
  try { loginText = JSON.stringify(JSON.parse(loginText)); } catch {}
  console.log('  status:', res.status, loginText);
  jar.capture(res as any);

  console.log('4) Logout');
  res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: jar.headers() });
  console.log('  status:', res.status);

  console.log('Done');
}

main().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
