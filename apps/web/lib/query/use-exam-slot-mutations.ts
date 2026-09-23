'use client'

import { useQueryClient } from '@tanstack/react-query'

import {
  approveExamSlotRequest,
  cancelExamSlot,
  openExamSlot,
  rejectExamSlotRequest,
  requestExamSlot,
} from '@/lib/api/resources'
import type { ApiExamSlotRequest } from '@/lib/api/api-types'
import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'

/** Opens a new bookable slot (components/admin/exam-slots-panel.tsx). */
export function useOpenExamSlot() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: openExamSlot,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.examSlots.all })
      },
    },
    { success: 'Slot opened.', failure: "Couldn't open the slot." },
  )
}

/** Withdraws a slot — also rejects the pending request holding it, if any, on the server, so both
 * lists (slots and requests) go stale together. */
export function useCancelExamSlot() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: cancelExamSlot,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.examSlots.all })
        void queryClient.invalidateQueries({ queryKey: keys.examSlotRequests.all })
        void queryClient.invalidateQueries({ queryKey: keys.examSlotRequests.mine })
      },
    },
    { success: 'Slot cancelled.', failure: "Couldn't cancel the slot." },
  )
}

/**
 * A student claiming a slot for themselves (components/exams-screen.tsx's "Available sittings").
 * The failure toast surfaces the server's own message underneath (`useEditMutation`'s standard
 * behavior) — that's where "you need L3 on every chapter of this track" or "this slot is no longer
 * open" actually shows up, so there's nothing to duplicate here.
 */
export function useRequestExamSlot() {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: requestExamSlot,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.examSlots.all })
        void queryClient.invalidateQueries({ queryKey: keys.examSlotRequests.mine })
      },
    },
    { success: 'Sitting requested.', failure: "Couldn't request this sitting." },
  )
}

/**
 * Approve/reject, not optimistic — same reasoning as `use-enrollment-request-mutations.ts`'s own
 * review mutations: a review decision is deliberate and infrequent. Approving also produces a real
 * `exam` row server-side, so this invalidates the student's dashboard/exams too, the same way
 * `use-exam-mutations.ts`'s `useRecordExamResult` does for the same reason.
 */
function useReviewExamSlotRequestMutation(
  review: (id: string) => Promise<ApiExamSlotRequest>,
  feedback: { success: string; failure: string },
) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: review,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.examSlots.all })
        void queryClient.invalidateQueries({ queryKey: keys.examSlotRequests.all })
        void queryClient.invalidateQueries({ queryKey: keys.exams })
        void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      },
    },
    feedback,
  )
}

export function useApproveExamSlotRequest() {
  return useReviewExamSlotRequestMutation(approveExamSlotRequest, {
    success: 'Request approved — the sitting is booked.',
    failure: "Couldn't approve the request.",
  })
}

export function useRejectExamSlotRequest() {
  return useReviewExamSlotRequestMutation(rejectExamSlotRequest, {
    success: 'Request rejected.',
    failure: "Couldn't reject the request.",
  })
}
