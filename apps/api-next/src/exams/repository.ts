import { and, asc, eq, gt, isNull, or, type SQL } from 'drizzle-orm'

import { evaluation, exam, type SchoolDb } from '@narada/db'

import type { ExamReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import type { CreateExamData, Exam, FindExamsData, UpdateExamData } from './schema'

export type Evaluation = typeof evaluation.$inferSelect

/** Lists exams visible under `scope`, ordered by `(scheduledAt, id)` with a matching compound cursor. */
export async function findMany(
  db: SchoolDb,
  { status, cursor, limit }: FindExamsData,
  scope: ExamReadScope,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (scope.kind === 'own') {
    conditions.push(eq(exam.studentId, scope.profileId))
  }

  if (status) {
    conditions.push(eq(exam.status, status))
  }

  if (cursor) {
    // `or()` is only typed as possibly-undefined for a zero-argument call; both
    // branches here are always-defined `SQL`, so the result is never undefined.
    conditions.push(
      or(
        gt(exam.scheduledAt, cursor.scheduledAt),
        and(eq(exam.scheduledAt, cursor.scheduledAt), gt(exam.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.exam.findMany({
    where: and(...conditions),
    orderBy: [asc(exam.scheduledAt), asc(exam.id)],
    limit: limit + 1,
  })

  return paginateResponse(rows, limit, item => ({ scheduledAt: item.scheduledAt, id: item.id }))
}

export async function findById(db: SchoolDb, id: string): Promise<Exam | undefined> {
  return db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

export async function findChapterTrackId(
  db: SchoolDb,
  chapterId: string,
): Promise<{ trackId: string } | undefined> {
  return db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: { trackId: true },
  })
}

export async function insert(
  db: SchoolDb,
  data: CreateExamData & { batchId: string },
): Promise<Exam | undefined> {
  const rows = await db.insert(exam).values(data).returning()
  return rows.at(0)
}

/**
 * Optimistic compare-and-set: only applies `data` if the exam's status still matches
 * `expectedStatus`. Returns `undefined` on a lost race (concurrent status change) as well as on
 * a missing exam — the service distinguishes those two cases with a follow-up read.
 */
export async function updateGuarded(
  db: SchoolDb,
  id: string,
  data: UpdateExamData,
  expectedStatus: Exam['status'],
): Promise<Exam | undefined> {
  const rows = await db
    .update(exam)
    .set(data)
    .where(and(eq(exam.id, id), eq(exam.status, expectedStatus)))
    .returning()

  return rows.at(0)
}

export async function insertEvaluation(
  db: SchoolDb,
  values: {
    studentId: string
    chapterId: string
    batchId: string | null
    level: Evaluation['level']
    notes: string | undefined
    evaluatorId: string
  },
): Promise<Evaluation | undefined> {
  const rows = await db.insert(evaluation).values(values).returning()
  return rows.at(0)
}

/**
 * Guarded by both `evaluationId IS NULL` and a compare-and-set on `expectedStatus` (the status
 * the service read before opening the transaction). The first half makes a concurrent second
 * result lose; the second half makes a concurrent status change (e.g. a committed cancellation)
 * lose here instead of being silently overwritten. Returns `undefined` for a missing exam and
 * for either lost race — the service distinguishes them with a follow-up read.
 */
export async function complete(
  db: SchoolDb,
  id: string,
  evaluationId: string,
  performedAt: Date,
  expectedStatus: Exam['status'],
): Promise<Exam | undefined> {
  const rows = await db
    .update(exam)
    .set({ evaluationId, performedAt, status: 'completed' })
    .where(and(eq(exam.id, id), isNull(exam.evaluationId), eq(exam.status, expectedStatus)))
    .returning()

  return rows.at(0)
}
