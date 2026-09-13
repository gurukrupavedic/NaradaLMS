'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { registrationsQuery } from '@/lib/query/options'
import { useApproveRegistration, useRejectRegistration } from '@/lib/query/use-registration-mutations'
import type { ApiRegistration, ApiRegistrationStatus } from '@/lib/api/api-types'

const TABS: { status: ApiRegistrationStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
]

export function RegistrationReview() {
  const [status, setStatus] = useState<ApiRegistrationStatus>('pending')
  const { data: registrations, error } = useQuery(registrationsQuery(status))

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline="Registrations"
        meta="Applications filed through the public registration form, awaiting a teacher's review."
      />

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
        ) : !registrations ? (
          <ScreenSkeleton rows={6} />
        ) : (
          <Section title={TABS.find(t => t.status === status)!.label} count={`${registrations.length}`}>
            {registrations.length === 0 ? (
              <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
                No {status} registrations.
              </p>
            ) : (
              <ol className="sheet">
                {registrations.map(registration => (
                  <RegistrationRow key={registration.id} registration={registration} />
                ))}
              </ol>
            )}
          </Section>
        )}
      </div>
    </>
  )
}

function RegistrationRow({ registration }: { registration: ApiRegistration }) {
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()
  const pending = approve.isPending || reject.isPending

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <Link
        href={`/admin/registrations/${registration.id}`}
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

      <span className="label shrink-0 text-ink-muted">
        {formatDistanceToNow(new Date(registration.createdAt), { addSuffix: true })}
      </span>

      {registration.status === 'pending' && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => reject.mutate(registration.id)}
            className="label border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => approve.mutate(registration.id)}
            className="label bg-ink px-3 py-1.5 text-paper transition-opacity disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      )}
    </li>
  )
}
