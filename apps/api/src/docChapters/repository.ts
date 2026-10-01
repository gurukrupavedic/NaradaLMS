import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import {
  audioMapping,
  chapter,
  docChapter,
  docChapterUpload,
  segment,
  segmentText,
  track,
  uuidv7,
  type SchoolDb,
} from '@narada/db'

import type { ParsedHeading } from './parse'
import type { ScriptKey } from './schema'

export async function insertUpload(
  db: SchoolDb,
  data: {
    id: string
    courseId: string
    uploadedByProfileId?: string
    saObjectKey: string
    teObjectKey: string
    enObjectKey: string
  },
) {
  const rows = await db.insert(docChapterUpload).values(data).returning()
  const row = rows[0]
  if (!row) throw new Error('insertUpload: insert returned no row')
  return row
}

/**
 * The most recently created upload for a course — what the worker actually processes (see
 * `worker.ts`'s doc comment for why it looks this up rather than trusting a specific upload id
 * baked into its job payload).
 */
export function findLatestUploadByCourse(db: SchoolDb, courseId: string) {
  return db.query.docChapterUpload.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.courseId, courseId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })
}

/**
 * The existing doc chapter for `(courseId, title)`, if any, plus whether any of its segments is
 * already assigned to a course chapter.
 *
 * Check-then-act, with no row lock: nothing today writes `segment.chapterId` concurrently with a
 * re-upload (the assignment endpoint doesn't exist yet), so there's no live race. Once it does,
 * revisit this alongside that endpoint's own transaction — a `.for('update')` lock here (or on
 * the assignment write) is the fix, not something to add speculatively now.
 */
export async function findExistingHeading(
  db: SchoolDb,
  courseId: string,
  title: string,
): Promise<{ id: string; hasAssignedSegment: boolean } | undefined> {
  const row = await db.query.docChapter.findFirst({
    where: (t, { and: andCol, eq: eqCol }) => andCol(eqCol(t.courseId, courseId), eqCol(t.title, title)),
    columns: { id: true },
    with: { segments: { columns: { chapterId: true } } },
  })

  if (!row) return undefined
  return { id: row.id, hasAssignedSegment: row.segments.some(s => s.chapterId !== null) }
}

/**
 * Replaces every segment of an existing, not-yet-assigned doc chapter with freshly parsed ones —
 * old segments (and their `segmentText`/`audioMapping` rows, via cascade) are deleted first. Never
 * call this on a doc chapter with any assigned segment; `upsertParsedHeading` in `service.ts` is the
 * one caller and only reaches this branch after confirming that via `findExistingHeading`.
 */
export async function replaceHeadingSegments(
  db: SchoolDb,
  docChapterId: string,
  data: { track: string; sourceUploadId: string; verses: ParsedHeading['verses'] },
): Promise<void> {
  await db
    .update(docChapter)
    .set({ track: data.track, sourceUploadId: data.sourceUploadId })
    .where(eq(docChapter.id, docChapterId))
  await db.delete(segment).where(eq(segment.docChapterId, docChapterId))
  await insertSegments(db, docChapterId, data.verses)
}

export async function createHeadingWithSegments(
  db: SchoolDb,
  data: { courseId: string; title: string; track: string; sourceUploadId: string; verses: ParsedHeading['verses'] },
): Promise<void> {
  const rows = await db
    .insert(docChapter)
    .values({ courseId: data.courseId, title: data.title, track: data.track, sourceUploadId: data.sourceUploadId })
    .returning({ id: docChapter.id })
  const row = rows[0]
  if (!row) throw new Error('createHeadingWithSegments: insert returned no row')

  await insertSegments(db, row.id, data.verses)
}

/**
 * Segment ids are generated here, in JS (`uuidv7`, the same function `segment.id`'s own
 * `$defaultFn` uses), rather than left to the database default and read back — a multi-row INSERT
 * does not guarantee its `RETURNING` rows come back in `VALUES` order, and `segmentText` needs to
 * know each segment's id before it can be inserted at all.
 */
async function insertSegments(db: SchoolDb, docChapterId: string, verses: ParsedHeading['verses']): Promise<void> {
  if (verses.length === 0) return

  const segmentIds = verses.map(() => uuidv7())
  await db.insert(segment).values(
    verses.map((verse, index) => ({
      id: segmentIds[index]!,
      docChapterId,
      order: index + 1,
      flaggedForReview: verse.flaggedForReview,
    })),
  )

  const textRows = verses.flatMap((verse, index) => {
    const segmentId = segmentIds[index]!
    const rows: { segmentId: string; script: 'sa' | 'te' | 'en'; text: string }[] = [
      { segmentId, script: 'sa', text: verse.sa },
    ]
    if (verse.te) rows.push({ segmentId, script: 'te', text: verse.te })
    if (verse.en) rows.push({ segmentId, script: 'en', text: verse.en })
    return rows
  })

  if (textRows.length > 0) {
    await db.insert(segmentText).values(textRows)
  }
}

export type DocChapterListRow = {
  id: string
  title: string
  track: string
  verseCount: number
  assignedCount: number
}

export async function listDocChapters(db: SchoolDb, courseId: string, q?: string): Promise<DocChapterListRow[]> {
  const searchFilter =
    q && q.trim().length > 0
      ? or(ilike(docChapter.title, `%${q}%`), ilike(docChapter.track, `%${q}%`))
      : undefined

  const rows = await db
    .select({
      id: docChapter.id,
      title: docChapter.title,
      track: docChapter.track,
      verseCount: count(segment.id),
      assignedCount: sql<number>`count(${segment.chapterId})`.mapWith(Number),
    })
    .from(docChapter)
    .leftJoin(segment, eq(segment.docChapterId, docChapter.id))
    .where(and(eq(docChapter.courseId, courseId), searchFilter))
    .groupBy(docChapter.id)
    .orderBy(docChapter.title)

  return rows
}

// ── Doc chapter workspace (segment cleanup) ────────────────────────────────

export function findDocChapterDetail(db: SchoolDb, docChapterId: string) {
  return db.query.docChapter.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, docChapterId),
    with: {
      segments: {
        orderBy: (s, { asc }) => asc(s.order),
        with: { segmentTexts: true },
      },
    },
  })
}

/** A segment row, only if it actually belongs to `docChapterId` — guards a segment id from a different doc chapter reaching a mutation through a mismatched URL. */
export function findSegmentInDocChapter(db: SchoolDb, docChapterId: string, segmentId: string) {
  return db.query.segment.findFirst({
    where: (t, { and: andCol, eq: eqCol }) => andCol(eqCol(t.id, segmentId), eqCol(t.docChapterId, docChapterId)),
    with: { segmentTexts: true },
  })
}

/** The segment immediately after `order` in the same doc chapter, if any — for merge-next. */
export function findNextSegment(db: SchoolDb, docChapterId: string, order: number) {
  return db.query.segment.findFirst({
    where: (t, { and: andCol, eq: eqCol, gt }) => andCol(eqCol(t.docChapterId, docChapterId), gt(t.order, order)),
    orderBy: (t, { asc }) => asc(t.order),
    with: { segmentTexts: true },
  })
}

export async function findOrderedSegmentIds(db: SchoolDb, docChapterId: string): Promise<string[]> {
  const rows = await db
    .select({ id: segment.id })
    .from(segment)
    .where(eq(segment.docChapterId, docChapterId))
    .orderBy(segment.order)
  return rows.map(r => r.id)
}

/**
 * Reassigns every id in `orderedIds` to its (1-based) index as the new `order`, via the same
 * temp-offset two-phase update as `chapters/repository.ts::reorderChapters` — a single UPDATE
 * across multiple rows isn't reliably safe against the plain (non-deferrable)
 * `segment_docChapterId_order_uidx` unique index. Called after every split/merge/delete so a doc
 * chapter's segment order always stays a clean, contiguous `1..N` — split's new segment in
 * particular needs *somewhere* to go, and there's no other way to make room for it.
 */
export async function renumberSegments(db: SchoolDb, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return

  for (const offset of [1_000_000, 0]) {
    const cases = sql.join(
      orderedIds.map((id, index) => sql`when ${id}::uuid then ${offset + index + 1}::int`),
      sql` `,
    )
    await db
      .update(segment)
      .set({ order: sql`case ${segment.id} ${cases} end` })
      .where(inArray(segment.id, orderedIds))
  }
}

/** `order` is a placeholder (0, never used by a real segment — real orders start at 1) — the caller renumbers immediately after via `renumberSegments`. */
export async function insertSegmentRow(
  db: SchoolDb,
  data: { id: string; docChapterId: string; chapterId: string | null; flaggedForReview: boolean },
): Promise<void> {
  await db.insert(segment).values({ ...data, order: 0 })
}

export async function updateSegment(
  db: SchoolDb,
  segmentId: string,
  data: Partial<{ chapterId: string | null; flaggedForReview: boolean }>,
): Promise<void> {
  await db.update(segment).set(data).where(eq(segment.id, segmentId))
}

export async function upsertSegmentText(
  db: SchoolDb,
  segmentId: string,
  script: ScriptKey,
  text: string,
): Promise<void> {
  await db
    .insert(segmentText)
    .values({ segmentId, script, text })
    .onConflictDoUpdate({ target: [segmentText.segmentId, segmentText.script], set: { text } })
}

/** Cascades `segmentText` and any `audioMapping` rows via their FKs — see `packages/db/src/schema/school.ts`. */
export async function deleteSegmentRow(db: SchoolDb, segmentId: string): Promise<void> {
  await db.delete(segment).where(eq(segment.id, segmentId))
}

// ── Assignment (doc chapter segments → course chapters) ────────────────────

/**
 * `chapterId -> courseId` for whichever of `chapterIds` exist, through their track — the one place
 * this domain needs to reach into `chapter`/`track` at all, to confirm an assignment's target
 * chapter actually belongs to the same course as the doc chapter being assigned from.
 */
export async function findChapterCourseIds(db: SchoolDb, chapterIds: string[]): Promise<Map<string, string>> {
  if (chapterIds.length === 0) return new Map()

  const rows = await db
    .select({ chapterId: chapter.id, courseId: track.courseId })
    .from(chapter)
    .innerJoin(track, eq(track.id, chapter.trackId))
    .where(inArray(chapter.id, chapterIds))
  return new Map(rows.map(r => [r.chapterId, r.courseId]))
}

/**
 * Bulk-sets `segment.chapterId`, grouped by distinct target value into one `UPDATE ... WHERE id IN
 * (...)` per group — cheap at this scale (a doc chapter has at most a few hundred segments, and
 * real assignments cluster into just a handful of distinct chapters plus maybe one "unassigned"
 * group), and far simpler than a single giant CASE expression for no real benefit.
 */
export async function setSegmentAssignments(
  db: SchoolDb,
  assignments: { segmentId: string; chapterId: string | null }[],
): Promise<void> {
  const segmentIdsByChapterId = new Map<string | null, string[]>()
  for (const { segmentId, chapterId } of assignments) {
    const group = segmentIdsByChapterId.get(chapterId)
    if (group) group.push(segmentId)
    else segmentIdsByChapterId.set(chapterId, [segmentId])
  }

  for (const [chapterId, segmentIds] of segmentIdsByChapterId) {
    await db.update(segment).set({ chapterId }).where(inArray(segment.id, segmentIds))
  }
}

/** Called when a segment's chapter assignment changes — any `audioMapping` already made against it belonged to its *previous* chapter's audio and makes no sense attached to whatever it's assigned to now (or to nothing). See `service.ts::setAssignments`'s doc comment. */
export async function deleteAudioMappingsForSegments(db: SchoolDb, segmentIds: string[]): Promise<void> {
  if (segmentIds.length === 0) return
  await db.delete(audioMapping).where(inArray(audioMapping.segmentId, segmentIds))
}
