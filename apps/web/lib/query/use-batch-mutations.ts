'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import {
  closeBatchEnrollment,
  createBatch,
  openBatchEnrollment,
  selfEnrollInBatch,
  type CreateBatchInput,
} from '@/lib/api/resources'

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

// Admin-side "open"/"close" toggle (components/admin/batch-detail.tsx's "Enrollment" section) —
// the one-click replacement for hand-picking an opens-at/closes-at pair. Both affect this batch's
// own admin detail view and the student-facing open list, so both get invalidated.
export function useOpenBatchEnrollment(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => openBatchEnrollment(batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.batches.open })
    },
  })
}

export function useCloseBatchEnrollment(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => closeBatchEnrollment(batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.batches.open })
    },
  })
}

// The admin "create batch" form (components/admin/create-batch-form.tsx). Affects the admin
// overview list and, when created pre-opened, the student-facing open list too.
export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBatchInput) => createBatch(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.all })
      void queryClient.invalidateQueries({ queryKey: keys.batches.open })
    },
  })
}
