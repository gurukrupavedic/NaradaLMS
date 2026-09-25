'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { logCounter, setCounterDay } from '@/lib/api/resources'
import { formatCount } from '@/lib/counter'

/**
 * Both write paths for one counter of one profile (`components/counter-card.tsx`). Either changes
 * every window that counter has cached — this year's total, the lifetime, the recent days — so what's
 * invalidated is the profile's whole counters prefix, not one window.
 */
function useInvalidateCounters(profileId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.counters.profile(profileId) })
}

/** Adds to a day — the student's today unless a past date is given. */
export function useLogCounter(profileId: string, key: string) {
  const invalidate = useInvalidateCounters(profileId)

  return useEditMutation(
    {
      mutationFn: (input: { count: number; loggedOn?: string }) =>
        logCounter(profileId, key, input),
      onSuccess: invalidate,
    },
    {
      success: (_day, { count }) => `Added ${formatCount(count)}.`,
      failure: "Couldn't log that.",
    },
  )
}

/** Sets a day's total outright — a correction; 0 clears the day. */
export function useSetCounterDay(profileId: string, key: string) {
  const invalidate = useInvalidateCounters(profileId)

  return useEditMutation(
    {
      mutationFn: ({ loggedOn, count }: { loggedOn: string; count: number }) =>
        setCounterDay(profileId, key, loggedOn, count),
      onSuccess: invalidate,
    },
    {
      success: (_day, { count }) => (count === 0 ? 'Day cleared.' : 'Day updated.'),
      failure: "Couldn't update that day.",
    },
  )
}
