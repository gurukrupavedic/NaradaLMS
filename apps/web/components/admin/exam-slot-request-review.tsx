'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { Timestamp } from '@/components/timestamp'
import { examSlotRequestsQuery } from '@/lib/query/options'
import {
  useApproveExamSlotRequest,
  useRejectExamSlotRequest,
} from '@/lib/query/use-exam-slot-mutations'
import type { ExamSlotRequestRow } from '@/lib/api/resources'
import type { ApiExamSlotRequestStatus } from '@/lib/api/api-types'

const TABS: { status: ApiExamSlotRequestStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
]

// The requests half of /admin/exam-slots (components/admin/admin-exam-slots-screen.tsx owns the
// page's shared `Standing` header and the "Slots"/"Requests" switch above this) — same
// pending/approved/rejected shape as `EnrollmentRequestReview`, a different underlying resource: a
// student asking to sit a track's certification exam, not to join a batch.
export function ExamSlotRequestReview() {
  const [status, setStatus] = useState<ApiExamSlotRequestStatus>('pending')
  const { data: requests, error } = useQuery(examSlotRequestsQuery(status))

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-9">
      <div className="flex gap-5 border-b border-rule pb-2">
        {TABS.map(tab => (
          <button
            key={tab.status}
            type="button"
            onClick={() => setStatus(tab.status)}
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
      ) : !requests ? (
        <ScreenSkeleton rows={6} />
      ) : (
        <Section title={TABS.find(t => t.status === status)!.label} count={`${requests.length}`}>
          {requests.length === 0 ? (
            <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
              No {status} sitting requests.
            </p>
          ) : (
            <ol className="sheet">
              {requests.map(request => (
                <ExamSlotRequestRowItem key={request.id} request={request} />
              ))}
            </ol>
          )}
        </Section>
      )}
    </div>
  )
}

function ExamSlotRequestRowItem({ request }: { request: ExamSlotRequestRow }) {
  const approve = useApproveExamSlotRequest()
  const reject = useRejectExamSlotRequest()
  const pending = approve.isPending || reject.isPending

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">{request.studentName}</span>
        <span className="label mt-0.5 block text-ink-muted">{request.track}</span>
      </div>

      <span className="label shrink-0 font-mono text-ink-muted">
        <Timestamp variant="dateTime" value={request.when} />
      </span>

      {request.status === 'pending' && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={pending}
            aria-busy={reject.isPending}
            onClick={() => reject.mutate(request.id)}
            className="label inline-flex items-center gap-2 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
          >
            {reject.isPending && <Spinner />}
            Reject
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={approve.isPending}
            onClick={() => approve.mutate(request.id)}
            className="label inline-flex items-center gap-2 bg-ink px-3 py-1.5 text-paper transition-opacity disabled:opacity-50"
          >
            {approve.isPending && <Spinner />}
            Approve
          </button>
        </div>
      )}
    </li>
  )
}
