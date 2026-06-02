import { z } from 'zod'
import { and, asc, eq, gt, or } from 'drizzle-orm'

import { userIdSchema } from '@narada/auth/ids'
import { hasBatchPermission } from '@narada/auth/permissions'
import { batch, chapter, exam, evaluation, type SchoolDatabase } from '@narada/db'
import { compoundCursor, dateCursorField, paginateResponse } from '../utils/cursor'
import { internalError, notFound, unprocessable } from '../error'
import type { BatchAccess } from '../utils/auth'
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
  cursor: compoundCursor({ scheduledAt: dateCursorField(), id: z.string() }).optional(),
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

export default class ExamService {
  public static async findByBatch(
    db: SchoolDatabase,
    batchId: string,
    options: ListExamsQuery & { access: BatchAccess },
  ): Promise<{ items: Exam[]; nextCursor: string | null }> {
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })
    if (!batchRow) throw notFound()

    const { access, status, cursor, limit } = options

    const conditions = [eq(exam.batchId, batchId)]
    const canSeeAll =
      access.kind === 'schoolWide' ||
      (access.kind === 'singleBatch' &&
        hasBatchPermission(access.enrollment.role, { exam: ['update'] }))
    if (!canSeeAll) conditions.push(eq(exam.studentId, access.userId))
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

  public static async findById(db: SchoolDatabase, examId: string): Promise<Exam | undefined> {
    const row = await db.query.exam.findFirst({
      where: (t, { eq }) => eq(t.id, examId),
    })

    if (!row) {
      return undefined
    }

    return row
  }

  public static async create(db: SchoolDatabase, batchId: string, data: CreateExamData): Promise<Exam> {
    await assertChapterBelongsToBatchTrack(db, batchId, data.chapterId)

    const rows = await db
      .insert(exam)
      .values({ batchId, ...data })
      .returning()

    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  }

  public static async update(db: SchoolDatabase, examId: string, data: UpdateExamData): Promise<Exam> {
    const rows = await db.update(exam).set(data).where(eq(exam.id, examId)).returning()
    const row = rows.at(0)
    if (!row) {
      throw notFound()
    }

    return row
  }

  public static async recordResult(
    db: SchoolDatabase,
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
}

async function assertChapterBelongsToBatchTrack(
  db: SchoolDatabase,
  batchId: string,
  chapterId: string,
): Promise<void> {
  const rows = await db
    .select({ id: chapter.id })
    .from(batch)
    .innerJoin(chapter, eq(chapter.trackId, batch.trackId))
    .where(and(eq(batch.id, batchId), eq(chapter.id, chapterId)))
    .limit(1)

  if (rows.length === 0) {
    throw unprocessable(`Chapter ${chapterId} does not belong to this batch's track`)
  }
}
