'use client'

import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Archive, Section } from '@/components/section'
import { PillKey } from '@/components/proficiency-pill'
import { TrackLadder } from '@/components/track-ladder'
import { TeachingList } from '@/components/teaching-list'
import { Notice } from '@/components/notice'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { dashboardQuery } from '@/lib/query/options'

/**
 * Status, plus the ladder: what's next and what needs attention up top, then the same track ×
 * chapter picture `/practice` (`components/practice-screen.tsx`) shows — denser here (the
 * collapsible `TrackLadder`, not `/practice`'s always-flat `TrackChapterList`), on the theory that
 * a reader landing on their own dashboard usually wants *their* active track expanded and
 * everything else out of the way, where a reader who's gone looking for a specific chapter on
 * `/practice` wants nothing collapsed to begin with.
 */
export function DashboardScreen() {
  const { data, error } = useQuery(dashboardQuery())

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={9} />

  const {
    firstName,
    learningTracks,
    archivedLearningTracks,
    teachingBatches,
    resumeChapterId,
    nextClass,
    upcomingExam,
  } = data

  const focus = learningTracks[0]
  const resume = focus?.chapters.find(c => c.id === resumeChapterId)

  return (
    <>
      <Standing
        eyebrow={`${firstName} · up next`}
        headline={resume?.title ?? 'Nothing in progress'}
        meta={
          focus && resume
            ? [focus.name, `chapter ${resume.code}`, focus.batchCode].filter(Boolean).join(' · ')
            : 'You have no active chapters right now.'
        }
        stats={
          focus
            ? [
                { value: `${focus.started}/${focus.total}`, label: 'Chapters' },
                { value: String(focus.mastered), label: 'Mastered' },
              ]
            : []
        }
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {/* `Reveal` always renders its own wrapper element, even around a `Notice` that renders
            nothing — an empty-but-present sibling still collects `space-y-12`'s margin, which
            read as a dead gap above "Your practice" whenever there was no notice to show (the
            common case for this test account). Skipping the wrapper entirely when there's
            nothing to notify about is what `teachingBatches.length > 0` already does for "Your
            teaching" below — same fix, applied here too. */}
        {(nextClass || upcomingExam) && (
          <Reveal>
            <Notice
              items={[
                nextClass
                  ? {
                      label: 'Next class',
                      body: (
                        <>
                          {nextClass.batchCode} · <Timestamp variant="dateTime" value={nextClass.when} />
                        </>
                      ),
                      ...(nextClass.meetingUrl ? { action: { label: 'Join', href: nextClass.meetingUrl } } : {}),
                    }
                  : null,
                upcomingExam
                  ? {
                      label: 'Exam',
                      body: (
                        <>
                          {upcomingExam.chapterTitle} ·{' '}
                          <Timestamp variant="dateTime" value={upcomingExam.when} />
                        </>
                      ),
                    }
                  : null,
              ].filter(item => item !== null)}
            />
          </Reveal>
        )}

        <Reveal delay={60}>
          <Section title="Your practice" count={`${learningTracks.length} tracks`}>
            <PillKey />
            <div className="space-y-4">
              {learningTracks.map(track => (
                <TrackLadder
                  key={track.id}
                  track={track}
                  resumeChapterId={track.id === focus?.id ? resumeChapterId : null}
                  defaultOpen={track.id === focus?.id}
                />
              ))}
            </div>

            {archivedLearningTracks.length > 0 && (
              <Archive label={`${archivedLearningTracks.length} completed track`}>
                <div className="space-y-4">
                  {archivedLearningTracks.map(track => (
                    <TrackLadder key={track.id} track={track} defaultOpen={false} />
                  ))}
                </div>
              </Archive>
            )}
          </Section>
        </Reveal>

        {teachingBatches.length > 0 && (
          <Reveal delay={120}>
            <Section title="Your teaching" count={`${teachingBatches.length} active batches`}>
              <TeachingList batches={teachingBatches} />
            </Section>
          </Reveal>
        )}
      </div>
    </>
  )
}
