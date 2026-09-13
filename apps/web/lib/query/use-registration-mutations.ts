'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { approveRegistration, rejectRegistration } from '@/lib/api/resources'
import type { ApiRegistration } from '@/lib/api/api-types'

/**
 * Approve/reject, not optimistic like the catalog mutations (`use-catalog-mutations.ts`) — a
 * review decision is deliberate and infrequent, not a burst of small edits, so waiting for the
 * real response before updating the screen costs nothing a reader would notice. `onSuccess` writes
 * the server's own returned row straight into the detail cache (no separate refetch needed) and
 * invalidates every list/detail query so whichever status tab the reader came from drops the row.
 */
function useReviewRegistrationMutation(review: (id: string) => Promise<ApiRegistration>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: review,
    onSuccess: updated => {
      queryClient.setQueryData(keys.registrations.detail(updated.id), updated)
      void queryClient.invalidateQueries({ queryKey: keys.registrations.all })
    },
  })
}

export function useApproveRegistration() {
  return useReviewRegistrationMutation(approveRegistration)
}

export function useRejectRegistration() {
  return useReviewRegistrationMutation(rejectRegistration)
}
