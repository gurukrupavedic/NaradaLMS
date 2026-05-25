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

export const evaluationSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  chapterId: z.string(),
  level: proficiencyLevel,
  notes: z.string().nullable(),
  evaluatorId: z.string(),
  evaluatedAt: z.date().nullable(),
})

export const createEvaluationSchema = z.object({
  studentId: z.string().min(1),
  chapterId: z.uuid(),
  level: proficiencyLevel,
  notes: z.string().optional(),
})

export type Evaluation = z.infer<typeof evaluationSchema>
export type CreateEvaluationData = z.infer<typeof createEvaluationSchema>

type DbEvaluation = typeof evaluation.$inferSelect

function mapEvaluation(row: DbEvaluation): Evaluation {
  return {
    id: row.id,
    studentId: row.studentId,
    chapterId: row.chapterId,
    level: row.level,
    notes: row.notes,
    evaluatorId: row.evaluatorId,
    evaluatedAt: row.evaluatedAt,
  }
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
    return mapEvaluation(row)
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

    return rows.map(mapEvaluation)
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

    return rows.map(mapEvaluation)
  }
}
