import { and, asc, eq, gt, isNull, or, type SQL } from 'drizzle-orm'

import { batch, enrollment, evaluation, exam, type SchoolDbExecutor } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import type { ExamReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import type {
  CreateExamData,
  Exam,
  FindExamsData,
  RecordExamResultData,
  UpdateExamData,
} from './schema'
import { assertValidTransition } from './transitions'

const RECORDABLE_STATUSES: Exam['status'][] = ['scheduled', 'inProgress']

export async function findExams(
  { status, cursor, limit }: FindExamsData,
  visibility: ExamReadScope,
  db: SchoolDbExecutor,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (visibility.kind === 'own') {
    conditions.push(eq(exam.studentId, visibility.profileId))
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

export async function findById(id: string, db: SchoolDbExecutor): Promise<Exam> {
  const row = await findByIdOrUndefined(id, db)
  if (!row) {
    throw notFound()
  }

  return row
}

async function findByIdOrUndefined(id: string, db: SchoolDbExecutor): Promise<Exam | undefined> {
  return db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

export async function createExam(data: CreateExamData, db: SchoolDbExecutor): Promise<Exam> {
  await assertValidExamAssignment(data.studentId, data.chapterId, db)

  const rows = await db.insert(exam).values(data).returning()
  const row = rows.at(0)
  if (!row) {
    throw internalError()
  }

  return row
}

// A student can only be examined on a chapter belonging to a track they're
// enrolled in as a student.
async function assertValidExamAssignment(
  studentId: string,
  chapterId: string,
  db: SchoolDbExecutor,
): Promise<void> {
  const chapterRow = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: { trackId: true },
  })

  if (!chapterRow) {
    throw unprocessable('chapter not found')
  }

  const enrolled = await db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .innerJoin(batch, eq(enrollment.batchId, batch.id))
    .where(
      and(
        eq(enrollment.profileId, studentId),
        eq(enrollment.role, 'student'),
        eq(batch.trackId, chapterRow.trackId),
      ),
    )
    .limit(1)

  if (enrolled.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this chapter')
  }
}

export async function updateExam(
  id: string,
  data: UpdateExamData,
  db: SchoolDbExecutor,
): Promise<Exam> {
  const existing = await findById(id, db)
  if (data.status && data.status !== existing.status) {
    assertValidTransition(existing.status, data.status)
  }

  const rows = await db
    .update(exam)
    .set(data)
    .where(and(eq(exam.id, id), eq(exam.status, existing.status)))
    .returning()

  const row = rows.at(0)
  if (!row) {
    // Either the exam was deleted, or its status changed since we read it.
    const stillExists = await findByIdOrUndefined(id, db)
    throw stillExists ? conflict('exam status changed concurrently') : notFound()
  }

  return row
}

export async function recordExamResult(
  id: string,
  evaluatorId: string,
  data: RecordExamResultData,
  db: SchoolDbExecutor,
): Promise<Exam> {
  const existing = await findById(id, db)
  if (!RECORDABLE_STATUSES.includes(existing.status)) {
    throw conflict(`cannot record a result for an exam in '${existing.status}' status`)
  }

  return db.transaction(async tx => {
    const evalRows = await tx
      .insert(evaluation)
      .values({
        studentId: existing.studentId,
        chapterId: existing.chapterId,
        level: data.level,
        notes: data.notes,
        evaluatorId,
      })
      .returning()

    const evalRow = evalRows.at(0)
    if (!evalRow) {
      throw internalError()
    }

    const rows = await tx
      .update(exam)
      .set({ evaluationId: evalRow.id, performedAt: new Date(), status: 'completed' })
      .where(and(eq(exam.id, id), isNull(exam.evaluationId)))
      .returning()

    const row = rows.at(0)
    if (!row) {
      throw conflict('a result was already recorded for this exam')
    }

    return row
  })
}
