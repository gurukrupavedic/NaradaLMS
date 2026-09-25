/**
 * The admin content catalog's types and pure helpers.
 *
 * Deliberately a different shape from `lib/models/dashboard.ts`'s `LadderTrack`,
 * because it answers a different question. A student's track view is *their*
 * record — their marks, their next chapter, published chapters only. An admin
 * opening the same track is not looking at anybody's progress: they want the
 * full catalog including drafts, and the state of the content pipeline behind
 * each chapter.
 *
 * That pipeline is the point. The live database has 113 published chapters and
 * not one of them has `script`, `textUrl`, segments or audio — so every student
 * sees a syllabus of titles with nothing behind them. Nothing else in the app
 * surfaces that; the catalog puts it in the primary column.
 *
 * `lib/api/resources/catalog.ts` builds real `CatalogTrack`s from `GET /v1/tracks` (via
 * `lib/api/reshape.ts`'s `buildCatalogTrack`). This module is their shape, plus the derivations
 * (`pipelineOf`/`isReady`/`summariseTrack`) that read it.
 */

export type ScriptCode = 'te' | 'sa' | 'en'

export type ChapterContentState = {
  script: ScriptCode | null
  hasText: boolean
  segments: number
  audioCount: number
  /** Every audio asset has its segment time-ranges mapped. */
  mapped: boolean
}

export type CatalogChapter = {
  id: string
  code: string
  title: string
  status: 'draft' | 'published'
  content: ChapterContentState
}

export type CatalogTrack = {
  id: string
  name: string
  order: number
  batchCodes: string[]
  chapters: CatalogChapter[]
}

// Every real chapter's content state. None of `hasText`/`segments`/`audioCount`/`mapped` exist on
// `ApiChapter` (the track list doesn't carry them), so `lib/api/reshape.ts`'s `buildCatalogTrack`
// gives every real chapter this exact empty state — which means the pipeline view under-reports any
// chapter that does have authored content. It stays empty until the API returns real content state.
export const EMPTY: ChapterContentState = {
  script: null,
  hasText: false,
  segments: 0,
  audioCount: 0,
  mapped: false,
}

/**
 * The four pipeline stages, in the order the API requires them: text must exist
 * before segments can address offsets into it, segments must exist before audio
 * can be mapped to them. Rendering them in order means a half-built chapter
 * reads as a prefix, and the stage that is actually blocking is the first empty
 * cell.
 */
export const PIPELINE_STAGES = ['Text', 'Segments', 'Audio', 'Mapped'] as const

export function pipelineOf(content: ChapterContentState): boolean[] {
  return [
    content.hasText,
    content.segments > 0,
    content.audioCount > 0,
    content.audioCount > 0 && content.mapped,
  ]
}

export function isReady(content: ChapterContentState): boolean {
  return pipelineOf(content).every(Boolean)
}

export function summariseTrack(track: CatalogTrack) {
  const published = track.chapters.filter(c => c.status === 'published')
  return {
    total: track.chapters.length,
    published: published.length,
    drafts: track.chapters.length - published.length,
    ready: track.chapters.filter(c => isReady(c.content)).length,
    // The number that matters: chapters a student can already open and find
    // nothing in.
    publishedButEmpty: published.filter(c => !c.content.hasText).length,
  }
}
