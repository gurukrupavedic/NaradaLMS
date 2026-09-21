'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { createBatch, requestBatchEnrollment, type CreateBatchInput } from '@/lib/api/resources'

/**
 * Requesting to join a batch changes the one thing the cache can't reconcile on its own: the
 * dashboard's `pendingBatchIds` (components/open-batch-picker.tsx uses this to swap a batch's
 * "Join" button for a disabled "Pending approval" once the request lands) — no seat is taken yet,
 * that only happens once an admin/instructor approves the request, so `keys.batches.open` doesn't
 * need invalidating here. Not optimistic, matching the review mutations
 * (`use-enrollment-request-mutations.ts`) — a request a reader files once and then leaves this
 * screen for costs nothing to wait on.
 */
export function useRequestEnrollment() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (batchId: string) => requestBatchEnrollment(batchId),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      },
    },
    { success: 'Request sent — pending approval.', failure: "Couldn't send your request." },
  )
}

// The admin "create batch" form (components/admin/create-batch-form.tsx). Affects the admin
// overview list and the student-facing "request to join" list, since every non-completed batch
// (including a brand new one) is immediately requestable.
export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: CreateBatchInput) => createBatch(input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.batches.all })
        void queryClient.invalidateQueries({ queryKey: keys.batches.open })
      },
    },
    {
      success: (_batch, { code }) => `Created batch ${code}.`,
      failure: ({ code }) => `Couldn't create batch ${code}.`,
    },
  )
}
