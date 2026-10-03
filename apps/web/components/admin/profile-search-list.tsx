'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { profileSearchQuery } from '@/lib/query/options'
import { useEnrollProfile } from '@/lib/query/use-enrollment-mutations'
import { Spinner } from '@/components/spinner'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { AdminBatchDetail } from '@/lib/models/dashboard'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Search-and-add for a batch, shared by the two admin drawers that seat someone: "Add student"
 * (`role="student"`) and "Edit staff" (`role="instructor"`). Which role a result is added as is
 * fixed by whoever mounts this — an admin never picks it per result. It lives inside a drawer's
 * body, so closing the drawer unmounts it and the next opening starts with an empty search.
 */
export function ProfileSearchList({
  batch,
  role,
}: {
  batch: AdminBatchDetail
  role: 'student' | 'instructor'
}) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  const { data: results, isFetching, isError } = useQuery(profileSearchQuery(debounced, batch.id))
  const enroll = useEnrollProfile(batch.code, batch.id)

  return (
    <>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, email or phone…"
        className="w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />

      {debounced.trim() ? (
        <ul className="mt-3 divide-y divide-rule">
          {isFetching && !results ? (
            <li className="py-3 text-[0.8125rem] text-ink-muted">Searching…</li>
          ) : isError ? (
            <li className="py-3 text-[0.8125rem] text-vermilion">
              Couldn&rsquo;t search right now — try again.
            </li>
          ) : results && results.length > 0 ? (
            results.map(candidate => {
              const adding = enroll.isPending && enroll.variables?.profileId === candidate.id
              return (
                <li key={candidate.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <span className="block truncate text-[0.875rem]">
                      {candidate.name}
                      {candidate.city && <span className="label ml-2 text-ink-muted">{candidate.city}</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-ink-muted">
                      {candidate.email && <span className="break-all">{candidate.email}</span>}
                      {candidate.phone && <span className="font-mono">{candidate.phone}</span>}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={enroll.isPending}
                    aria-busy={adding}
                    onClick={() =>
                      enroll.mutate({ profileId: candidate.id, profileName: candidate.name, role })
                    }
                    className="label inline-flex min-w-[4.5rem] shrink-0 items-center justify-center gap-2 border border-ink/25 px-3 py-1 transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
                  >
                    {adding && <Spinner />}
                    Add
                  </button>
                </li>
              )
            })
          ) : (
            <li className="py-3 text-[0.8125rem] text-ink-muted">No matching profiles.</li>
          )}
        </ul>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-ink-muted">
          Start typing a name, email or phone number to search.
        </p>
      )}
    </>
  )
}
