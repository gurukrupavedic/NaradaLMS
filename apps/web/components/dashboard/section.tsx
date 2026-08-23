'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { CaretDownIcon } from '@/components/ui/icons'

interface SectionProps {
  title: string
  count?: string
  children: React.ReactNode
}

export function Section({ title, count, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-4">
        <h2 className="shrink-0 font-serif text-xl font-semibold">{title}</h2>
        <div className="h-px flex-1 bg-border" />
        {count && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

interface ArchiveProps {
  label: string
  children: React.ReactNode
}

// Completed batches used to sit inline with live ones — 17 of them for one instructor, in no
// particular order. They're history, so they stay one click away instead of on the page.
export function Archive({ label, children }: ArchiveProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="group flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretDownIcon
          strokeWidth={2}
          className={cn('size-3 transition-transform', !open && '-rotate-90')}
        />
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
