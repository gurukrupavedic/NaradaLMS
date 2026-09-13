'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { selfEnrollInBatch, updateBatchEnrollmentWindow } from '@/lib/api/resources'

/**
 * Joining a batch changes two things the cache can't reconcile on its own: the dashboard's
 * `hasActiveBatch`/`memberships` (a brand new membership, not an edit to one already cached) and
 * every other open batch's `seatsRemaining` (one seat gone, possibly at any of them if the
 * reader had several tabs open). Invalidating both, rather than writing an optimistic patch, is
 * the simpler correct choice for an action a reader takes once and then leaves this screen.
 */
export function useSelfEnroll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batchId: string) => selfEnrollInBatch(batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      void queryClient.invalidateQueries({ queryKey: keys.batches.open })
    },
  })
}

export type EnrollmentWindowPatch = {
  enrollmentOpensAt: string | null
  enrollmentClosesAt: string | null
  capacity: number | null
}

// Admin-side counterpart: setting a batch's enrollment window/capacity
// (components/admin/batch-detail.tsx). Affects both this batch's own admin detail view and the
// student-facing open list, so both get invalidated.
export function useUpdateBatchEnrollmentWindow(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: EnrollmentWindowPatch) => updateBatchEnrollmentWindow(batchId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.batches.open })
    },
  })
}
