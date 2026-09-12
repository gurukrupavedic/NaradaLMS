'use client'

import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { TrackChapterList } from '@/components/track-chapter-list'
import { Reveal } from '@/components/reveal'
import { dashboardQuery } from '@/lib/query/options'

/**
 * Every chapter of every track the student has actually started, laid flat — split out of
 * `DashboardScreen` (which used to carry this section as "Your practice") so the two questions
 * "what's my status" and "let me find any chapter and practice it" have their own pages. Before
 * the split, the practice room's own back-link had nowhere honest to point: `/tracks/[trackId]`
 * (a single-track page reachable only from a click buried inside a ladder, never from the nav)
 * was the only candidate, and landing there via back-navigation read as a dead end with no way
 * back in deliberately — see the git history around this file for the fuller account. This page
 * *is* that honest destination now: reachable from the nav, always, with nothing to expand first
 * — `TrackChapterList` (`components/track-chapter-list.tsx`), not the collapsible `TrackLadder`
 * `DashboardScreen` still uses, on purpose: finding a chapter fast is the whole point of this
 * page, so nothing here should stand between landing on it and seeing every chapter there is *to
 * practice*. That last part is deliberate too: a track with nothing started isn't something to
 * find and practice, it's future curriculum, so it's filtered out below — the dashboard's own
 * ladder still shows it, because "everything assigned" is the right picture there.
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
  // One list, completed tracks first, each half sorted by the syllabus's own real numbering
  // rather than `learningTracks`'s own order (which `fetchDashboard` sorts by "focus" — active
  // batch, then progress — right for the dashboard's "what's next" framing, wrong here). Sorting
  // each half separately rather than sorting the concatenation as one list is what keeps
  // "completed first" itself intact — a single sort by `order` alone would interleave a
  // low-numbered in-progress track ahead of a high-numbered completed one.
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order
  const allTracks = [
    ...[...archivedLearningTracks].sort(byOrder),
    ...[...inProgressTracks].sort(byOrder),
  ]

  return (
    <>
      <Standing
        eyebrow={`${firstName} · practice`}
        headline="Every track, every chapter"
        meta={
          inProgressTracks.length > 0
            ? `${inProgressTracks.length} track${inProgressTracks.length === 1 ? '' : 's'} in progress`
            : 'Nothing in progress yet.'
        }
        stats={[
          { value: String(inProgressTracks.length), label: 'In progress' },
          { value: String(archivedLearningTracks.length), label: 'Completed' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-10 px-5 py-9">
        <Reveal>
          <Section title="Your practice" count={`${allTracks.length} tracks`}>
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
                  <TrackChapterList
                    key={track.id}
                    track={track}
                    resumeChapterId={track.id === focus?.id ? resumeChapterId : null}
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
