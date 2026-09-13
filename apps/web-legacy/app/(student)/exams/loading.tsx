import { AppShellSkeletonHeader } from '@/components/app-shell-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppShellSkeletonHeader />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
          <div>
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}
