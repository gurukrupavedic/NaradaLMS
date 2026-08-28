'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@narada/env/client'

import { authFetch, applySetCookies, getSession, requestOrigin } from './auth'
import { fetchApi } from './api'
import { PROFILE_COOKIE } from './constants'
import type { ApiAuthProfile, ApiProfile } from './types'

export async function getProfiles(): Promise<ApiProfile[]> {
  return fetchApi<ApiProfile[]>('/profiles')
}

// Shared by every route group that requires a signed-in profile — previously duplicated
// verbatim in (student)/layout.tsx and admin/layout.tsx, with no mechanism keeping the two
// copies in sync.
export async function requireAuthenticatedProfile(): Promise<void> {
  const headerStore = await headers()
  const [session, cookieStore] = await Promise.all([
    getSession(headerStore.get('cookie') ?? '', requestOrigin(headerStore)),
    cookies(),
  ])

  if (!session || !cookieStore.get(PROFILE_COOKIE)) {
    redirect('/login')
  }
}

export async function getCurrentProfile(): Promise<ApiProfile | null> {
  const cookieStore = await cookies()
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value
  if (!profileId) return null

  const profiles = await getProfiles()
  return profiles.find(profile => profile.id === profileId) ?? null
}

export async function getAuthProfile(): Promise<ApiAuthProfile> {
  return fetchApi<ApiAuthProfile>('/profile')
}

export async function hasSchoolWideAccess(): Promise<boolean> {
  const authProfile = await getAuthProfile()
  return authProfile.isSuperAdmin || authProfile.memberships.some(m => m.role === 'owner' || m.role === 'admin')
}

// Does not redirect itself — redirect() throws a control-flow error that a caller's
// try/catch (as sign-in-form.tsx needs, to show a real failure as a toast) would
// swallow, reporting a successful selection as a failure. Callers navigate on success.
export async function selectProfile(profileId: string): Promise<void> {
  // BetterAuth's organization plugin gates every school-scoped permission check
  // (see apps/api/src/utils/auth.ts hasPermission) on the session having an active
  // organization — a separate concept from Narada's own x-school-slug tenant scoping.
  // Going through the API's HTTP route (rather than calling better-auth in-process)
  // means we have to forward its Set-Cookie response headers ourselves — otherwise
  // the session's cookie cache stays stale and every school-permission check keeps
  // throwing "No active organization".
  const headerStore = await headers()
  const response = await authFetch(
    '/organization/set-active',
    headerStore.get('cookie') ?? '',
    requestOrigin(headerStore),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationSlug: env.NEXT_PUBLIC_SCHOOL_SLUG }),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to set active organization: ${response.status}`)
  }

  const cookieJar = await cookies()
  applySetCookies(cookieJar, response)

  cookieJar.set(PROFILE_COOKIE, profileId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })
}

export async function signOut(): Promise<void> {
  const headerStore = await headers()
  const response = await authFetch('/sign-out', headerStore.get('cookie') ?? '', requestOrigin(headerStore), {
    method: 'POST',
  })

  const cookieJar = await cookies()
  applySetCookies(cookieJar, response)
  cookieJar.delete(PROFILE_COOKIE)
  redirect('/login')
}
