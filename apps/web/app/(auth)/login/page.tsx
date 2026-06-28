import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@narada/auth'

import { SignInForm } from '@/components/auth/sign-in-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    redirect('/')
  }

  return <SignInForm />
}
