'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { approveEnrollmentRequest, rejectEnrollmentRequest } from '@/lib/api/resources'
import type { ApiEnrollmentRequest } from '@/lib/api/api-types'

/**
 * Approve/reject, not optimistic — same reasoning as `use-registration-mutations.ts`'s own review
 * mutations: a review decision is deliberate and infrequent, so waiting for the real response
 * before updating the screen costs nothing a reader would notice. `onSuccess` invalidates every
 * status tab so whichever one the reader approved/rejected from drops the row.
 */
function useReviewEnrollmentRequestMutation(
  review: (id: string) => Promise<ApiEnrollmentRequest>,
  feedback: { success: string; failure: string },
) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: review,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.enrollmentRequests.all })
      },
    },
    feedback,
  )
}

export function useApproveEnrollmentRequest() {
  return useReviewEnrollmentRequestMutation(approveEnrollmentRequest, {
    success: 'Batch request approved.',
    failure: "Couldn't approve the batch request.",
  })
}

export function useRejectEnrollmentRequest() {
  return useReviewEnrollmentRequestMutation(rejectEnrollmentRequest, {
    success: 'Batch request rejected.',
    failure: "Couldn't reject the batch request.",
  })
}
