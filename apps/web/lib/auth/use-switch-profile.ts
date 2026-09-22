'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { setSelectedProfile } from '@/lib/auth/profile-store'
import type { ApiProfile } from '@/lib/api/api-types'

/**
 * Switches which of the signed-in account's profiles is active — app-shell.tsx's header dropdown,
 * for a household sharing one phone number across several children's profiles (same reasoning as
 * `app/login/page.tsx`'s own profile picker, which this mirrors: `setSelectedProfile` then
 * `queryClient.clear()`, since every cached query — dashboard, exams, admin access — is scoped to
 * whichever profile was active when it was fetched, and would otherwise keep showing the outgoing
 * profile's data until each query happened to refetch on its own).
 *
 * Always lands on `/` rather than wherever the switch was triggered from: the new profile isn't
 * guaranteed to belong to the current page's course, or to have admin access if the page it was on
 * needed it, and `/` already knows how to find whichever course *this* profile belongs to (same
 * as `useSignOut`'s post-sign-out `/login`, and the login picker's own post-selection `/`).
 */
export function useSwitchProfile(): (profile: Pick<ApiProfile, 'id' | 'name'>) => void {
  const router = useRouter()
  const queryClient = useQueryClient()

  return function switchProfile(profile: Pick<ApiProfile, 'id' | 'name'>) {
    setSelectedProfile(profile.id, profile.name)
    queryClient.clear()
    router.push('/')
  }
}
