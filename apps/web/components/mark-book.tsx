'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PROFICIENCY_LABEL, PROFICIENCY_SHORT, type ProficiencyLevel } from '@/lib/proficiency'
import type { RosterStudent } from '@/lib/mock-dashboard'
import { GradeDialog, type GradeDialogTarget, type GradeMutation } from '@/components/grade-dialog'
import type { SetLevelInput } from '@/lib/query/use-evaluation-mutations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
 *
 * A cell is only clickable to grade when `chapterIds` and `grading` are both supplied — the
 * dashboard's own read-only history views (certification-record.tsx etc.) don't wire either, and
 * stay plain badges. Where it is wired, clicking a mark opens components/grade-dialog.tsx (one
 * shared dialog for the whole grid, not one per cell) — a real evaluation is history (see
 * reshape.ts's `latestLevelByChapterId`), so "editing" a grade here means recording a new one, not
 * mutating the mark shown.
 */

// The subset of `useMutation`'s return value the row menu actually needs — same structural-typing
// move as grade-dialog.tsx's own `GradeMutation`, so this component doesn't need to know or care
// that the caller happens to be using react-query. Takes the same item shape `useSetEvaluations`
// (and the single-cell grade dialog's `useSetEvaluation`) already send — "promote" is just that
// same bulk write, called with the rows this file itself computes below.
export type PromoteMutation = {
  mutateAsync: (items: SetLevelInput[]) => Promise<unknown>
}

// Same structural-typing move as `PromoteMutation` above, for the row menu's "Mark on break" —
// takes just the student's id (`RosterStudent.id`, their profileId), since the mutation already
// closes over which batch it's acting on (see use-enrollment-mutations.ts's `useSetOnBreak`).
export type OnBreakMutation = {
  mutateAsync: (studentId: string) => Promise<unknown>
}

const CELL_INK: Record<ProficiencyLevel, string> = {
  notStarted: 'bg-mark-not-started text-ink-muted/35',
  absent: 'bg-mark-absent/25 text-ink-muted',
  level0: 'bg-mark-level0 text-mark-ink-fixed',
  level1: 'bg-mark-level1 text-ink',
  level2: 'bg-mark-level2 text-card',
  level3: 'bg-mark-level3 text-ink',
  level4: 'bg-mark-level4 text-card',
}

export function MarkBook({
  chapterCodes,
  chapterIds,
  chapterTitles,
  students,
  className,
  grading,
  promote,
  onBreak,
}: {
  chapterCodes: string[]
  // Parallel to chapterCodes — both required to enable grading (see this file's own doc comment).
  chapterIds?: string[]
  chapterTitles?: string[]
  students: RosterStudent[]
  className?: string
  grading?: GradeMutation
  // "Show profile" is always in the row menu; "Promote to L3" and "Mark on break" only appear when
  // a mutation is actually wired to satisfy them (same optional-prop gate as `grading`) — a
  // read-only history view passes neither and gets a menu with just the one, always-safe item.
  promote?: PromoteMutation
  onBreak?: OnBreakMutation
}) {
  const [target, setTarget] = useState<GradeDialogTarget | null>(null)

  return (
    <div className={cn('overflow-x-auto', className)}>
      {/* No `w-full`: stretching the table to the container's width let the browser squeeze
          every chapter column below its own content's width once there were more chapters than
          fit — headers overlapped their neighbours and cells stopped being square. Left to its
          natural (wider) size, the `overflow-x-auto` wrapper scrolls instead of squeezing. */}
      <table className="border-collapse text-left">
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
                className="w-10 min-w-10 px-0 py-2 text-center font-mono text-[0.625rem] font-normal text-ink-muted"
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

            // The exact rows "Promote to L3" needs to send — every chapter this student isn't
            // already at L3 or L4 on. Computed here from the grid already on screen rather than
            // asked of the server (which still independently re-checks it — see
            // use-evaluation-mutations.ts's `useSetEvaluations` doc comment — so a stale view here
            // just means fewer rows land, never a wrong one).
            const promoteItems: SetLevelInput[] = student.marks.flatMap((level, i) => {
              const chapterId = chapterIds?.[i]
              if (!chapterId || level === 'level3' || level === 'level4') return []
              return [{ studentId: student.id, chapterId, level: 'level3' as const }]
            })

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
                    'sticky left-0 max-w-45 truncate py-1.5 pr-4 pl-4 text-[0.8125rem] font-normal',
                    // An opaque tint rather than plain bg-card: the sticky column must stay fully
                    // opaque (or the mark cells scrolling underneath it show through), but it still
                    // needs to carry the same vermilion "unmarked" cue as the rest of the row, whose
                    // own bg-vermilion/[0.05] is translucent by design (it isn't the scroll-clipped
                    // sticky layer, so translucency there is harmless).
                    unevaluated
                      ? 'bg-[color-mix(in_srgb,var(--vermilion)_5%,var(--card))]'
                      : 'bg-card',
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate">{student.name}</span>
                    <StudentMenu
                      student={student}
                      promote={promote}
                      promoteItems={promoteItems}
                      onBreak={onBreak}
                    />
                  </div>
                  {student.city && (
                    <span className="label block text-ink-muted">{student.city}</span>
                  )}
                </th>

                {student.marks.map((level, i) => {
                  const chapterId = chapterIds?.[i]
                  // A certified chapter is never editable from here, even with a mutation wired up
                  // — L4 only ever comes from an exam result (exams/service.ts's recordExamResult),
                  // and the server enforces this too (createEvaluations silently drops a write that
                  // would land on one), but disabling the cell means a teacher never sees the dialog
                  // open just to get rejected on submit.
                  const canEdit = Boolean(grading && chapterId) && level !== 'level4'

                  return (
                    <td key={chapterCodes[i]} className="p-1 text-center align-middle">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() =>
                          chapterId &&
                          setTarget({
                            studentId: student.id,
                            studentName: student.name,
                            chapterId,
                            chapterCode: chapterCodes[i]!,
                            chapterTitle: chapterTitles?.[i] ?? '',
                            currentLevel: level,
                          })
                        }
                        title={`${chapterCodes[i]} · ${PROFICIENCY_LABEL[level]}`}
                        className={cn(
                          // A real square (fixed h/w, not h + w-full): a cell that only pins its
                          // height stretches to whatever width the column ends up with, which is
                          // exactly the rectangle-not-square look this was meant to fix.
                          'mx-auto grid size-9 place-items-center font-mono text-[0.5625rem] leading-none',
                          CELL_INK[level],
                          level === 'notStarted' && 'border border-dashed border-rule',
                          level === 'level4' && 'ring-1 ring-vermilion ring-inset',
                          canEdit && 'cursor-pointer transition-opacity hover:opacity-75',
                        )}
                      >
                        {level === 'notStarted' ? '' : PROFICIENCY_SHORT[level]}
                      </button>
                    </td>
                  )
                })}

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

      {grading && (
        <GradeDialog
          open={target !== null}
          onOpenChange={open => !open && setTarget(null)}
          target={target}
          grading={grading}
        />
      )}
    </div>
  )
}

/**
 * The row's three-dot trigger, replacing what used to be the student name itself acting as the
 * link to their profile. A single click on a name is one keystroke away from a misclick against
 * the mark cells beside it, and it buried "promote" with nowhere to put it — a menu gives both
 * actions an explicit target instead of overloading the name.
 */
function StudentMenu({
  student,
  promote,
  promoteItems,
  onBreak,
}: {
  student: RosterStudent
  promote?: PromoteMutation
  promoteItems: SetLevelInput[]
  onBreak?: OnBreakMutation
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  // Its own status, distinct from `status` above — the two row actions are independent writes and
  // a teacher could plausibly retry one without the other having failed.
  const [breakStatus, setBreakStatus] = useState<'idle' | 'pending' | 'error'>('idle')

  async function handlePromote() {
    if (!promote || promoteItems.length === 0) return
    setStatus('pending')
    try {
      await promote.mutateAsync(promoteItems)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  async function handleBreak() {
    if (!onBreak) return
    setBreakStatus('pending')
    try {
      await onBreak.mutateAsync(student.id)
      setBreakStatus('idle')
    } catch {
      setBreakStatus('error')
    }
  }

  const hasError = status === 'error' || breakStatus === 'error'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${student.name}`}
        title={
          status === 'error'
            ? 'Could not promote to L3 — try again'
            : breakStatus === 'error'
              ? 'Could not mark on break — try again'
              : undefined
        }
        className={cn(
          'shrink-0 rounded p-0.5 outline-none transition-colors hover:text-ink data-[popup-open]:text-ink',
          hasError ? 'text-vermilion' : 'text-ink-muted/70',
        )}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-40 rounded-none border border-rule bg-card p-0 shadow-none ring-0"
      >
        {promote && (
          <DropdownMenuItem
            disabled={status === 'pending' || promoteItems.length === 0}
            onClick={handlePromote}
            className="rounded-none border-b border-rule-soft px-4 py-2.5 text-[0.8125rem] text-ink-muted focus:bg-ink/[0.03] focus:text-ink data-disabled:opacity-50"
          >
            {status === 'pending' ? 'Promoting…' : 'Promote to L3'}
          </DropdownMenuItem>
        )}
        {onBreak && (
          <DropdownMenuItem
            disabled={breakStatus === 'pending'}
            onClick={handleBreak}
            className="rounded-none border-b border-rule-soft px-4 py-2.5 text-[0.8125rem] text-ink-muted focus:bg-ink/[0.03] focus:text-ink data-disabled:opacity-50"
          >
            {breakStatus === 'pending' ? 'Marking on break…' : 'Mark on break'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<Link href={`/students/${student.id}`} />}
          className="group/row flex items-center justify-between gap-4 rounded-none px-4 py-2.5 text-[0.8125rem] text-ink-muted focus:bg-ink/[0.03] focus:text-ink"
        >
          Show profile
          <span
            aria-hidden
            className="text-ink-muted/60 transition-colors group-focus/row:text-vermilion"
          >
            →
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
