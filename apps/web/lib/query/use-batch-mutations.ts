'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import {
  closeBatchEnrollment,
  createBatch,
  openBatchEnrollment,
  requestBatchEnrollment,
  type CreateBatchInput,
} from '@/lib/api/resources'

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

  return useMutation({
    mutationFn: (batchId: string) => requestBatchEnrollment(batchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.dashboard })
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
