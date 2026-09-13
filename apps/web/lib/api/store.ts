import { fetchApi } from '@/lib/api/client'
import { buildCatalogTrack } from '@/lib/api/reshape'
import { getSelectedProfileId } from '@/lib/auth/profile-store'
import type { ApiBatch, ApiTrack } from '@/lib/api/api-types'
import type { CatalogTrack } from '@/lib/mock-catalog'

/**
 * A writable stand-in for the database — now only for what still has no real backend:
 * `track.name`/`subtitle` (`saveTrack`/`writeTrack`) and `chapter.isCertification`, neither of
 * which has a real column (`subtitle` and `isCertification` are mock-only — see `mock-catalog.ts`
 * and `reshape.ts::buildCatalogTrack`, which hardcodes `isCertification: false` for real data).
 * Chapter title/order/status/delete write for real now (`lib/api/resources.ts`'s four mutations go
 * through `mutateApi`, calling `resetCatalogCache` below afterward) — see PARITY_PLAN.md §17 in
 * the api-next checkout for what's still mocked.
 *
 * Without this the catalog reads were read-only, and that quietly broke the whole
 * optimistic-mutation story: the edit applied instantly, then `onSettled`
 * invalidated the query, the refetch re-read the same source, and the
 * change vanished about a second later. The Query wiring was correct — the
 * "server" simply had no memory, so it kept answering with the old syllabus.
 *
 * That is exactly the failure an optimistic UI is supposed to surface, and it
 * only shows up if writes and reads go through the same place. So they do —
 * seeded from a real `GET /v1/tracks` snapshot the first time either is called,
 * rather than the static fixture this module used before `web-next` had
 * real auth to fetch with.
 *
 * The seed is a fresh array from `buildCatalogTrack`, not a reference into
 * anything cached elsewhere: mutating a shared object would leak edits into
 * every other consumer of that same real-data query.
 *
 * Scope is one JavaScript context. Edits made in the browser live until a full
 * reload, at which point the module reloads and re-seeds from a fresh snapshot
 * — the honest behaviour for a prototype with no database behind the writes.
 */
let tracks: CatalogTrack[] | null = null
let seeding: Promise<CatalogTrack[]> | null = null

async function seed(): Promise<CatalogTrack[]> {
  if (tracks) return tracks
  // Concurrent callers (the catalog list and a hovered track both firing on the same admin
  // overview render) share one in-flight fetch rather than each seeding their own copy — the
  // second seed would silently discard whatever the first one had already been edited to.
  if (seeding) return seeding

  seeding = (async () => {
    const profileId = getSelectedProfileId()
    const [apiTracks, batchesPage] = await Promise.all([
      fetchApi<ApiTrack[]>('/tracks'),
      // No `withDetail` — only `trackId`/`code` are needed to group batches under their track,
      // and the roster/schedule that flag adds is real weight this call doesn't use.
      fetchApi<{ items: ApiBatch[] }>(`/profiles/${profileId}/batches?limit=100`),
    ])

    const batchCodesByTrackId = new Map<string, string[]>()
    for (const batch of batchesPage.items) {
      const codes = batchCodesByTrackId.get(batch.trackId) ?? []
      codes.push(batch.code)
      batchCodesByTrackId.set(batch.trackId, codes)
    }

    tracks = apiTracks.map(track => buildCatalogTrack(track, batchCodesByTrackId.get(track.id) ?? []))
    return tracks
  })()

  return seeding
}

export function readTracks(): Promise<CatalogTrack[]> {
  return seed()
}

export async function readTrack(id: string): Promise<CatalogTrack | undefined> {
  const all = await seed()
  return all.find(track => track.id === id)
}

function updateTrack(id: string, update: (track: CatalogTrack) => CatalogTrack) {
  // A write can only follow a read that already seeded the store — every write's own call site
  // (lib/api/resources.ts's mutations) is reached from a screen that has already rendered the
  // track it's editing. `tracks` being null here would mean a write raced ahead of any read,
  // which is a caller bug, not a state this function should paper over.
  if (!tracks) return
  tracks = tracks.map(track => (track.id === id ? update(track) : track))
}

export function writeTrack(
  trackId: string,
  patch: Partial<Pick<CatalogTrack, 'name' | 'subtitle'>>,
) {
  updateTrack(trackId, track => ({ ...track, ...patch }))
}

/**
 * Chapter title/order/status/delete now write for real (`lib/api/resources.ts`'s four mutations
 * go through `mutateApi`, not this store) — a caller calls this right after one of those succeeds
 * so the *next* read re-seeds from a fresh `GET /tracks` instead of `seed()`'s normal
 * memoize-forever behavior. This also wipes any still-mock-only edit to `track.subtitle` or
 * `chapter.isCertification` (neither has a real column — see `resources.ts`'s doc comment on
 * those four mutations) — an accepted, honest side effect: the re-seed can't know about an edit
 * the real API was never told about.
 */
export function resetCatalogCache() {
  tracks = null
  seeding = null
}
