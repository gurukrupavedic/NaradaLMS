'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { registrationQuery } from '@/lib/query/options'
import { useApproveRegistration, useRejectRegistration } from '@/lib/query/use-registration-mutations'
import { SELF_REPORTED_PROFICIENCY_LABEL } from '@/lib/registration-proficiency'
import { formatLocation } from '@/lib/geo'
import { formatTimeZone } from '@/lib/timezone'
import type { ApiRegistration, ApiRegistrationStatus } from '@/lib/api/api-types'
import { useCoursePath } from '@/lib/course'
import { formatAgo } from '@/lib/format-date'

const STATUS_LABEL: Record<ApiRegistrationStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const AGREEMENT_LABELS: { key: keyof ApiRegistration; label: string }[] = [
  { key: 'dressCodeAgreed', label: 'Dress code' },
  { key: 'noMeatAgreed', label: 'No meat' },
  { key: 'noAlcoholAgreed', label: 'No alcohol' },
  { key: 'noSmokingAgreed', label: 'No smoking' },
]

export function RegistrationDetail({ registrationId }: { registrationId: string }) {
  const cp = useCoursePath()
  const { data: registration, error } = useQuery(registrationQuery(registrationId))

  if (error) return <ScreenError error={error} backHref={cp('/admin/registrations')} backLabel="← Registrations" />
  if (!registration) return <ScreenSkeleton rows={8} />

  return <RegistrationDetailView registration={registration} />
}

function RegistrationDetailView({ registration }: { registration: ApiRegistration }) {
  const cp = useCoursePath()
  const router = useRouter()
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()
  const pending = approve.isPending || reject.isPending

  async function handleApprove() {
    await approve.mutateAsync(registration.id)
    router.push(cp('/admin/registrations'))
  }

  async function handleReject() {
    await reject.mutateAsync(registration.id)
    router.push(cp('/admin/registrations'))
  }

  return (
    <>
      <Standing
        eyebrow={`Administration · ${STATUS_LABEL[registration.status]}`}
        headline={`${registration.firstName} ${registration.lastName}`}
        meta={`Filed ${formatAgo(registration.createdAt)}`}
      />

      <div className="mx-auto max-w-5xl space-y-11 px-5 py-9">
        <Link href={cp('/admin/registrations')} className="label text-ink-muted transition-colors hover:text-ink">
          ← Registrations
        </Link>

        <Section title="Contact">
          <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Phone</dt>
              <dd className="mt-2 font-mono text-[0.9375rem]">{registration.phone}</dd>

              <dt className="label mt-5 text-ink-muted">Email</dt>
              <dd className="mt-2 text-[0.9375rem]">{registration.email ?? '—'}</dd>
            </div>

            <div className="px-4 py-4">
              <dt className="label text-ink-muted">City</dt>
              <dd className="mt-2 text-[0.9375rem]">{registration.city ?? '—'}</dd>

              <dt className="label mt-5 text-ink-muted">Location</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {formatLocation(registration.state, registration.country) ?? '—'}
              </dd>

              <dt className="label mt-5 text-ink-muted">Time zone</dt>
              <dd className="mt-2 text-[0.9375rem]">{formatTimeZone(registration.countryTimeZone) ?? '—'}</dd>

              <dt className="label mt-5 text-ink-muted">Year of birth</dt>
              <dd className="mt-2 text-[0.9375rem]">{registration.yearOfBirth}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Learning background">
          <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Goal</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed">{registration.learningGoal ?? '—'}</dd>

              <dt className="label mt-5 text-ink-muted">Current proficiency</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {registration.currentProficiency
                  ? (SELF_REPORTED_PROFICIENCY_LABEL[registration.currentProficiency] ?? registration.currentProficiency)
                  : '—'}
              </dd>
            </div>

            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Speaks</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {registration.spokenLanguages.length > 0 ? registration.spokenLanguages.join(', ') : '—'}
              </dd>

              <dt className="label mt-5 text-ink-muted">Reads</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {registration.readLanguages.length > 0 ? registration.readLanguages.join(', ') : '—'}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Family & agreements">
          <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Parent / guardian</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {registration.parentNames.length > 0 ? registration.parentNames.join(', ') : '—'}
              </dd>

              <dt className="label mt-5 text-ink-muted">Comments</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed">{registration.comments ?? '—'}</dd>
            </div>

            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Agreements</dt>
              <dd className="mt-2 space-y-1.5">
                {AGREEMENT_LABELS.map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-2 text-[0.875rem]">
                    <span aria-hidden className={registration[key] ? 'text-vermilion' : 'text-ink-muted/40'}>
                      {registration[key] ? '✓' : '–'}
                    </span>
                    {label}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </Section>

        {registration.status === 'pending' ? (
          <Section title="Decision">
            <div className="flex gap-3">
              <button
                type="button"
                disabled={pending}
                aria-busy={reject.isPending}
                onClick={handleReject}
                className="label inline-flex flex-1 items-center justify-center gap-2 border border-rule px-5 py-3 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50 sm:flex-none sm:px-8"
              >
                {reject.isPending && <Spinner />}
                Reject
              </button>
              <button
                type="button"
                disabled={pending}
                aria-busy={approve.isPending}
                onClick={handleApprove}
                className="label inline-flex flex-1 items-center justify-center gap-2 bg-ink px-5 py-3 text-paper transition-opacity disabled:opacity-50 sm:flex-none sm:px-8"
              >
                {approve.isPending && <Spinner />}
                Approve
              </button>
            </div>
          </Section>
        ) : (
          registration.reviewedAt && (
            <p className="label text-ink-muted">
              {STATUS_LABEL[registration.status]}{' '}
              {formatAgo(registration.reviewedAt)}
            </p>
          )
        )}
      </div>
    </>
  )
}
