import { z } from 'zod'
import { and, asc, eq, gt, inArray, or } from 'drizzle-orm'

import { userIdSchema } from '@narada/auth/ids'
import { hasBatchPermission } from '@narada/auth/permissions'
import { batch, chapter, enrollment, exam, evaluation, type SchoolDbExecutor } from '@narada/db'
import { compoundCursor, dateCursorField, paginateResponse, uuidCursorField } from '../utils/cursor'
import { internalError, notFound } from '../error'
import { proficiencyLevelSchema } from './shared'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const createExamSchema = z.object({
  studentId: userIdSchema,
  chapterId: z.uuid(),
  scheduledAt: z.iso.datetime().transform(v => new Date(v)),
})

export const updateExamSchema = requireNonEmpty(
  z.object({
    scheduledAt: z.iso
      .datetime()
      .transform(v => new Date(v))
      .optional(),
    status: z.enum(['scheduled', 'inProgress', 'cancelled']).optional(),
  }),
)

export const listExamsQuerySchema = z.object({
  status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']).optional(),
  cursor: compoundCursor({ scheduledAt: dateCursorField(), id: uuidCursorField() }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export const recordResultSchema = z.object({
  level: proficiencyLevelSchema,
  notes: z.string().optional(),
})

export type Exam = typeof exam.$inferSelect
export type CreateExamData = z.infer<typeof createExamSchema>
export type UpdateExamData = z.infer<typeof updateExamSchema>
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>
export type RecordResultData = z.infer<typeof recordResultSchema>

export async function findVisibleExamsForUser(
  db: SchoolDbExecutor,
  userId: string,
  options: ListExamsQuery,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  const visibleBatchIds = await manageableBatchIds(db, userId)
  if (visibleBatchIds.length === 0) {
    return findManyExams(db, [eq(exam.studentId, userId)], options)
  }

  const visibleChapterIds = db
    .select({ id: chapter.id })
    .from(chapter)
    .innerJoin(batch, eq(batch.trackId, chapter.trackId))
    .where(inArray(batch.id, visibleBatchIds))

  const visibleStudentIds = db
    .select({ id: enrollment.userId })
    .from(enrollment)
    .where(inArray(enrollment.batchId, visibleBatchIds))

  const visibleExamCondition = or(
    eq(exam.studentId, userId),
    and(inArray(exam.chapterId, visibleChapterIds), inArray(exam.studentId, visibleStudentIds)),
  )

  if (!visibleExamCondition) {
    return findManyExams(db, [eq(exam.studentId, userId)], options)
  }

  return findManyExams(db, [visibleExamCondition], options)
}

export async function findAllExams(
  db: SchoolDbExecutor,
  options: ListExamsQuery,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  return findManyExams(db, [], options)
}

async function findManyExams(
  db: SchoolDbExecutor,
  baseConditions: ReturnType<typeof eq>[],
  options: ListExamsQuery,
): Promise<{ items: Exam[]; nextCursor: string | null }> {
  const { status, cursor, limit } = options
  const conditions = [...baseConditions]

  if (status) conditions.push(eq(exam.status, status))
  if (cursor) {
    const cursorWhere = or(
      gt(exam.scheduledAt, cursor.scheduledAt),
      and(eq(exam.scheduledAt, cursor.scheduledAt), gt(exam.id, cursor.id)),
    )

    if (cursorWhere) conditions.push(cursorWhere)
  }

  const rows = await db.query.exam.findMany({
    where: and(...conditions),
    orderBy: [asc(exam.scheduledAt), asc(exam.id)],
    limit: limit + 1,
  })

  return paginateResponse(rows, limit, item => ({ scheduledAt: item.scheduledAt, id: item.id }))
}

export async function findExamById(
  db: SchoolDbExecutor,
  examId: string,
): Promise<Exam | undefined> {
  const row = await db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, examId),
  })

  if (!row) {
    return undefined
  }

  return row
}

export async function createExam(db: SchoolDbExecutor, data: CreateExamData): Promise<Exam> {
  const rows = await db.insert(exam).values(data).returning()

  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

export async function canManageExam(
  db: SchoolDbExecutor,
  userId: string,
  data: Pick<Exam, 'studentId' | 'chapterId'>,
): Promise<boolean> {
  const chapterRow = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, data.chapterId),
    columns: { trackId: true },
  })

  if (!chapterRow) return false
  const studentRows = await db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .innerJoin(batch, eq(batch.id, enrollment.batchId))
    .where(and(eq(enrollment.userId, data.studentId), eq(batch.trackId, chapterRow.trackId)))

  const studentBatchIds = studentRows.map(row => row.batchId)
  if (studentBatchIds.length === 0) return false
  const rows = await db
    .select({ role: enrollment.role })
    .from(enrollment)
    .where(and(eq(enrollment.userId, userId), inArray(enrollment.batchId, studentBatchIds)))

  return rows.some(row => hasBatchPermission(row.role, { exam: ['update'] }))
}

export async function updateExam(
  db: SchoolDbExecutor,
  examId: string,
  data: UpdateExamData,
): Promise<Exam> {
  const rows = await db.update(exam).set(data).where(eq(exam.id, examId)).returning()
  const row = rows.at(0)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function recordExamResult(
  db: SchoolDbExecutor,
  examId: string,
  evaluatorId: string,
  data: RecordResultData,
): Promise<Exam> {
  const examRow = await db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, examId),
  })

  if (!examRow) throw notFound()
  return db.transaction(async tx => {
    const evalRows = await tx
      .insert(evaluation)
      .values({
        studentId: examRow.studentId,
        chapterId: examRow.chapterId,
        level: data.level,
        notes: data.notes,
        evaluatorId,
      })
      .returning()

    const evalRow = evalRows.at(0)
    if (!evalRow) throw internalError()
    const rows = await tx
      .update(exam)
      .set({ evaluationId: evalRow.id, performedAt: new Date(), status: 'completed' })
      .where(eq(exam.id, examId))
      .returning()

    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  })
}

async function manageableBatchIds(db: SchoolDbExecutor, userId: string): Promise<string[]> {
  const rows = await db
    .select({ batchId: enrollment.batchId, role: enrollment.role })
    .from(enrollment)
    .where(eq(enrollment.userId, userId))

  return rows
    .filter(row => hasBatchPermission(row.role, { exam: ['update'] }))
    .map(row => row.batchId)
}
