'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { approveEnrollmentRequest, rejectEnrollmentRequest } from '@/lib/api/resources'
import type { ApiEnrollmentRequest } from '@/lib/api/api-types'

/**
 * Approve/reject, not optimistic — same reasoning as `use-registration-mutations.ts`'s own review
 * mutations: a review decision is deliberate and infrequent, so waiting for the real response
 * before updating the screen costs nothing a reader would notice. `onSuccess` invalidates every
 * status tab so whichever one the reader approved/rejected from drops the row.
 */
function useReviewEnrollmentRequestMutation(review: (id: string) => Promise<ApiEnrollmentRequest>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: review,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.enrollmentRequests.all })
    },
  })
}

export function useApproveEnrollmentRequest() {
  return useReviewEnrollmentRequestMutation(approveEnrollmentRequest)
}

export function useRejectEnrollmentRequest() {
  return useReviewEnrollmentRequestMutation(rejectEnrollmentRequest)
}
