import { AppShellSkeletonHeader } from '@/components/app-shell-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppShellSkeletonHeader />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-28 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}
