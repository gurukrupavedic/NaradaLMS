'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/client'
import { profileSearchQuery } from '@/lib/query/options'
import { useEnrollProfile } from '@/lib/query/use-enrollment-mutations'
import { Drawer } from '@/components/drawer'
import type { AdminBatchDetail } from '@/lib/mock-dashboard'

const SEARCH_DEBOUNCE_MS = 300

/**
 * The admin "add a student" flow, opened from the roster's "+ Add student" button
 * (components/admin/batch-detail.tsx). A drawer rather than an inline box: the
 * search itself can turn up dozens of matches, and the roster/mark book underneath shouldn't have
 * to make room for a list that long every time an admin so much as glances at this batch.
 */
export function AddStudentDrawer({
  batch,
  open,
  onOpenChange,
}: {
  batch: AdminBatchDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  // A fresh search every time the drawer opens — leftover text from the last student an admin
  // added would otherwise still be sitting there the next time they open it. Adjusted during
  // render (React's documented pattern for resetting state on a prop change) rather than in an
  // effect, which would set state synchronously after an extra render instead.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setDebounced('')
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isFetching } = useQuery(profileSearchQuery(debounced, batch.id))
  const enroll = useEnrollProfile(batch.code, batch.id)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add a student" description={batch.code}>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />

      {debounced.trim() ? (
        <ul className="mt-3 divide-y divide-rule-soft">
          {isFetching && !results ? (
            <li className="py-3 text-[0.8125rem] text-ink-muted">Searching…</li>
          ) : results && results.length > 0 ? (
            results.map(candidate => (
              <li key={candidate.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-[0.875rem]">
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
            <li className="py-3 text-[0.8125rem] text-ink-muted">No matching students.</li>
          )}
        </ul>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-ink-muted">Start typing a name to search.</p>
      )}

      {enroll.isError && (
        <p className="mt-3 text-[0.8125rem] text-vermilion">
          {enroll.error instanceof ApiError ? enroll.error.message : 'Something went wrong.'}
        </p>
      )}
    </Drawer>
  )
}
