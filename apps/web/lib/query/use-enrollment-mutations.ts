'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { keys } from '@/lib/query/options'
import { enrollProfile, moveEnrollmentToBatch } from '@/lib/api/resources'

/**
 * Admin "add a student" (components/admin/roster-editor.tsx). Besides this batch's own detail
 * view (the roster it renders comes straight from `GET /batches/:batchId`), every cached profile
 * search is invalidated too — the profile just added is now enrolled here, so a search result
 * still showing its "Add" button, unrefreshed, would let the admin re-click into a 409 the search
 * itself could have prevented.
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
 * Admin "move to another batch" (components/admin/roster-editor.tsx). Invalidates both batches'
 * detail queries — the source loses a roster row, the destination gains one — plus the profile
 * search cache, since the move can change who's addable to either.
 */
export function useMoveEnrollment(code: string, batchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ profileId, toBatchId }: { profileId: string; toBatchId: string; toBatchCode: string }) =>
      moveEnrollmentToBatch(batchId, profileId, toBatchId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(code) })
      void queryClient.invalidateQueries({ queryKey: keys.batches.detail(variables.toBatchCode) })
      void queryClient.invalidateQueries({ queryKey: keys.profiles.searchAll })
    },
  })
}
