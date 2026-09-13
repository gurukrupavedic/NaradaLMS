'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { PillKey } from '@/components/proficiency-pill'
import { MarkBook } from '@/components/mark-book'
import { Notice } from '@/components/notice'
import { ApiError } from '@/lib/api/client'
import { isBatchOpenForEnrollment } from '@/lib/api/resources'
import { adminBatchQuery, catalogTrackQuery, keys } from '@/lib/query/options'
import { usePrefetch } from '@/lib/query/use-prefetch'
import { useCloseBatchEnrollment, useOpenBatchEnrollment } from '@/lib/query/use-batch-mutations'
import { useSetEvaluation } from '@/lib/query/use-evaluation-mutations'
import { summariseRoster, type AdminBatchDetail } from '@/lib/mock-dashboard'

const STATUS_LABEL = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed' } as const

/**
 * Batch detail.
 *
 * The admin list answers "which batches exist"; this answers the questions that
 * actually come up about one of them — who is teaching it, when does it meet,
 * can a student get in, and who is falling behind.
 */
export function BatchDetail({ code }: { code: string }) {
  const { data: batch, error } = useQuery(adminBatchQuery(code))

  // The view's hover-prefetch hook needs `batch.trackId`, so the loading branch
  // has to sit above it — hence the container/view split rather than an early
  // return that would break the rules of hooks.
  if (error) return <ScreenError error={error} backHref="/admin" backLabel="← All batches" />
  if (!batch) return <ScreenSkeleton rows={10} />

  return <BatchDetailView batch={batch} />
}

function BatchDetailView({ batch }: { batch: AdminBatchDetail }) {
  const summary = summariseRoster(batch.roster)
  const catalogPrefetch = usePrefetch(catalogTrackQuery(batch.trackId))

  const gaps = [
    batch.classSlots.length === 0 && 'no schedule set',
    batch.meetingUrl === null && 'no join link',
    batch.staffRoster.length === 0 && 'no teacher assigned',
  ].filter(Boolean) as string[]

  return (
    <>
      <Standing
        eyebrow={`Administration · ${STATUS_LABEL[batch.status]}`}
        headline={batch.code}
        meta={`${batch.track} · ${batch.roster.length} enrolled${batch.startDate ? ` · began ${batch.startDate}` : ''}`}
        stats={[
          { value: String(batch.roster.length), label: 'Roll' },
          { value: `${Math.round(summary.progress)}%`, label: 'Progress' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-11 px-5 py-9">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/admin" className="label text-ink-muted transition-colors hover:text-ink">
            ← All batches
          </Link>
          {/* Points at the admin catalog, not `/tracks/[id]`. That route is the
              *reader's* own record — their marks, their next chapter, published
              chapters only — so sending an admin there showed them their
              personal progress in a track they may not even study, instead of
              the syllabus they came to inspect. */}
          <Link
            href={`/admin/tracks/${batch.trackId}`}
            {...catalogPrefetch}
            className="label text-ink-muted transition-colors hover:text-vermilion"
          >
            Edit {batch.track} catalog →
          </Link>
        </div>

        {/* On a single batch a setup gap IS the exception, so here it is stated
            per batch — unlike the list view, where every active batch shared the
            same gap and flagging all 43 rows said nothing. */}
        {gaps.length > 0 && batch.status !== 'completed' && (
          <Notice
            items={[
              {
                label: 'Incomplete',
                body: `This batch has ${gaps.join(', ')}. Students see no way to attend.`,
              },
            ]}
          />
        )}

        <Section title="Details">
          <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Meets</dt>
              <dd className="mt-2 space-y-1.5">
                {batch.classSlots.length === 0 ? (
                  <span className="text-[0.875rem] text-ink-muted/70">No schedule set</span>
                ) : (
                  batch.classSlots.map(slot => (
                    <span key={slot.day} className="block text-[0.9375rem]">
                      {slot.day}
                      <span className="text-ink-muted">
                        {' · '}
                        {slot.time} · {slot.durationMinutes} min
                      </span>
                    </span>
                  ))
                )}
              </dd>

              <dt className="label mt-5 text-ink-muted">Join link</dt>
              <dd className="mt-2">
                {batch.meetingUrl ? (
                  <a
                    href={batch.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.875rem] text-ink underline decoration-vermilion decoration-1 underline-offset-4 transition-colors hover:text-vermilion"
                  >
                    {batch.meetingUrl.replace('https://', '')} ↗
                  </a>
                ) : (
                  <span className="text-[0.875rem] text-ink-muted/70">Not set</span>
                )}
              </dd>
            </div>

            <div className="px-4 py-4">
              <dt className="label text-ink-muted">Teaching staff</dt>
              <dd className="mt-2 space-y-1.5">
                {batch.staffRoster.length === 0 ? (
                  <span className="text-[0.875rem] text-ink-muted/70">Nobody assigned</span>
                ) : (
                  batch.staffRoster.map(member => (
                    <span key={member.name} className="flex items-baseline gap-2.5">
                      <span className="text-[0.9375rem]">{member.name}</span>
                      <span className="label text-ink-muted">
                        {member.role === 'instructor' ? 'Teacher' : 'TA'}
                      </span>
                    </span>
                  ))
                )}
              </dd>

              <dt className="label mt-5 text-ink-muted">Standing</dt>
              <dd className="mt-2 text-[0.9375rem]">
                {Math.round(summary.progress)}% started
                <span className="text-ink-muted">
                  {' · '}
                  {Math.round(summary.masteredProgress)}% mastered
                </span>
                {summary.unmarked > 0 && (
                  <span className="label mt-1.5 block text-vermilion">
                    {summary.unmarked} students not yet marked
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </Section>

        <EnrollmentSection batch={batch} />

        <RosterSection batch={batch} />
      </div>
    </>
  )
}

/**
 * The roster mark book, plus its grade editor (components/grade-dialog.tsx) — a school admin can
 * grade any batch's roster here, not just one they personally teach
 * (AccessPolicy.requireCanCreateEvaluation).
 */
function RosterSection({ batch }: { batch: AdminBatchDetail }) {
  const setLevel = useSetEvaluation(batch.id, keys.batches.detail(batch.code))

  return (
    <Section title="Roster" count={`${batch.roster.length} enrolled · ${batch.chapterCodes.length} chapters`}>
      {batch.roster.length === 0 ? (
        <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
          Nobody is enrolled in this batch yet.
        </p>
      ) : (
        <>
          <PillKey />
          <div className="sheet">
            <MarkBook
              chapterCodes={batch.chapterCodes}
              chapterIds={batch.chapterIds}
              chapterTitles={batch.chapterTitles}
              students={batch.roster}
              grading={setLevel}
            />
          </div>
        </>
      )}
    </Section>
  )
}

/**
 * The one place an admin opens a batch to self-enrollment (components/open-batch-picker.tsx is
 * the student-facing result). A single "Open"/"Close" toggle rather than a pair of datetime-local
 * inputs — an admin doesn't think in opens-at/closes-at timestamps, only "can students join right
 * now or not," so that's the one thing this control asks (see
 * `use-batch-mutations.ts::useOpenBatchEnrollment`/`useCloseBatchEnrollment`, which resolve it to
 * the actual columns server-side). No capacity control here — every batch gets the same hard cap
 * at creation (`DEFAULT_BATCH_CAPACITY`, apps/api/src/batches/schema.ts) until per-batch capacity
 * comes back.
 */
function EnrollmentSection({ batch }: { batch: AdminBatchDetail }) {
  const isOpenNow = isBatchOpenForEnrollment(batch)
  const open = useOpenBatchEnrollment(batch.code, batch.id)
  const close = useCloseBatchEnrollment(batch.code, batch.id)
  const toggle = isOpenNow ? close : open

  return (
    <Section title="Enrollment" count={isOpenNow ? 'Open now' : 'Closed'}>
      <div className="sheet flex flex-wrap items-center gap-4 px-4 py-4">
        <button
          type="button"
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          className={cn(
            'label px-4 py-2 transition-opacity disabled:opacity-50',
            isOpenNow ? 'border border-ink/25 text-ink' : 'bg-ink text-paper',
          )}
        >
          {toggle.isPending ? 'Saving…' : isOpenNow ? 'Close enrollment' : 'Open enrollment'}
        </button>
        <span className="text-[0.875rem] text-ink-muted">
          {isOpenNow
            ? 'Students can self-enroll in this batch right now.'
            : 'Students cannot self-enroll in this batch.'}
        </span>
        {toggle.isError && (
          <p className="w-full text-[0.8125rem] text-vermilion">
            {toggle.error instanceof ApiError ? toggle.error.message : 'Something went wrong.'}
          </p>
        )}
      </div>
    </Section>
  )
}
