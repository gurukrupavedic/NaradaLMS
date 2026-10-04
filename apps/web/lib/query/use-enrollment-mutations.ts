'use client'

import { useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import {
  changeMemberRole,
  enrollProfile,
  moveEnrollmentToBatch,
  putStudentOnBreak,
  removeTeacher,
  setStudentScore,
} from '@/lib/api/resources'
import type { Score, ScoreKey } from '@/lib/scores'

/**
 * Admin "add a student" (components/admin/add-student-drawer.tsx). Besides this batch's own
 * detail view (its roster comes from `GET /profiles/:id/batches?withDetail=true`), every cached
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
 * different endpoints (`GET /profiles/:id/batches` vs. `GET /me/dashboard`) and each needs its own query
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

/**
 * Staffing a batch from its admin page (components/mark-book.tsx's "Promote to TA" and
 * components/admin/edit-staff-drawer.tsx's TA "Remove"): the one role change the server allows, in
 * either direction. A TA is also a roster student, so the roster and the teaching-staff list both
 * read from the batch detail this invalidates. `profileName` is only for the toast.
 */
export function useChangeMemberRole(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: ({ profileId, role }: { profileId: string; profileName: string; role: 'student' | 'ta' }) =>
        changeMemberRole(batchId, profileId, role),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
        void queryClient.invalidateQueries({ queryKey: keys.batches.all })
      },
    },
    {
      success: (_data, { profileName, role }) =>
        role === 'ta' ? `${profileName} is now a TA.` : `${profileName} is no longer a TA.`,
      failure: ({ profileName, role }) =>
        role === 'ta' ? `Couldn't promote ${profileName} to TA.` : `Couldn't remove ${profileName} as TA.`,
    },
  )
}

/** Admin "remove teacher" (components/admin/edit-staff-drawer.tsx). The server refuses the last one. */
export function useRemoveTeacher(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: ({ profileId }: { profileId: string; profileName: string }) =>
        removeTeacher(batchId, profileId),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
        void queryClient.invalidateQueries({ queryKey: keys.batches.all })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
      },
    },
    {
      success: (_data, { profileName }) => `Removed ${profileName} from ${code}.`,
      failure: ({ profileName }) => `Couldn't remove ${profileName}.`,
    },
  )
}

/**
 * The mark book's three score columns (components/mark-book.tsx) — same batchId/invalidateKey
 * shape as {@link useSetOnBreak}, since the admin batch view and the teacher's dashboard each
 * read the roster from a different endpoint.
 */
export function useSetScore(batchId: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: ({ studentId, key, score }: { studentId: string; key: ScoreKey; score: Score }) =>
        setStudentScore(batchId, studentId, key, score),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: invalidateKey })
      },
    },
    { success: 'Score saved.', failure: "Couldn't save that score." },
  )
}
