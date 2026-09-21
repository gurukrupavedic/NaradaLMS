'use client'

import { useQuery } from '@tanstack/react-query'

import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { openBatchesQuery } from '@/lib/query/options'
import { useRequestEnrollment } from '@/lib/query/use-batch-mutations'
import type { ApiOpenBatch } from '@/lib/api/api-types'

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * What a profile with no live batch seat sees instead of the (otherwise misleading) bare syllabus
 * view — shown for two distinct situations that end up needing the exact same screen: someone
 * just approved with no enrollment history at all, and someone returning from a break or whose
 * last cohort ended. `returning` only changes the copy; the mechanism (list what's open, ask to
 * join one) is identical either way.
 *
 * `pendingBatchIds` (dashboard-screen.tsx's own `data.pendingBatchIds`) marks a batch this profile
 * has already requested — asking again would just hit the server's 409, so those rows show
 * "Pending approval" instead of a clickable "Request to join" button.
 */
export function OpenBatchPicker({
  returning,
  pendingBatchIds,
}: {
  returning: boolean
  pendingBatchIds: string[]
}) {
  const { data: batches, error } = useQuery(openBatchesQuery())

  return (
    <Section title={returning ? 'Rejoin a batch' : 'Choose your batch'}>
      {error ? (
        <p className="sheet px-4 py-6 text-center text-[0.875rem] text-vermilion">
          Couldn&apos;t load open batches. Try reloading the page.
        </p>
      ) : !batches ? (
        <div className="sheet px-4 py-6">
          <span className="block h-4 w-1/2 animate-pulse bg-ink/[0.07]" />
        </div>
      ) : batches.length === 0 ? (
        <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
          There are no batches to join right now. Check back once a new one is scheduled.
        </p>
      ) : (
        <ol className="sheet">
          {batches.map(batch => (
            <OpenBatchRow key={batch.id} batch={batch} pending={pendingBatchIds.includes(batch.id)} />
          ))}
        </ol>
      )}
    </Section>
  )
}

function OpenBatchRow({ batch, pending }: { batch: ApiOpenBatch; pending: boolean }) {
  const enroll = useRequestEnrollment()

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule-soft px-4 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium">
          {batch.trackName}
          <span className="ml-2 font-mono text-[0.8125rem] font-normal text-ink-muted">{batch.code}</span>
        </span>
        <span className="label mt-0.5 block text-ink-muted">
          {batch.classSlots.length === 0
            ? 'Schedule to be announced'
            : batch.classSlots
                .map(slot => `${DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek} ${slot.time}`)
                .join(' · ')}
        </span>
      </div>

      {pending || enroll.isSuccess ? (
        <span className="label shrink-0 border border-rule px-4 py-2 text-ink-muted">Pending approval</span>
      ) : (
        <button
          type="button"
          disabled={enroll.isPending}
          aria-busy={enroll.isPending}
          onClick={() => enroll.mutate(batch.id)}
          className="label inline-flex shrink-0 items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {enroll.isPending && <Spinner />}
          {enroll.isPending ? 'Requesting…' : 'Request to join'}
        </button>
      )}
    </li>
  )
}
