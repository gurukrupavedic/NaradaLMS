'use client'

import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { TrackLadder } from '@/components/track-ladder'
import { Reveal } from '@/components/reveal'
import { dashboardQuery } from '@/lib/query/options'
import { pluralize } from '@/lib/pluralize'

/**
 * Every track the student has actually started, each expandable to its chapters — split out of
 * `DashboardScreen` so "what's my status" and "let me find any chapter and practice it" have their
 * own pages, and reachable from the nav so the practice room's back-link has an honest destination.
 * Same collapsible `TrackLadder` as the dashboard, with in-progress tracks listed ahead of
 * completed ones and the focus track opened. A track with nothing started isn't something to
 * practice, it's future curriculum, so it's filtered out below — the dashboard's ladder still
 * shows it, because "everything assigned" is the right picture there.
 *
 * Same `dashboardQuery()` as `DashboardScreen` — same cache entry, so switching between Dashboard
 * and Practice never re-fetches.
 */
export function PracticeScreen() {
  const { data, error } = useQuery(dashboardQuery())

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={9} />

  const { firstName, learningTracks, archivedLearningTracks, resumeChapterId } = data
  const focus = learningTracks[0]
  // `learningTracks` is "not yet archived," not "in progress" — it also holds every track the
  // student hasn't touched at all (0 chapters started, no batch). Those are future curriculum,
  // not something to practice yet, so this page — unlike the dashboard's own ladder, which still
  // shows them — leaves them off entirely.
  const inProgressTracks = learningTracks.filter(track => track.started > 0)
  // One list, in-progress tracks first so a student's live work is at the top instead of below
  // their finished tracks, each half sorted by the syllabus's own real numbering rather than
  // `learningTracks`'s own order (which `fetchDashboard` sorts by "focus"). Sorting each half
  // separately, not the concatenation, is what keeps "in progress first" intact.
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order
  const allTracks = [
    ...[...inProgressTracks].sort(byOrder),
    ...[...archivedLearningTracks].sort(byOrder),
  ]

  return (
    <>
      <Standing
        eyebrow={`${firstName} · practice`}
        headline="Every track, every chapter"
        meta={
          inProgressTracks.length > 0
            ? `${pluralize(inProgressTracks.length, 'track')} in progress`
            : 'Nothing in progress yet.'
        }
        stats={[
          { value: String(inProgressTracks.length), label: 'In progress' },
          { value: String(archivedLearningTracks.length), label: 'Completed' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-10 px-5 py-9">
        <Reveal>
          <Section title="Your practice" count={pluralize(allTracks.length, 'track')}>
            {allTracks.length === 0 ? (
              // Every chapter here needs a real mark to open into (see `ChapterLine`'s own
              // comment) — a track with nothing evaluated yet has nothing this page can link to,
              // so an empty list here is correct, not broken. Say why, rather than leaving the
              // section looking like it failed to load.
              <p className="max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
                Nothing to practice yet. A chapter opens here once your teacher has marked it at
                least once in class — check the Dashboard for what&apos;s assigned.
              </p>
            ) : (
              <div className="space-y-4">
                {allTracks.map(track => (
                  <TrackLadder
                    key={track.id}
                    track={track}
                    resumeChapterId={track.id === focus?.id ? resumeChapterId : null}
                    defaultOpen={track.id === focus?.id}
                  />
                ))}
              </div>
            )}
          </Section>
        </Reveal>
      </div>
    </>
  )
}
