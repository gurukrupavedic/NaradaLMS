'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { Pill } from '@/components/proficiency-pill'
import { PROFICIENCY_LABEL, PROFICIENCY_ORDER, type ProficiencyLevel } from '@/lib/proficiency'

/**
 * The grade dialog — apps/web's own version of the old frontend's
 * components/teacher/evaluate-dialog.tsx, ported rather than imported: the old one was built on
 * shadcn's theme tokens (bg-primary, rounded-full, sonner toasts) that this app's register
 * aesthetic deliberately doesn't use anywhere real (grep components/ui/* — nothing outside that
 * folder imports from it). Same shape and interaction otherwise: a level picker plus an optional
 * notes field, in one dialog shared across every cell in the grid rather than one dialog per cell
 * (the old component's own doc comment recommended exactly this for a matrix).
 */

// `notStarted` means "no evaluation exists yet" — a teacher grading a chapter picks a real
// outcome, never that placeholder (same exclusion the old dialog made). `level4` is excluded
// too: that grade only certifies an exam result (see exams/service.ts's recordExamResult), never
// a teacher's own evaluation.
const GRADABLE_LEVELS = PROFICIENCY_ORDER.filter(
  level => level !== 'notStarted' && level !== 'level4',
)

export type GradeDialogTarget = {
  studentId: string
  studentName: string
  chapterId: string
  chapterCode: string
  chapterTitle: string
  currentLevel: ProficiencyLevel
}

// The subset of `useMutation`'s return value this dialog actually needs — kept as a small
// structural interface (rather than importing react-query's own type) so this component doesn't
// need to know or care that the caller happens to be using react-query. `use-evaluation-
// mutations.ts`'s `useSetEvaluation` return value satisfies this shape as-is.
export type GradeMutation = {
  mutate: (
    input: { studentId: string; chapterId: string; level: ProficiencyLevel; notes: string },
    opts?: { onSuccess?: () => void },
  ) => void
  isPending: boolean
  isError: boolean
  error: unknown
}

export function GradeDialog({
  open,
  onOpenChange,
  target,
  grading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: GradeDialogTarget | null
  grading: GradeMutation
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-rule bg-card p-5 shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          {target && (
            <GradeForm
              // Remounts the form (and its draft state) whenever a new cell is targeted.
              key={`${target.studentId}:${target.chapterId}`}
              target={target}
              grading={grading}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GradeForm({
  target,
  grading,
  onCancel,
}: {
  target: GradeDialogTarget
  grading: GradeMutation
  onCancel: () => void
}) {
  // `notStarted` and `level4` both fall outside GRADABLE_LEVELS — neither is a teacher's own
  // pick (the latter is an exam-only certification), so both default to the same starting point.
  const isGradable = target.currentLevel !== 'notStarted' && target.currentLevel !== 'level4'
  const [level, setLevel] = useState<ProficiencyLevel>(isGradable ? target.currentLevel : 'level0')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    grading.mutate(
      { studentId: target.studentId, chapterId: target.chapterId, level, notes: notes.trim() },
      { onSuccess: onCancel },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Dialog.Title className="display text-[1.125rem]">Evaluate proficiency</Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          {target.studentName} — {target.chapterCode} {target.chapterTitle}
        </Dialog.Description>
      </div>

      <div className="space-y-2">
        <span className="label block text-ink-muted">Level</span>
        <div className="grid grid-cols-2 gap-1.5">
          {GRADABLE_LEVELS.map(candidate => {
            const selected = level === candidate
            return (
              <button
                key={candidate}
                type="button"
                aria-pressed={selected}
                onClick={() => setLevel(candidate)}
                className={cn(
                  'flex items-center gap-2 border px-3 py-2 text-left text-[0.8125rem] transition-colors',
                  selected
                    ? 'border-vermilion bg-vermilion/[0.06]'
                    : 'border-rule hover:bg-ink/[0.03]',
                )}
              >
                <Pill level={candidate} size="sm" />
                {PROFICIENCY_LABEL[candidate]}
              </button>
            )
          })}
        </div>
      </div>

      <label className="block">
        <span className="label block text-ink-muted">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Pronunciation, svara, memory, next assignment…"
          className="mt-2 w-full resize-none border border-rule bg-transparent p-2.5 text-[0.8125rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
        />
      </label>

      {grading.isError && (
        <p className="text-[0.8125rem] text-vermilion">
          {grading.error instanceof ApiError ? grading.error.message : 'Could not save that grade.'}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="label border border-ink/25 px-4 py-2 text-ink transition-opacity disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={grading.isPending}
          className="label bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {grading.isPending ? 'Saving…' : 'Save evaluation'}
        </button>
      </div>
    </form>
  )
}
