'use client'

import { useState, type ReactNode } from 'react'

import { RosterGrid } from '@/components/teacher/roster-grid'
import { StudentHistoryDrawer } from '@/components/teacher/student-history-drawer'
import { Badge } from '@/components/ui/badge'
import { CaretDownIcon } from '@/components/ui/icons'
import { Progress } from '@/components/ui/progress'
import { type RosterRow } from '@/lib/roster'
import { cn } from '@/lib/utils'
import { type ApiChapter, type BatchStatus } from '@/lib/types'

interface TeachingBatchSectionProps {
  batchId: string
  batchCode: string
  status: BatchStatus
  trackName: string
  trackOrder: number
  progress: number
  role: 'instructor' | 'ta'
  chapters: ApiChapter[]
  roster: RosterRow[]
  historyContentByStudentId: Record<string, ReactNode>
  defaultOpen?: boolean
}

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
}

const ROLE_LABEL: Record<'instructor' | 'ta', string> = {
  instructor: 'Teacher',
  ta: 'TA',
}

export function TeachingBatchSection({
  batchId,
  batchCode,
  status,
  trackName,
  trackOrder,
  progress,
  role,
  chapters,
  roster,
  historyContentByStudentId,
  defaultOpen = false,
}: TeachingBatchSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null)
  const st = STATUS_CONFIG[status]

  function openHistory(studentId: string) {
    setHistoryStudentId(studentId)
    setHistoryOpen(true)
  }

  const historyStudent = roster.find(row => row.student.id === historyStudentId)?.student

  return (
    <div className="overflow-hidden bg-primary/5 ring-1 ring-primary/30">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/10"
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
          <Badge variant="outline" className="mb-1">
            {ROLE_LABEL[role]}
          </Badge>
          <p className="text-xs text-muted-foreground">{roster.length} students</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{Math.round(progress)}%</p>
        </div>
      </button>

      <Progress value={progress} className="h-1 rounded-none" />

      {/* Experimental: grid view. Revert by swapping back to
          <RosterAccordion batchId={batchId} roster={roster} onOpenHistory={openHistory} /> —
          same roster data and history-drawer wiring, no other changes needed. */}
      {open && (
        <RosterGrid
          batchId={batchId}
          chapters={chapters}
          roster={roster}
          onOpenHistory={openHistory}
        />
      )}

      <StudentHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={historyStudent ? `${historyStudent.name} — history` : 'Student history'}
        description="Readonly profile details and chronological evaluation marks."
      >
        {historyStudentId ? historyContentByStudentId[historyStudentId] : null}
      </StudentHistoryDrawer>
    </div>
  )
}
