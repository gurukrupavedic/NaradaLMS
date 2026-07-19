'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@narada/auth'
import { env } from '@narada/env'
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies'

import { fetchApi } from './api'
import { PROFILE_COOKIE } from './constants'
import type { ApiProfile } from './types'

export async function getProfiles(): Promise<ApiProfile[]> {
  return fetchApi<ApiProfile[]>('/profiles')
}

export async function getCurrentProfile(): Promise<ApiProfile | null> {
  const cookieStore = await cookies()
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value
  if (!profileId) return null

  const profiles = await getProfiles()
  return profiles.find(profile => profile.id === profileId) ?? null
}

export async function selectProfile(profileId: string): Promise<void> {
  // BetterAuth's organization plugin gates every school-scoped permission check
  // (see apps/api/src/utils/auth.ts hasPermission) on the session having an active
  // organization — a separate concept from Narada's own x-school-slug tenant scoping.
  // Calling auth.api.X() directly (rather than through an HTTP round trip) doesn't
  // propagate its Set-Cookie response headers to the browser automatically, so we
  // forward them ourselves — otherwise the session's cookie cache stays stale and
  // every school-permission check keeps throwing "No active organization".
  const result = await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationSlug: env.NEXT_PUBLIC_SCHOOL_SLUG },
    returnHeaders: true,
  })

  const cookieJar = await cookies()
  applySetCookieHeader(cookieJar, result.headers.get('set-cookie'))

  cookieJar.set(PROFILE_COOKIE, profileId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect('/')
}

export async function signOut(): Promise<void> {
  const result = await auth.api.signOut({
    headers: await headers(),
    returnHeaders: true,
  })
  const cookieJar = await cookies()
  applySetCookieHeader(cookieJar, result.headers.get('set-cookie'))
  cookieJar.delete(PROFILE_COOKIE)
  redirect('/login')
}

function applySetCookieHeader(
  cookieJar: Awaited<ReturnType<typeof cookies>>,
  setCookie: string | null,
): void {
  if (!setCookie) return

  parseSetCookieHeader(setCookie).forEach((attributes, name) => {
    cookieJar.set(name, attributes.value, toCookieOptions(attributes))
  })
}
