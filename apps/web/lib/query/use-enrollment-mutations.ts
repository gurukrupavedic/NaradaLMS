'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import { enrollProfile, moveEnrollmentToBatch, putStudentOnBreak } from '@/lib/api/resources'

/**
 * Admin "add a student" (components/admin/add-student-drawer.tsx). Besides this batch's own
 * detail view (the roster it renders comes straight from `GET /batches/:batchId`), every cached
 * profile search is invalidated too — the profile just added is now enrolled here, so a search
 * result still showing its "Add" button, unrefreshed, would let the admin re-click into a 409 the
 * search itself could have prevented. `profileName` isn't sent anywhere — it's only there so the
 * toast can say who was added.
 */
export function useEnrollProfile(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: ({
        profileId,
        role,
      }: {
        profileId: string
        profileName: string
        role: 'student' | 'ta' | 'instructor'
      }) => enrollProfile(batchId, profileId, role),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
      },
    },
    {
      success: (_data, { profileName }) => `Added ${profileName} to ${code}.`,
      failure: ({ profileName }) => `Couldn't add ${profileName}.`,
    },
  )
}

/**
 * Admin "move to another batch" (components/admin/move-batch-drawer.tsx, opened from a student's
 * own profile). Invalidates both batches' detail queries — the source loses a roster row, the
 * destination gains one — the moved profile's own detail query (its "Learning" ladder shows the
 * batch it's in, per track), and the profile search cache, since the move can change who's
 * addable to either batch. `profileName` is only for the toast.
 */
export function useMoveEnrollment(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: ({
        profileId,
        toBatchId,
      }: {
        profileId: string
        profileName: string
        toBatchId: string
        toBatchCode: string
      }) => moveEnrollmentToBatch(batchId, profileId, toBatchId),
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
        void queryClient.invalidateQueries({ queryKey: keys.batches.detail(variables.toBatchCode) })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detail(variables.profileId) })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
      },
    },
    {
      success: (_data, { profileName, toBatchCode }) => `Moved ${profileName} to ${toBatchCode}.`,
      failure: ({ profileName, toBatchCode }) => `Couldn't move ${profileName} to ${toBatchCode}.`,
    },
  )
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

  return useEditMutation(
    {
      mutationFn: (profileId: string) => putStudentOnBreak(batchId, profileId),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: invalidateKey })
      },
    },
    { success: 'Marked on break.', failure: "Couldn't mark on break." },
  )
}
