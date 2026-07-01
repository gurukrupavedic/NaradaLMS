import 'server-only'

import { cookies, headers } from 'next/headers'
import { env } from '@narada/env'

import { PROFILE_COOKIE } from './constants'

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()])
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'x-school-slug': env.NEXT_PUBLIC_SCHOOL_SLUG,
      cookie: headerStore.get('cookie') ?? '',
      ...(profileId ? { 'x-profile-id': profileId } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    throw new Error(`API error ${response.status} on ${path}`)
  }

  const { data } = await response.json()
  return data as T
}
