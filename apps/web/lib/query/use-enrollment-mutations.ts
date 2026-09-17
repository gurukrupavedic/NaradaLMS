'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { enrollProfile, moveEnrollmentToBatch, putStudentOnBreak } from '@/lib/api/resources'

/**
 * Admin "add a student" (components/admin/add-student-drawer.tsx). Besides this batch's own
 * detail view (the roster it renders comes straight from `GET /batches/:batchId`), every cached
 * profile search is invalidated too — the profile just added is now enrolled here, so a search
 * result still showing its "Add" button, unrefreshed, would let the admin re-click into a 409 the
 * search itself could have prevented.
 */
export function useEnrollProfile(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: 'student' | 'ta' | 'instructor' }) =>
      enrollProfile(batchId, profileId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
    },
  })
}

/**
 * Admin "move to another batch" (components/admin/move-batch-drawer.tsx, opened from a student's
 * own profile). Invalidates both batches' detail queries — the source loses a roster row, the
 * destination gains one — the moved profile's own detail query (its "Learning" ladder shows the
 * batch it's in, per track), and the profile search cache, since the move can change who's
 * addable to either batch.
 */
export function useMoveEnrollment(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ profileId, toBatchId }: { profileId: string; toBatchId: string; toBatchCode: string }) =>
      moveEnrollmentToBatch(batchId, profileId, toBatchId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(variables.toBatchCode) })
      void queryClient.invalidateQueries({ queryKey: keys.profiles.detail(variables.profileId) })
      void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
    },
  })
}

/**
 * The mark book's "Mark on break" row action (components/mark-book.tsx, wired from
 * components/admin/batch-detail.tsx and components/teaching-list.tsx) — same batchId/invalidateKey
 * shape as use-evaluation-mutations.ts's useSetEvaluation, since the two screens read from
 * different endpoints (`GET /batches/:id` vs. `GET /me/dashboard`) and each needs its own query
 * invalidated once the student drops off the roster.
 */
export function useSetOnBreak(batchId: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profileId: string) => putStudentOnBreak(batchId, profileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invalidateKey })
    },
  })
}
