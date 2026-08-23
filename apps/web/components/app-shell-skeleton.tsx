import { Skeleton } from '@/components/ui/skeleton'

// Mirrors AppShell's nav card exactly (down to the brand text, which is static and costs
// nothing to render for real) so the header doesn't jump in size or position once the real
// shell — which needs profile/nav data this fallback doesn't have — takes over.
export function AppShellSkeletonHeader() {
  return (
    <div className="shrink-0 px-6 py-3">
      <div className="bg-card ring-1 ring-foreground/10">
        <header className="flex h-13 items-center px-5">
          <div className="flex flex-1 items-center">
            <span className="whitespace-nowrap text-sm font-semibold tracking-tight">
              Narada LMS
            </span>
          </div>
          <nav className="hidden items-center gap-3 md:flex">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-14" />
          </nav>
          <div className="flex flex-1 items-center justify-end gap-2.5">
            <Skeleton className="size-6" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </header>
      </div>
    </div>
  )
}
