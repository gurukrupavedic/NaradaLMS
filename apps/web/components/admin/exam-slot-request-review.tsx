'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApproveRejectButtons, ReviewList, type ReviewStatus } from '@/components/admin/review-list'
import { Timestamp } from '@/components/timestamp'
import { examSlotRequestsQuery } from '@/lib/query/options'
import {
  useApproveExamSlotRequest,
  useRejectExamSlotRequest,
} from '@/lib/query/use-exam-slot-mutations'
import type { ExamSlotRequestRow } from '@/lib/api/resources'

// The requests half of /admin/exam-slots (components/admin/admin-exam-slots-screen.tsx owns the
// page's shared `Standing` header and the "Slots"/"Requests" switch above this) — same
// pending/approved/rejected shape as `EnrollmentRequestReview`, a different underlying resource: a
// student asking to sit a track's certification exam, not to join a batch.
export function ExamSlotRequestReview() {
  const [status, setStatus] = useState<ReviewStatus>('pending')
  const query = useQuery(examSlotRequestsQuery(status))

  return (
    <ReviewList
      status={status}
      onStatusChange={setStatus}
      query={query}
      emptyLabel="sitting requests"
      renderRow={request => <ExamSlotRequestRowItem key={request.id} request={request} />}
    />
  )
}

function ExamSlotRequestRowItem({ request }: { request: ExamSlotRequestRow }) {
  const approve = useApproveExamSlotRequest()
  const reject = useRejectExamSlotRequest()

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
        <ApproveRejectButtons id={request.id} approve={approve} reject={reject} />
      )}
    </li>
  )
}
