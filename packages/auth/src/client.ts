'use client'

import { createAuthClient } from 'better-auth/react'
import { phoneNumberClient } from 'better-auth/client/plugins'

// Same-origin with the app (routed to the real API via apps/web's next.config
// rewrite), not env.NEXT_PUBLIC_API_URL: better-auth's session cookie is set on
// whatever origin actually answers this request, so browser calls must stay
// same-origin rather than pointing cross-origin at the API's own domain —
// otherwise the cookie ends up scoped to the API's domain, invisible to the
// app's server. createAuthClient requires an absolute URL, so this is built from
// window.location at runtime; the SSR fallback is never actually fetched from.
const baseURL = typeof window === 'undefined' ? 'http://localhost/v1/auth' : `${window.location.origin}/v1/auth`

export const authClient = createAuthClient({ baseURL, plugins: [phoneNumberClient()] })
export const { useSession, signIn, signUp, signOut } = authClient
