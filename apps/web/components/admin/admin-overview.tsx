'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Archive, Section } from '@/components/section'
import { BatchTable, FilterableBatchTable } from '@/components/batch-table'
import { Notice } from '@/components/notice'
import {
  adminBatchesQuery,
  adminSittingsQuery,
  catalogTrackQuery,
  catalogTracksQuery,
  enrollmentRequestsQuery,
  examSlotRequestsQuery,
  registrationsQuery,
} from '@/lib/query/options'
import { summariseTrack, type CatalogTrack } from '@/lib/models/catalog'
import { usePrefetch } from '@/lib/query/use-prefetch'
import { useSelectedProfileName } from '@/lib/auth/profile-store'
import { useCoursePath } from '@/lib/course'
import { pluralize } from '@/lib/pluralize'

export function AdminOverview() {
  const cp = useCoursePath()
  // Two independent queries rather than one combined endpoint: batches and the
  // content catalog change on completely different cadences, and separating
  // them lets the catalog keep its 10-minute staleTime instead of being
  // refetched every time a batch is touched.
  const { data: batches, error: batchesError } = useQuery(adminBatchesQuery())
  const { data: tracks, error: tracksError } = useQuery(catalogTracksQuery())
  // Pending counts only — the review screen itself (components/admin/admin-registrations-screen.tsx)
  // owns the full pending/approved/rejected lists for both. A failed fetch here just hides the
  // section's count rather than blocking the whole overview the way batches/tracks failing does.
  const { data: pendingRegistrations } = useQuery(registrationsQuery('pending'))
  const { data: pendingEnrollmentRequests } = useQuery(enrollmentRequestsQuery('pending'))
  // Same count-only treatment: the grading screen (components/admin/admin-exams-screen.tsx) owns the list.
  const { data: sittings } = useQuery(adminSittingsQuery())
  const { data: pendingSlotRequests } = useQuery(examSlotRequestsQuery('pending'))
  const profileName = useSelectedProfileName()

  // No hooks below this point, so the early return is safe.
  if (batchesError || tracksError) return <ScreenError error={batchesError ?? tracksError} />
  if (!batches || !tracks) return <ScreenSkeleton rows={6} />

  const missingLink = batches.active.filter(b => !b.hasMeetingUrl).length
  const missingSchedule = batches.active.filter(b => !b.hasSchedule).length

  return (
    <>
      <Standing
        eyebrow={`${profileName ?? ''} · administration`}
        headline={pluralize(batches.summary.active, 'active batch', 'active batches')}
        meta={`${batches.summary.total} total · ${pluralize(batches.summary.students, 'student')} · ${pluralize(batches.summary.tracks, 'track')}`}
        stats={[
          { value: String(batches.summary.active), label: 'Active' },
          { value: String(batches.summary.students), label: 'Students' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {(missingLink > 0 || missingSchedule > 0) && (
          <Notice
            items={[
              {
                label: 'Setup',
                body: `${missingSchedule} active batches have no schedule and ${missingLink} have no join link — students see neither a time nor a way in.`,
              },
            ]}
          />
        )}

        <Section
          title="Registrations"
          count={`${(pendingRegistrations?.length ?? 0) + (pendingEnrollmentRequests?.length ?? 0)} pending`}
        >
          <ol className="sheet">
            <li className="border-b border-rule-soft last:border-0">
              <Link
                href={cp('/admin/registrations')}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span className="text-[0.9375rem]">Review applications</span>
                {(pendingRegistrations?.length ?? 0) > 0 ? (
                  <span className="label text-vermilion">{pendingRegistrations!.length} awaiting review →</span>
                ) : (
                  <span className="label text-ink-muted">Nothing pending →</span>
                )}
              </Link>
            </li>
            <li className="border-b border-rule-soft last:border-0">
              <Link
                href={cp('/admin/registrations?view=batchRequests')}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span className="text-[0.9375rem]">Review batch requests</span>
                {(pendingEnrollmentRequests?.length ?? 0) > 0 ? (
                  <span className="label text-vermilion">
                    {pendingEnrollmentRequests!.length} awaiting review →
                  </span>
                ) : (
                  <span className="label text-ink-muted">Nothing pending →</span>
                )}
              </Link>
            </li>
          </ol>
        </Section>

        <Section title="Exams" count={`${sittings?.awaiting.length ?? 0} awaiting`}>
          <ol className="sheet">
            <li className="border-b border-rule-soft last:border-0">
              <Link
                href={cp('/admin/exams')}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span className="text-[0.9375rem]">Grade certification exams</span>
                {(sittings?.awaiting.length ?? 0) > 0 ? (
                  <span className="label text-vermilion">{sittings!.awaiting.length} awaiting a result →</span>
                ) : (
                  <span className="label text-ink-muted">Nothing awaiting →</span>
                )}
              </Link>
            </li>
            <li className="border-b border-rule-soft last:border-0">
              <Link
                href={cp('/admin/exam-slots?view=requests')}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span className="text-[0.9375rem]">Review attempt requests</span>
                {(pendingSlotRequests?.length ?? 0) > 0 ? (
                  <span className="label text-vermilion">{pendingSlotRequests!.length} awaiting review →</span>
                ) : (
                  <span className="label text-ink-muted">Nothing pending →</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href={cp('/admin/exam-slots')}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span className="text-[0.9375rem]">Open an attempt slot</span>
                <span className="label text-ink-muted">→</span>
              </Link>
            </li>
          </ol>
        </Section>

        <Section
          title="Active"
          count={pluralize(batches.active.length, 'batch', 'batches')}
          action={
            <Link
              href={cp('/admin/batches/new')}
              className="label ml-auto shrink-0 rounded-full bg-vermilion px-3.5 py-1.5 text-paper transition-colors hover:bg-vermilion/90"
            >
              + New batch
            </Link>
          }
        >
          <FilterableBatchTable rows={batches.active} />
        </Section>

        {batches.upcoming.length > 0 && (
          <Section title="Upcoming" count={pluralize(batches.upcoming.length, 'batch', 'batches')}>
            <BatchTable rows={batches.upcoming} />
          </Section>
        )}

        {/* Content lives beside the batches that teach it. Without this the
            catalog is only reachable by opening a batch first, which is a
            strange way in when the thing you want to edit is the syllabus. */}
        <Section title="Content" count={pluralize(tracks.length, 'track')}>
          <ol className="sheet">
            {tracks.map(track => (
              <CatalogRow key={track.id} track={track} />
            ))}
          </ol>
        </Section>

        <Archive label={pluralize(batches.archived.length, 'completed batch', 'completed batches')}>
          <BatchTable rows={batches.archived} />
        </Archive>
      </div>
    </>
  )
}

function CatalogRow({ track }: { track: CatalogTrack }) {
  const cp = useCoursePath()
  const summary = summariseTrack(track)
  // Warm the catalog on hover — the gap before the click is almost exactly the
  // latency of the request it triggers.
  const prefetch = usePrefetch(catalogTrackQuery(track.id))

  return (
    <li className="border-b border-rule-soft last:border-0">
      <Link
        href={cp(`/admin/tracks/${track.id}`)}
        {...prefetch}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-ink/[0.03]"
      >
        {/* Order, not the name again — a real track has only the one name, and repeating it in
            both columns read as a rendering bug rather than a second field with nothing in it. */}
        <span className="w-20 shrink-0 font-mono text-[0.75rem] text-ink-muted">
          {String(track.order).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
          {track.subtitle ?? track.name}
        </span>
        {summary.publishedButEmpty > 0 && (
          <span className="label shrink-0 text-vermilion">{summary.publishedButEmpty} empty</span>
        )}
        <span className="label shrink-0 text-ink-muted">
          {summary.drafts > 0 && `${summary.drafts} draft · `}
          {summary.ready}/{summary.total} ready
        </span>
      </Link>
    </li>
  )
}
