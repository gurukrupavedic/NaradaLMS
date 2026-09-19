import { EXAM_MARKS } from '@/lib/exam-grading'
import type { ApiExamResult } from '@/lib/api/api-types'

/**
 * One graded sitting's marks on a single ruled line, in the order they're scored — the five marks
 * out of their maximums, then the children's bonus when the student earned one. Set in the mono
 * face at metadata weight: it is the evidence behind the outcome beside it, not the headline.
 */
export function ExamMarksLine({ result }: { result: ApiExamResult }) {
  return (
    <span className="mt-1.5 block font-mono text-[0.6875rem] leading-relaxed text-ink-muted/80">
      {EXAM_MARKS.map(mark => `${mark.label} ${result[mark.key]}/${mark.max}`).join(' · ')}
      {result.childrenBonus > 0 && ` · Children +${result.childrenBonus}`}
    </span>
  )
}
