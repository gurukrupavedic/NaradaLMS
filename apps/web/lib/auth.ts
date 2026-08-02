import 'server-only'

import type { cookies as nextCookies } from 'next/headers'
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies'
import { env } from '@narada/env/client'

type CookieJar = Awaited<ReturnType<typeof nextCookies>>

// apps/web never touches the database directly — every better-auth operation goes
// through the API's own HTTP-mounted auth routes (apps/api/src/server.ts), the same
// ones the browser client (@narada/auth/client) already uses. This keeps the frontend
// deployable without database credentials.
const AUTH_BASE_URL = `${env.NEXT_PUBLIC_API_URL}/auth`

export async function authFetch(path: string, cookieHeader: string, init?: RequestInit): Promise<Response> {
  return fetch(`${AUTH_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...init?.headers,
      cookie: cookieHeader,
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

export async function getSession(cookieHeader: string): Promise<unknown | null> {
  const response = await authFetch('/get-session', cookieHeader)
  if (!response.ok) return null
  return response.json()
}
