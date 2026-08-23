import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { AdminBatchList, type AdminBatchGroup } from '@/components/admin/batch-list'
import { getBatches } from '@/lib/api/batches'
import { fetchAllPages } from '@/lib/api/pagination'
import { getTracks } from '@/lib/api/tracks'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import type { BatchStatus } from '@/lib/types'

// Ordered by what an admin scanning the whole school cares about first.
const STATUS_ORDER: BatchStatus[] = ['active', 'upcoming', 'completed']

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
  const trackLabel = (trackId: string) => {
    const track = trackMap.get(trackId)
    return track ? `Track ${track.order} — ${track.name}` : 'Unknown track'
  }

  const groups: AdminBatchGroup[] = STATUS_ORDER.map(status => ({
    status,
    batches: batches
      .filter(batch => batch.status === status)
      .sort((a, b) => {
        const trackOrder = (trackMap.get(a.trackId)?.order ?? 0) - (trackMap.get(b.trackId)?.order ?? 0)
        return trackOrder !== 0 ? trackOrder : a.code.localeCompare(b.code)
      })
      .map(batch => ({
        id: batch.id,
        code: batch.code,
        status: batch.status,
        startDate: batch.startDate,
        meetingUrl: batch.meetingUrl,
        trackLabel: trackLabel(batch.trackId),
      })),
  })).filter(group => group.batches.length > 0)

  return (
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold">School batches</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Every batch across the school — {batches.length} total. Click one for details.
          </p>
        </div>

        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches yet.</p>
        ) : (
          <AdminBatchList groups={groups} />
        )}
      </div>
    </AppShell>
  )
}
