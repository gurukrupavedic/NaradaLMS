/**
 * BetterAuth's own REST surface, called directly — no `better-auth` client SDK, matching the rest
 * of this workspace (`lib/api/client.ts`'s plain `fetch`, no generated/SDK client anywhere). Every
 * call goes to this app's own `/v1/auth/*` path, which `next.config.ts`'s rewrite forwards to the
 * real apps/api-next: same-origin, so the session cookie BetterAuth sets lands on this app's own
 * origin and the browser attaches it automatically on every later same-origin request — no client
 * JS ever touches the cookie's value.
 *
 * Endpoint paths and payload shapes here are load-bearing on BetterAuth's own phone-number plugin
 * (packages/auth/src/index.ts in the api-next checkout) rather than anything this workspace
 * controls — verified against apps/web's own working `authClient.phoneNumber.sendOtp`/`.verify`
 * calls (components/auth/sign-in-form.tsx there), which exercise the same plugin.
 */

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/v1/auth${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

async function extractError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  const message = (body as { message?: string; error?: { message?: string } } | null)
  return message?.message ?? message?.error?.message ?? `Request failed (${response.status})`
}

export async function sendOtp(phoneNumber: string): Promise<{ error: string | null }> {
  const response = await authFetch('/phone-number/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  })
  return response.ok ? { error: null } : { error: await extractError(response) }
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
): Promise<{ error: string | null }> {
  const response = await authFetch('/phone-number/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  })
  return response.ok ? { error: null } : { error: await extractError(response) }
}

export type AuthSession = {
  user: { id: string; name: string; email: string; isSuperAdmin: boolean }
  session: { id: string; expiresAt: string }
}

/** Null means "no signed-in user" — a 401 from a missing/expired session, not a thrown error. */
export async function getAuthSession(): Promise<AuthSession | null> {
  const response = await authFetch('/get-session')
  if (!response.ok) return null
  const body: unknown = await response.json().catch(() => null)
  return (body as AuthSession | null) ?? null
}

export async function signOut(): Promise<void> {
  await authFetch('/sign-out', { method: 'POST' })
}
