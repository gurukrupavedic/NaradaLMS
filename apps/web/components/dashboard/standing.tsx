import { cn } from '@/lib/utils'

type Stat = { value: string; label: string }

interface StandingProps {
  eyebrow: string
  headline: string
  meta?: string
  stats: Stat[]
  className?: string
}

// Replaces the old "Welcome back, {name}." hero, which spent the entire first viewport on the
// least informative thing on the page. The greeting moves into the eyebrow and the headline
// carries whatever the reader actually came to find out.
export function Standing({ eyebrow, headline, meta, stats, className }: StandingProps) {
  return (
    <header className={cn('relative overflow-hidden border-b border-border', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 select-none font-serif leading-none text-foreground/[0.04]"
        style={{ fontSize: '15rem' }}
      >
        ॐ
      </span>
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-10 gap-y-6 px-4 py-8">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {headline}
          </h1>
          {meta && <p className="mt-2 text-sm text-muted-foreground">{meta}</p>}
        </div>

        {stats.length > 0 && (
          <dl className="flex shrink-0 gap-8">
            {stats.map(stat => (
              <div key={stat.label}>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 font-mono text-2xl font-medium tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  )
}
