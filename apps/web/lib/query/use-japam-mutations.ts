'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { logJapam, setJapamDay } from '@/lib/api/resources'
import { formatCount } from '@/lib/japam'

/**
 * Both write paths for one profile's japam (`components/japam-card.tsx`). Either changes every
 * window the profile has cached — this year's total, the lifetime, the recent days — so what's
 * invalidated is the profile's whole japam prefix, not one window.
 */
function useInvalidateJapam(profileId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.japam.profile(profileId) })
}

/** Adds to a day — the student's today unless a past date is given. */
export function useLogJapam(profileId: string) {
  const invalidate = useInvalidateJapam(profileId)

  return useEditMutation(
    {
      mutationFn: (input: { count: number; loggedOn?: string }) => logJapam(profileId, input),
      onSuccess: invalidate,
    },
    {
      success: (_day, { count }) => `Added ${formatCount(count)}.`,
      failure: "Couldn't log that.",
    },
  )
}

/** Sets a day's total outright — a correction; 0 clears the day. */
export function useSetJapamDay(profileId: string) {
  const invalidate = useInvalidateJapam(profileId)

  return useEditMutation(
    {
      mutationFn: ({ loggedOn, count }: { loggedOn: string; count: number }) =>
        setJapamDay(profileId, loggedOn, count),
      onSuccess: invalidate,
    },
    {
      success: (_day, { count }) => (count === 0 ? 'Day cleared.' : 'Day updated.'),
      failure: "Couldn't update that day.",
    },
  )
}
