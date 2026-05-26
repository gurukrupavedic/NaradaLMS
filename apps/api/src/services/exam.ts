import assert from 'node:assert'
import { z } from 'zod'
import { and, asc, eq, gt } from 'drizzle-orm'

import { hasBatchPermission } from '@narada/auth/permissions'
import { exam, examResult, evaluation, type Database } from '@narada/db'
import { asCursor, paginateResponse } from '../utils/cursor'
import { notFound, unprocessable } from '../error'
import type { BatchAccess } from '../utils/auth'

const PAGE_SIZE = 20

const proficiencyLevel = z.enum([
  'absent',
  'notStarted',
  'practicing',
  'level1',
  'level2',
  'level3',
  'level4',
])

export const examSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  studentId: z.string(),
  scheduledAt: z.date(),
  status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']),
})

export const examResultSchema = z.object({
  examId: z.string(),
  chapterId: z.string(),
  evaluationId: z.string(),
})

export const examDetailSchema = examSchema.extend({
  results: z.array(examResultSchema),
})

export const createExamSchema = z.object({
  studentId: z.string().min(1),
  scheduledAt: z.iso.datetime().transform(v => new Date(v)),
})

export const updateExamSchema = z
  .object({
    scheduledAt: z.iso
      .datetime()
      .transform(v => new Date(v))
      .optional(),
    status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export const listExamsQuerySchema = z.object({
  status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled']).optional(),
  cursor: asCursor(z.object({ id: z.string() })).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export const recordResultItemSchema = z.object({
  chapterId: z.uuid(),
  level: proficiencyLevel,
  notes: z.string().optional(),
})

export const recordResultsSchema = z.array(recordResultItemSchema).min(1)

export type Exam = z.infer<typeof examSchema>
export type ExamResult = z.infer<typeof examResultSchema>
export type ExamDetail = z.infer<typeof examDetailSchema>
export type CreateExamData = z.infer<typeof createExamSchema>
export type UpdateExamData = z.infer<typeof updateExamSchema>
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>
export type RecordResultItem = z.infer<typeof recordResultItemSchema>

type DbExam = typeof exam.$inferSelect

function mapExam(row: DbExam): Exam {
  return {
    id: row.id,
    batchId: row.batchId,
    studentId: row.studentId,
    scheduledAt: row.scheduledAt,
    status: row.status,
  }
}

export default class ExamService {
  public static async findByBatch(
    db: Database,
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
    if (cursor) conditions.push(gt(exam.id, cursor.id))

    const rows = await db.query.exam.findMany({
      where: and(...conditions),
      orderBy: asc(exam.id),
      limit: limit + 1,
    })

    return paginateResponse(rows.map(mapExam), limit, item => ({ id: item.id }))
  }

  public static async findById(db: Database, examId: string): Promise<ExamDetail | undefined> {
    const row = await db.query.exam.findFirst({
      where: (t, { eq }) => eq(t.id, examId),
      with: { results: true },
    })

    if (!row) {
      return undefined
    }

    return {
      ...mapExam(row),
      results: row.results.map(r => ({
        examId: r.examId,
        chapterId: r.chapterId,
        evaluationId: r.evaluationId,
      })),
    }
  }

  public static async create(db: Database, batchId: string, data: CreateExamData): Promise<Exam> {
    const rows = await db
      .insert(exam)
      .values({ batchId, ...data })
      .returning()

    const row = rows.at(0)
    assert(row !== undefined, '`insert` should always return a row')
    return mapExam(row)
  }

  public static async update(db: Database, examId: string, data: UpdateExamData): Promise<Exam> {
    const rows = await db.update(exam).set(data).where(eq(exam.id, examId)).returning()
    const row = rows.at(0)
    if (!row) {
      throw notFound()
    }

    return mapExam(row)
  }

  public static async recordResults(
    db: Database,
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

    assert(batchRow !== undefined, 'batch not found for exam — FK violation')
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
        assert(evalRow !== undefined, '`insert` should always return a row')
        const resultRows = await tx
          .insert(examResult)
          .values({ examId, chapterId: item.chapterId, evaluationId: evalRow.id })
          .returning()

        const resultRow = resultRows.at(0)
        assert(resultRow !== undefined, '`insert` should always return a row')
        results.push({
          examId: resultRow.examId,
          chapterId: resultRow.chapterId,
          evaluationId: resultRow.evaluationId,
        })
      }

      const updatedRows = await tx
        .update(exam)
        .set({ status: 'completed' })
        .where(eq(exam.id, examId))
        .returning()

      const updated = updatedRows.at(0)
      assert(updated !== undefined, 'exam update should return a row')
      return { ...mapExam(updated), results }
    })
  }
}
