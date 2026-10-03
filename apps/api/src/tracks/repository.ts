import { count, countDistinct, eq, inArray, sql } from 'drizzle-orm'

import { audioAsset, audioMapping, segment, segmentText, type SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'
import type { ChapterContentState, TrackWithChapters } from './schema'

// Archived is invisible in every view, not just learner-preview — an archived chapter is hidden,
// not merely draft (see `packages/db/src/schema/school.ts`'s `chapter.archived` doc comment).

export async function findAll(
  db: SchoolDb,
  view: ContentReadView,
  courseId: string,
): Promise<TrackWithChapters[]> {
  const tracks = await db.query.track.findMany({
    where: (t, { eq: eqCol }) => eqCol(t.courseId, courseId),
    orderBy: (t, { asc }) => asc(t.order),
    with: {
      chapters: {
        orderBy: (c, { asc }) => asc(c.order),
        where: (c, { and, eq: eqCol }) => and(view.kind === 'authoring' ? undefined : eqCol(c.status, 'published'), eqCol(c.archived, false)),
      },
    },
  })

  // Learner dashboard shares this exact query (`dashboard/service.ts` calls `findAll` with
  // `{kind: 'learnerPreview'}`) — content readiness is an authoring-only concern (apps/web's admin
  // "Pipeline" column), so every dashboard load skips these two extra aggregate queries entirely.
  if (view.kind !== 'authoring') return tracks

  const chapterIds = tracks.flatMap(t => t.chapters.map(c => c.id))
  const contentByChapterId = await findChapterContentState(db, chapterIds)

  return tracks.map(t => ({
    ...t,
    chapters: t.chapters.map(c => ({ ...c, content: contentByChapterId.get(c.id) })),
  }))
}

/**
 * Per-chapter content readiness: `hasText`/`segments` come from `segment`/`segmentText`
 * (`segment.chapterId` set at assignment time, per `docChapters/service.ts`), `audioCount` from
 * `audioAsset`, and `mapped` from whether `audioMapping` fully covers every (asset, segment) pair
 * for the chapter — the same "every audio asset's segment time-ranges mapped" definition
 * `apps/web/lib/models/catalog.ts`'s `ChapterContentState` doc comment states. Two grouped queries
 * rather than one join across both sides: `segment`/`segmentText` and `audioAsset`/`audioMapping`
 * don't share a join key, and joining all four at once would fan out one side's count across the
 * other's rows.
 */
export async function findChapterContentState(
  db: SchoolDb,
  chapterIds: string[],
): Promise<Map<string, ChapterContentState>> {
  const result = new Map<string, ChapterContentState>()
  if (chapterIds.length === 0) return result

  const segmentRows = await db
    .select({
      chapterId: segment.chapterId,
      segments: count(segment.id),
      hasText: sql<boolean>`count(${segmentText.segmentId}) > 0`,
    })
    .from(segment)
    .leftJoin(segmentText, eq(segmentText.segmentId, segment.id))
    .where(inArray(segment.chapterId, chapterIds))
    .groupBy(segment.chapterId)

  const audioRows = await db
    .select({
      chapterId: audioAsset.chapterId,
      audioCount: countDistinct(audioAsset.id),
      mappingCount: count(audioMapping.segmentId),
    })
    .from(audioAsset)
    .leftJoin(audioMapping, eq(audioMapping.audioAssetId, audioAsset.id))
    .where(inArray(audioAsset.chapterId, chapterIds))
    .groupBy(audioAsset.chapterId)

  const segmentsByChapterId = new Map(segmentRows.map(r => [r.chapterId as string, r]))
  const audioByChapterId = new Map(audioRows.map(r => [r.chapterId as string, r]))

  for (const chapterId of chapterIds) {
    const segments = segmentsByChapterId.get(chapterId)?.segments ?? 0
    const hasText = segmentsByChapterId.get(chapterId)?.hasText ?? false
    const audioCount = audioByChapterId.get(chapterId)?.audioCount ?? 0
    const mappingCount = audioByChapterId.get(chapterId)?.mappingCount ?? 0

    result.set(chapterId, {
      hasText,
      segments,
      audioCount,
      mapped: segments > 0 && audioCount > 0 && mappingCount === segments * audioCount,
    })
  }

  return result
}

export async function exists(db: SchoolDb, id: string): Promise<boolean> {
  const row = await db.query.track.findFirst({ where: (t, { eq }) => eq(t.id, id), columns: { id: true } })
  return row !== undefined
}

/** Whether `id` is a track of `courseId` — a slot is course-scoped, so a request must name a track
 * of the slot's own course. */
export async function existsInCourse(db: SchoolDb, id: string, courseId: string): Promise<boolean> {
  const row = await db.query.track.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, id), eq(t.courseId, courseId)),
    columns: { id: true },
  })
  return row !== undefined
}

export async function findById(
  db: SchoolDb,
  id: string,
  view: ContentReadView,
): Promise<TrackWithChapters | undefined> {
  return db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      chapters: {
        orderBy: (c, { asc }) => asc(c.order),
        where: (c, { and, eq }) => and(view.kind === 'authoring' ? undefined : eq(c.status, 'published'), eq(c.archived, false)),
      },
    },
  })
}

/**
 * The track immediately before `trackId` in its course, by `order` — `undefined` for the course's
 * first track (nothing is a prerequisite to it) or an unknown `trackId`. Ordering by `order` rather
 * than assuming `order - 1` tolerates gaps; tracks are static seeded content with no reorder API, so
 * `order` is trusted as the course's real track sequence.
 */
export async function findPreviousTrack(
  db: SchoolDb,
  trackId: string,
): Promise<{ id: string } | undefined> {
  const current = await db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, trackId),
    columns: { courseId: true, order: true },
  })
  if (!current) {
    return undefined
  }

  return db.query.track.findFirst({
    where: (t, { and, eq, lt }) => and(eq(t.courseId, current.courseId), lt(t.order, current.order)),
    orderBy: (t, { desc }) => desc(t.order),
    columns: { id: true },
  })
}

/**
 * Every track in `courseId` mapped to the id of the track immediately before it — the bulk
 * counterpart to {@link findPreviousTrack}, one query for the whole course instead of one per
 * batch (backs `batches/service.ts::findOpenBatches`'s eligibility check across every open batch at
 * once). A track missing from the map is the course's first — nothing prerequisite to it.
 */
export async function findPreviousTrackMap(db: SchoolDb, courseId: string): Promise<Map<string, string>> {
  const rows = await db.query.track.findMany({
    where: (t, { eq }) => eq(t.courseId, courseId),
    orderBy: (t, { asc }) => asc(t.order),
    columns: { id: true },
  })

  const map = new Map<string, string>()
  for (let i = 1; i < rows.length; i++) {
    map.set(rows[i]!.id, rows[i - 1]!.id)
  }
  return map
}
