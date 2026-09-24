'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { MarkBook } from '@/components/mark-book'
import { AddStudentDrawer } from '@/components/admin/add-student-drawer'
import { Notice } from '@/components/notice'
import { adminBatchQuery, catalogTrackQuery, keys } from '@/lib/query/options'
import { usePrefetch } from '@/lib/query/use-prefetch'
import { useSetEvaluation, useSetEvaluations } from '@/lib/query/use-evaluation-mutations'
import { useSetOnBreak } from '@/lib/query/use-enrollment-mutations'
import { summariseRoster, type AdminBatchDetail } from '@/lib/models/dashboard'
import { useCoursePath } from '@/lib/course'
import { pluralize } from '@/lib/pluralize'

const STATUS_LABEL = { upcoming: 'Upcoming', active: 'Active', completed: 'Closed' } as const

/**
 * Batch detail.
 *
 * The admin list answers "which batches exist"; this answers the questions that
 * actually come up about one of them — who is teaching it, when does it meet,
 * can a student get in, and who is falling behind.
 */
export function BatchDetail({ code }: { code: string }) {
  const cp = useCoursePath()
  const { data: batch, error } = useQuery(adminBatchQuery(code))

  // The view's hover-prefetch hook needs `batch.trackId`, so the loading branch
  // has to sit above it — hence the container/view split rather than an early
  // return that would break the rules of hooks.
  if (error) return <ScreenError error={error} backHref={cp('/admin')} backLabel="← All batches" />
  if (!batch) return <ScreenSkeleton rows={10} />

  return <BatchDetailView batch={batch} />
}

function BatchDetailView({ batch }: { batch: AdminBatchDetail }) {
  const cp = useCoursePath()
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
          <Link
            href={cp('/admin')}
            className="label text-ink-muted transition-colors hover:text-ink"
          >
            ← All batches
          </Link>
          {/* Points at the admin catalog, not `/tracks/[id]`. That route is the
              *reader's* own record — their marks, their next chapter, published
              chapters only — so sending an admin there showed them their
              personal progress in a track they may not even study, instead of
              the syllabus they came to inspect. */}
          <Link
            href={cp(`/admin/tracks/${batch.trackId}`)}
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
                    {pluralize(summary.unmarked, 'student')} not yet marked
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </Section>

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
  const promote = useSetEvaluations(batch.id, keys.batches.detail(batch.code))
  const onBreak = useSetOnBreak(batch.id, keys.batches.detail(batch.code))
  const [addOpen, setAddOpen] = useState(false)

  return (
    <Section title="Roster" count={`${batch.roster.length} enrolled · ${pluralize(batch.chapterCodes.length, 'chapter')}`}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add to roster"
          className="label shrink-0 rounded-full bg-vermilion px-3.5 py-1.5 text-paper transition-colors hover:bg-vermilion/90"
        >
          + Add
        </button>
      </div>

      {batch.roster.length === 0 ? (
        <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
          Nobody is enrolled in this batch yet.
        </p>
      ) : (
        <div className="sheet">
          <MarkBook
            chapterCodes={batch.chapterCodes}
            chapterIds={batch.chapterIds}
            chapterTitles={batch.chapterTitles}
            students={batch.roster}
            grading={setLevel}
            promote={promote}
            onBreak={onBreak}
          />
        </div>
      )}

      <AddStudentDrawer batch={batch} open={addOpen} onOpenChange={setAddOpen} />
    </Section>
  )
}
