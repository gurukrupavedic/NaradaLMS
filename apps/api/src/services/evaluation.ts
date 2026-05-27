import { z } from 'zod'
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'

import { enrollment, evaluation, type Database } from '@narada/db'
import { compoundCursor, nullableDateCursorField, paginateResponse } from '../utils/cursor'
import { notFound } from '../error'
import assert from 'node:assert'

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

export const createEvaluationSchema = z.object({
  studentId: z.string().min(1),
  chapterId: z.uuid(),
  level: proficiencyLevel,
  notes: z.string().optional(),
})

export const listEvaluationsQuerySchema = z.object({
  cursor: compoundCursor({ evaluatedAt: nullableDateCursorField(), id: z.string() }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export type Evaluation = typeof evaluation.$inferSelect
export type CreateEvaluationData = z.infer<typeof createEvaluationSchema>
export type ListEvaluationsQuery = z.infer<typeof listEvaluationsQuerySchema>

type EvaluationPage = { items: Evaluation[]; nextCursor: string | null }

function evaluationCursorWhere(cursor: ListEvaluationsQuery['cursor']) {
  if (!cursor) return undefined

  if (cursor.evaluatedAt === null) {
    return and(isNull(evaluation.evaluatedAt), lt(evaluation.id, cursor.id))
  }

  return or(
    lt(evaluation.evaluatedAt, cursor.evaluatedAt),
    and(eq(evaluation.evaluatedAt, cursor.evaluatedAt), lt(evaluation.id, cursor.id)),
    isNull(evaluation.evaluatedAt),
  )
}

function evaluationPage(rows: Evaluation[], limit: number): EvaluationPage {
  return paginateResponse(rows, limit, item => ({ evaluatedAt: item.evaluatedAt, id: item.id }))
}

export default class EvaluationService {
  public static async create(
    db: Database,
    evaluatorId: string,
    data: CreateEvaluationData,
  ): Promise<Evaluation> {
    const rows = await db
      .insert(evaluation)
      .values({ ...data, evaluatorId })
      .returning()

    const row = rows.at(0)
    assert(row !== undefined, '`insert` should always return a row')
    return row
  }

  public static async findByBatch(
    db: Database,
    batchId: string,
    options: ListEvaluationsQuery,
  ): Promise<EvaluationPage> {
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    if (!batchRow) throw notFound()
    const chapterRows = await db.query.chapter.findMany({
      where: (t, { eq }) => eq(t.trackId, batchRow.trackId),
      columns: { id: true },
    })

    const chapterIds = chapterRows.map(c => c.id)
    if (chapterIds.length === 0) return { items: [], nextCursor: null }
    const enrolledStudentIds = db
      .select({ userId: enrollment.userId })
      .from(enrollment)
      .where(eq(enrollment.batchId, batchId))

    const conditions = [
      inArray(evaluation.studentId, enrolledStudentIds),
      inArray(evaluation.chapterId, chapterIds),
    ]

    const cursorWhere = evaluationCursorWhere(options.cursor)
    if (cursorWhere) conditions.push(cursorWhere)

    const rows = await db.query.evaluation.findMany({
      where: and(...conditions),
      orderBy: [sql`${evaluation.evaluatedAt} desc nulls last`, desc(evaluation.id)],
      limit: options.limit + 1,
    })

    return evaluationPage(rows, options.limit)
  }

  public static async findByStudent(
    db: Database,
    batchId: string,
    studentId: string,
    options: ListEvaluationsQuery,
  ): Promise<EvaluationPage> {
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    if (!batchRow) throw notFound()
    const chapterRows = await db.query.chapter.findMany({
      where: (t, { eq }) => eq(t.trackId, batchRow.trackId),
      columns: { id: true },
    })

    const chapterIds = chapterRows.map(c => c.id)
    if (chapterIds.length === 0) return { items: [], nextCursor: null }
    const enrolledStudentIds = db
      .select({ userId: enrollment.userId })
      .from(enrollment)
      .where(eq(enrollment.batchId, batchId))

    const conditions = [
      eq(evaluation.studentId, studentId),
      inArray(evaluation.studentId, enrolledStudentIds),
      inArray(evaluation.chapterId, chapterIds),
    ]

    const cursorWhere = evaluationCursorWhere(options.cursor)
    if (cursorWhere) conditions.push(cursorWhere)

    const rows = await db.query.evaluation.findMany({
      where: and(...conditions),
      orderBy: [sql`${evaluation.evaluatedAt} desc nulls last`, desc(evaluation.id)],
      limit: options.limit + 1,
    })

    return evaluationPage(rows, options.limit)
  }
}
