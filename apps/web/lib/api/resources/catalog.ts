import { fetchApi, mutateApi, notFound } from '@/lib/api/client'
import { buildCatalogTrack } from '@/lib/api/reshape'
import { getSelectedProfileId } from '@/lib/auth/profile-store'
import type { CatalogChapter, CatalogTrack } from '@/lib/models/catalog'
import type { ApiBatch, ApiScriptKey, ApiTrack } from '@/lib/api/api-types'

// GET /v1/tracks (drafts included for an admin) plus the batches each track is taught in, reshaped
// for the admin catalog. Two requests, not one per track: the batches call carries no roster or
// schedule (`withDetail` is left off) since only `trackId` and `code` are needed to group them.
export async function fetchCatalogTracks(): Promise<CatalogTrack[]> {
  const profileId = getSelectedProfileId()
  const [apiTracks, batchesPage] = await Promise.all([
    fetchApi<ApiTrack[]>('/tracks'),
    fetchApi<{ items: ApiBatch[] }>(`/profiles/${profileId}/batches?limit=100`),
  ])

  const batchCodesByTrackId = new Map<string, string[]>()
  for (const batch of batchesPage.items) {
    const codes = batchCodesByTrackId.get(batch.trackId) ?? []
    codes.push(batch.code)
    batchCodesByTrackId.set(batch.trackId, codes)
  }

  return apiTracks.map(track => buildCatalogTrack(track, batchCodesByTrackId.get(track.id) ?? []))
}

// One track of that same catalog. There is no endpoint for a single track — `GET /tracks` is what
// the app reads — so this fetches the catalog and picks it out.
export async function fetchCatalogTrack(trackId: string): Promise<CatalogTrack> {
  const track = (await fetchCatalogTracks()).find(candidate => candidate.id === trackId)
  return track ? track : notFound(`Track ${trackId}`)
}

// The four chapter mutations are real (`chapters/route.ts`'s `POST /` and `PATCH /:chapterId`, and
// `tracks/route.ts`'s `PUT /:trackId/chapters/order`). They resolve to void: the optimistic cache
// write in `use-catalog-mutations.ts` already holds the new state, so the only thing the caller
// needs back is whether it failed.

// Only the fields the real schema understands are forwarded; anything else in `patch` (the other
// `content` fields beyond `script`) is dropped rather than sent.
export async function saveChapter(id: string, patch: Partial<CatalogChapter>): Promise<void> {
  const body: {
    code?: string
    title?: string
    status?: 'draft' | 'published'
    script?: ApiScriptKey | null
  } = {}
  if (patch.code !== undefined) body.code = patch.code
  if (patch.title !== undefined) body.title = patch.title
  if (patch.status !== undefined) body.status = patch.status
  if (patch.content !== undefined) body.script = patch.content.script

  // The schema requires at least one recognized field; skip the round trip rather than send an
  // empty body the server would reject.
  if (Object.keys(body).length === 0) return

  await mutateApi(`/chapters/${id}`, 'PATCH', body)
}

export async function saveChapterOrder(trackId: string, orderedIds: string[]): Promise<void> {
  await mutateApi(`/tracks/${trackId}/chapters/order`, 'PUT', { chapterIds: orderedIds })
}

export async function createChapter(trackId: string, chapter: CatalogChapter): Promise<void> {
  await mutateApi('/chapters', 'POST', { trackId, code: chapter.code, title: chapter.title })
}

// "Delete" archives rather than removes the row — a chapter that ever had student activity can't
// be hard-deleted (real `evaluation`/`exam` rows reference it). `archived` is a real column,
// distinct from `status`; the chapter drops out of every catalog list once the refetch settles.
export async function deleteChapter(id: string): Promise<void> {
  await mutateApi(`/chapters/${id}`, 'PATCH', { status: 'draft', archived: true })
}
