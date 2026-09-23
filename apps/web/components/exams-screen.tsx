'use client'

import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Pill } from '@/components/proficiency-pill'
import { CertificationRecord } from '@/components/certification-record'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { examSlotsQuery, examsQuery, myExamSlotRequestsQuery } from '@/lib/query/options'
import { useRequestExamSlot } from '@/lib/query/use-exam-slot-mutations'
import { ExamMarksLine } from '@/components/exam-marks-line'
import { EXAM_MAX_TOTAL, EXAM_OUTCOME_LABEL } from '@/lib/exam-grading'
import { narrowLevel } from '@/lib/api/reshape'
import { isCertified } from '@/lib/proficiency'
import { useSelectedProfileName } from '@/lib/auth/profile-store'
import { Spinner } from '@/components/spinner'
import type { ExamSlotRequestRow, ExamSlotRow } from '@/lib/api/resources'

export function ExamsScreen() {
  const { data, error } = useQuery(examsQuery())
  // Open slots and the reader's own requests against them — kept as their own queries rather than
  // folded into `examsQuery`'s payload, since neither is dashboard data: they're both scoped to
  // this screen alone.
  const { data: openSlots } = useQuery(examSlotsQuery({ status: 'open' }))
  const { data: myRequests } = useQuery(myExamSlotRequestsQuery())
  const profileName = useSelectedProfileName()

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={4} />
  const { certifications, scheduled, past } = data

  // A track with a live claim already can't take a second one (the server's own "one pending
  // request per track" rule) — disabling the button here just saves a guaranteed-to-fail click.
  const pendingTrackIds = new Set(
    (myRequests ?? []).filter(r => r.status === 'pending').map(r => r.trackId),
  )
  // Approved requests already show up above as a booked sitting or, once graded, sitting history —
  // showing them a third time here would be redundant, so this list is only the ones still moving.
  const openRequests = (myRequests ?? []).filter(r => r.status !== 'approved')

  const certified = certifications.filter(c => isCertified(c.level)).length
  const total = certifications.length

  return (
    <>
      <Standing
        eyebrow={`${profileName ?? ''} · certification`}
        headline={
          certified === 0
            ? 'No certifications yet'
            : certified === total
              ? 'Every track certified'
              : `Certified in ${certified} of ${total} tracks`
        }
        meta={`${total - certified} tracks remaining · ${scheduled.length} sitting booked`}
        stats={[
          { value: `${certified}/${total}`, label: 'Certified' },
          { value: String(past.length), label: 'Sittings' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {/* The `exam` table tracks booked sittings and is separate from the
            certification marks below. It is routinely empty, so the section is
            omitted entirely rather than rendered as a "nothing here" panel. */}
        {scheduled.length > 0 && (
          <Reveal>
            <Section title="Booked" count={`${scheduled.length} sitting`}>
              <ol className="sheet">
                {scheduled.map(sitting => (
                  <li
                    key={sitting.id}
                    className="flex items-center gap-4 border-l-2 border-vermilion px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">
                        {sitting.track}
                      </span>
                      <span className="label mt-0.5 block text-ink-muted">certification exam</span>
                    </span>
                    <span className="shrink-0 font-mono text-[0.75rem] text-ink-muted">
                      <Timestamp variant="dateTime" value={sitting.when} />
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          </Reveal>
        )}

        {openRequests.length > 0 && (
          <Reveal delay={40}>
            <Section title="My requests" count={`${openRequests.length}`}>
              <ol className="sheet">
                {openRequests.map(request => (
                  <MyRequestRow key={request.id} request={request} />
                ))}
              </ol>
            </Section>
          </Reveal>
        )}

        {/* Routinely empty — a school only has open slots when an admin has actually opened one,
            so (like "Booked" above) this is omitted rather than shown as "nothing here". */}
        {!!openSlots?.length && (
          <Reveal delay={80}>
            <Section title="Available sittings" count={`${openSlots.length}`}>
              <ol className="sheet">
                {openSlots.map(slot => (
                  <AvailableSlotRow
                    key={slot.id}
                    slot={slot}
                    alreadyRequested={pendingTrackIds.has(slot.trackId)}
                  />
                ))}
              </ol>
            </Section>
          </Reveal>
        )}

        <Reveal delay={120}>
          <Section title="Certification record" count={`${certified}/${total} tracks`}>
            <CertificationRecord rows={certifications} />
          </Section>
        </Reveal>

        {past.length > 0 && (
          <Reveal delay={160}>
            <Section title="Sitting history" count={`${past.length} sittings`}>
              <ol className="sheet">
                {past.map(sitting => {
                  const result = sitting.result!
                  return (
                    <li
                      key={sitting.id}
                      className="flex items-start gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem]">
                          {sitting.track} · {EXAM_OUTCOME_LABEL[result.outcome]}
                        </span>
                        <span className="label mt-1 block text-ink-muted">
                          <Timestamp variant="dateTime" value={sitting.when} /> · {result.total} /{' '}
                          {EXAM_MAX_TOTAL}
                        </span>
                        <ExamMarksLine result={result} />
                        {/* An examiner's note is the most valuable thing on this
                            page and used to be set at the same weight as the
                            metadata around it. */}
                        {result.notes && (
                          <span className="mt-2.5 block border-l border-rule py-0.5 pl-3 text-[0.8125rem] leading-relaxed text-ink-muted italic">
                            {result.notes}
                          </span>
                        )}
                      </span>
                      {result.level ? (
                        <Pill level={narrowLevel(result.level)} className="mt-1 shrink-0" />
                      ) : (
                        <span className="label mt-1 shrink-0 text-vermilion">reappear</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </Section>
          </Reveal>
        )}
      </div>
    </>
  )
}

const REQUEST_STATUS_LABEL: Record<'pending' | 'rejected', string> = {
  pending: 'Awaiting review',
  rejected: 'Not approved',
}

function MyRequestRow({ request }: { request: ExamSlotRequestRow }) {
  return (
    <li className="flex items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem]">{request.track}</span>
        <span className="label mt-0.5 block text-ink-muted">
          <Timestamp variant="dateTime" value={request.when} />
        </span>
      </span>
      <span
        className={`label shrink-0 ${request.status === 'pending' ? 'text-vermilion' : 'text-ink-muted'}`}
      >
        {REQUEST_STATUS_LABEL[request.status as 'pending' | 'rejected']}
      </span>
    </li>
  )
}

function AvailableSlotRow({ slot, alreadyRequested }: { slot: ExamSlotRow; alreadyRequested: boolean }) {
  const request = useRequestExamSlot()

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem]">{slot.track}</span>
        <span className="label mt-0.5 block text-ink-muted">
          <Timestamp variant="dateTime" value={slot.when} />
        </span>
      </span>
      <button
        type="button"
        disabled={request.isPending || alreadyRequested}
        aria-busy={request.isPending}
        onClick={() => request.mutate(slot.id)}
        className="label inline-flex shrink-0 items-center gap-2 border border-ink/25 px-3 py-1.5 text-ink transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
      >
        {request.isPending && <Spinner />}
        {alreadyRequested ? 'Requested' : 'Request'}
      </button>
    </li>
  )
}
