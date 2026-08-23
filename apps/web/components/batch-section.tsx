'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { getProficiencyProgress, isMasteredProficiency, isStartedProficiency } from '@/lib/proficiency'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { CalendarBlankIcon, CaretDownIcon } from '@/components/ui/icons'
import type { ChapterData } from '@/components/track-card'

interface BatchSectionProps {
  batchCode: string
  batchStatus: 'upcoming' | 'active' | 'completed'
  startDate: string | null
  trackOrder: number
  trackName: string
  chapters: ChapterData[]
}

const STATUS_CONFIG = {
  active:    { label: 'Active',    variant: 'default'   as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  upcoming:  { label: 'Upcoming',  variant: 'outline'   as const },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BatchSection({
  batchCode,
  batchStatus,
  startDate,
  trackOrder,
  trackName,
  chapters,
}: BatchSectionProps) {
  const [open, setOpen] = useState(true)
  const progress = getProficiencyProgress(chapters.map(ch => ch.proficiency))
  const startedCount = chapters.filter(ch => isStartedProficiency(ch.proficiency)).length
  const masteredCount = chapters.filter(ch => isMasteredProficiency(ch.proficiency)).length
  const st = STATUS_CONFIG[batchStatus]

  return (
    <div className="bg-card overflow-hidden ring-1 ring-foreground/10">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <CaretDownIcon
          strokeWidth={2}
          className={cn(
            'mt-1 size-3 shrink-0 text-muted-foreground transition-transform',
            !open && '-rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{batchCode}</span>
            <Badge variant={st.variant} className="shrink-0">
              {st.label}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Track {trackOrder} — {trackName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {startDate && (
            <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <CalendarBlankIcon className="size-3.5" />
              {formatDate(startDate)}
            </p>
          )}
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {startedCount}/{chapters.length}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({Math.round(progress)}%)
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {masteredCount}/{chapters.length} mastered
          </p>
        </div>
      </button>

      <Progress value={progress} className="h-1 rounded-none" />

      {open && (
        <div className="divide-y divide-border/30 border-t border-border/50">
          {chapters.map(ch => (
            <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                {ch.code}
              </span>
              <span className="flex-1 truncate text-sm text-foreground/80">{ch.title}</span>
              <div className="flex shrink-0 items-center gap-4">
                {ch.evaluatedAt && (
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {ch.evaluatedAt}
                  </span>
                )}
                <ProficiencyBadge level={ch.proficiency} compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
