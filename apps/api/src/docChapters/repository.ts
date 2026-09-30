import { and, count, eq, ilike, or, sql } from 'drizzle-orm'

import { docChapter, docChapterUpload, segment, segmentText, uuidv7, type SchoolDb } from '@narada/db'

import type { ParsedHeading } from './parse'

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
