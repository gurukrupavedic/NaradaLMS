'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { MarkBook } from '@/components/mark-book'
import { keys } from '@/lib/query/options'
import { useSetEvaluation, useSetEvaluations } from '@/lib/query/use-evaluation-mutations'
import { useSetOnBreak } from '@/lib/query/use-enrollment-mutations'
import type { TeachingBatch } from '@/lib/models/dashboard'
import { pluralize } from '@/lib/pluralize'

const ROLE_LABEL: Record<TeachingBatch['role'], string> = { instructor: 'Teacher', ta: 'TA' }

export function TeachingList({ batches }: { batches: TeachingBatch[] }) {
  // The role badge was on all 24 rows even when every one of them read
  // "Teacher". It earns its place only when it distinguishes something.
  const showRole = new Set(batches.map(b => b.role)).size > 1
  const active = batches.filter(b => b.status === 'active')
  const completed = batches.filter(b => b.status === 'completed')

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <div className="sheet divide-y divide-rule-soft">
          {active.map((batch, i) => (
            <TeachingRow key={batch.batchId} batch={batch} showRole={showRole} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-4">
            <span className="label shrink-0 text-ink-muted">Closed</span>
            <span className="h-px flex-1 bg-rule" />
            <span className="label shrink-0 text-ink-muted">{pluralize(completed.length, 'batch', 'batches')}</span>
          </div>
          <div className="sheet divide-y divide-rule-soft">
            {completed.map(batch => (
              <TeachingRow key={batch.batchId} batch={batch} showRole={showRole} defaultOpen={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeachingRow({
  batch,
  showRole,
  defaultOpen,
}: {
  batch: TeachingBatch
  showRole: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const setLevel = useSetEvaluation(batch.batchId, keys.dashboard)
  const promote = useSetEvaluations(batch.batchId, keys.dashboard)
  const onBreak = useSetOnBreak(batch.batchId, keys.dashboard)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-ink/[0.025]"
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
          <span className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-mono text-[0.875rem] font-medium">{batch.batchCode}</span>
            {showRole && <span className="label text-ink-muted">{ROLE_LABEL[batch.role]}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">
            {batch.track} · {pluralize(batch.students.length, 'student')}
          </span>
        </span>

        {batch.unevaluatedCount > 0 && (
          <span className="stamp shrink-0 whitespace-nowrap">
            {batch.unevaluatedCount} unmarked
          </span>
        )}

        <span className="w-16 shrink-0 text-right font-mono text-[0.875rem]">
          {Math.round(batch.progress)}%
        </span>
      </button>

      {open && (
        <div className="border-t border-rule-soft">
          <MarkBook
            chapterCodes={batch.chapterCodes}
            chapterIds={batch.chapterIds}
            chapterTitles={batch.chapterTitles}
            students={batch.students}
            grading={setLevel}
            promote={promote}
            onBreak={onBreak}
          />
        </div>
      )}
    </div>
  )
}
