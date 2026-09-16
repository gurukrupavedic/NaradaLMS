'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminBatchesQuery, profileSearchQuery } from '@/lib/query/options'
import { useEnrollProfile, useMoveEnrollment } from '@/lib/query/use-enrollment-mutations'
import type { AdminBatchDetail } from '@/lib/mock-dashboard'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Add-a-student / move-a-student, the two roster edits neither `EnrollmentSection` (the open/
 * close toggle) nor `RosterSection`'s mark book (grading) cover. Kept as its own section rather
 * than folded into the mark book: that grid is purpose-built for "who is behind, on what," and
 * adding a destination-batch picker to every row there would compete with the marks for attention
 * on the one screen that's about them.
 */
export function RosterEditor({ batch }: { batch: AdminBatchDetail }) {
  return (
    <div className="sheet space-y-6 px-4 py-5">
      <AddStudent batch={batch} />
      {batch.roster.length > 0 && <div className="border-t border-rule-soft pt-5"><MoveStudent batch={batch} /></div>}
    </div>
  )
}

function AddStudent({ batch }: { batch: AdminBatchDetail }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isFetching } = useQuery(profileSearchQuery(debounced, batch.id))
  const enroll = useEnrollProfile(batch.code, batch.id)

  return (
    <div>
      <span className="label block text-ink-muted">Add a student</span>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />

      {debounced.trim() && (
        <ul className="mt-2 divide-y divide-rule-soft">
          {isFetching && !results ? (
            <li className="py-2 text-[0.8125rem] text-ink-muted">Searching…</li>
          ) : results && results.length > 0 ? (
            results.map(candidate => (
              <li key={candidate.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-[0.875rem]">
                  {candidate.name}
                  {candidate.city && <span className="label ml-2 text-ink-muted">{candidate.city}</span>}
                </span>
                <button
                  type="button"
                  disabled={enroll.isPending}
                  onClick={() => enroll.mutate({ profileId: candidate.id, role: 'student' })}
                  className="label shrink-0 border border-ink/25 px-3 py-1 transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))
          ) : (
            <li className="py-2 text-[0.8125rem] text-ink-muted">No matching students.</li>
          )}
        </ul>
      )}

      {enroll.isError && (
        <p className="mt-2 text-[0.8125rem] text-vermilion">
          {enroll.error instanceof ApiError ? enroll.error.message : 'Something went wrong.'}
        </p>
      )}
    </div>
  )
}

function MoveStudent({ batch }: { batch: AdminBatchDetail }) {
  const { data: allBatches } = useQuery(adminBatchesQuery())
  const move = useMoveEnrollment(batch.code, batch.id)

  const [studentId, setStudentId] = useState('')
  const [toBatchId, setToBatchId] = useState('')

  // Only live batches are worth moving a student into — a batch that's already wrapped up isn't
  // a destination anyone means to pick.
  const destinations = (allBatches ? [...allBatches.active, ...allBatches.upcoming] : []).filter(
    row => row.id !== batch.id,
  )

  function handleMove() {
    const toBatch = destinations.find(row => row.id === toBatchId)
    if (!studentId || !toBatch) return

    move.mutate(
      { profileId: studentId, toBatchId: toBatch.id, toBatchCode: toBatch.code },
      { onSuccess: () => setStudentId('') },
    )
  }

  return (
    <div>
      <span className="label block text-ink-muted">Move a student to another batch</span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
          className="border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
        >
          <option value="" disabled>
            Choose a student…
          </option>
          {batch.roster.map(student => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>

        <span className="text-ink-muted">→</span>

        <select
          value={toBatchId}
          onChange={e => setToBatchId(e.target.value)}
          className="border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
        >
          <option value="" disabled>
            Choose a batch…
          </option>
          {destinations.map(row => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.track}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!studentId || !toBatchId || move.isPending}
          onClick={handleMove}
          className={cn('label px-4 py-1.5 transition-opacity disabled:opacity-50', 'bg-ink text-paper')}
        >
          {move.isPending ? 'Moving…' : 'Move'}
        </button>
      </div>

      {move.isError && (
        <p className="mt-2 text-[0.8125rem] text-vermilion">
          {move.error instanceof ApiError ? move.error.message : 'Something went wrong.'}
        </p>
      )}
    </div>
  )
}
