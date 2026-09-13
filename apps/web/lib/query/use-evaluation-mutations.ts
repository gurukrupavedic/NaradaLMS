'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createEvaluation } from '@/lib/api/resources'
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
 * endpoints (`GET /batches/:id` + its evaluations vs. `GET /me/dashboard`).
 */
export function useSetEvaluation(batchId: string, invalidateKey: readonly unknown[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetLevelInput) => createEvaluation(batchId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invalidateKey })
    },
  })
}
