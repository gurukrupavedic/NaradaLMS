import { cn } from '@/lib/utils'

type Stat = { value: string; label: string }

interface StandingProps {
  eyebrow: string
  headline: string
  meta?: string
  stats?: Stat[]
  // Sits above the stats box, right-aligned — a page-level action (e.g. "Move to another
  // batch →" on components/student-profile-screen.tsx) rather than one more stat.
  action?: React.ReactNode
  className?: string
}

/**
 * The page header. The headline carries whatever the reader actually arrived to
 * find out — a teacher wants to know where attention is owed, a student wants
 * to know what to practise next — rather than spending the first viewport on a
 * greeting.
 *
 * The ॐ watermark survives from the original design, but now renders in a real
 * Devanagari face instead of a browser fallback, and sits at 4% so it reads as
 * a blind-embossed mark in the paper rather than a decoration on top of it.
 */
export function Standing({ eyebrow, headline, meta, stats = [], action, className }: StandingProps) {
  return (
    <header className={cn('relative overflow-hidden border-b border-rule', className)}>
      <span
        aria-hidden
        className="font-deva pointer-events-none absolute -top-14 -right-6 leading-none text-ink/[0.045] select-none"
        style={{ fontSize: '13rem' }}
      >
        ॐ
      </span>

      <div className="relative mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-12 gap-y-7 px-5 pt-10 pb-8">
        <div className="min-w-0">
          <p className="label text-ink-muted">{eyebrow}</p>
          <h1 className="display mt-3 text-[2rem] sm:text-[2.75rem]">{headline}</h1>
          {meta && <p className="mt-3 max-w-prose text-[0.875rem] text-ink-muted">{meta}</p>}
        </div>

        {(action || stats.length > 0) && (
          <div className="flex shrink-0 flex-col items-end gap-3">
            {action}
            {stats.length > 0 && (
              <dl className="flex divide-x divide-rule border-y border-rule">
                {stats.map(stat => (
                  <div key={stat.label} className="px-5 py-3 first:pl-0 last:pr-0">
                    <dt className="label text-ink-muted">{stat.label}</dt>
                    <dd className="mt-1.5 font-mono text-2xl leading-none font-medium">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
