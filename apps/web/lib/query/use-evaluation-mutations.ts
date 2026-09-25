'use client'

import { useQueryClient } from '@tanstack/react-query'

import { createEvaluation, createEvaluations } from '@/lib/api/resources'
import { useEditMutation } from '@/lib/query/use-edit-mutation'
import type { ProficiencyLevel } from '@/lib/proficiency'

export type SetLevelInput = {
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  notes?: string
}

/**
 * The mark book's grade editor (components/mark-book.tsx, wired from
 * components/admin/batch-detail.tsx and components/teaching-list.tsx). Invalidates whichever
 * query actually rendered the mark book that changed — the admin batch detail view or the
 * teacher's own dashboard — rather than one shared key, since the two screens read from different
 * endpoints (`GET /profiles/:id/batches` + the batch's evaluations vs. `GET /me/dashboard`).
 */
export function useSetEvaluation(batchId: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: SetLevelInput) => createEvaluation(batchId, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: invalidateKey })
      },
    },
    { success: 'Evaluation saved.', failure: "Couldn't save that evaluation." },
  )
}

/**
 * The bulk sibling of {@link useSetEvaluation} — same endpoint, same invalidation, but for the
 * roster grid's "Promote to L3" row action (components/mark-book.tsx), which sends one item per
 * not-yet-L3 chapter in a single request rather than looping `useSetEvaluation` once per chapter.
 * mark-book.tsx computes the item list itself from the grid it already has on screen; the server
 * still independently drops any item that would overwrite an already-certified L4 chapter (see
 * apps/api/src/evaluations/service.ts's `createEvaluations`).
 */
export function useSetEvaluations(batchId: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (items: SetLevelInput[]) => createEvaluations(batchId, items),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: invalidateKey })
      },
    },
    { success: 'Promoted to L3.', failure: "Couldn't promote to L3." },
  )
}
