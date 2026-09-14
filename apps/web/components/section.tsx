'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Section heading: title, a rule running out to the margin, and an optional
 * count sitting on the far end. The ruled line is the load-bearing gesture of
 * this whole system — it does the work a card border or a shadow would do
 * elsewhere, at a fraction of the visual weight.
 */
export function Section({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string
  count?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex items-baseline gap-4">
        <h2 className="display shrink-0 text-[1.4rem]">{title}</h2>
        <span className="h-px flex-1 bg-rule" />
        {count && <span className="label shrink-0 text-ink-muted">{count}</span>}
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * Completed work is history — one click away rather than on the page. One
 * instructor here has seventeen finished batches; inline they simply buried the
 * three that are live.
 */
export function Archive({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-rule-soft pt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="label flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
      >
        <span aria-hidden className="text-vermilion">
          {open ? '−' : '+'}
        </span>
        {label}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}
