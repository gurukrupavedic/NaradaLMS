import { mutateApi, notFound, send } from '@/lib/api/client'
import type { CatalogChapter, CatalogTrack } from '@/lib/models/catalog'
import { readTrack, readTracks, resetCatalogCache, writeTrack } from '@/lib/api/store'
import type { ApiScriptKey } from '@/lib/api/api-types'

// GET /v1/tracks — admin view, drafts included. Reads through the store (lib/api/store.ts), which
// seeds itself from this same real endpoint on first call and reflects edits made this session
// from then on — see that module's own doc comment for why.
export function fetchCatalogTracks(): Promise<CatalogTrack[]> {
  return readTracks()
}

// GET /v1/tracks/:trackId — admin view, drafts included.
export async function fetchCatalogTrack(trackId: string): Promise<CatalogTrack> {
  const track = await readTrack(trackId)
  return track ? track : notFound(`Track ${trackId}`)
}

// Named for the endpoint each one stands in for. `saveTrack` (name/subtitle — `subtitle` has no
// real column, see `store.ts`'s doc comment) is still mocked via `send()` + the local store; the
// four chapter mutations below are real (`chapters/route.ts`'s `POST /`, `PATCH /:chapterId`, and
// `tracks/route.ts`'s `PUT /:trackId/chapters/order` — real gaps closed 2026-09-09). They resolve
// to void: the optimistic cache write in `use-catalog-mutations.ts` already holds the new state,
// so the only thing the caller needs back is whether it failed.

// `isCertification` has no real column (see `store.ts`'s doc comment) — a real PATCH wouldn't know
// what to do with it, so only the fields the real schema understands are forwarded; anything else
// in `patch` (isCertification, other `content` fields beyond `script`) is silently dropped rather
// than sent.
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

  // A patch touching only `isCertification` has nothing real to send (the schema requires at
  // least one recognized field) — the optimistic cache write already applied it locally, and
  // that's genuinely all this field gets today; skip the round trip rather than send an empty
  // body the server would reject.
  if (Object.keys(body).length === 0) return

  await mutateApi(`/chapters/${id}`, 'PATCH', body)
  resetCatalogCache()
}

export async function saveChapterOrder(trackId: string, orderedIds: string[]): Promise<void> {
  await mutateApi(`/tracks/${trackId}/chapters/order`, 'PUT', { chapterIds: orderedIds })
  resetCatalogCache()
}

export async function createChapter(trackId: string, chapter: CatalogChapter): Promise<void> {
  await mutateApi('/chapters', 'POST', { trackId, code: chapter.code, title: chapter.title })
  resetCatalogCache()
}

// "Delete" archives rather than removes the row — a chapter that ever had student activity can't
// be hard-deleted (real `evaluation`/`exam` rows reference it). `archived` is a real column,
// distinct from `status`; the chapter drops out of every catalog list once this settles and the
// cache resets, but — unlike the old mocked behaviour — not before, since there's no local array
// to splice out of anymore.
export async function deleteChapter(id: string): Promise<void> {
  await mutateApi(`/chapters/${id}`, 'PATCH', { status: 'draft', archived: true })
  resetCatalogCache()
}

export async function saveTrack(
  trackId: string,
  patch: Partial<Pick<CatalogTrack, 'name' | 'subtitle'>>,
): Promise<void> {
  await send('PATCH', `/tracks/${trackId}`, patch)
  writeTrack(trackId, patch)
}

// Real writes against apps/api's chapters domain — unlike every mutation above, these have a
// real endpoint to reach (`chapters/route.ts`), so they go through `mutateApi`, not the mocked
// `send`. See `lib/api/client.ts`'s own doc comment for why the split exists.
