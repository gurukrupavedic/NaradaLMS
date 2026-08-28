import { cn } from '@/lib/utils'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { isCertified, type CertificationRow } from '@/lib/exams-view'

// One row per track certification, attempted or not. The untouched rows carry the same dashed
// placeholder the track ladder uses, so "not yet" reads the same way on both screens.
export function CertificationRecord({ rows }: { rows: CertificationRow[] }) {
  return (
    <ol className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
      {rows.map(row => {
        const done = isCertified(row)
        return (
          <li key={row.chapterId} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={cn(
                'w-16 shrink-0 font-mono text-xs tabular-nums',
                done ? 'text-foreground' : 'text-muted-foreground/50',
              )}
            >
              {row.track}
            </span>
            <span
              className={cn(
                'w-10 shrink-0 font-mono text-xs tabular-nums',
                done ? 'text-muted-foreground' : 'text-muted-foreground/50',
              )}
            >
              {row.chapterCode}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                done ? 'text-foreground' : 'text-muted-foreground/60',
              )}
            >
              {done ? 'Certified' : 'Not yet attempted'}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground/70 sm:block">
              {row.evaluatedAt ?? ''}
            </span>
            {done && row.level ? (
              <ProficiencyBadge level={row.level} compact />
            ) : (
              <span
                aria-label="Not yet attempted"
                className="h-4 w-6 shrink-0 border border-dashed border-border"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
