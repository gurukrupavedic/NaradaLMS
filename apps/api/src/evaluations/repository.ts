import { eq, inArray, type SQL } from 'drizzle-orm'

import { chapter, enrollment, evaluation, track, type SchoolDb } from '@narada/db'

import { paginateResponse } from '../utils/cursor'
import { findNullsLastPage } from '../utils/keyset'
import type { CreateEvaluationData, Evaluation, FindEvaluationsData } from './schema'

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
  const rows = await findNullsLastPage({
    sortColumn: evaluation.evaluatedAt,
    idColumn: evaluation.id,
    idOrder: 'desc',
    conditions: baseConditions,
    cursor: cursor && { sortValue: cursor.evaluatedAt, id: cursor.id },
    limit,
    fetch: q => db.query.evaluation.findMany(q),
  })

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

/** The one write path into `evaluation` — a single-cell grade and a bulk "promote" both funnel
 * here via service.ts's `createEvaluations` (one item or many; an empty array is a valid no-op,
 * e.g. every item filtered out for already being certified). */
export async function insertMany(
  db: SchoolDb,
  rows: (CreateEvaluationData & { batchId: string; evaluatorId: string })[],
): Promise<Evaluation[]> {
  if (rows.length === 0) {
    return []
  }

  return db.insert(evaluation).values(rows).returning()
}

/**
 * Every evaluation a student has ever received, across every track — not scoped to a batch or
 * current enrollment. Backs the dashboard's "my achievements" view: a student certified in
 * tracks 1-8 over several years is enrolled in at most one batch today, so scoping to current
 * enrollment would hide the other seven (dashboard.ts's own reasoning, ported as-is — this is a
 * real product requirement, not an implementation detail).
 */
export async function findAllForStudent(
  db: SchoolDb,
  studentId: string,
  courseId: string,
): Promise<Evaluation[]> {
  return db.query.evaluation.findMany({
    where: (t, { and: andCols, eq: eqCol, inArray: inArrayCol }) =>
      andCols(
        eqCol(t.studentId, studentId),
        // An evaluation belongs to a course through its chapter's track.
        inArrayCol(
          t.chapterId,
          db
            .select({ id: chapter.id })
            .from(chapter)
            .innerJoin(track, eq(track.id, chapter.trackId))
            .where(eq(track.courseId, courseId)),
        ),
      ),
    orderBy: (t, { desc: descCol }) => descCol(t.evaluatedAt),
  })
}

/**
 * Backs the dashboard's "teaching" summary: one query for every evaluation across every batch an
 * instructor/TA teaches, bucketed back per batch in application code (two taught batches can
 * share a track, so chapterId alone can't tell them apart — only the actual roster, already known
 * to the caller, can). Empty either input list means no possible match — short-circuit rather
 * than let `inArray([])` reach Postgres.
 */
export async function findForChaptersAndStudents(
  db: SchoolDb,
  chapterIds: string[],
  studentIds: string[],
): Promise<Evaluation[]> {
  if (chapterIds.length === 0 || studentIds.length === 0) {
    return []
  }

  return db.query.evaluation.findMany({
    where: (t, { and: andCols, inArray: inArrayCol }) =>
      andCols(inArrayCol(t.chapterId, chapterIds), inArrayCol(t.studentId, studentIds)),
  })
}
