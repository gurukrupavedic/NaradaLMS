'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Pill } from '@/components/proficiency-pill'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { ExamMarksLine } from '@/components/exam-marks-line'
import { RecordExamResultDialog } from '@/components/admin/record-exam-result-dialog'
import type { AdminSittingRow } from '@/lib/api/resources'
import { narrowLevel } from '@/lib/api/reshape'
import { EXAM_MAX_TOTAL, EXAM_OUTCOME_LABEL } from '@/lib/exam-grading'
import { adminSittingsQuery } from '@/lib/query/options'

/**
 * Grading track exams. Recording a result is school-admin only (apps/api's
 * `AccessPolicy#requireCanRecordEvaluation`) — an instructor can schedule or reschedule a sitting
 * but not certify one — which is why this lives under /admin rather than on the teacher's own
 * dashboard. The list is school-wide: see `fetchAdminSittings` for why it has to ask the API
 * without a profile to get every student's sitting.
 */
export function AdminExamsScreen() {
  const { data, error } = useQuery(adminSittingsQuery())
  const [target, setTarget] = useState<AdminSittingRow | null>(null)
  const [open, setOpen] = useState(false)

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={6} />

  const { awaiting, graded } = data

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline={
          awaiting.length === 0
            ? 'No exams awaiting a result'
            : `${awaiting.length} awaiting a result`
        }
        meta="A certification exam sits a whole track. Enter the five marks; the children's bonus, total and outcome are worked out for you, and a passing result is applied to every chapter of the track."
        stats={[
          { value: String(awaiting.length), label: 'Awaiting' },
          { value: String(graded.length), label: 'Graded' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        <Reveal>
          <Section title="Awaiting a result" count={`${awaiting.length} sittings`}>
            {awaiting.length === 0 ? (
              <p className="text-[0.9375rem] text-ink-muted">No sittings are booked right now.</p>
            ) : (
              <ol className="sheet">
                {awaiting.map(sitting => (
                  <li
                    key={sitting.id}
                    className="flex items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">
                        {sitting.studentName}
                      </span>
                      <span className="label mt-0.5 block text-ink-muted">
                        {sitting.track} · {sitting.batchCode}
                      </span>
                    </span>
                    <span className="hidden shrink-0 font-mono text-[0.75rem] text-ink-muted sm:block">
                      <Timestamp variant="dateTime" value={sitting.when} />
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTarget(sitting)
                        setOpen(true)
                      }}
                      className="label shrink-0 border border-ink/25 px-3 py-1.5 text-ink transition-colors hover:border-vermilion hover:text-vermilion"
                    >
                      Record result
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </Reveal>

        {graded.length > 0 && (
          <Reveal delay={60}>
            <Section title="Graded" count={`${graded.length} sittings`}>
              <ol className="sheet">
                {graded.map(sitting => {
                  const result = sitting.result!
                  return (
                    <li
                      key={sitting.id}
                      className="flex items-start gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem]">
                          {sitting.studentName} · {EXAM_OUTCOME_LABEL[result.outcome]}
                        </span>
                        <span className="label mt-1 block text-ink-muted">
                          {sitting.track} · {sitting.batchCode} ·{' '}
                          <Timestamp variant="dateTime" value={result.evaluatedAt} /> ·{' '}
                          {result.total} / {EXAM_MAX_TOTAL}
                        </span>
                        <ExamMarksLine result={result} />
                      </span>
                      {result.level ? (
                        <Pill level={narrowLevel(result.level)} className="mt-1 shrink-0" />
                      ) : (
                        <span className="label mt-1 shrink-0 text-vermilion">reappear</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTarget(sitting)
                          setOpen(true)
                        }}
                        className="label mt-1 shrink-0 border border-ink/25 px-3 py-1.5 text-ink transition-colors hover:border-vermilion hover:text-vermilion"
                      >
                        Correct
                      </button>
                    </li>
                  )
                })}
              </ol>
            </Section>
          </Reveal>
        )}
      </div>

      <RecordExamResultDialog open={open} onOpenChange={setOpen} sitting={target} />
    </>
  )
}
