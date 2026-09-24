'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApproveRejectButtons, ReviewList, type ReviewStatus } from '@/components/admin/review-list'
import { enrollmentRequestsQuery } from '@/lib/query/options'
import {
  useApproveEnrollmentRequest,
  useRejectEnrollmentRequest,
} from '@/lib/query/use-enrollment-request-mutations'
import type { ApiEnrollmentRequest } from '@/lib/api/api-types'
import { formatAgo } from '@/lib/format-date'

// The batch-requests half of /admin/registrations (components/admin/admin-registrations-screen.tsx
// owns the page's shared `Standing` header and the "Applications"/"Batch requests" switch above
// this) — same pending/approved/rejected shape as `RegistrationReview`, a different underlying
// resource: an already-enrolled student asking to join a specific open batch
// (apps/api/src/enrollmentRequests), not a prospective applicant with no account yet.
export function EnrollmentRequestReview() {
  const [status, setStatus] = useState<ReviewStatus>('pending')
  const query = useQuery(enrollmentRequestsQuery(status))

  return (
    <ReviewList
      status={status}
      onStatusChange={setStatus}
      query={query}
      emptyLabel="batch requests"
      renderRow={request => <EnrollmentRequestRow key={request.id} request={request} />}
    />
  )
}

function EnrollmentRequestRow({ request }: { request: ApiEnrollmentRequest }) {
  const approve = useApproveEnrollmentRequest()
  const reject = useRejectEnrollmentRequest()

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">{request.studentName}</span>
        <span className="label mt-0.5 block text-ink-muted">
          {request.trackName} · {request.batchCode}
        </span>
      </div>

      <span className="label shrink-0 text-ink-muted">{formatAgo(request.createdAt)}</span>

      {request.status === 'pending' && (
        <ApproveRejectButtons id={request.id} approve={approve} reject={reject} />
      )}
    </li>
  )
}
