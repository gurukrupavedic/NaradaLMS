'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ApproveRejectButtons, ReviewList, type ReviewStatus } from '@/components/admin/review-list'
import { registrationsQuery } from '@/lib/query/options'
import { useApproveRegistration, useRejectRegistration } from '@/lib/query/use-registration-mutations'
import type { ApiRegistration } from '@/lib/api/api-types'
import { useCoursePath } from '@/lib/course'
import { formatAgo } from '@/lib/format-date'

// The applications half of /admin/registrations (components/admin/admin-registrations-screen.tsx
// owns the page's shared `Standing` header and the "Applications"/"Batch requests" switch above
// this) — the public registration form's pending/approved/rejected queue.
export function RegistrationReview() {
  const [status, setStatus] = useState<ReviewStatus>('pending')
  const query = useQuery(registrationsQuery(status))

  return (
    <ReviewList
      status={status}
      onStatusChange={setStatus}
      query={query}
      emptyLabel="registrations"
      renderRow={registration => <RegistrationRow key={registration.id} registration={registration} />}
    />
  )
}

function RegistrationRow({ registration }: { registration: ApiRegistration }) {
  const cp = useCoursePath()
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <Link
        href={cp(`/admin/registrations/${registration.id}`)}
        className="min-w-0 flex-1 underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion"
      >
        <span className="block text-[0.9375rem]">
          {registration.firstName} {registration.lastName}
        </span>
        <span className="label mt-0.5 block text-ink-muted">
          {registration.phone}
          {registration.city && ` · ${registration.city}`}
        </span>
      </Link>

      <span className="label shrink-0 text-ink-muted">{formatAgo(registration.createdAt)}</span>

      {registration.status === 'pending' && (
        <ApproveRejectButtons id={registration.id} approve={approve} reject={reject} />
      )}
    </li>
  )
}
