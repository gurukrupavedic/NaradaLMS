'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { TrackLadder } from '@/components/track-ladder'
import { CertificationRecord } from '@/components/certification-record'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { MoveBatchDrawer } from '@/components/admin/move-batch-drawer'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { profileDetailQuery } from '@/lib/query/options'
import { buildCertificationRows, buildLearningTracks } from '@/lib/api/reshape'
import { isCertified } from '@/lib/proficiency'
import { SELF_REPORTED_PROFICIENCY_LABEL } from '@/lib/registration-proficiency'
import { useHasAdminAccess, useSelectedProfileId } from '@/lib/auth/profile-store'
import { useUpdateProfile } from '@/lib/query/use-profile-mutations'
import { formatLocation } from '@/lib/geo'
import { formatTimeZone } from '@/lib/timezone'
import type { ApiProfile } from '@/lib/api/api-types'

const AGREEMENT_LABELS: { key: keyof ApiProfile; label: string }[] = [
  { key: 'dressCodeAgreed', label: 'Dress code' },
  { key: 'noMeatAgreed', label: 'No meat' },
  { key: 'noAlcoholAgreed', label: 'No alcohol' },
  { key: 'noSmokingAgreed', label: 'No smoking' },
]

/**
 * A single student's full record: contact/background detail (copied onto `profile` from their
 * approved registration — see `apps/api/src/registrations/service.ts::provisionApprovedApplicant`)
 * plus the same track/certification/exam-history shape the dashboard already assembles for "self,"
 * reused here for any profile the caller is allowed to view — the student themselves, a teacher
 * sharing a batch with them, or a school admin (`AccessPolicy#requireCanViewProfile`; a 403 from
 * the server renders below via `ScreenError`).
 */
export function StudentProfileScreen({ profileId }: { profileId: string }) {
  const { data, error } = useQuery(profileDetailQuery(profileId))
  const isAdmin = useHasAdminAccess()
  const isSelf = useSelectedProfileId() === profileId
  const [moveOpen, setMoveOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const canEdit = isSelf || isAdmin
  const updating = useUpdateProfile(profileId, isSelf)

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={9} />

  const { profile, dashboard } = data
  const learningTracks = buildLearningTracks(dashboard).sort((a, b) => a.order - b.order)
  const certifications = buildCertificationRows(dashboard)
  const certifiedCount = certifications.filter(c => isCertified(c.level)).length

  // Assumes a profile holds at most one live batch at a time (true of every real profile today —
  // see move-batch-drawer.tsx's own doc comment); `.find` rather than every candidate, since
  // there's nowhere yet for an admin to pick among more than one.
  const movableTrack = learningTracks.find(track => track.batchId !== null && track.batchStatus !== 'completed')

  return (
    <>
      <Standing
        eyebrow="Student profile"
        headline={profile.name}
        meta={[profile.phone, profile.city].filter(Boolean).join(' · ') || 'No contact details on file'}
        stats={[
          { value: String(dashboard.memberships.length), label: 'Batches' },
          { value: `${certifiedCount}/${certifications.length}`, label: 'Certified' },
        ]}
        action={
          canEdit || (isAdmin && movableTrack) ? (
            <div className="flex shrink-0 items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="label border border-ink/25 px-3.5 py-1.5 text-ink transition-colors hover:border-vermilion hover:text-vermilion"
                >
                  Edit profile
                </button>
              )}
              {isAdmin && movableTrack && (
                <button
                  type="button"
                  onClick={() => setMoveOpen(true)}
                  className="label rounded-full bg-vermilion px-3.5 py-1.5 text-paper transition-colors hover:bg-vermilion/90"
                >
                  Change batch
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        <Reveal>
          <Section title="Details">
            <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="px-4 py-4">
                <dt className="label text-ink-muted">Phone</dt>
                <dd className="mt-2 font-mono text-[0.9375rem]">{profile.phone ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">Email</dt>
                <dd className="mt-2 text-[0.9375rem]">{profile.email ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">City</dt>
                <dd className="mt-2 text-[0.9375rem]">{profile.city ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">Location</dt>
                <dd className="mt-2 text-[0.9375rem]">{formatLocation(profile.state, profile.country) ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">Time zone</dt>
                <dd className="mt-2 text-[0.9375rem]">{formatTimeZone(profile.countryTimeZone) ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">Year of birth</dt>
                <dd className="mt-2 text-[0.9375rem]">{profile.yearOfBirth ?? '—'}</dd>
              </div>

              <div className="px-4 py-4">
                <dt className="label text-ink-muted">Goal</dt>
                <dd className="mt-2 text-[0.9375rem] leading-relaxed">{profile.learningGoal ?? '—'}</dd>

                <dt className="label mt-5 text-ink-muted">Self-reported starting point</dt>
                <dd className="mt-2 text-[0.9375rem]">
                  {profile.currentProficiency
                    ? (SELF_REPORTED_PROFICIENCY_LABEL[profile.currentProficiency] ?? profile.currentProficiency)
                    : '—'}
                </dd>

                <dt className="label mt-5 text-ink-muted">Speaks</dt>
                <dd className="mt-2 text-[0.9375rem]">
                  {profile.spokenLanguages.length > 0 ? profile.spokenLanguages.join(', ') : '—'}
                </dd>

                <dt className="label mt-5 text-ink-muted">Reads</dt>
                <dd className="mt-2 text-[0.9375rem]">
                  {profile.readLanguages.length > 0 ? profile.readLanguages.join(', ') : '—'}
                </dd>
              </div>
            </dl>
          </Section>
        </Reveal>

        {(profile.parentNames.length > 0 || profile.comments || AGREEMENT_LABELS.some(({ key }) => profile[key])) && (
          <Reveal delay={40}>
            <Section title="Family & agreements">
              <dl className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="px-4 py-4">
                  <dt className="label text-ink-muted">Parent / guardian</dt>
                  <dd className="mt-2 text-[0.9375rem]">
                    {profile.parentNames.length > 0 ? profile.parentNames.join(', ') : '—'}
                  </dd>

                  <dt className="label mt-5 text-ink-muted">Comments</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed">{profile.comments ?? '—'}</dd>
                </div>

                <div className="px-4 py-4">
                  <dt className="label text-ink-muted">Agreements</dt>
                  <dd className="mt-2 space-y-1.5">
                    {AGREEMENT_LABELS.map(({ key, label }) => (
                      <span key={key} className="flex items-center gap-2 text-[0.875rem]">
                        <span aria-hidden className={profile[key] ? 'text-vermilion' : 'text-ink-muted/40'}>
                          {profile[key] ? '✓' : '–'}
                        </span>
                        {label}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </Section>
          </Reveal>
        )}

        {learningTracks.length > 0 && (
          <Reveal delay={80}>
            <Section title="Learning" count={`${learningTracks.length} tracks`}>
              <div className="space-y-4">
                {learningTracks.map(track => (
                  <TrackLadder key={track.id} track={track} defaultOpen={false} />
                ))}
              </div>
            </Section>
          </Reveal>
        )}

        {certifications.length > 0 && (
          <Reveal delay={120}>
            <Section title="Certification record" count={`${certifiedCount}/${certifications.length} tracks`}>
              <CertificationRecord rows={certifications} />
            </Section>
          </Reveal>
        )}

        {dashboard.upcomingExams.length > 0 && (
          <Reveal delay={160}>
            <Section title="Upcoming exams" count={`${dashboard.upcomingExams.length} booked`}>
              <ol className="sheet">
                {dashboard.upcomingExams.map(exam => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">
                        {exam.track.name}
                      </span>
                      <span className="label mt-0.5 block text-ink-muted">certification exam</span>
                    </span>
                    <span className="shrink-0 font-mono text-[0.75rem] text-ink-muted">
                      <Timestamp variant="dateTime" value={exam.scheduledAt} />
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          </Reveal>
        )}
      </div>

      {movableTrack && movableTrack.batchId && (
        <MoveBatchDrawer
          open={moveOpen}
          onOpenChange={setMoveOpen}
          profileId={profile.id}
          profileName={profile.name}
          fromBatchId={movableTrack.batchId}
          fromBatchCode={movableTrack.batchCode ?? ''}
        />
      )}

      {canEdit && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          updating={updating}
          isSelf={isSelf}
        />
      )}
    </>
  )
}
