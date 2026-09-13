'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { isStartedProficiency, PROFICIENCY_LEVELS, getProficiencyConfig } from '@/lib/proficiency'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { CaretDownIcon } from '@/components/ui/icons'
import type { ChapterRow, LearningTrack } from '@/lib/dashboard-view'

// The legend used to live alone at the very bottom of the page, after every badge it explains.
// One compact key, once, above the thing it decodes.
export function LevelKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {PROFICIENCY_LEVELS.filter(level => level !== 'absent' && level !== 'notStarted').map(
        level => (
          <div key={level} className="flex items-center gap-1.5">
            <ProficiencyBadge level={level} compact />
            <span className="text-xs text-muted-foreground">
              {getProficiencyConfig(level).label}
            </span>
          </div>
        ),
      )}
    </div>
  )
}

interface TrackLadderProps {
  track: LearningTrack
  resumeChapterId?: string | null
  defaultOpen?: boolean
}

export function TrackLadder({ track, resumeChapterId, defaultOpen = true }: TrackLadderProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <article className="bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <CaretDownIcon
          strokeWidth={2}
          className={cn(
            'size-3 shrink-0 text-muted-foreground transition-transform',
            !open && '-rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold">{track.track}</span>
          {/* A closed batch can still hold unfinished chapters, and most prior study has no
              batch on record at all — say which, rather than leaving the reader wondering why
              nothing is scheduled. */}
          {track.batch === null ? (
            <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              prior study
            </span>
          ) : (
            track.batch.status === 'completed' && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                batch ended
              </span>
            )
          )}
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {track.batch?.code ?? 'No batch on record'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-medium tabular-nums">
            {track.started}
            <span className="text-muted-foreground">/{track.total}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {track.mastered} mastered
          </p>
        </div>
      </button>

      <ProgressRule value={track.progress} mastered={track.masteredProgress} />

      {open && (
        <ol className="divide-y divide-border/30 border-t border-border/50">
          {track.chapters.map((chapter, index) => (
            <ChapterLine
              key={chapter.id}
              chapter={chapter}
              // Suppress a date identical to the row above it. A bulk import stamps every
              // chapter with the same day, which turned the column into 14 copies of one date.
              showDate={chapter.evaluatedAt !== track.chapters[index - 1]?.evaluatedAt}
              isResume={chapter.id === resumeChapterId}
            />
          ))}
        </ol>
      )}
    </article>
  )
}

// Two-tone rule: total progress, with the mastered portion overlaid in the stronger colour, so
// "done" and "mastered" read as one bar instead of two competing percentages.
function ProgressRule({ value, mastered }: { value: number; mastered: number }) {
  return (
    <div className="relative h-1 w-full bg-muted" role="presentation">
      <div className="absolute inset-y-0 left-0 bg-primary/35" style={{ width: `${value}%` }} />
      <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${mastered}%` }} />
    </div>
  )
}

function ChapterLine({
  chapter,
  showDate,
  isResume,
}: {
  chapter: ChapterRow
  showDate: boolean
  isResume: boolean
}) {
  const started = isStartedProficiency(chapter.level)

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-2',
        isResume && 'bg-primary/[0.07]',
        chapter.isCertification && 'bg-accent/25',
      )}
    >
      <span
        aria-hidden
        className={cn('w-0.5 self-stretch', isResume ? 'bg-primary' : 'bg-transparent')}
      />
      <span
        className={cn(
          'w-10 shrink-0 font-mono text-xs tabular-nums',
          started ? 'text-muted-foreground' : 'text-muted-foreground/50',
        )}
      >
        {chapter.code}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            'truncate text-sm',
            chapter.isCertification && 'font-medium',
            started ? 'text-foreground' : 'text-muted-foreground/60',
          )}
        >
          {chapter.title}
        </span>
        {isResume && (
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-primary">
            resume
          </span>
        )}
      </span>
      <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground/70 sm:block">
        {showDate ? chapter.evaluatedAt : ''}
      </span>
      {started ? (
        <ProficiencyBadge level={chapter.level} compact />
      ) : (
        <span
          aria-label="Not started"
          className="h-4 w-6 shrink-0 border border-dashed border-border"
        />
      )}
    </li>
  )
}
