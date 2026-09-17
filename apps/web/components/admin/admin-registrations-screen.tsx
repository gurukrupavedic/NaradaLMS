'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { Standing } from '@/components/standing'
import { RegistrationReview } from '@/components/admin/registration-review'
import { EnrollmentRequestReview } from '@/components/admin/enrollment-request-review'
import { enrollmentRequestsQuery, registrationsQuery } from '@/lib/query/options'

type View = 'applications' | 'batchRequests'

const VIEWS: { view: View; label: string }[] = [
  { view: 'applications', label: 'Applications' },
  { view: 'batchRequests', label: 'Batch requests' },
]

/**
 * The one screen for everything awaiting a teacher's approval before someone new shows up on a
 * roster: a prospective applicant with no account yet (`RegistrationReview`) and an already-
 * enrolled student asking to join a *specific* open batch (`EnrollmentRequestReview`) are
 * different underlying resources, but from a reviewing teacher's point of view they're the same
 * kind of task — so they share this one page and header rather than living on separate admin
 * screens a teacher has to remember to check separately.
 */
export function AdminRegistrationsScreen() {
  // Only ever read once, on mount, to seed which tab opens — components/admin/admin-overview.tsx's
  // "Review batch requests" row links here with `?view=batchRequests` so that click lands on the
  // right tab directly rather than always opening on "Applications" first.
  const searchParams = useSearchParams()
  const [view, setView] = useState<View>(searchParams.get('view') === 'batchRequests' ? 'batchRequests' : 'applications')
  // Pending counts only, for the switcher's own badges — each sub-view owns its full
  // pending/approved/rejected list and re-fetches it independently.
  const { data: pendingApplications } = useQuery(registrationsQuery('pending'))
  const { data: pendingBatchRequests } = useQuery(enrollmentRequestsQuery('pending'))
  const counts: Record<View, number | undefined> = {
    applications: pendingApplications?.length,
    batchRequests: pendingBatchRequests?.length,
  }

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline="Registrations"
        meta="Everything waiting on a teacher's review — new applications filed through the public registration form, and batch-join requests from students already enrolled."
      />

      <div className="mx-auto max-w-5xl px-5 pt-9">
        <div className="flex gap-5 border-b border-rule pb-2">
          {VIEWS.map(item => {
            const count = counts[item.view]
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={
                  item.view === view
                    ? 'label flex items-center gap-2 text-vermilion'
                    : 'label flex items-center gap-2 text-ink-muted transition-colors hover:text-ink'
                }
              >
                {item.label}
                {!!count && (
                  <span className="rounded-full bg-vermilion/10 px-1.5 py-0.5 text-vermilion">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {view === 'applications' ? <RegistrationReview /> : <EnrollmentRequestReview />}
    </>
  )
}
