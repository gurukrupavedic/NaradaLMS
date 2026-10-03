'use client'

import { useQueryClient } from '@tanstack/react-query'

import { addTrackTa, removeTrackTa } from '@/lib/api/resources'
import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'

// Both change the listed TAs and who is still a candidate, so the whole `trackTas` prefix goes stale.
export function useAddTrackTa() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: addTrackTa,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.trackTas.all })
      },
    },
    { success: 'TA added.', failure: "Couldn't add the TA." },
  )
}

export function useRemoveTrackTa() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: removeTrackTa,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.trackTas.all })
      },
    },
    { success: 'TA removed.', failure: "Couldn't remove the TA." },
  )
}
