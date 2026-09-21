'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { updateProfile, type UpdateProfileInput } from '@/lib/api/resources'

/**
 * The student's own "edit my profile" form (components/edit-profile-dialog.tsx). Only the target
 * profile's own detail query is invalidated — name/city/etc. aren't duplicated into any other
 * cached view (a batch roster shows role/joinedAt, not this contact/background detail).
 */
export function useUpdateProfile(profileId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (patch: UpdateProfileInput) => updateProfile(profileId, patch),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detail(profileId) })
      },
    },
    { success: 'Profile saved.', failure: "Couldn't save your profile." },
  )
}
