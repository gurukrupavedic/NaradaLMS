import { z } from 'zod'

import { evaluation, type Database } from '@narada/db'
import { notFound } from '../error'
import assert from 'node:assert'

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

export type Evaluation = typeof evaluation.$inferSelect
export type CreateEvaluationData = z.infer<typeof createEvaluationSchema>

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

  public static async findByBatch(db: Database, batchId: string): Promise<Evaluation[]> {
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    if (!batchRow) throw notFound()
    const chapterRows = await db.query.chapter.findMany({
      where: (t, { eq }) => eq(t.trackId, batchRow.trackId),
      columns: { id: true },
    })

    const chapterIds = chapterRows.map(c => c.id)
    if (chapterIds.length === 0) return []
    const rows = await db.query.evaluation.findMany({
      where: (t, { inArray }) => inArray(t.chapterId, chapterIds),
      orderBy: (t, { desc }) => desc(t.evaluatedAt),
    })

    return rows
  }

  public static async findByStudent(
    db: Database,
    batchId: string,
    studentId: string,
  ): Promise<Evaluation[]> {
    const batchRow = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    if (!batchRow) throw notFound()
    const chapterRows = await db.query.chapter.findMany({
      where: (t, { eq }) => eq(t.trackId, batchRow.trackId),
      columns: { id: true },
    })

    const chapterIds = chapterRows.map(c => c.id)
    if (chapterIds.length === 0) return []
    const rows = await db.query.evaluation.findMany({
      where: (t, { and, eq, inArray }) =>
        and(eq(t.studentId, studentId), inArray(t.chapterId, chapterIds)),
      orderBy: (t, { desc }) => desc(t.evaluatedAt),
    })

    return rows
  }
}
