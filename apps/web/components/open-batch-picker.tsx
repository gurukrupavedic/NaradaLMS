'use client'

import { useQuery } from '@tanstack/react-query'

import { Section } from '@/components/section'
import { ApiError } from '@/lib/api/client'
import { openBatchesQuery } from '@/lib/query/options'
import { useSelfEnroll } from '@/lib/query/use-batch-mutations'
import type { ApiOpenBatch } from '@/lib/api/api-types'

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * What a profile with no live batch seat sees instead of the (otherwise misleading) bare syllabus
 * view — shown for two distinct situations that end up needing the exact same screen: someone
 * just approved with no enrollment history at all, and someone returning from a break or whose
 * last cohort ended. `returning` only changes the copy; the mechanism (list what's open, join one)
 * is identical either way.
 */
export function OpenBatchPicker({ returning }: { returning: boolean }) {
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
          No batches are open for enrollment right now. Check back soon — a teacher will let you
          know once one opens.
        </p>
      ) : (
        <ol className="sheet">
          {batches.map(batch => (
            <OpenBatchRow key={batch.id} batch={batch} />
          ))}
        </ol>
      )}
    </Section>
  )
}

function OpenBatchRow({ batch }: { batch: ApiOpenBatch }) {
  const enroll = useSelfEnroll()

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

      <button
        type="button"
        disabled={enroll.isPending}
        onClick={() => enroll.mutate(batch.id)}
        className="label shrink-0 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
      >
        {enroll.isPending ? 'Joining…' : 'Join'}
      </button>

      {enroll.isError && (
        <p className="w-full text-[0.8125rem] text-vermilion">
          {enroll.error instanceof ApiError ? enroll.error.message : 'Something went wrong. Try again.'}
        </p>
      )}
    </li>
  )
}
