import { z } from 'zod'
import { and, asc, eq, gt, inArray, or } from 'drizzle-orm'

import { hasBatchPermission } from '@narada/auth/permissions'
import { batch, chapter, enrollment, exam, evaluation, type SchoolDbExecutor } from '@narada/db'
import { compoundCursor, dateCursorField, paginateResponse, uuidCursorField } from '../utils/cursor'
import { internalError, notFound, unprocessable } from '../error'
import { proficiencyLevelSchema } from './shared'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const createExamSchema = z.object({
  studentId: z.uuid(),
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

// The list views (a student's own exams, or everything an instructor/admin can see) need enough
// to render on their own — a bare Exam row has only chapterId and evaluationId, no chapter title
// or result. exam.chapterId → chapter and exam.evaluationId → evaluation are both already
// declared in relations.ts, so this is one eager-loaded query, not a fan-out.
export type ExamWithDetail = Exam & {
  chapter: Pick<typeof chapter.$inferSelect, 'id' | 'code' | 'title' | 'trackId'>
  evaluation: Pick<typeof evaluation.$inferSelect, 'level' | 'notes'> | null
}

export async function findVisibleExamsForProfile(
  db: SchoolDbExecutor,
  profileId: string,
  options: ListExamsQuery,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
  const visibleBatchIds = await manageableBatchIds(db, profileId)
  if (visibleBatchIds.length === 0) {
    return findManyExams(db, [eq(exam.studentId, profileId)], options)
  }

  const visibleChapterIds = db
    .select({ id: chapter.id })
    .from(chapter)
    .innerJoin(batch, eq(batch.trackId, chapter.trackId))
    .where(inArray(batch.id, visibleBatchIds))

  const visibleStudentIds = db
    .select({ id: enrollment.profileId })
    .from(enrollment)
    .where(inArray(enrollment.batchId, visibleBatchIds))

  const visibleExamCondition = or(
    eq(exam.studentId, profileId),
    and(inArray(exam.chapterId, visibleChapterIds), inArray(exam.studentId, visibleStudentIds)),
  )

  if (!visibleExamCondition) {
    return findManyExams(db, [eq(exam.studentId, profileId)], options)
  }

  return findManyExams(db, [visibleExamCondition], options)
}

export async function findAllExams(
  db: SchoolDbExecutor,
  options: ListExamsQuery,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
  return findManyExams(db, [], options)
}

async function findManyExams(
  db: SchoolDbExecutor,
  baseConditions: ReturnType<typeof eq>[],
  options: ListExamsQuery,
): Promise<{ items: ExamWithDetail[]; nextCursor: string | null }> {
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
    with: {
      chapter: { columns: { id: true, code: true, title: true, trackId: true } },
      evaluation: { columns: { level: true, notes: true } },
    },
  })

  return paginateResponse(rows, limit, item => ({ scheduledAt: item.scheduledAt, id: item.id }))
}

export async function findExamById(
  db: SchoolDbExecutor,
  examId: string,
): Promise<Exam | undefined> {
  return db.query.exam.findFirst({
    where: (t, { eq }) => eq(t.id, examId),
  })
}

export async function createExam(db: SchoolDbExecutor, data: CreateExamData): Promise<Exam> {
  const rows = await db.insert(exam).values(data).returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

async function findStudentBatchIds(
  db: SchoolDbExecutor,
  studentId: string,
  chapterId: string,
): Promise<string[]> {
  const chapterRow = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: { trackId: true },
  })

  if (!chapterRow) {
    return []
  }

  const rows = await db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .innerJoin(batch, eq(batch.id, enrollment.batchId))
    .where(and(eq(enrollment.profileId, studentId), eq(batch.trackId, chapterRow.trackId)))

  return rows.map(r => r.batchId)
}

export async function validateExamInput(
  db: SchoolDbExecutor,
  data: Pick<Exam, 'studentId' | 'chapterId'>,
): Promise<void> {
  const batchIds = await findStudentBatchIds(db, data.studentId, data.chapterId)
  if (batchIds.length === 0) {
    throw unprocessable('student is not enrolled in any batch for this track')
  }
}

export async function canManageExam(
  db: SchoolDbExecutor,
  profileId: string,
  data: Pick<Exam, 'studentId' | 'chapterId'>,
): Promise<boolean> {
  const studentBatchIds = await findStudentBatchIds(db, data.studentId, data.chapterId)
  if (studentBatchIds.length === 0) return false
  const rows = await db
    .select({ role: enrollment.role })
    .from(enrollment)
    .where(and(eq(enrollment.profileId, profileId), inArray(enrollment.batchId, studentBatchIds)))

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
  examRecord: Pick<Exam, 'id' | 'studentId' | 'chapterId'>,
  evaluatorId: string,
  data: RecordResultData,
): Promise<Exam> {
  return db.transaction(async tx => {
    const evalRows = await tx
      .insert(evaluation)
      .values({
        studentId: examRecord.studentId,
        chapterId: examRecord.chapterId,
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
      .where(eq(exam.id, examRecord.id))
      .returning()

    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    return row
  })
}

async function manageableBatchIds(db: SchoolDbExecutor, profileId: string): Promise<string[]> {
  const rows = await db
    .select({ batchId: enrollment.batchId, role: enrollment.role })
    .from(enrollment)
    .where(eq(enrollment.profileId, profileId))

  return rows
    .filter(row => hasBatchPermission(row.role, { exam: ['update'] }))
    .map(row => row.batchId)
}
