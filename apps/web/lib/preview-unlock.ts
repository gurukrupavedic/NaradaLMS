/**
 * TEMPORARY(preview-unlock): lets people who know a shared password see the app while
 * `COMING_SOON_MODE=true` fronts it with the maintenance page. Remove this file, its test,
 * `app/coming-soon/unlock/`, the unlock form in `app/coming-soon/page.tsx`, and the one block in
 * `proxy.ts` once the app is open to everyone.
 *
 * The password lives only in the server-only `PREVIEW_PASSWORD` env var. Entering it posts to
 * `PREVIEW_UNLOCK_PATH`, which sets a cookie holding a token derived from it; `proxy.ts` recomputes
 * the token on each request to decide whether to skip the maintenance page. The cookie is stateless
 * and never contains the password itself, and changing the password invalidates every unlock.
 *
 * This only unlocks the *pages*. `/v1/*` (the API and auth) is never gated by coming-soon mode, and
 * it is sessions, not this password, that protect data.
 *
 * Kept dependency-free (Web Crypto only) so it runs in the proxy whichever runtime Next gives it,
 * and so it can be unit-tested without a Next runtime.
 */

export const PREVIEW_COOKIE = 'narada-preview'
export const PREVIEW_UNLOCK_PATH = '/coming-soon/unlock'
export const PREVIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const TOKEN_MESSAGE = 'narada-preview-v1'
const encoder = new TextEncoder()

/** HMAC-SHA256 of a fixed message keyed by the password — the cookie's value, as lowercase hex. */
export async function previewToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(TOKEN_MESSAGE))
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Web Crypto has no `timingSafeEqual`, and the proxy may not be on the Node runtime — hence by hand. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return difference === 0
}

/**
 * Compares the tokens rather than the raw strings, so the comparison is over fixed-length values
 * whatever the caller typed. An empty password is never correct (and is not a valid HMAC key).
 */
export async function isPasswordCorrect(submitted: string, password: string): Promise<boolean> {
  if (!submitted || !password) return false
  return safeEqual(await previewToken(submitted), await previewToken(password))
}

/** Whether a request's cookie proves the password was entered. Unset password means nothing unlocks. */
export async function isUnlocked(
  cookieValue: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!cookieValue || !password) return false
  return safeEqual(cookieValue, await previewToken(password))
}
