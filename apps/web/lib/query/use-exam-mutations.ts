'use client'

import { useQueryClient } from '@tanstack/react-query'

import { correctExamResult, recordExamResult, type RecordExamResultInput } from '@/lib/api/resources'
import { keys } from '@/lib/query/options'
import { useEditMutation } from '@/lib/query/use-edit-mutation'

/**
 * Grades a track exam (components/admin/record-exam-result-dialog.tsx). Recording a result does
 * more than complete the sitting: when it grants a level it writes that level to every chapter of
 * the track, so every screen that reads chapter marks or certifications goes stale with it — the
 * exams pages, the student's dashboard, and every batch's mark book — and all of them are
 * invalidated here rather than left for the caller to enumerate.
 */
export function useRecordExamResult(examId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: RecordExamResultInput) => recordExamResult(examId, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.exams })
        void queryClient.invalidateQueries({ queryKey: keys.dashboard })
        void queryClient.invalidateQueries({ queryKey: keys.batches.all })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detailAll })
      },
    },
    { success: 'Exam result recorded.', failure: "Couldn't record the exam result." },
  )
}

/**
 * Corrects an already-graded sitting (components/admin/record-exam-result-dialog.tsx, same form —
 * see its own doc comment). Invalidates exactly what `useRecordExamResult` does: a correction
 * rewrites chapter evaluations too, so every screen reading them goes stale the same way.
 */
export function useCorrectExamResult(examId: string) {
  const queryClient = useQueryClient()

  return useEditMutation(
    {
      mutationFn: (input: RecordExamResultInput) => correctExamResult(examId, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: keys.exams })
        void queryClient.invalidateQueries({ queryKey: keys.dashboard })
        void queryClient.invalidateQueries({ queryKey: keys.batches.all })
        void queryClient.invalidateQueries({ queryKey: keys.profiles.detailAll })
      },
    },
    { success: 'Exam result corrected.', failure: "Couldn't correct the exam result." },
  )
}
