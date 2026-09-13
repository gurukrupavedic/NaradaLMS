'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { PROFICIENCY_LABEL, PROFICIENCY_SHORT, type ProficiencyLevel } from '@/lib/proficiency'
import type { RosterStudent } from '@/lib/mock-dashboard'

/**
 * The mark book.
 *
 * A teacher grading a batch is answering one question — who is behind, and on
 * what — and that is a question about a *grid*, not a list. Stacking 24
 * accordion rows of badges makes the reader hold the whole batch in their head
 * to spot the gap. Ruled into a register, the unmarked column is simply the
 * pale one, visible without reading a single label.
 *
 * Cells carry the register's own colour sense (see globals.css / LEVEL_INK) —
 * green while still underway, purple once certified — so which family a mark
 * belongs to is legible at the size of a grid cell, not just from a bead
 * count. This is the one place that colour convention matters most: it's the
 * grid the mark book itself is named after.
 */

const CELL_INK: Record<ProficiencyLevel, string> = {
  notStarted: 'bg-mark-not-started text-ink-muted/35',
  absent: 'bg-mark-absent/25 text-ink-muted',
  level1: 'bg-mark-level1 text-mark-ink-fixed',
  level2: 'bg-mark-level2 text-ink',
  level3: 'bg-mark-level3 text-card',
  level4: 'bg-mark-level4 text-card',
}

export function MarkBook({
  chapterCodes,
  students,
  className,
}: {
  chapterCodes: string[]
  students: RosterStudent[]
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Proficiency by student and chapter for this batch
        </caption>
        <thead>
          <tr className="border-b border-rule">
            <th scope="col" className="label sticky left-0 bg-card py-2 pr-4 pl-4 text-ink-muted">
              Student
            </th>
            {chapterCodes.map(code => (
              <th
                key={code}
                scope="col"
                className="w-9 px-0 py-2 text-center font-mono text-[0.625rem] font-normal text-ink-muted"
              >
                {code}
              </th>
            ))}
            <th scope="col" className="label py-2 pr-4 pl-4 text-right text-ink-muted">
              At
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            // Nobody has marked this student at all — the row the teacher opened
            // the page to find. It gets the only vermilion on the grid.
            const unevaluated = student.current === null

            return (
              <tr
                key={student.id}
                className={cn(
                  'border-b border-rule-soft last:border-0',
                  unevaluated && 'bg-vermilion/[0.05]',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 max-w-45 truncate bg-card py-1.5 pr-4 pl-4 text-[0.8125rem] font-normal',
                    unevaluated && 'bg-transparent',
                  )}
                >
                  <Link href={`/students/${student.id}`} className="block truncate hover:text-vermilion">
                    {student.name}
                  </Link>
                  {student.city && (
                    <span className="label block text-ink-muted">{student.city}</span>
                  )}
                </th>

                {student.marks.map((level, i) => (
                  <td key={chapterCodes[i]} className="p-[3px] text-center align-middle">
                    <span
                      title={`${chapterCodes[i]} · ${PROFICIENCY_LABEL[level]}`}
                      className={cn(
                        'grid h-6 w-full place-items-center font-mono text-[0.5625rem] leading-none',
                        CELL_INK[level],
                        level === 'notStarted' && 'border border-dashed border-rule',
                        level === 'level4' && 'ring-1 ring-vermilion ring-inset',
                      )}
                    >
                      {level === 'notStarted' ? '' : PROFICIENCY_SHORT[level]}
                    </span>
                  </td>
                ))}

                <td className="py-1.5 pr-4 pl-4 text-right">
                  {unevaluated ? (
                    <span className="label whitespace-nowrap text-vermilion">not yet marked</span>
                  ) : (
                    <span className="font-mono text-[0.75rem]">{student.current}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
