import { and, eq, inArray, ne } from 'drizzle-orm'
import { audioAsset, audioMapping, chapterScript, chapterScriptSegment, segment, stagedUpload, type SchoolDb } from '@narada/db'

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
