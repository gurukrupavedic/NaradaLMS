import 'server-only'

import type { cookies as nextCookies, headers as nextHeaders } from 'next/headers'
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies'
import { env } from '@narada/env/client'

type CookieJar = Awaited<ReturnType<typeof nextCookies>>
type HeaderStore = Awaited<ReturnType<typeof nextHeaders>>

// Origin isn't sent by browsers on every request (e.g. plain page-load GETs), but
// better-auth requires it on state-changing calls, so this reconstructs it the same
// way regardless of request type rather than relying on it being present.
export function requestOrigin(headerStore: HeaderStore): string {
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const host = headerStore.get('host') ?? ''
  return `${proto}://${host}`
}

// apps/web never touches the database directly — every better-auth operation goes
// through the API's own HTTP-mounted auth routes (apps/api/src/server.ts), the same
// ones the browser client (@narada/auth/client) already uses. This keeps the frontend
// deployable without database credentials.
const AUTH_BASE_URL = `${env.NEXT_PUBLIC_API_URL}/auth`

export async function authFetch(
  path: string,
  cookieHeader: string,
  origin: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${AUTH_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...init?.headers,
      cookie: cookieHeader,
      // better-auth rejects state-changing (POST) requests without a trusted Origin —
      // a CSRF defense that only ever mattered for its HTTP layer, which in-process
      // auth.api.X() calls (what this replaced) never went through. A browser's own
      // fetch sets this automatically; a server-to-server fetch does not, so it has to
      // be forwarded explicitly from the original incoming request.
      origin,
    },
  })
}

export function applySetCookies(cookieJar: CookieJar, response: Response): void {
  for (const setCookie of response.headers.getSetCookie()) {
    parseSetCookieHeader(setCookie).forEach((attributes, name) => {
      cookieJar.set(name, attributes.value, toCookieOptions(attributes))
    })
  }
}

export async function getSession(cookieHeader: string, origin: string): Promise<unknown | null> {
  const response = await authFetch('/get-session', cookieHeader, origin)
  if (!response.ok) return null
  return response.json()
}
