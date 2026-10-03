'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { changeContact, saveProfile, type ChangeContactInput, type SaveProfileInput } from '@/lib/api/resources'

/**
 * The "edit profile" form (components/edit-profile-dialog.tsx) — the profile's own owner, or a
 * school admin correcting someone else's (`isSelf` only changes the failure toast's wording; the
 * server, `apps/api/src/profiles/service.ts::updateProfile` and `courseProfile/service.ts`, decide
 * what's actually allowed via `access.isSchoolAdmin()`). Only the target profile's own detail query
 * is invalidated — name/city/etc. aren't duplicated into any other cached view (a batch roster shows
 * role/joinedAt, not this contact/background detail).
 */
export function useUpdateProfile(profileId: string, isSelf = true) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: SaveProfileInput) => saveProfile(profileId, input),
      // Also on failure: the first of the two PATCHes may have landed.
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detail(profileId) })
      },
    },
    {
      success: 'Profile saved.',
      failure: isSelf ? "Couldn't save your profile." : "Couldn't save the student's profile.",
    },
  )
}

/**
 * Changing the phone number or year of birth, behind a one-time code (components/
 * change-contact-dialog.tsx). A new phone is also the account's sign-in number, so the profile list
 * the login screen reads is stale too — only this profile's detail is cached here, though.
 */
export function useChangeContact(profileId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: ChangeContactInput) => changeContact(profileId, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.profiles.detail(profileId) }),
    },
    { success: 'Details updated.', failure: "Couldn't update your details." },
  )
}
