'use client'

import { useState } from 'react'

import { EvaluateDialog, type EvaluateDialogTarget } from '@/components/teacher/evaluate-dialog'
import { ArrowUpRightIcon } from '@/components/ui/icons'
import { getProficiencyConfig } from '@/lib/proficiency'
import { type RosterRow } from '@/lib/roster'
import { cn } from '@/lib/utils'
import { type ApiChapter } from '@/lib/types'

// Experimental alternative to RosterAccordion for the expanded batch-section content — a
// student x chapter proficiency grid instead of a clickable list. Consumes the same
// RosterAccordionRow[] shape, so swapping TeachingBatchSection back to <RosterAccordion /> is a
// one-line revert; no data plumbing changes needed either way.
export function RosterGrid({
  batchId,
  chapters,
  roster,
  onOpenHistory,
}: {
  batchId: string
  chapters: ApiChapter[]
  roster: RosterRow[]
  onOpenHistory: (studentId: string) => void
}) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<EvaluateDialogTarget | null>(null)

  function handleCellClick(row: RosterRow, mark: RosterRow['chapterMarks'][number]) {
    setTarget({
      studentId: row.student.id,
      studentName: row.student.name,
      chapterId: mark.chapter.id,
      chapterCode: mark.chapter.code,
      chapterTitle: mark.chapter.title,
      initialLevel: mark.level,
      initialNotes: mark.latest?.notes ?? '',
    })
    setOpen(true)
  }

  return (
    <>
      <div className="border-t border-border/50">
        <div className="max-h-96 overflow-auto">
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
                    <button
                      type="button"
                      onClick={() => onOpenHistory(row.student.id)}
                      title={`View ${row.student.name}'s history`}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {row.student.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.student.city}
                        </span>
                      </span>
                      <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </td>
                  {row.chapterMarks.map(mark => {
                    const config = getProficiencyConfig(mark.level)
                    const key = `${row.student.id}:${mark.chapter.id}`

                    return (
                      <td
                        key={mark.chapter.id}
                        className="relative border-b border-l border-border/50 p-0"
                      >
                        <button
                          type="button"
                          title={`${row.student.name} — ${mark.chapter.code}: ${config.label}`}
                          onClick={() => handleCellClick(row, mark)}
                          onMouseEnter={() => setHoveredCell(key)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={cn(
                            'absolute inset-0 flex items-center justify-center text-xs font-semibold transition-colors',
                            config.bg,
                            config.text,
                          )}
                        >
                          {hoveredCell === key && (
                            <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-foreground/50" />
                          )}
                          {config.shortLabel}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EvaluateDialog batchId={batchId} open={open} onOpenChange={setOpen} target={target} />
    </>
  )
}
