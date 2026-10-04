import { cn } from '@/lib/utils'
import {
  formatScore,
  SCORE_KEYS,
  SCORE_LABEL,
  SCORE_MEANING,
  SCORE_TITLE,
  type Score,
  type StudentScores,
} from '@/lib/scores'

/**
 * Ink for a score. The sign always carries the meaning (+1 / 0 / −1), so colour only reinforces it
 * — it is never the sole signal. Vermilion stays the register's "look here" colour, so it marks
 * the −1s and nothing else on a score.
 */
export function scoreInk(score: Score): string {
  if (score === null) return 'text-ink-muted/40'
  if (score < 0) return 'text-vermilion'
  if (score > 0) return 'text-mark-green'
  return 'text-ink-muted'
}

/** The tooltip for one score cell: what it measures, and what the current value means. */
export function scoreTitle(key: keyof StudentScores, score: Score): string {
  const meaning = score === null ? 'Not assessed yet' : `${formatScore(score)} · ${SCORE_MEANING[key][score]}`
  return `${SCORE_TITLE[key]} — ${meaning}`
}

/**
 * A learner's three scores, read-only, on one line — the student's own view of what their
 * teachers have recorded (components/track-ladder.tsx). The editable version lives in the mark
 * book's cells (components/mark-book.tsx).
 */
export function ScoreStrip({ scores, className }: { scores: StudentScores; className?: string }) {
  return (
    <dl className={cn('flex flex-wrap gap-x-6 gap-y-1', className)}>
      {SCORE_KEYS.map(key => {
        const score = scores[key]
        return (
          <div key={key} className="flex items-baseline gap-2" title={scoreTitle(key, score)}>
            <dt className="label text-ink-muted">{SCORE_LABEL[key]}</dt>
            <dd className={cn('font-mono text-[0.8125rem]', scoreInk(score))}>
              {score === null ? '—' : formatScore(score)}
              {score !== null && (
                <span className="ml-1.5 font-sans text-[0.6875rem] text-ink-muted">
                  {SCORE_MEANING[key][score]}
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
