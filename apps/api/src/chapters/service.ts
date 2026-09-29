import type { SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, orNotFound, unprocessable } from '../error'
import { signedDownloadUrl } from '../utils/contentStorage'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import type { AccessPolicy, ContentReadView } from '../utils/accessPolicy'
import * as repository from './repository'
import type {
  AudioAsset,
  Chapter,
  ChapterDetail,
  CreateChapterData,
  ScriptText,
  UpdateChapterData,
} from './schema'

// Constant per script code — nothing has ever varied these per chapter, so they're a static
// lookup rather than a per-chapter DB row (the now-removed `chapterScript` table).
const SCRIPT_META: Record<'sa' | 'te' | 'en', { label: string; short: string; fontClass: string }> = {
  sa: { label: 'Sanskrit', short: 'SA', fontClass: 'font-deva' },
  te: { label: 'Telugu', short: 'TE', fontClass: 'font-telugu' },
  en: { label: 'English', short: 'EN', fontClass: '' },
}

type ChapterServiceContext = { db: SchoolDbClient }

/** The one question the read path asks of `AccessPolicy` — narrow so a unit test can hand in a stub. */
type CourseContentGate = Pick<AccessPolicy, 'canReadCourseContent'>

/**
 * `findById` for a *reader*. A chapter in a course the caller isn't part of 404s exactly like one
 * that doesn't exist — never 403 — so guessing an id can't disclose what another course teaches.
 * The write paths call plain `findById` (they are admin-only, and read back what they just wrote).
 */
export async function findByIdForReader(
  context: ChapterServiceContext,
  id: string,
  view: ContentReadView,
  gate: CourseContentGate,
): Promise<ChapterDetail> {
  const courseId = await repository.findCourseId(context.db, id)
  if (courseId === undefined || !(await gate.canReadCourseContent(courseId))) {
    throw notFound()
  }

  return findById(context, id, view)
}

/** A draft chapter under `learnerPreview` view 404s exactly like a nonexistent one — never 403 — so guessing an ID can't disclose hidden content. */
export async function findById(
  context: ChapterServiceContext,
  id: string,
  view: ContentReadView,
): Promise<ChapterDetail> {
  const row = orNotFound(await repository.findById(context.db, id, view))

  // `row.segments` is already ordered (the repository query's own `orderBy`) — each script's list
  // just filters to the segments that happen to have text for it, keeping that same order. A
  // segment with no confident text for a script yet (see `segmentText`'s own doc comment) simply
  // has no entry in that script's list.
  const scripts: ScriptText[] = (['sa', 'te', 'en'] as const).map(key => ({
    key,
    ...SCRIPT_META[key],
    segments: row.segments.flatMap(seg => {
      const text = seg.segmentTexts.find(st => st.script === key)?.text
      return text === undefined ? [] : [{ id: seg.id, text }]
    }),
  }))

  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    scripts,
    // Signed in parallel, not one at a time — a chapter with several takes shouldn't pay for N
    // sequential round trips to R2.
    audio: await Promise.all(row.audioAssets.map(toAudioAssetResponse)),
  }
}

async function toAudioAssetResponse(row: {
  id: string
  label: string | null
  reciter: string
  duration: number
  objectKey: string
  audioMappings: { segmentId: string; audioStart: number; audioEnd: number }[]
}): Promise<AudioAsset> {
  return {
    id: row.id,
    label: row.label,
    reciter: row.reciter,
    duration: row.duration,
    url: await signedDownloadUrl(row.objectKey),
    mappings: row.audioMappings.map(m => ({
      segmentId: m.segmentId,
      audioStart: m.audioStart,
      audioEnd: m.audioEnd,
    })),
  }
}

// ── Chapter catalog management (title/order/status/archive) ────────────────

function toChapter(row: {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
}): Chapter {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
  }
}

export async function createChapter(context: ChapterServiceContext, data: CreateChapterData): Promise<Chapter> {
  const row = await withConstraintMapping(
    () =>
      context.db.transaction(async tx => {
        const order = await repository.nextChapterOrder(tx, data.trackId)
        return repository.insertChapter(tx, { trackId: data.trackId, code: data.code, title: data.title, order })
      }),
    {
      [DbConstraint.chapterTrackIdFk]: () => unprocessable('unknown or invalid track'),
      [DbConstraint.chapterTrackIdCodeUnique]: () => conflict('a chapter with this code already exists in this track'),
    },
  )

  if (!row) throw internalError()
  return toChapter(row)
}

/**
 * `archived` is a real column, distinct from `status` (see `packages/db/src/schema/school.ts`'s
 * `chapter.archived` doc comment) — a chapter that ever had student activity can't be hard-deleted
 * (`evaluation`/`exam` both reference `chapterId`), so "delete" in the admin UI sends
 * `{ status: 'draft', archived: true }` through this same endpoint rather than a separate one.
 *
 * A transition into or out of `archived` also reassigns `order`, inside the same transaction as
 * the field update: archiving pushes the chapter below every other row in the track so it can
 * never collide with a future active chapter's order (`nextArchivedOrder`); restoring (`archived:
 * false` on a currently-archived row) appends it back at the end (`nextChapterOrder`) — there's no
 * restore UI yet, but the schema allows it, so this stays correct if one is added later.
 */
export async function updateChapter(
  context: ChapterServiceContext,
  chapterId: string,
  data: UpdateChapterData,
): Promise<Chapter> {
  const row = await withConstraintMapping(
    () =>
      context.db.transaction(async tx => {
        const existing = orNotFound(await repository.findChapterRowById(tx, chapterId))

        let order: number | undefined
        if (data.archived === true && !existing.archived) {
          order = await repository.nextArchivedOrder(tx, existing.trackId)
        } else if (data.archived === false && existing.archived) {
          order = await repository.nextChapterOrder(tx, existing.trackId)
        }

        return repository.updateChapterRow(tx, chapterId, order === undefined ? data : { ...data, order })
      }),
    {
      [DbConstraint.chapterTrackIdCodeUnique]: () => conflict('a chapter with this code already exists in this track'),
    },
  )

  if (!row) throw internalError()
  return toChapter(row)
}
