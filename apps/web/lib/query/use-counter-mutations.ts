'use client'

import { useQueryClient } from '@tanstack/react-query'
import type { Details } from '@narada/profile-fields'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { addToCounter, updateCourseDetails } from '@/lib/api/resources'
import { formatCount } from '@/lib/counter'

/**
 * The write paths for a profile's course-level details (`components/counter-card.tsx`). The values
 * come back with the profile page's own response, so that one query is what's refreshed.
 */
function useRefreshProfile(profileId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.profiles.detail(profileId) })
}

/** Adds to one of the course's counters. */
export function useAddToCounter(profileId: string, key: string) {
  const refresh = useRefreshProfile(profileId)

  return useEditMutation(
    {
      mutationFn: (count: number) => addToCounter(profileId, key, count),
      onSuccess: refresh,
    },
    { success: (_result, count) => `Added ${formatCount(count)}.`, failure: "Couldn't add that." },
  )
}

/** Edits the course-level details — for a counter, setting it outright (a correction). */
export function useUpdateCourseDetails(profileId: string) {
  const refresh = useRefreshProfile(profileId)

  return useEditMutation(
    {
      mutationFn: (patch: Details) => updateCourseDetails(profileId, patch),
      onSuccess: refresh,
    },
    { success: 'Updated.', failure: "Couldn't save that." },
  )
}
