import { ChapterLine } from '@/components/chapter-line'
import type { LadderTrack } from '@/components/track-ladder'

/**
 * A track and every one of its chapters, laid flat — no collapse, no progress bar, no per-track
 * stat block. `/practice`'s whole point is finding any chapter fast, so nothing here should stand
 * between landing on the page and seeing every chapter there is; `TrackLadder`
 * (`components/track-ladder.tsx`), with the accordion and the started/mastered summary, is the
 * dashboard's own denser take on the same data and stays there.
 *
 * Every chapter shows, same as `TrackLadder` — `ChapterLine` itself decides whether a chapter is
 * clickable (at least L1) or plain text (not yet evaluated), so there's nothing to filter here.
 */
export function TrackChapterList({
  track,
  resumeChapterId,
}: {
  track: LadderTrack
  resumeChapterId?: string | null
}) {
  return (
    <article className="sheet">
      <div className="px-4 py-3.5">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="display text-[1.0625rem] leading-tight">{track.name}</span>
        </span>
        <span className="mt-1 block font-mono text-[0.6875rem] text-ink-muted">
          {track.batchCode ?? 'No batch on record'}
          {track.subtitle && ` · ${track.subtitle}`}
        </span>
      </div>

      <ol className="border-t border-rule-soft">
        {track.chapters.map(chapter => (
          <ChapterLine key={chapter.id} chapter={chapter} isResume={chapter.id === resumeChapterId} />
        ))}
      </ol>
    </article>
  )
}
