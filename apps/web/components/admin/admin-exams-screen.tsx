'use client'

import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

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
import { adminSittingsPageQuery } from '@/lib/query/options'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { pluralize } from '@/lib/pluralize'

const SEARCH_DEBOUNCE_MS = 300

/**
 * One "Load more" list (Awaiting or Graded), with its own search box — debounced the same way
 * `add-student-drawer.tsx`'s search is, and keyed on the debounced text (`adminSittingsPageQuery`),
 * so a new search resets pagination for free instead of this hook having to do it by hand.
 */
function useSittingList(graded: boolean) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  const result = useInfiniteQuery(adminSittingsPageQuery(graded, debounced))
  const rows = result.data?.pages.flatMap(page => page.items) ?? []

  return { query, setQuery, rows, ...result }
}

/**
 * Grading track exams. Recording a result is school-admin only (apps/api's
 * `AccessPolicy#requireCanRecordEvaluation`) — an instructor can schedule or reschedule a sitting
 * but not certify one — which is why this lives under /admin rather than on the teacher's own
 * dashboard. The list is school-wide: see `fetchAdminSittingsPage` for why it has to ask the API
 * without a profile to get every student's sitting.
 *
 * "Awaiting" and "Graded" are two independent paginated lists (each with its own search box) rather
 * than one combined fetch — the API already splits them server-side (`graded=true/false`) and
 * orders each the way its list wants (soonest-first vs. newest-graded-first), so there's no shared
 * page to walk.
 */
export function AdminExamsScreen() {
  const awaiting = useSittingList(false)
  const graded = useSittingList(true)
  const [target, setTarget] = useState<AdminSittingRow | null>(null)
  const [open, setOpen] = useState(false)

  // No hooks below this point, so the early return is safe.
  if (awaiting.error || graded.error) return <ScreenError error={awaiting.error ?? graded.error} />
  if (!awaiting.data || !graded.data) return <ScreenSkeleton rows={6} />

  // A "Load more" list never knows its true total, only what's loaded so far — the `+` says there's
  // more without claiming an exact count the API was never asked for.
  const awaitingCount = `${awaiting.rows.length}${awaiting.hasNextPage ? '+' : ''}`
  const gradedCount = `${graded.rows.length}${graded.hasNextPage ? '+' : ''}`

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline={
          awaiting.rows.length === 0 && !awaiting.hasNextPage
            ? 'No exams awaiting a result'
            : `${awaitingCount} awaiting a result`
        }
        meta="A certification exam sits a whole track. Enter the five marks; the children's bonus, total and outcome are worked out for you, and a passing result is applied to every chapter of the track."
        stats={[
          { value: awaitingCount, label: 'Awaiting' },
          { value: gradedCount, label: 'Graded' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        <Reveal>
          <Section title="Awaiting a result" count={awaiting.hasNextPage ? `${awaitingCount} sittings` : pluralize(awaiting.rows.length, 'sitting')}>
            <input
              value={awaiting.query}
              onChange={e => awaiting.setQuery(e.target.value)}
              placeholder="Search by student name…"
              className="mb-4 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
            />
            {awaiting.rows.length === 0 ? (
              <p className="text-[0.9375rem] text-ink-muted">
                {awaiting.query.trim()
                  ? `No sittings match "${awaiting.query.trim()}".`
                  : 'No sittings are booked right now.'}
              </p>
            ) : (
              <ol className="sheet">
                {awaiting.rows.map(sitting => (
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
            {awaiting.hasNextPage && (
              <LoadMoreButton
                onClick={() => awaiting.fetchNextPage()}
                loading={awaiting.isFetchingNextPage}
              />
            )}
          </Section>
        </Reveal>

        <Reveal delay={60}>
          <Section title="Graded" count={graded.hasNextPage ? `${gradedCount} sittings` : pluralize(graded.rows.length, 'sitting')}>
            <input
              value={graded.query}
              onChange={e => graded.setQuery(e.target.value)}
              placeholder="Search by student name…"
              className="mb-4 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
            />
            {graded.rows.length === 0 ? (
              <p className="text-[0.9375rem] text-ink-muted">
                {graded.query.trim()
                  ? `No sittings match "${graded.query.trim()}".`
                  : 'No sittings have been graded yet.'}
              </p>
            ) : (
              <ol className="sheet">
                {graded.rows.map(sitting => {
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
            )}
            {graded.hasNextPage && (
              <LoadMoreButton
                onClick={() => graded.fetchNextPage()}
                loading={graded.isFetchingNextPage}
              />
            )}
          </Section>
        </Reveal>
      </div>

      <RecordExamResultDialog open={open} onOpenChange={setOpen} sitting={target} />
    </>
  )
}

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="label mt-4 w-full border border-ink/25 py-2 text-center text-ink transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
    >
      {loading ? 'Loading…' : 'Load more'}
    </button>
  )
}
