'use client'

import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/dashboard-view'
import { filterAdminRows, type AdminBatchRow } from '@/lib/admin-view'
import { CaretRightIcon } from '@/components/ui/icons'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function BatchTable({ rows }: { rows: AdminBatchRow[] }) {
  return (
    <ol className="divide-y divide-border/40 bg-card ring-1 ring-foreground/10">
      {rows.map(row => (
        <li key={row.id}>
          <a
            href={`/admin/batches/${row.id}`}
            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm font-medium">{row.code}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {row.track}
                <span className="sm:hidden"> · {pluralize(row.studentCount, 'student')}</span>
                {row.startDate && <span className="hidden sm:inline"> · {formatDate(row.startDate)}</span>}
              </span>
            </span>

            {/* Teaching staff is the thing an admin most often scans for, after the code. */}
            <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">
              {row.teachers.length > 0 ? row.teachers.join(', ') : '—'}
            </span>

            <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
              {pluralize(row.studentCount, 'student')}
            </span>

            <CaretRightIcon
              strokeWidth={2}
              className="size-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
            />
          </a>
        </li>
      ))}
    </ol>
  )
}

// 90 batches is too many to scan, and they differ only in a trailing group number. A single
// filter over code, track and teacher name is the cheapest way to make the list navigable.
export function FilterableBatchTable({
  rows,
  emptyLabel,
}: {
  rows: AdminBatchRow[]
  emptyLabel: string
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => filterAdminRows(rows, query), [rows, query])

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter by code, track or teacher…"
          aria-label="Filter batches"
          className={cn(
            'w-full max-w-xs border border-border bg-background px-3 py-1.5 text-sm outline-none',
            'transition-colors placeholder:text-muted-foreground/50',
            'focus:border-primary focus:ring-1 focus:ring-primary/30',
          )}
        />
        {query.trim() !== '' && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {filtered.length}/{rows.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <BatchTable rows={filtered} />
      )}
    </div>
  )
}
