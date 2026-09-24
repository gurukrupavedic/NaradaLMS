'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { ChapterLine } from '@/components/chapter-line'
import type { ProficiencyLevel } from '@/lib/proficiency'

export type ChapterRow = {
  id: string
  code: string
  title: string
  level: ProficiencyLevel
  evaluatedAt: string | null
  isCertification?: boolean
  // Set when the chapter has text and audio uploaded, which is what makes it
  // openable in the practice room. Across the imported syllabus this is
  // currently false for every chapter — the ladder says so rather than offering
  // a link into an empty room.
  hasContent?: boolean
}

export type LadderTrack = {
  id: string
  name: string
  subtitle?: string
  // The syllabus's own real ordering (`ApiTrack.order` in lib/api/api-types.ts) — not this
  // student's own priority. `/practice` (`components/practice-screen.tsx`) sorts by this so
  // completed and in-progress tracks interleave by curriculum order instead of by the
  // "focus track first" priority `fetchDashboard` sorts `learningTracks` itself by, which is
  // right for the dashboard's own "what's next" framing but not for a page whose whole point
  // is a plain, findable list.
  order: number
  batchId: string | null
  batchCode: string | null
  batchStatus: 'upcoming' | 'active' | 'completed' | null
  // The learner's own seat in `batchId` (distinct from the batch's status): a seat on a break, or
  // dropped/inactive, is a batch they belong to but are not currently sitting in.
  enrollmentStatus: 'active' | 'break' | 'dropped' | 'inactive' | null
  started: number
  mastered: number
  total: number
  progress: number
  masteredProgress: number
  chapters: ChapterRow[]
}

export function TrackLadder({
  track,
  resumeChapterId,
  defaultOpen = true,
}: {
  track: LadderTrack
  resumeChapterId?: string | null
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <article className="sheet">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.025]"
      >
        <span
          aria-hidden
          className={cn(
            'shrink-0 text-vermilion transition-transform duration-200',
            !open && '-rotate-90',
          )}
        >
          ▾
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="display text-[1.0625rem] leading-tight">{track.name}</span>
          </span>
          <span className="mt-1 block font-mono text-[0.6875rem] text-ink-muted">
            {track.batchCode ?? 'No batch on record'}
            {track.subtitle && ` · ${track.subtitle}`}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-mono text-[0.9375rem] font-medium">
            {track.started}
            <span className="text-ink-muted">/{track.total}</span>
          </span>
          <span className="label mt-1 block text-ink-muted">{track.mastered} mastered</span>
        </span>
      </button>

      <ProgressRule value={track.progress} mastered={track.masteredProgress} />

      {open && (
        <ol className="border-t border-rule-soft">
          {track.chapters.map(chapter => (
            <ChapterLine key={chapter.id} chapter={chapter} isResume={chapter.id === resumeChapterId} />
          ))}
        </ol>
      )}
    </article>
  )
}

/**
 * Two-tone rule: everything started, with the mastered portion overlaid in the
 * full ink, so "touched" and "mastered" read as one bar rather than two
 * competing percentages.
 */
function ProgressRule({ value, mastered }: { value: number; mastered: number }) {
  return (
    <div className="relative h-[3px] w-full bg-ink/[0.07]" role="presentation">
      <div className="absolute inset-y-0 left-0 bg-indigo/35" style={{ width: `${value}%` }} />
      <div className="absolute inset-y-0 left-0 bg-indigo" style={{ width: `${mastered}%` }} />
    </div>
  )
}
