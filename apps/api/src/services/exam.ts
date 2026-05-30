import { z } from 'zod'
import { and, asc, eq, gt, or, sql } from 'drizzle-orm'

import { userIdSchema } from '@narada/auth/ids'
import { hasBatchPermission } from '@narada/auth/permissions'
import { exam, examResult, evaluation, type SchoolDatabase } from '@narada/db'
import { compoundCursor, dateCursorField, paginateResponse } from '../utils/cursor'
import { internalError, notFound, unprocessable } from '../error'
import type { BatchAccess } from '../utils/auth'
import { proficiencyLevelSchema } from './shared'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const createExamSchema = z.object({
  studentId: userIdSchema,
  scheduledAt: z.iso.datetime().transform(v => new Date(v)),
})

export const updateExamSchema = requireNonEmpty(
  z.object({
    scheduledAt: z.iso
      .datetime()
      .transform(v => new Date(v))
      .optional(),
    status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']).optional(),
  }),
)

export const listExamsQuerySchema = z.object({
  status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']).optional(),
  cursor: compoundCursor({ scheduledAt: dateCursorField(), id: z.string() }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export const recordResultItemSchema = z.object({
  chapterId: z.uuid(),
  level: proficiencyLevelSchema,
  notes: z.string().optional(),
})

export const recordResultsSchema = z
  .array(recordResultItemSchema)
  .min(1)
  .refine(items => new Set(items.map(item => item.chapterId)).size === items.length, {
    message: 'duplicate chapter results are not allowed',
  })

export type Exam = typeof exam.$inferSelect
export type ExamResult = typeof examResult.$inferSelect
export type ExamDetail = Exam & { results: ExamResult[] }
export type CreateExamData = z.infer<typeof createExamSchema>
export type UpdateExamData = z.infer<typeof updateExamSchema>
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>
export type RecordResultItem = z.infer<typeof recordResultItemSchema>

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

  public static async findById(db: SchoolDatabase, examId: string): Promise<ExamDetail | undefined> {
    const row = await db.query.exam.findFirst({
      where: (t, { eq }) => eq(t.id, examId),
      with: { results: true },
    })

    if (!row) {
      return undefined
    }

    return row
  }

  public static async create(db: SchoolDatabase, batchId: string, data: CreateExamData): Promise<Exam> {
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

  public static async recordResults(
    db: SchoolDatabase,
    examId: string,
    evaluatorId: string,
    items: RecordResultItem[],
  ): Promise<ExamDetail> {
    const examRow = await db.query.exam.findFirst({
      where: (t, { eq }) => eq(t.id, examId),
    })

    if (!examRow) throw notFound()
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, examRow.batchId),
      columns: { trackId: true },
    })

    if (!batchRow) throw internalError()
    const trackChapters = await db.query.chapter.findMany({
      where: (t, { eq }) => eq(t.trackId, batchRow.trackId),
      columns: { id: true },
    })

    const validChapterIds = new Set(trackChapters.map(c => c.id))
    for (const item of items) {
      if (!validChapterIds.has(item.chapterId)) {
        throw unprocessable(`Chapter ${item.chapterId} does not belong to this exam's track`)
      }
    }

    return await db.transaction(async tx => {
      const results: ExamResult[] = []
      for (const item of items) {
        const evalRows = await tx
          .insert(evaluation)
          .values({
            studentId: examRow.studentId,
            chapterId: item.chapterId,
            level: item.level,
            notes: item.notes,
            evaluatorId,
          })
          .returning()

        const evalRow = evalRows.at(0)
        if (!evalRow) throw internalError()
        const resultRows = await tx
          .insert(examResult)
          .values({ examId, chapterId: item.chapterId, evaluationId: evalRow.id })
          .onConflictDoUpdate({
            target: [examResult.examId, examResult.chapterId],
            set: { evaluationId: sql`excluded.${sql.identifier('evaluationId')}` },
          })
          .returning()

        const resultRow = resultRows.at(0)
        if (!resultRow) throw internalError()
        results.push({
          examId: resultRow.examId,
          chapterId: resultRow.chapterId,
          evaluationId: resultRow.evaluationId,
        })
      }

      return { ...examRow, results }
    })
  }
}
