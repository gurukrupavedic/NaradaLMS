import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@narada/auth'

import { fetchApi } from '@/lib/api'
import { PROFILE_COOKIE } from '@/lib/constants'
import type { ApiProfile } from '@/lib/types'
import { SignInForm } from '@/components/auth/sign-in-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const [session, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    cookies(),
  ])

  if (!session) {
    return <SignInForm />
  }

  if (cookieStore.get(PROFILE_COOKIE)) {
    redirect('/')
  }

  const profiles = await fetchApi<ApiProfile[]>('/profiles')
  return <SignInForm initialProfiles={profiles} />
}
