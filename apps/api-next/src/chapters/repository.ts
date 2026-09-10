import { and, eq, inArray, max, min, ne } from 'drizzle-orm'
import {
  audioAsset,
  audioMapping,
  chapter,
  chapterScript,
  chapterScriptSegment,
  segment,
  stagedUpload,
  type SchoolDb,
} from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'

/**
 * The chapter row plus its content, nested exactly as `chapters/service.ts::findById` needs to
 * reshape it — draft-chapter gating needs no extra work here: scripts/audio only exist as children
 * of a chapter row, so a `where` clause that already excludes a draft chapter for `learnerPreview`
 * means its content is never fetched at all, not merely hidden.
 */
export async function findById(db: SchoolDb, id: string, view: ContentReadView) {
  return db.query.chapter.findFirst({
    where: (t, { and, eq }) =>
      view.kind === 'authoring' ? eq(t.id, id) : and(eq(t.id, id), eq(t.status, 'published')),
    with: {
      scripts: {
        orderBy: (s, { asc }) => asc(s.order),
        with: { scriptSegments: { with: { segment: true } } },
      },
      audioAssets: {
        orderBy: (a, { asc }) => asc(a.order),
        with: { audioMappings: { orderBy: (m, { asc }) => asc(m.audioStart) } },
      },
    },
  })
}

// ── Scripts + segments (write side) ─────────────────────────────────────────

export async function findSegmentsForChapter(db: SchoolDb, chapterId: string) {
  return db.query.segment.findMany({
    where: (t, { eq }) => eq(t.chapterId, chapterId),
    orderBy: (t, { asc }) => asc(t.order),
  })
}

/**
 * Whether any segment in `segmentIds` is still relied on by a script other than
 * `excludeChapterScriptId`, or by any audio mapping — the guard that decides whether it's safe to
 * resize a chapter's segment timeline (see `chapters/service.ts::upsertScript`'s own doc comment).
 */
export async function findSegmentDependents(
  db: SchoolDb,
  segmentIds: string[],
  excludeChapterScriptId: string | null,
): Promise<{ hasOtherScriptDependents: boolean; hasAudioMappings: boolean }> {
  if (segmentIds.length === 0) {
    return { hasOtherScriptDependents: false, hasAudioMappings: false }
  }

  const scriptDeps = await db
    .select({ chapterScriptId: chapterScriptSegment.chapterScriptId })
    .from(chapterScriptSegment)
    .where(
      excludeChapterScriptId
        ? and(
            inArray(chapterScriptSegment.segmentId, segmentIds),
            ne(chapterScriptSegment.chapterScriptId, excludeChapterScriptId),
          )
        : inArray(chapterScriptSegment.segmentId, segmentIds),
    )
    .limit(1)

  const mappingDeps = await db
    .select({ segmentId: audioMapping.segmentId })
    .from(audioMapping)
    .where(inArray(audioMapping.segmentId, segmentIds))
    .limit(1)

  return { hasOtherScriptDependents: scriptDeps.length > 0, hasAudioMappings: mappingDeps.length > 0 }
}

/** Full replace: only safe to call once `findSegmentDependents` has confirmed nothing else relies on the chapter's current segments. */
export async function replaceChapterSegments(db: SchoolDb, chapterId: string, count: number) {
  await db.delete(segment).where(eq(segment.chapterId, chapterId))
  if (count === 0) return []
  return db
    .insert(segment)
    .values(Array.from({ length: count }, (_, i) => ({ chapterId, order: i })))
    .returning()
}

async function nextChapterScriptOrder(db: SchoolDb, chapterId: string): Promise<number> {
  const rows = await db.select({ id: chapterScript.id }).from(chapterScript).where(eq(chapterScript.chapterId, chapterId))
  return rows.length + 1
}

/** Insert-or-update by the chapter's unique `(chapterId, script)` — `order` is set once, at creation, and left untouched on later saves. */
export async function upsertChapterScript(
  db: SchoolDb,
  chapterId: string,
  script: string,
  data: { label: string; shortLabel: string; fontClass: string; text: string },
) {
  const order = await nextChapterScriptOrder(db, chapterId)
  const rows = await db
    .insert(chapterScript)
    .values({ chapterId, script: script as never, order, ...data })
    .onConflictDoUpdate({
      target: [chapterScript.chapterId, chapterScript.script],
      set: data,
    })
    .returning()
  return rows.at(0)
}

/** Full replace, scoped to one `chapterScriptId` — never touches sibling scripts' offsets or the shared `segment` rows themselves. */
export async function replaceChapterScriptSegments(
  db: SchoolDb,
  chapterScriptId: string,
  pairs: { segmentId: string; start: number; end: number }[],
) {
  await db.delete(chapterScriptSegment).where(eq(chapterScriptSegment.chapterScriptId, chapterScriptId))
  if (pairs.length === 0) return []
  return db
    .insert(chapterScriptSegment)
    .values(pairs.map(p => ({ chapterScriptId, segmentId: p.segmentId, start: p.start, end: p.end })))
    .returning()
}

// ── Staged uploads ───────────────────────────────────────────────────────────

export async function createStagedUpload(
  db: SchoolDb,
  data: {
    chapterId: string
    purpose: 'audio'
    objectKey: string
    contentType: string
    createdByUserId: string
    expiresAt: Date
  },
) {
  const rows = await db.insert(stagedUpload).values(data).returning()
  return rows.at(0)
}

export async function findStagedUpload(db: SchoolDb, id: string, chapterId: string, purpose: 'audio') {
  return db.query.stagedUpload.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, id), eq(t.chapterId, chapterId), eq(t.purpose, purpose)),
  })
}

export async function markStagedUploadExpired(db: SchoolDb, id: string): Promise<void> {
  await db.update(stagedUpload).set({ status: 'expired' }).where(eq(stagedUpload.id, id))
}

export async function markStagedUploadCompleted(db: SchoolDb, id: string): Promise<void> {
  await db.update(stagedUpload).set({ status: 'completed', completedAt: new Date() }).where(eq(stagedUpload.id, id))
}

// ── Audio assets + mappings ──────────────────────────────────────────────────

export async function nextAudioAssetOrder(db: SchoolDb, chapterId: string): Promise<number> {
  const rows = await db.select({ id: audioAsset.id }).from(audioAsset).where(eq(audioAsset.chapterId, chapterId))
  return rows.length + 1
}

/** `onConflictDoNothing` on `(chapterId, objectKey)` makes a retried confirm-upload call idempotent — see `findAudioAssetByObjectKey` for the re-fetch half of that. */
export async function insertAudioAsset(
  db: SchoolDb,
  data: { chapterId: string; objectKey: string; label: string | null; reciter: string; duration: number; order: number },
) {
  const rows = await db.insert(audioAsset).values(data).onConflictDoNothing().returning()
  return rows.at(0)
}

export async function findAudioAssetByObjectKey(db: SchoolDb, chapterId: string, objectKey: string) {
  return db.query.audioAsset.findFirst({
    where: (t, { and, eq }) => and(eq(t.chapterId, chapterId), eq(t.objectKey, objectKey)),
    with: { audioMappings: true },
  })
}

export async function findAudioAssetById(db: SchoolDb, audioId: string, chapterId: string) {
  return db.query.audioAsset.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, audioId), eq(t.chapterId, chapterId)),
  })
}

export async function deleteAudioAssetRow(db: SchoolDb, audioId: string): Promise<void> {
  await db.delete(audioAsset).where(eq(audioAsset.id, audioId))
}

export async function countSegmentsBelongingToChapter(
  db: SchoolDb,
  chapterId: string,
  segmentIds: string[],
): Promise<number> {
  if (segmentIds.length === 0) return 0
  const rows = await db
    .select({ id: segment.id })
    .from(segment)
    .where(and(eq(segment.chapterId, chapterId), inArray(segment.id, segmentIds)))
  return rows.length
}

/** Full replace, scoped to one `audioAssetId` — safe unconditionally, since a mapping has no downstream dependents of its own. */
export async function replaceAudioMappings(
  db: SchoolDb,
  audioAssetId: string,
  pairs: { segmentId: string; audioStart: number; audioEnd: number }[],
) {
  await db.delete(audioMapping).where(eq(audioMapping.audioAssetId, audioAssetId))
  if (pairs.length === 0) return []
  return db
    .insert(audioMapping)
    .values(pairs.map(p => ({ audioAssetId, segmentId: p.segmentId, audioStart: p.audioStart, audioEnd: p.audioEnd })))
    .returning()
}

// ── Chapter catalog management (title/order/status/archive) ────────────────

/** One past the highest `order` among this track's active (non-archived) chapters — where a newly created or restored chapter goes. */
export async function nextChapterOrder(db: SchoolDb, trackId: string): Promise<number> {
  const rows = await db
    .select({ max: max(chapter.order) })
    .from(chapter)
    .where(and(eq(chapter.trackId, trackId), eq(chapter.archived, false)))
  return (rows[0]?.max ?? -1) + 1
}

/**
 * One below the lowest `order` in the track, across every row (active or already archived) — so
 * archiving permanently drops a chapter out of the active ordering range and can never collide
 * with a future active chapter's `order`. See `chapters/service.ts::updateChapter`'s doc comment.
 */
export async function nextArchivedOrder(db: SchoolDb, trackId: string): Promise<number> {
  const rows = await db.select({ min: min(chapter.order) }).from(chapter).where(eq(chapter.trackId, trackId))
  return (rows[0]?.min ?? 0) - 1
}

export async function insertChapter(
  db: SchoolDb,
  data: { trackId: string; code: string; title: string; order: number },
) {
  const rows = await db
    .insert(chapter)
    .values({ ...data, status: 'draft', script: null, archived: false })
    .returning()
  return rows[0]
}

export async function updateChapterRow(
  db: SchoolDb,
  id: string,
  data: Partial<{ code: string; title: string; script: 'te' | 'sa' | 'en' | null; status: 'draft' | 'published'; archived: boolean; order: number }>,
) {
  const rows = await db.update(chapter).set(data).where(eq(chapter.id, id)).returning()
  return rows[0]
}

export async function findChapterRowById(db: SchoolDb, id: string) {
  return db.query.chapter.findFirst({ where: (t, { eq }) => eq(t.id, id) })
}

export async function findActiveChapterIds(db: SchoolDb, trackId: string): Promise<string[]> {
  const rows = await db
    .select({ id: chapter.id })
    .from(chapter)
    .where(and(eq(chapter.trackId, trackId), eq(chapter.archived, false)))
  return rows.map(r => r.id)
}

/**
 * Reassigns every id in `orderedIds` to its index as the new `order`, in one transaction, via a
 * temp-offset two-phase update — a single UPDATE across multiple rows isn't reliably safe against
 * a plain (non-deferrable) unique index in Postgres (a mid-statement transient collision is a real
 * gotcha, not hypothetical), and converting `chapter_trackId_order_uidx` to a deferrable
 * constraint would drift from what Drizzle's schema builder models. `1_000_000 + index` is a temp
 * range no realistic track's active chapters, and no archived chapter's negative `order`
 * (`nextArchivedOrder` above), could ever reach.
 */
export async function reorderChapters(db: SchoolDb, orderedIds: string[]): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    await db.update(chapter).set({ order: 1_000_000 + index }).where(eq(chapter.id, id))
  }
  for (const [index, id] of orderedIds.entries()) {
    await db.update(chapter).set({ order: index }).where(eq(chapter.id, id))
  }
}
