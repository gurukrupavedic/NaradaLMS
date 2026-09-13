import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden bg-primary/10 lg:block lg:w-5/12" />
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-xs space-y-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      </main>
    </div>
  )
}
