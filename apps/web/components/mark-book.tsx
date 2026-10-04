'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PROFICIENCY_LABEL, PROFICIENCY_SHORT, type ProficiencyLevel } from '@/lib/proficiency'
import type { RosterStudent } from '@/lib/models/dashboard'
import { GradeDialog, type GradeDialogTarget, type GradeMutation } from '@/components/grade-dialog'
import { Spinner } from '@/components/spinner'
import type { SetLevelInput } from '@/lib/query/use-evaluation-mutations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCoursePath } from '@/lib/course'
import { scoreInk, scoreTitle } from '@/components/score-strip'
import {
  formatScore,
  SCORE_KEYS,
  SCORE_LABEL,
  SCORE_MEANING,
  SCORE_SHORT,
  SCORE_TITLE,
  type Score,
  type ScoreKey,
  type ScoreValue,
} from '@/lib/scores'

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

// And for "Promote to TA" — the same shape again, closing over the batch and the new role (see
// use-enrollment-mutations.ts's `useChangeMemberRole`), so the caller supplies the toast's name too.
export type PromoteToTaMutation = {
  mutateAsync: (student: { profileId: string; profileName: string; role: 'ta' }) => Promise<unknown>
}

// Same structural-typing move again, for the three score columns — one call per cell edit.
export type ScoreMutation = {
  mutateAsync: (input: { studentId: string; key: ScoreKey; score: Score }) => Promise<unknown>
}

// The columns pinned to the left of the chapter marks: the student, then the three scores. Fixed
// widths so each sticky column's `left` offset is exactly the width of what's pinned before it.
const NAME_WIDTH = 12
const SCORE_WIDTH = 3.25
const scoreLeft = (index: number) => `${NAME_WIDTH + index * SCORE_WIDTH}rem`
// A hairline after the last pinned column — a real border would vanish under `border-collapse`
// once the column is sticky and the chapters scroll beneath it.
const PINNED_EDGE = 'shadow-[inset_-1px_0_0_var(--rule)]'

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
  promoteToTa,
  scoring,
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
  // Admin-only (it's a staffing change) — omitted by the teacher's own dashboard, which gets no item.
  promoteToTa?: PromoteToTaMutation
  // The three score columns are always shown; they're only editable when this is wired — the
  // read-only history views pass nothing and get the same columns as plain numbers.
  scoring?: ScoreMutation
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
            <th
              scope="col"
              style={{ width: `${NAME_WIDTH}rem`, minWidth: `${NAME_WIDTH}rem`, maxWidth: `${NAME_WIDTH}rem` }}
              className="label sticky left-0 bg-card py-2 pr-4 pl-4 text-ink-muted"
            >
              Student
            </th>
            {SCORE_KEYS.map((key, i) => (
              <th
                key={key}
                scope="col"
                title={SCORE_TITLE[key]}
                style={{ width: `${SCORE_WIDTH}rem`, minWidth: `${SCORE_WIDTH}rem`, left: scoreLeft(i) }}
                className={cn(
                  'bg-card px-0 py-2 text-center font-mono text-[0.5625rem] font-normal text-ink-muted md:sticky',
                  i === SCORE_KEYS.length - 1 && PINNED_EDGE,
                )}
              >
                <abbr title={SCORE_TITLE[key]} className="no-underline">
                  {SCORE_SHORT[key]}
                </abbr>
              </th>
            ))}
            {chapterCodes.map(code => (
              <th
                key={code}
                scope="col"
                className="w-10 min-w-10 px-0 py-2 text-center font-mono text-[0.625rem] font-normal text-ink-muted"
              >
                {code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            // Nobody has marked this student at all — the row the teacher opened
            // the page to find. It gets the only vermilion on the grid.
            const unevaluated = student.current === null

            // An opaque tint rather than plain bg-card: the sticky columns must stay fully opaque
            // (or the mark cells scrolling underneath them show through), but they still need to
            // carry the same vermilion "unmarked" cue as the rest of the row, whose own
            // bg-vermilion/[0.05] is translucent by design (it isn't the scroll-clipped sticky
            // layer, so translucency there is harmless).
            const pinnedBg = unevaluated
              ? 'bg-[color-mix(in_srgb,var(--vermilion)_5%,var(--card))]'
              : 'bg-card'

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
                  style={{ width: `${NAME_WIDTH}rem`, minWidth: `${NAME_WIDTH}rem`, maxWidth: `${NAME_WIDTH}rem` }}
                  className={cn(
                    'sticky left-0 truncate py-1.5 pr-4 pl-4 text-[0.8125rem] font-normal',
                    pinnedBg,
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate">
                      {student.name}
                      {student.role === 'ta' && (
                        <span className="label ml-2 text-vermilion">TA</span>
                      )}
                    </span>
                    <StudentMenu
                      student={student}
                      promote={promote}
                      promoteItems={promoteItems}
                      onBreak={onBreak}
                      promoteToTa={promoteToTa}
                    />
                  </div>
                  {student.city && (
                    <span className="label block text-ink-muted">{student.city}</span>
                  )}
                </th>

                {SCORE_KEYS.map((key, i) => (
                  <td
                    key={key}
                    style={{ width: `${SCORE_WIDTH}rem`, minWidth: `${SCORE_WIDTH}rem`, left: scoreLeft(i) }}
                    className={cn(
                      'p-1 text-center align-middle md:sticky',
                      pinnedBg,
                      i === SCORE_KEYS.length - 1 && PINNED_EDGE,
                    )}
                  >
                    <ScoreCell
                      student={student}
                      scoreKey={key}
                      score={student.scores[key]}
                      scoring={scoring}
                    />
                  </td>
                ))}

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
 * One score cell: the signed number (empty when nobody has assessed it), and — where `scoring` is
 * wired — a small menu to set it to +1 / 0 / −1 or clear it. Menu rather than click-to-cycle: a
 * teacher setting a score means to pick a value, and a cycling cell makes −1 two accidental
 * clicks away from +1.
 */
function ScoreCell({
  student,
  scoreKey,
  score,
  scoring,
}: {
  student: RosterStudent
  scoreKey: ScoreKey
  score: Score
  scoring?: ScoreMutation
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')

  const face = cn(
    'mx-auto grid size-9 place-items-center font-mono text-[0.8125rem] leading-none',
    score === null && 'border border-dashed border-rule',
    scoreInk(score),
  )

  if (!scoring) {
    return (
      <span title={scoreTitle(scoreKey, score)} className={face}>
        {formatScore(score)}
      </span>
    )
  }

  async function choose(next: Score) {
    if (!scoring || next === score) return
    setStatus('pending')
    try {
      await scoring.mutateAsync({ studentId: student.id, key: scoreKey, score: next })
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const options: Score[] = [1, 0, -1, null]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={status === 'pending'}
        aria-label={`${SCORE_LABEL[scoreKey]} for ${student.name}: ${score === null ? 'not assessed' : formatScore(score)}`}
        title={status === 'error' ? 'Could not save that score — try again' : scoreTitle(scoreKey, score)}
        className={cn(
          face,
          'cursor-pointer outline-none transition-colors hover:bg-ink/[0.05] data-[popup-open]:bg-ink/[0.05]',
          status === 'error' && 'ring-1 ring-vermilion ring-inset',
        )}
      >
        {status === 'pending' ? <Spinner className="size-3.5" /> : formatScore(score)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-44 rounded-none border border-rule bg-card p-0 shadow-none ring-0"
      >
        <p className="label border-b border-rule-soft px-4 py-2 text-ink-muted">{SCORE_LABEL[scoreKey]}</p>
        {options.map(option => (
          <DropdownMenuItem
            key={option ?? 'clear'}
            onClick={() => choose(option)}
            className="flex items-center justify-between gap-4 rounded-none border-b border-rule-soft px-4 py-2 text-[0.8125rem] text-ink-muted last:border-0 focus:bg-ink/[0.03] focus:text-ink"
          >
            <span className="flex items-baseline gap-3">
              <span className={cn('w-6 font-mono', scoreInk(option))}>
                {option === null ? '—' : formatScore(option)}
              </span>
              {option === null ? 'Clear' : SCORE_MEANING[scoreKey][option as ScoreValue]}
            </span>
            {option === score && <span aria-hidden>●</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  promoteToTa,
}: {
  student: RosterStudent
  promote?: PromoteMutation
  promoteItems: SetLevelInput[]
  onBreak?: OnBreakMutation
  promoteToTa?: PromoteToTaMutation
}) {
  const cp = useCoursePath()
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

  const [taStatus, setTaStatus] = useState<'idle' | 'pending' | 'error'>('idle')

  async function handlePromoteToTa() {
    if (!promoteToTa) return
    setTaStatus('pending')
    try {
      await promoteToTa.mutateAsync({ profileId: student.id, profileName: student.name, role: 'ta' })
      setTaStatus('idle')
    } catch {
      setTaStatus('error')
    }
  }

  const hasError = status === 'error' || breakStatus === 'error' || taStatus === 'error'
  const pending = status === 'pending' || breakStatus === 'pending' || taStatus === 'pending'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${student.name}`}
        title={
          status === 'error'
            ? 'Could not promote to L3 — try again'
            : breakStatus === 'error'
              ? 'Could not mark on break — try again'
              : taStatus === 'error'
                ? 'Could not promote to TA — try again'
                : undefined
        }
        className={cn(
          'shrink-0 rounded p-0.5 outline-none transition-colors hover:text-ink data-[popup-open]:text-ink',
          hasError ? 'text-vermilion' : 'text-ink-muted/70',
        )}
      >
        {/* The menu closes the moment an action is picked, so this trigger is the only thing left
            on screen to show the write is still in flight. */}
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <MoreHorizontal className="size-4" aria-hidden />
        )}
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
        {promoteToTa && student.role !== 'ta' && (
          <DropdownMenuItem
            disabled={taStatus === 'pending'}
            onClick={handlePromoteToTa}
            className="rounded-none border-b border-rule-soft px-4 py-2.5 text-[0.8125rem] text-ink-muted focus:bg-ink/[0.03] focus:text-ink data-disabled:opacity-50"
          >
            {taStatus === 'pending' ? 'Promoting…' : 'Promote to TA'}
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
          render={<Link href={cp(`/students/${student.id}`)} />}
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
