'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Pill } from '@/components/proficiency-pill'
import { CertificationRecord } from '@/components/certification-record'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { examEligibilityQuery, examSlotsQuery, examsQuery, myExamSlotRequestsQuery } from '@/lib/query/options'
import { useRequestExamSlot } from '@/lib/query/use-exam-slot-mutations'
import { ExamMarksLine } from '@/components/exam-marks-line'
import { EXAM_MAX_TOTAL, EXAM_OUTCOME_LABEL } from '@/lib/exam-grading'
import { narrowLevel } from '@/lib/api/reshape'
import { isCertified } from '@/lib/proficiency'
import { useSelectedProfileName } from '@/lib/auth/profile-store'
import { Spinner } from '@/components/spinner'
import type { ExamSlotRequestRow, ExamSlotRow } from '@/lib/api/resources'
import { pluralize } from '@/lib/pluralize'

export function ExamsScreen() {
  const { data, error } = useQuery(examsQuery())
  // Open slots and the reader's own requests against them — kept as their own queries rather than
  // folded into `examsQuery`'s payload, since neither is dashboard data: they're both scoped to
  // this screen alone.
  const { data: openSlots } = useQuery(examSlotsQuery({ status: 'open' }))
  const { data: myRequests } = useQuery(myExamSlotRequestsQuery())
  // Which tracks the reader may request right now (L3+ on every chapter). Only a pre-check — the
  // server enforces the same rule — so a failed fetch just leaves the buttons disabled, never wrong.
  const { data: eligibleTrackIds } = useQuery(examEligibilityQuery())
  const profileName = useSelectedProfileName()

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={4} />
  const { certifications, scheduled, past } = data

  // A student can hold only one live request at a time (the server's own "one pending request per
  // student" rule) — disabling the buttons here just saves a guaranteed-to-fail click.
  const hasPendingRequest = (myRequests ?? []).some(r => r.status === 'pending')
  // The tracks the reader may sit right now, named from their certification rows. A slot is generic,
  // so they choose among these when requesting.
  const eligibleTracks = eligibleTrackIds
    ? certifications
        .filter(c => eligibleTrackIds.includes(c.trackId))
        .map(c => ({ id: c.trackId, name: c.track }))
    : undefined
  // Approved requests already show up above as a booked sitting or, once graded, exam feedback —
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
              : `Certified in ${certified} of ${pluralize(total, 'track')}`
        }
        meta={`${pluralize(total - certified, 'track')} remaining · ${pluralize(scheduled.length, 'attempt')} booked`}
        stats={[
          { value: `${certified}/${total}`, label: 'Certified' },
          { value: String(past.length), label: 'Attempts' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {/* The `exam` table tracks booked sittings and is separate from the
            certification marks below. It is routinely empty, so the section is
            omitted entirely rather than rendered as a "nothing here" panel. */}
        {scheduled.length > 0 && (
          <Reveal>
            <Section title="Booked" count={pluralize(scheduled.length, 'attempt')}>
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
            <Section title="Available attempts" count={`${openSlots.length}`}>
              <ol className="sheet">
                {openSlots.map(slot => (
                  <AvailableSlotRow
                    key={slot.id}
                    slot={slot}
                    hasPendingRequest={hasPendingRequest}
                    eligibleTracks={eligibleTracks}
                  />
                ))}
              </ol>
            </Section>
          </Reveal>
        )}

        <Reveal delay={120}>
          <Section title="Certification record" count={`${certified}/${pluralize(total, 'track')}`}>
            <CertificationRecord rows={certifications} />
          </Section>
        </Reveal>

        {past.length > 0 && (
          <Reveal delay={160}>
            <Section title="Exam feedback" count={pluralize(past.length, 'attempt')}>
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

// `eligibleTracks` is undefined while the pre-check is still loading — the button stays disabled
// rather than flashing enabled and then locking.
function AvailableSlotRow({
  slot,
  hasPendingRequest,
  eligibleTracks,
}: {
  slot: ExamSlotRow
  hasPendingRequest: boolean
  eligibleTracks: { id: string; name: string }[] | undefined
}) {
  const request = useRequestExamSlot()
  const [chosenTrackId, setChosenTrackId] = useState('')
  const trackId = chosenTrackId || eligibleTracks?.[0]?.id || ''
  const blocked = eligibleTracks?.length === 0 && !hasPendingRequest

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">
          <Timestamp variant="dateTime" value={slot.when} />
        </span>
        {blocked && (
          <span className="mt-1 block text-[0.75rem] text-ink-muted">
            Needs L3 on every chapter of a track.
          </span>
        )}
      </span>
      {eligibleTracks && eligibleTracks.length > 1 && (
        <select
          aria-label="Track to sit"
          value={trackId}
          disabled={request.isPending || hasPendingRequest}
          onChange={e => setChosenTrackId(e.target.value)}
          className="shrink-0 border-b border-ink/25 bg-transparent py-1 text-[0.875rem] focus:border-vermilion focus:outline-none disabled:opacity-50"
        >
          {eligibleTracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      )}
      {eligibleTracks?.length === 1 && (
        <span className="label shrink-0 text-ink-muted">{eligibleTracks[0]!.name}</span>
      )}
      <button
        type="button"
        disabled={request.isPending || hasPendingRequest || !trackId}
        aria-busy={request.isPending}
        onClick={() => request.mutate({ slotId: slot.id, trackId })}
        className="label inline-flex shrink-0 items-center gap-2 border border-ink/25 px-3 py-1.5 text-ink transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
      >
        {request.isPending && <Spinner />}
        {hasPendingRequest ? 'Request pending' : blocked ? 'Not yet eligible' : 'Request'}
      </button>
    </li>
  )
}
