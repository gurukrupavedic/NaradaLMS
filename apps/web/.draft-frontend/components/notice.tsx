import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type NoticeItem = {
  label: string
  body: ReactNode
  action?: { label: string; href: string }
}

/**
 * The standing rail: what is happening next, held against a vermilion margin
 * rule. It is the one element allowed to interrupt the reading order, so it
 * carries only things with a time attached — a class about to sit, an exam
 * booked. Anything that can wait belongs in a section below.
 */
export function Notice({ items, className }: { items: NoticeItem[]; className?: string }) {
  if (items.length === 0) return null

  return (
    <div className={cn('border-l-2 border-vermilion bg-vermilion/[0.045] py-3 pr-4 pl-4', className)}>
      <ul className="flex flex-wrap items-baseline gap-x-9 gap-y-2.5">
        {items.map(item => (
          <li key={item.label} className="flex min-w-0 items-baseline gap-2.5">
            <span className="label shrink-0 text-vermilion">{item.label}</span>
            <span className="text-[0.8125rem] text-ink-muted">{item.body}</span>
            {item.action && (
              <a
                href={item.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="label shrink-0 text-ink underline decoration-vermilion decoration-2 underline-offset-4 transition-colors hover:text-vermilion"
              >
                {item.action.label} ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
