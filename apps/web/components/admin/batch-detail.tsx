'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { PillKey } from '@/components/proficiency-pill'
import { MarkBook } from '@/components/mark-book'
import { Notice } from '@/components/notice'
import { ApiError } from '@/lib/api/client'
import { isBatchOpenForEnrollment } from '@/lib/api/resources'
import { adminBatchQuery, catalogTrackQuery } from '@/lib/query/options'
import { usePrefetch } from '@/lib/query/use-prefetch'
import { useUpdateBatchEnrollmentWindow } from '@/lib/query/use-batch-mutations'
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

        <Section
          title="Roster"
          count={`${batch.roster.length} enrolled · ${batch.chapterCodes.length} chapters`}
        >
          {batch.roster.length === 0 ? (
            <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
              Nobody is enrolled in this batch yet.
            </p>
          ) : (
            <>
              <PillKey />
              <div className="sheet">
                <MarkBook chapterCodes={batch.chapterCodes} students={batch.roster} />
              </div>
            </>
          )}
        </Section>
      </div>
    </>
  )
}

/** A UTC ISO instant, formatted for `<input type="datetime-local">` in the *browser's* local time
 * zone (that input has no time-zone concept of its own — it always means "local"). */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * The one place an admin opens a batch to self-enrollment (components/open-batch-picker.tsx is
 * the student-facing result). No dedicated "edit batch" screen exists yet for any other field
 * either, so this is a small always-editable form on the detail page rather than a toggled edit
 * mode — there's nothing to toggle away from.
 */
function EnrollmentSection({ batch }: { batch: AdminBatchDetail }) {
  const update = useUpdateBatchEnrollmentWindow(batch.code, batch.id)
  const [opensAt, setOpensAt] = useState(() => toLocalInputValue(batch.enrollmentOpensAt))
  const [closesAt, setClosesAt] = useState(() => toLocalInputValue(batch.enrollmentClosesAt))
  const [capacity, setCapacity] = useState(() => (batch.capacity !== null ? String(batch.capacity) : ''))

  const isOpenNow = isBatchOpenForEnrollment(batch)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({
      enrollmentOpensAt: opensAt ? new Date(opensAt).toISOString() : null,
      enrollmentClosesAt: closesAt ? new Date(closesAt).toISOString() : null,
      capacity: capacity.trim() ? Number(capacity) : null,
    })
  }

  return (
    <Section title="Enrollment" count={isOpenNow ? 'Open now' : undefined}>
      <form onSubmit={handleSubmit} className="sheet grid grid-cols-1 gap-5 px-4 py-4 sm:grid-cols-3">
        <label className="block">
          <span className="label block text-ink-muted">Opens</span>
          <input
            type="datetime-local"
            value={opensAt}
            onChange={e => setOpensAt(e.target.value)}
            className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label block text-ink-muted">Closes</span>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={e => setClosesAt(e.target.value)}
            className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label block text-ink-muted">Capacity</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            placeholder="Unlimited"
            className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="label bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          {update.isError && (
            <p className="text-[0.8125rem] text-vermilion">
              {update.error instanceof ApiError ? update.error.message : 'Something went wrong.'}
            </p>
          )}
          {update.isSuccess && <p className="label text-ink-muted">Saved</p>}
        </div>
      </form>
    </Section>
  )
}
