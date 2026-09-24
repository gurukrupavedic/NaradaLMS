import { cn } from '@/lib/utils'

/**
 * Suspense fallbacks.
 *
 * Ruled blocks at the sizes of the real thing, not spinners: the page holds its
 * shape while data streams in, so nothing jumps when it arrives. Kept flat and
 * shadowless like everything else — a shimmer gradient would be the one place
 * this system pretended to have depth.
 */
function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span style={style} className={cn('block animate-pulse bg-ink/[0.07]', className)} />
}

function StandingSkeleton() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-12 gap-y-7 px-5 pt-10 pb-8">
        <div className="min-w-0 space-y-3">
          <Bar className="h-2.5 w-32" />
          <Bar className="h-9 w-72" />
          <Bar className="h-3 w-56" />
        </div>
        <div className="flex gap-8">
          <Bar className="h-12 w-16" />
          <Bar className="h-12 w-16" />
        </div>
      </div>
    </header>
  )
}

function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-5xl space-y-11 px-5 py-9">
      <div className="space-y-5">
        <div className="flex items-baseline gap-4">
          <Bar className="h-5 w-28" />
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="sheet">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0"
            >
              <Bar className="h-3 w-10" />
              <Bar className="h-3 flex-1" style={{ maxWidth: `${40 + ((i * 13) % 35)}%` }} />
              <Bar className="h-5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ScreenSkeleton({ rows }: { rows?: number }) {
  return (
    <>
      <StandingSkeleton />
      <ListSkeleton rows={rows} />
    </>
  )
}
