import Link from 'next/link'

import { cn } from '@/lib/utils'
import { isStarted } from '@/lib/proficiency'
import { Pill } from '@/components/proficiency-pill'
import { Timestamp } from '@/components/timestamp'
import type { ChapterRow } from '@/components/track-ladder'

/**
 * One chapter row, opening straight into the practice room. Shared between `TrackLadder` (the
 * accordion on `/dashboard`) and `TrackChapterList` (the flat, always-expanded listing on
 * `/practice`) — both show every chapter in the track and let this component decide, per row,
 * whether it's clickable.
 *
 * `dateColumn` toggles whether the evaluation-date column exists at all — currently both callers
 * show it, but it stays a separate prop from `showLevel` since a future list may want one column
 * without the other.
 */
export function ChapterLine({
  chapter,
  dateColumn = true,
  showLevel = true,
  isResume,
}: {
  chapter: ChapterRow
  dateColumn?: boolean
  showLevel?: boolean
  isResume: boolean
}) {
  const started = isStarted(chapter.level)

  return (
    <li
      className={cn(
        'group flex items-center gap-3.5 border-b border-rule-soft px-4 py-2.5 last:border-0',
        isResume && 'bg-vermilion/[0.055]',
      )}
    >
      {/* The resume rule is the single vermilion mark on the page — the one
          place the reader is being told to go. */}
      <span
        aria-hidden
        className={cn('-my-2.5 w-[2px] self-stretch', isResume ? 'bg-vermilion' : 'bg-transparent')}
      />

      <span
        className={cn(
          'w-12 shrink-0 font-mono text-[0.6875rem]',
          started ? 'text-ink-muted' : 'text-ink-muted/50',
        )}
      >
        {chapter.code}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* Practice only opens once there's a real mark to build on — a chapter still at "not
            started" or "absent" has nothing to resume, so it stays plain text rather than a link
            into an empty room. */}
        {started ? (
          <Link
            href={`/chapters/${encodeURIComponent(chapter.code)}`}
            className={cn(
              'truncate text-[0.875rem] text-ink underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion',
              chapter.isCertification && 'font-medium',
            )}
          >
            {chapter.title}
          </Link>
        ) : (
          <span
            className={cn('truncate text-[0.875rem] text-ink-muted/65', chapter.isCertification && 'font-medium')}
          >
            {chapter.title}
          </span>
        )}

        {chapter.hasContent && (
          <span aria-label="Has recording" title="Has recording" className="shrink-0 text-vermilion">
            ♪
          </span>
        )}
        {chapter.isCertification && <span className="stamp shrink-0">certification</span>}
        {isResume && <span className="label shrink-0 text-vermilion">resume</span>}
      </span>

      {dateColumn && (
        <span className="hidden w-28 shrink-0 text-right font-mono text-[0.6875rem] text-ink-muted/70 sm:block">
          <Timestamp value={chapter.evaluatedAt} />
        </span>
      )}

      {showLevel && <Pill level={chapter.level} className="shrink-0" />}
    </li>
  )
}
