import { redirect } from 'next/navigation'

import { AppShell, type NavigationItem } from '@/components/app-shell'
import { Badge } from '@/components/ui/badge'
import { BookOpenIcon, CalendarBlankIcon, HouseIcon, UsersIcon, VideoCameraIcon } from '@/components/ui/icons'
import { getBatches } from '@/lib/api/batches'
import { fetchAllPages } from '@/lib/api/pagination'
import { getTracks } from '@/lib/api/tracks'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import type { ApiBatch, BatchStatus } from '@/lib/types'

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon },
  { label: 'Content', icon: BookOpenIcon },
  { label: 'Batches', icon: UsersIcon },
]

// Ordered by what an admin scanning the whole school cares about first.
const STATUS_ORDER: BatchStatus[] = ['active', 'upcoming', 'completed']
const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AdminPage() {
  // A deliberately standalone check, made once per page load — unlike the per-batch role that
  // GET /profiles/:id/batches now resolves, this doesn't chain into any per-batch fetch, so it
  // can't reproduce the fan-out that took the dashboard down (see lib/dashboard.ts).
  const isAdmin = await hasSchoolWideAccess()
  if (!isAdmin) redirect('/')

  const [profile, batches, tracks] = await Promise.all([
    getCurrentProfile(),
    fetchAllPages(cursor => getBatches({ cursor })),
    getTracks(),
  ])

  const trackMap = new Map(tracks.map(t => [t.id, t]))
  const batchesByStatus = new Map<BatchStatus, ApiBatch[]>()
  for (const batch of batches) {
    const bucket = batchesByStatus.get(batch.status) ?? []
    bucket.push(batch)
    batchesByStatus.set(batch.status, bucket)
  }
  for (const bucket of batchesByStatus.values()) {
    bucket.sort((a, b) => {
      const trackOrder = (trackMap.get(a.trackId)?.order ?? 0) - (trackMap.get(b.trackId)?.order ?? 0)
      return trackOrder !== 0 ? trackOrder : a.code.localeCompare(b.code)
    })
  }

  return (
    <AppShell navigationItems={navItems} profile={profile}>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold">School batches</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Every batch across the school, read-only — {batches.length} total.
          </p>
        </div>

        {batches.length === 0 && (
          <p className="text-sm text-muted-foreground">No batches yet.</p>
        )}

        {STATUS_ORDER.filter(status => (batchesByStatus.get(status)?.length ?? 0) > 0).map(status => {
          const bucket = batchesByStatus.get(status) ?? []
          const st = STATUS_CONFIG[status]
          return (
            <div key={status} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="shrink-0 font-serif text-lg font-semibold">
                  {st.label}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({bucket.length})
                  </span>
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {bucket.map(batch => {
                  const track = trackMap.get(batch.trackId)
                  return (
                    <div
                      key={batch.id}
                      className="bg-card flex items-center justify-between gap-3 px-4 py-3 ring-1 ring-foreground/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{batch.code}</span>
                          <Badge variant={st.variant} className="shrink-0">
                            {st.label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {track ? `Track ${track.order} — ${track.name}` : 'Unknown track'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {batch.startDate && (
                          <p className="flex items-center justify-end gap-1">
                            <CalendarBlankIcon className="size-3.5" />
                            {formatDate(batch.startDate)}
                          </p>
                        )}
                        {batch.meetingUrl && (
                          <a
                            href={batch.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center justify-end gap-1 text-primary hover:underline"
                          >
                            <VideoCameraIcon className="size-3.5" />
                            Meeting link
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
