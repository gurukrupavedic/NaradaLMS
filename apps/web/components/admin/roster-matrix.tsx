import { ArrowUpRightIcon } from '@/components/ui/icons'
import { getProficiencyConfig } from '@/lib/proficiency'
import { type RosterRow } from '@/lib/roster'
import { cn } from '@/lib/utils'
import { type ApiChapter } from '@/lib/types'

// Read-only — cells link out to the existing per-student history page instead of opening an
// evaluate dialog. Admin oversight is about visibility, not editing another instructor's marks.
export function RosterMatrix({
  batchId,
  chapters,
  roster,
}: {
  batchId: string
  chapters: ApiChapter[]
  roster: RosterRow[]
}) {
  return (
    <div className="overflow-hidden ring-1 ring-foreground/10">
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-muted/30">
            <tr>
              <th className="sticky left-0 z-30 min-w-40 border-b border-r border-border/50 bg-muted/30 px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
                Student
              </th>
              {chapters.map(chapter => (
                <th
                  key={chapter.id}
                  className="min-w-14 border-b border-l border-border/50 px-1 py-2 text-center font-mono text-xs font-medium uppercase text-muted-foreground"
                >
                  {chapter.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map(row => (
              <tr key={row.student.id} className="transition-colors hover:bg-muted/10">
                <td className="sticky left-0 z-10 border-r border-b border-border/50 bg-card p-0">
                  <a
                    href={`/batches/${batchId}/students/${row.student.id}`}
                    title={`View ${row.student.name}'s history`}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.student.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.student.city}
                      </span>
                    </span>
                    <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                </td>
                {row.chapterMarks.map(mark => {
                  const config = getProficiencyConfig(mark.level)
                  return (
                    <td key={mark.chapter.id} className="border-b border-l border-border/50 p-0">
                      <div
                        title={`${row.student.name} — ${mark.chapter.code}: ${config.label}`}
                        className={cn(
                          'flex h-8 items-center justify-center text-xs font-semibold',
                          config.bg,
                          config.text,
                        )}
                      >
                        {config.shortLabel}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
