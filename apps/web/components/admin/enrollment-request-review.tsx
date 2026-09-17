'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Section } from '@/components/section'
import { enrollmentRequestsQuery } from '@/lib/query/options'
import {
  useApproveEnrollmentRequest,
  useRejectEnrollmentRequest,
} from '@/lib/query/use-enrollment-request-mutations'
import type { ApiEnrollmentRequest, ApiEnrollmentRequestStatus } from '@/lib/api/api-types'

const TABS: { status: ApiEnrollmentRequestStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
]

// The batch-requests half of /admin/registrations (components/admin/admin-registrations-screen.tsx
// owns the page's shared `Standing` header and the "Applications"/"Batch requests" switch above
// this) — same pending/approved/rejected shape as `RegistrationReview`, a different underlying
// resource: an already-enrolled student asking to join a specific open batch
// (apps/api/src/enrollmentRequests), not a prospective applicant with no account yet.
export function EnrollmentRequestReview() {
  const [status, setStatus] = useState<ApiEnrollmentRequestStatus>('pending')
  const { data: requests, error } = useQuery(enrollmentRequestsQuery(status))

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
              No {status} batch requests.
            </p>
          ) : (
            <ol className="sheet">
              {requests.map(request => (
                <EnrollmentRequestRow key={request.id} request={request} />
              ))}
            </ol>
          )}
        </Section>
      )}
    </div>
  )
}

function EnrollmentRequestRow({ request }: { request: ApiEnrollmentRequest }) {
  const approve = useApproveEnrollmentRequest()
  const reject = useRejectEnrollmentRequest()
  const pending = approve.isPending || reject.isPending

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">{request.studentName}</span>
        <span className="label mt-0.5 block text-ink-muted">
          {request.trackName} · {request.batchCode}
        </span>
      </div>

      <span className="label shrink-0 text-ink-muted">
        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
      </span>

      {request.status === 'pending' && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => reject.mutate(request.id)}
            className="label border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => approve.mutate(request.id)}
            className="label bg-ink px-3 py-1.5 text-paper transition-opacity disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      )}
    </li>
  )
}
