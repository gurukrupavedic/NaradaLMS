'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { profileSearchQuery } from '@/lib/query/options'
import { useEnrollProfile } from '@/lib/query/use-enrollment-mutations'
import { Drawer } from '@/components/drawer'
import { Spinner } from '@/components/spinner'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { AdminBatchDetail } from '@/lib/models/dashboard'

const SEARCH_DEBOUNCE_MS = 300

type Role = 'student' | 'ta' | 'instructor'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'ta', label: 'TA' },
  { value: 'instructor', label: 'Instructor' },
]

/**
 * The admin "add to batch" flow, opened from the roster's "+ Add" button
 * (components/admin/batch-detail.tsx). A drawer rather than an inline box: the
 * search itself can turn up dozens of matches, and the roster/mark book underneath shouldn't have
 * to make room for a list that long every time an admin so much as glances at this batch.
 *
 * One role applies to the whole search session, not a picker per result — an admin opening this
 * is either staffing the batch (TA/instructor) or adding students, not switching between the two
 * mid-search, and a single control up top means the common case (adding several students in a
 * row) never has to repeat itself. `useEnrollProfile`/`enrollProfile` already accept any of the
 * three roles (`apps/api/src/enrollment/schema.ts`'s `enrollmentRoleSchema`); a TA is a real,
 * first-class batch role here (`packages/db/src/schema/school.ts`'s `enrollmentRole` enum),
 * distinct from being a student anywhere else — the same profile can hold an active student seat
 * in one batch and a TA seat in another (or the same course's) batch at once.
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
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const [role, setRole] = useState<Role>('student')

  // A fresh search every time the drawer opens — leftover text from the last student an admin
  // added would otherwise still be sitting there the next time they open it. Adjusted during
  // render (React's documented pattern for resetting state on a prop change) rather than in an
  // effect, which would set state synchronously after an extra render instead.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setRole('student')
    }
  }

  const { data: results, isFetching, isError } = useQuery(profileSearchQuery(debounced, batch.id))
  const enroll = useEnrollProfile(batch.code, batch.id)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add to batch" description={batch.code}>
      <div>
        <span className="label block text-ink-muted">Add as</span>
        <div role="radiogroup" aria-label="Role" className="mt-2 grid grid-cols-3 gap-1.5">
          {ROLE_OPTIONS.map(option => {
            const selected = role === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(option.value)}
                className={cn(
                  'label border px-3 py-1.5 text-center transition-colors',
                  selected
                    ? 'border-vermilion bg-vermilion/[0.06] text-vermilion'
                    : 'border-rule text-ink-muted hover:bg-ink/[0.03]',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, email or phone…"
        className="mt-5 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
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
                      enroll.mutate({
                        profileId: candidate.id,
                        profileName: candidate.name,
                        role,
                      })
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
    </Drawer>
  )
}
