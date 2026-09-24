import { cn } from '@/lib/utils'
import { Pill } from '@/components/proficiency-pill'
import { Timestamp } from '@/components/timestamp'
import { isCertified } from '@/lib/proficiency'
import { EXAM_MAX_TOTAL, EXAM_OUTCOME_LABEL } from '@/lib/exam-grading'
import type { CertificationRow } from '@/lib/models/dashboard'

/**
 * The certification record reads as a document rather than a dashboard widget:
 * one ruled line per track — its latest exam result and total — the award date
 * set in figures on the right, and a struck stamp where a certification actually
 * landed (an L3 or L4 result; an L1 or L2 pass is graded but not certified, and a
 * reappear is shown as exactly that). It is the page a student
 * screenshots and sends to their family, so it is worth letting it look like
 * something issued.
 */
export function CertificationRecord({ rows }: { rows: CertificationRow[] }) {
  return (
    <ol className="sheet">
      {rows.map(row => {
        const certified = isCertified(row.level)
        // `level` is `notStarted` both for a track never sat and for a reappear; `outcome` is what
        // tells them apart.
        const sat = row.outcome !== null

        return (
          <li
            key={row.track}
            className="flex items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
          >
            <span className="w-20 shrink-0 font-mono text-[0.75rem] text-ink-muted">
              {row.track}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-[0.9375rem]',
                  sat ? 'text-ink' : 'text-ink-muted/60',
                )}
              >
                {row.outcome ? EXAM_OUTCOME_LABEL[row.outcome] : 'Track certification'}
              </span>
              {row.outcome ? (
                <span className="label mt-0.5 block text-ink-muted">
                  {row.total} / {EXAM_MAX_TOTAL}
                </span>
              ) : (
                <span className="label mt-0.5 block text-ink-muted/70">not sat</span>
              )}
            </span>

            {certified && <span className="stamp shrink-0">certified</span>}

            <span className="hidden w-24 shrink-0 text-right font-mono text-[0.6875rem] text-ink-muted/80 sm:block">
              <Timestamp value={row.awardedAt} />
            </span>

            <Pill level={row.level} size="lg" className="shrink-0" />
          </li>
        )
      })}
    </ol>
  )
}
