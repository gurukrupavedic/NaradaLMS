'use client'

import { env } from '@narada/env/client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({ baseURL: `${env.NEXT_PUBLIC_API_URL}/auth` })
export const { useSession, signIn, signUp, signOut } = authClient
