'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { recordExamResult, type RecordExamResultInput } from '@/lib/api/resources'
import { keys } from '@/lib/query/options'

/**
 * Grades a track exam (components/admin/record-exam-result-dialog.tsx). Recording a result does
 * more than complete the sitting: when it grants a level it writes that level to every chapter of
 * the track, so every screen that reads chapter marks or certifications goes stale with it — the
 * exams pages, the student's dashboard, and every batch's mark book — and all of them are
 * invalidated here rather than left for the caller to enumerate.
 */
export function useRecordExamResult(examId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecordExamResultInput) => recordExamResult(examId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.exams })
      void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      void queryClient.invalidateQueries({ queryKey: keys.batches.all })
      void queryClient.invalidateQueries({ queryKey: keys.profiles.detailAll })
    },
  })
}
