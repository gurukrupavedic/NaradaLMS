'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@narada/auth'

import { fetchApi } from './api'
import { PROFILE_COOKIE } from './constants'
import type { ApiProfile } from './types'

export async function getProfiles(): Promise<ApiProfile[]> {
  return fetchApi<ApiProfile[]>('/profiles')
}

export async function selectProfile(profileId: string): Promise<void> {
  const cookieJar = await cookies()
  cookieJar.set(PROFILE_COOKIE, profileId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect('/')
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  const cookieJar = await cookies()
  cookieJar.delete(PROFILE_COOKIE)
  redirect('/login')
}
