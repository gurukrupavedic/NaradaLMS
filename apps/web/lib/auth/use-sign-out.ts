'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { signOut as signOutRequest } from '@/lib/auth/client'
import { clearSelectedProfile } from '@/lib/auth/profile-store'

/**
 * Signs out and returns to /login. Shared by the app shell's menu and the root page (which a person
 * in no course can't get past, so it needs its own way out).
 */
export function useSignOut(): () => void {
  const router = useRouter()
  const queryClient = useQueryClient()

  return function signOut() {
    void signOutRequest().finally(() => {
      clearSelectedProfile()
      // Every cached query — dashboard, exams, admin batches, authProfile — is scoped to whoever was
      // signed in. `QueryClient` is a browser-lifetime singleton (`lib/query/client.ts`), so without
      // this the *next* account to sign in in this same tab would see the outgoing account's data
      // (and its admin nav item) until each query happened to refetch on its own — which, at a 60s+
      // staleTime, is not "immediately."
      queryClient.clear()
      router.push('/login')
    })
  }
}
