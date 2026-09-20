'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useQuery } from '@tanstack/react-query'

import { Spinner } from '@/components/spinner'
import type { AdminSittingRow } from '@/lib/api/resources'
import {
  childrenBonus,
  EXAM_MARKS,
  EXAM_MAX_TOTAL,
  EXAM_OUTCOME_LABEL,
  levelForOutcome,
  outcomeForTotal,
  type ExamMarkKey,
} from '@/lib/exam-grading'
import { profileDetailQuery } from '@/lib/query/options'
import { useRecordExamResult } from '@/lib/query/use-exam-mutations'
import { PROFICIENCY_LABEL } from '@/lib/proficiency'
import { narrowLevel } from '@/lib/api/reshape'
import { cn } from '@/lib/utils'

/**
 * The exam result form — one dialog shared across every sitting on the admin screen, like
 * components/grade-dialog.tsx is across every mark-book cell. The evaluator enters the five marks;
 * the children's bonus, total and outcome shown beside them are a live preview computed by
 * `lib/exam-grading.ts` (a mirror of the API's grading.ts), and the API re-derives all three on
 * save — nothing but the marks is ever sent, so the evaluator can't override the age-based bonus.
 */
export function RecordExamResultDialog({
  open,
  onOpenChange,
  sitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sitting: AdminSittingRow | null
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-rule bg-card p-5 shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          {sitting && (
            <ResultForm
              // Remounts the form (and its draft marks) whenever a different sitting is picked.
              key={sitting.id}
              sitting={sitting}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type Draft = Record<ExamMarkKey, string>

const EMPTY_DRAFT: Draft = {
  aksharaShuddhi: '',
  swaraShuddhi: '',
  niyantranaAnargalata: '',
  shraavyata: '',
  pratishakyaGrammar: '',
}

// Whole marks only, 0 up to the mark's own maximum — `null` for anything else (blank included), so
// the form can't be submitted until every mark is a real one.
function parseMark(raw: string, max: number): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const value = Number(raw)
  return value <= max ? value : null
}

function ResultForm({ sitting, onCancel }: { sitting: AdminSittingRow; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [notes, setNotes] = useState('')
  const recording = useRecordExamResult(sitting.id)
  const profile = useQuery(profileDetailQuery(sitting.studentId))

  const yearOfBirth = profile.data?.profile.yearOfBirth
  const noBirthYear =
    profile.data !== undefined && (yearOfBirth === null || yearOfBirth === undefined)
  const sittingYear = new Date(sitting.when).getUTCFullYear()
  const bonus = typeof yearOfBirth === 'number' ? childrenBonus(yearOfBirth, sittingYear) : null

  const parsed = EXAM_MARKS.map(mark => parseMark(draft[mark.key], mark.max))
  const complete = parsed.every(value => value !== null)
  const total =
    complete && bonus !== null ? parsed.reduce<number>((sum, v) => sum + v!, bonus) : null
  const outcome = total === null ? null : outcomeForTotal(total)
  const level = outcome === null ? null : levelForOutcome(outcome)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!complete || bonus === null) return

    const marks = Object.fromEntries(EXAM_MARKS.map((mark, i) => [mark.key, parsed[i]!])) as Record<
      ExamMarkKey,
      number
    >
    recording.mutate({ ...marks, notes: notes.trim() || undefined }, { onSuccess: onCancel })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Dialog.Title className="display text-[1.125rem]">Record exam result</Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          {sitting.studentName} — {sitting.track} · {sitting.batchCode}
        </Dialog.Description>
      </div>

      <div className="space-y-2">
        {EXAM_MARKS.map(mark => (
          <label key={mark.key} className="flex items-center gap-3">
            <span className="flex-1 text-[0.875rem]">{mark.label}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft[mark.key]}
              onChange={e => setDraft(current => ({ ...current, [mark.key]: e.target.value }))}
              aria-invalid={draft[mark.key] !== '' && parseMark(draft[mark.key], mark.max) === null}
              className={cn(
                'w-14 border bg-transparent px-2 py-1.5 text-right font-mono text-[0.875rem] focus:border-vermilion focus:outline-none',
                draft[mark.key] !== '' && parseMark(draft[mark.key], mark.max) === null
                  ? 'border-vermilion'
                  : 'border-rule',
              )}
            />
            <span className="w-10 font-mono text-[0.75rem] text-ink-muted">/ {mark.max}</span>
          </label>
        ))}
      </div>

      <dl className="space-y-1.5 border-t border-rule pt-4 text-[0.875rem]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">Children&apos;s bonus</dt>
          <dd className="font-mono">
            {bonus === null ? '—' : bonus > 0 ? `+${bonus}` : '0'}
            {typeof yearOfBirth === 'number' && (
              <span className="ml-2 text-[0.6875rem] text-ink-muted">born {yearOfBirth}</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">Total</dt>
          <dd className="font-mono">
            {total === null ? '—' : total}{' '}
            <span className="text-ink-muted">/ {EXAM_MAX_TOTAL}</span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">Outcome</dt>
          <dd className={cn('font-medium', outcome === 'reappear' && 'text-vermilion')}>
            {outcome === null ? '—' : EXAM_OUTCOME_LABEL[outcome]}
          </dd>
        </div>
      </dl>

      {outcome !== null && (
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          {level
            ? `Sets every chapter of ${sitting.track} to ${PROFICIENCY_LABEL[narrowLevel(level)]}, replacing whatever grade it has now.`
            : 'Reappear grants no level, so the chapters stay exactly as they are.'}
        </p>
      )}

      {noBirthYear && (
        <p className="text-[0.8125rem] text-vermilion">
          This student has no year of birth on file, so the children&apos;s bonus can&apos;t be
          worked out and the result can&apos;t be recorded yet.
        </p>
      )}
      {profile.isError && (
        <p className="text-[0.8125rem] text-vermilion">
          Could not load the student&apos;s profile, which is needed for the children&apos;s bonus.
        </p>
      )}

      <label className="block">
        <span className="label block text-ink-muted">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="What the examiner heard, what to work on next…"
          className="mt-2 w-full resize-none border border-rule bg-transparent p-2.5 text-[0.8125rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
        />
      </label>

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
          disabled={!complete || bonus === null || recording.isPending}
          aria-busy={recording.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {recording.isPending && <Spinner />}
          {recording.isPending ? 'Saving…' : 'Save result'}
        </button>
      </div>
    </form>
  )
}
