'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { pluralize, type TeachingBatch } from '@/lib/dashboard-view'
import { RosterAccordion } from '@/components/teacher/roster-accordion'
import { StudentHistoryDrawer } from '@/components/teacher/student-history-drawer'
import { CaretDownIcon } from '@/components/ui/icons'
import type { RosterRow } from '@/lib/roster'

const ROLE_LABEL: Record<string, string> = { instructor: 'Teacher', ta: 'TA' }

export interface TeachingRowData extends TeachingBatch {
  roster: RosterRow[]
  historyContentByStudentId: Record<string, ReactNode>
}

interface TeachingListProps {
  batches: TeachingRowData[]
  defaultOpenBatchId?: string
}

export function TeachingList({ batches, defaultOpenBatchId }: TeachingListProps) {
  // The role badge was repeated on all 24 rows even when every one of them said "Teacher".
  // It only earns its place when it distinguishes something.
  const showRole = new Set(batches.map(batch => batch.role)).size > 1

  return (
    <div className="divide-y divide-border/40 bg-card ring-1 ring-foreground/10">
      {batches.map(batch => (
        <TeachingRow
          key={batch.batchId}
          batch={batch}
          showRole={showRole}
          defaultOpen={batch.batchId === defaultOpenBatchId}
        />
      ))}
    </div>
  )
}

function TeachingRow({
  batch,
  showRole,
  defaultOpen,
}: {
  batch: TeachingRowData
  showRole: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null)

  const historyStudent = batch.roster.find(row => row.student.id === historyStudentId)?.student

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <CaretDownIcon
          strokeWidth={2}
          className={cn(
            'size-3 shrink-0 text-muted-foreground transition-transform',
            !open && '-rotate-90',
          )}
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate">
            <span className="font-mono text-sm font-medium">{batch.batchCode}</span>
            {showRole && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                {ROLE_LABEL[batch.role] ?? batch.role}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {batch.track}
            {/* Narrow screens have no room for the badge, and a bare number beside a percentage
                reads as noise — so the count says what it means here instead. */}
            <span className="sm:hidden">
              {' · '}
              {pluralize(batch.studentCount, 'student')}
              {batch.unevaluatedCount > 0 && (
                <span className="text-primary"> · {batch.unevaluatedCount} to evaluate</span>
              )}
            </span>
          </span>
        </span>

        {batch.unevaluatedCount > 0 && (
          <span className="hidden shrink-0 whitespace-nowrap border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary sm:inline">
            {batch.unevaluatedCount} to evaluate
          </span>
        )}

        <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
          {pluralize(batch.studentCount, 'student')}
        </span>

        <span className="w-16 shrink-0 text-right sm:w-20">
          <span className="font-mono text-sm tabular-nums">{Math.round(batch.progress)}%</span>
          <span className="ml-1 hidden text-xs text-muted-foreground tabular-nums sm:inline">
            /{Math.round(batch.masteredProgress)}%
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50">
          <RosterAccordion
            batchId={batch.batchId}
            roster={batch.roster}
            onOpenHistory={setHistoryStudentId}
          />
        </div>
      )}

      <StudentHistoryDrawer
        open={historyStudentId !== null}
        onOpenChange={isOpen => !isOpen && setHistoryStudentId(null)}
        title={historyStudent ? `${historyStudent.name} — history` : 'Student history'}
        description="Readonly profile details and chronological evaluation marks."
      >
        {historyStudentId ? batch.historyContentByStudentId[historyStudentId] : null}
      </StudentHistoryDrawer>
    </div>
  )
}
