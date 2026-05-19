'use client'

import { env } from '@narada/env'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({ baseURL: env.NEXT_PUBLIC_API_URL })
export const { useSession, signIn, signUp, signOut } = authClient
