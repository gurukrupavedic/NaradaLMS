'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { getProficiencyProgress, isStartedProficiency, ProficiencyLevel } from '@/lib/proficiency'
import { Badge } from '@/components/ui/badge'
import { CaretDownIcon } from '@/components/ui/icons'
import { Progress } from '@/components/ui/progress'
import { ProficiencyBadge } from '@/components/proficiency-badge'

export interface ChapterData {
  id: string
  code: string
  title: string
  proficiency: ProficiencyLevel
  evaluatedAt?: string
}

export interface TrackCardProps {
  title: string
  trackNumber: number
  chapters: ChapterData[]
  isCurrent?: boolean
  defaultOpen?: boolean
  onChapterClick?: (chapterId: string) => void
  className?: string
}

export function TrackCard({
  title,
  trackNumber,
  chapters,
  isCurrent = false,
  defaultOpen = false,
  onChapterClick,
  className,
}: TrackCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const startedChapters = chapters.filter(chapter => isStartedProficiency(chapter.proficiency))
  const progress = getProficiencyProgress(chapters.map(chapter => chapter.proficiency))

  return (
    <div className={cn('ring-foreground/10 bg-card overflow-hidden ring-1', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <CaretDownIcon
          strokeWidth={2}
          className={cn(
            'text-muted-foreground size-3 shrink-0 transition-transform',
            !open && '-rotate-90',
          )}
        />
        <span className="flex-1 text-sm font-medium">
          Track {trackNumber} — {title}
        </span>
        <div className="flex shrink-0 items-center gap-4">
          {isCurrent && <Badge variant="secondary">Current</Badge>}
          <span className="text-muted-foreground text-xs tabular-nums">
            {startedChapters.length}/{chapters.length}
          </span>
        </div>
      </button>

      <Progress value={progress} className="h-1 rounded-none" />

      {open && (
        <div className="border-border/50 divide-border/30 divide-y border-t">
          {chapters.map(ch => (
            <button
              key={ch.id}
              onClick={() => onChapterClick?.(ch.id)}
              className="hover:bg-muted/30 group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
            >
              <span className="text-muted-foreground w-12 shrink-0 font-mono text-xs">
                {ch.code}
              </span>
              <span className="group-hover:text-foreground text-foreground/80 flex-1 truncate text-sm">
                {ch.title}
              </span>
              <div className="flex shrink-0 items-center gap-4">
                {ch.evaluatedAt && (
                  <span className="text-muted-foreground hidden text-xs sm:block">
                    {ch.evaluatedAt}
                  </span>
                )}
                <ProficiencyBadge level={ch.proficiency} compact />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
