'use client'

import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

const TABS: { status: ReviewStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
]

/**
 * The pending/approved/rejected queue the admin review screens all share
 * (`RegistrationReview`, `EnrollmentRequestReview`, `ExamSlotRequestReview`): a status tab bar over
 * a ruled list, with the loading/error/empty states. The caller owns the `status` (it keys its own
 * query) and renders each row — a row is a plain `<li>`.
 */
export function ReviewList<T extends { id: string }>({
  status,
  onStatusChange,
  query,
  emptyLabel,
  renderRow,
}: {
  status: ReviewStatus
  onStatusChange: (status: ReviewStatus) => void
  query: Pick<UseQueryResult<T[]>, 'data' | 'error'>
  /** What's missing when the list is empty, e.g. "registrations" → "No pending registrations." */
  emptyLabel: string
  renderRow: (item: T) => ReactNode
}) {
  const { data, error } = query

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-9">
      <div className="flex gap-5 border-b border-rule pb-2">
        {TABS.map(tab => (
          <button
            key={tab.status}
            type="button"
            onClick={() => onStatusChange(tab.status)}
            className={
              tab.status === status
                ? 'label text-vermilion'
                : 'label text-ink-muted transition-colors hover:text-ink'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <ScreenError error={error} />
      ) : !data ? (
        <ScreenSkeleton rows={6} />
      ) : (
        <Section title={TABS.find(t => t.status === status)!.label} count={`${data.length}`}>
          {data.length === 0 ? (
            <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
              No {status} {emptyLabel}.
            </p>
          ) : (
            <ol className="sheet">{data.map(renderRow)}</ol>
          )}
        </Section>
      )}
    </div>
  )
}

type Mutation = { isPending: boolean; mutate: (id: string) => void }

/** A pending item's Reject/Approve pair; each button spins while its own mutation runs and both lock while either does. */
export function ApproveRejectButtons({
  id,
  approve,
  reject,
}: {
  id: string
  approve: Mutation
  reject: Mutation
}) {
  const busy = approve.isPending || reject.isPending

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={busy}
        aria-busy={reject.isPending}
        onClick={() => reject.mutate(id)}
        className="label inline-flex items-center gap-2 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
      >
        {reject.isPending && <Spinner />}
        Reject
      </button>
      <button
        type="button"
        disabled={busy}
        aria-busy={approve.isPending}
        onClick={() => approve.mutate(id)}
        className="label inline-flex items-center gap-2 bg-ink px-3 py-1.5 text-paper transition-opacity disabled:opacity-50"
      >
        {approve.isPending && <Spinner />}
        Approve
      </button>
    </div>
  )
}
