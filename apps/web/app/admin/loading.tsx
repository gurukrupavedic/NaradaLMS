import { AppShellSkeletonHeader } from '@/components/app-shell-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppShellSkeletonHeader />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
          <div>
            <Skeleton className="mb-2 h-7 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}
