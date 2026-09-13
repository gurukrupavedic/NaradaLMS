import { cn } from '@/lib/utils'
import { Pill } from '@/components/proficiency-pill'
import { Timestamp } from '@/components/timestamp'
import { isCertified, isStarted } from '@/lib/proficiency'
import type { CertificationRow } from '@/lib/mock-dashboard'

/**
 * The certification record reads as a document rather than a dashboard widget:
 * one ruled line per track, the award date set in figures on the right, and a
 * struck stamp where a certification actually landed. It is the page a student
 * screenshots and sends to their family, so it is worth letting it look like
 * something issued.
 */
export function CertificationRecord({ rows }: { rows: CertificationRow[] }) {
  return (
    <ol className="sheet">
      {rows.map(row => {
        const certified = isCertified(row.level)
        const begun = isStarted(row.level)

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
                  begun ? 'text-ink' : 'text-ink-muted/60',
                )}
              >
                {row.chapter}
              </span>
              {!begun && <span className="label mt-0.5 block text-ink-muted/70">not begun</span>}
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
