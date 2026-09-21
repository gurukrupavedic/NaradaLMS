'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { adminBatchesQuery } from '@/lib/query/options'
import { useMoveEnrollment } from '@/lib/query/use-enrollment-mutations'
import { Drawer } from '@/components/drawer'
import { Spinner } from '@/components/spinner'

/**
 * The admin "move to another batch" flow, opened from a student's own profile (components/
 * student-profile-screen.tsx) rather than from the batch they're currently in — an admin looking
 * at one student's record already has the "who" and the "from"; this drawer only needs to ask "to
 * where." Assumes a student holds at most one batch at a time (true of every real profile today);
 * a profile somehow enrolled in more than one would need a "which one" step first, deferred to a
 * future PR. Filters the destination list client-side (there's no dedicated batch-search endpoint,
 * and the admin overview already loads the full list for its own table) rather than a search box
 * per keystroke.
 */
export function MoveBatchDrawer({
  open,
  onOpenChange,
  profileId,
  profileName,
  fromBatchId,
  fromBatchCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  profileName: string
  fromBatchId: string
  fromBatchCode: string
}) {
  const [query, setQuery] = useState('')
  const { data: allBatches } = useQuery(adminBatchesQuery())
  const move = useMoveEnrollment(fromBatchCode, fromBatchId)

  const destinations = (allBatches ? [...allBatches.active, ...allBatches.upcoming] : [])
    .filter(row => row.id !== fromBatchId)
    .filter(row => row.code.toLowerCase().includes(query.trim().toLowerCase()))

  // Closes on success — the toast says what happened, and this drawer's own "currently in …" line
  // is stale the moment the student has moved, so leaving it open would only invite a second move
  // from a header that's no longer true.
  function handleMove(toBatchId: string, toBatchCode: string) {
    move.mutate(
      { profileId, profileName, toBatchId, toBatchCode },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Change batch"
      description={`${profileName} — currently in ${fromBatchCode}`}
    >
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by batch code…"
        className="w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />

      <ul className="mt-3 divide-y divide-rule">
        {!allBatches ? (
          <li className="py-3 text-[0.8125rem] text-ink-muted">Loading batches…</li>
        ) : destinations.length === 0 ? (
          <li className="py-3 text-[0.8125rem] text-ink-muted">No matching batches.</li>
        ) : (
          destinations.map(row => {
            const moving = move.isPending && move.variables?.toBatchId === row.id
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-[0.875rem]">
                  {row.code}
                  <span className="label ml-2 text-ink-muted">{row.track}</span>
                </span>
                <button
                  type="button"
                  disabled={move.isPending}
                  aria-busy={moving}
                  onClick={() => handleMove(row.id, row.code)}
                  className="label inline-flex min-w-[4.5rem] shrink-0 items-center justify-center gap-2 border border-ink/25 px-3 py-1 transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
                >
                  {moving && <Spinner />}
                  Move
                </button>
              </li>
            )
          })
        )}
      </ul>
    </Drawer>
  )
}
