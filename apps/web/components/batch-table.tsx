'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { AdminBatchRow } from '@/lib/mock-dashboard'

const STATUS_LABEL: Record<AdminBatchRow['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
}

export function BatchTable({ rows }: { rows: AdminBatchRow[] }) {
  return (
    <div className="sheet overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            <th scope="col" className="label px-4 py-2.5 text-ink-muted">
              Batch
            </th>
            <th scope="col" className="label px-4 py-2.5 text-ink-muted">
              Track
            </th>
            <th scope="col" className="label hidden px-4 py-2.5 text-ink-muted sm:table-cell">
              Staff
            </th>
            <th scope="col" className="label px-4 py-2.5 text-right text-ink-muted">
              Roll
            </th>
            <th scope="col" className="label px-4 py-2.5 text-right text-ink-muted">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const incomplete = !row.hasSchedule || !row.hasMeetingUrl

            return (
              <tr key={row.code} className="border-b border-rule-soft last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/batches/${encodeURIComponent(row.code)}`}
                    className="font-mono text-[0.8125rem] font-medium underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion"
                  >
                    {row.code}
                  </Link>
                  {/* Setup gaps are flagged per row only where they are the
                      exception. When every active batch is missing the same
                      thing the notice belongs once, above the table. */}
                  {incomplete && row.status === 'active' && (
                    <span className="label mt-0.5 block text-vermilion">
                      {!row.hasSchedule && !row.hasMeetingUrl
                        ? 'no schedule, no link'
                        : !row.hasSchedule
                          ? 'no schedule'
                          : 'no link'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[0.8125rem] text-ink-muted">{row.track}</td>
                <td className="hidden px-4 py-2.5 text-[0.8125rem] text-ink-muted sm:table-cell">
                  {row.staff}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[0.8125rem]">
                  {row.students || '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={cn(
                      'label',
                      row.status === 'active' ? 'text-ink' : 'text-ink-muted',
                    )}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function FilterableBatchTable({
  rows,
  emptyLabel = 'No batches match that filter.',
}: {
  rows: AdminBatchRow[]
  emptyLabel?: string
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      row =>
        row.code.toLowerCase().includes(q) ||
        row.track.toLowerCase().includes(q) ||
        row.staff.toLowerCase().includes(q),
    )
  }, [rows, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-rule pb-2">
        <span className="label shrink-0 text-ink-muted">Find</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="batch code, track or teacher"
          aria-label="Filter batches"
          className="w-full bg-transparent py-1 text-[0.875rem] placeholder:text-ink-muted/55 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="label shrink-0 text-vermilion"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-[0.875rem] text-ink-muted">{emptyLabel}</p>
      ) : (
        <BatchTable rows={filtered} />
      )}
    </div>
  )
}
