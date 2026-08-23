import { AppShellSkeletonHeader } from '@/components/app-shell-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppShellSkeletonHeader />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          <Skeleton className="h-4 w-56" />
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    </div>
  )
}
