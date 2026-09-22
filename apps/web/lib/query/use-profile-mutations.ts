'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { updateProfile, type UpdateProfileInput } from '@/lib/api/resources'

/**
 * The "edit profile" form (components/edit-profile-dialog.tsx) — the profile's own owner, or a
 * school admin correcting someone else's (`isSelf` only changes the failure toast's wording; the
 * server, `apps/api/src/profiles/service.ts::updateProfile`, decides what's actually allowed via
 * `access.isSchoolAdmin()`). Only the target profile's own detail query is invalidated —
 * name/city/etc. aren't duplicated into any other cached view (a batch roster shows role/joinedAt,
 * not this contact/background detail).
 */
export function useUpdateProfile(profileId: string, isSelf = true) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (patch: UpdateProfileInput) => updateProfile(profileId, patch),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detail(profileId) })
      },
    },
    {
      success: 'Profile saved.',
      failure: isSelf ? "Couldn't save your profile." : "Couldn't save the student's profile.",
    },
  )
}
