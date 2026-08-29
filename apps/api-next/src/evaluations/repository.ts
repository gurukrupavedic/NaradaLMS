import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm'

import { chapter, enrollment, evaluation, type SchoolDb } from '@narada/db'

import { paginateResponse } from '../utils/cursor'
import type { CreateEvaluationData, Evaluation, FindEvaluationsData } from './schema'

// Duplicated from exams/repository.ts's identical helper — both are placeholders for a real
// `chapters` domain (PARITY_PLAN.md §12/§4.1, not yet built). Delete both copies in favor of one
// real one once that domain exists; not worth a shared-utils abstraction for a 6-line query today.
export async function findChapterTrackId(
  db: SchoolDb,
  chapterId: string,
): Promise<{ trackId: string } | undefined> {
  return db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: { trackId: true },
  })
}

function enrolledProfileIdsInBatch(db: SchoolDb, batchId: string) {
  return db.select({ profileId: enrollment.profileId }).from(enrollment).where(eq(enrollment.batchId, batchId))
}

function chapterIdsInTrack(db: SchoolDb, trackId: string) {
  return db.select({ id: chapter.id }).from(chapter).where(eq(chapter.trackId, trackId))
}

/**
 * The shared pagination shape behind both list endpoints: order newest-first by
 * `(evaluatedAt desc nulls last, id desc)`, split into a null-aware two-phase query — `inArray`
 * against a subquery (rather than a materialized ID list) means an empty-chapters/empty-roster
 * track/batch naturally yields zero matching rows in SQL, with no separate empty-list guard
 * needed in application code.
 */
async function findEvaluations(
  db: SchoolDb,
  baseConditions: SQL[],
  { cursor, limit }: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  if (cursor?.evaluatedAt === null) {
    const rows = await db.query.evaluation.findMany({
      where: and(...baseConditions, isNull(evaluation.evaluatedAt), lt(evaluation.id, cursor.id)),
      orderBy: desc(evaluation.id),
      limit: limit + 1,
    })

    return paginateResponse(rows, limit, item => ({ evaluatedAt: item.evaluatedAt, id: item.id }))
  }

  const nonNullConditions = [...baseConditions, isNotNull(evaluation.evaluatedAt)]
  if (cursor) {
    // `or()` is only typed as possibly-undefined for a zero-argument call; both branches here are
    // always-defined `SQL`, so the result is never undefined.
    nonNullConditions.push(
      or(
        lt(evaluation.evaluatedAt, cursor.evaluatedAt),
        and(eq(evaluation.evaluatedAt, cursor.evaluatedAt), lt(evaluation.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.evaluation.findMany({
    where: and(...nonNullConditions),
    orderBy: [sql`${evaluation.evaluatedAt} desc nulls last`, desc(evaluation.id)],
    limit: limit + 1,
  })

  if (rows.length <= limit) {
    const nullRows = await db.query.evaluation.findMany({
      where: and(...baseConditions, isNull(evaluation.evaluatedAt)),
      orderBy: desc(evaluation.id),
      limit: limit + 1 - rows.length,
    })

    rows.push(...nullRows)
  }

  return paginateResponse(rows, limit, item => ({ evaluatedAt: item.evaluatedAt, id: item.id }))
}

/** Every evaluation for a student currently enrolled in `batchId`, on a chapter in `trackId`. */
export async function findForBatch(
  db: SchoolDb,
  batchId: string,
  trackId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  return findEvaluations(
    db,
    [
      inArray(evaluation.studentId, enrolledProfileIdsInBatch(db, batchId)),
      inArray(evaluation.chapterId, chapterIdsInTrack(db, trackId)),
    ],
    query,
  )
}

/** Same scope as {@link findForBatch}, additionally restricted to one student. */
export async function findForStudentInBatch(
  db: SchoolDb,
  batchId: string,
  trackId: string,
  studentId: string,
  query: FindEvaluationsData,
): Promise<{ items: Evaluation[]; nextCursor: string | null }> {
  return findEvaluations(
    db,
    [
      eq(evaluation.studentId, studentId),
      inArray(evaluation.studentId, enrolledProfileIdsInBatch(db, batchId)),
      inArray(evaluation.chapterId, chapterIdsInTrack(db, trackId)),
    ],
    query,
  )
}

export async function insert(
  db: SchoolDb,
  data: CreateEvaluationData & { batchId: string; evaluatorId: string },
): Promise<Evaluation | undefined> {
  const rows = await db.insert(evaluation).values(data).returning()
  return rows.at(0)
}
