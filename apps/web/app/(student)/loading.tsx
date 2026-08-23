import { AppShellSkeletonHeader } from '@/components/app-shell-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppShellSkeletonHeader />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-border px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <Skeleton className="mb-3 h-3 w-28" />
            <Skeleton className="h-10 w-72" />
          </div>
        </div>
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
          <Skeleton className="h-24 w-full" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-10 shrink-0" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}
