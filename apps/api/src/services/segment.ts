import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

import { segment, type Database } from '@narada/db'
import { internalError, unprocessable } from '../error'

export const segmentSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  start: z.number(),
  end: z.number(),
})

export const segmentInputSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .refine(data => data.end > data.start, { message: 'end must be greater than start' })

export const putSegmentsSchema = z.array(segmentInputSchema)

export type Segment = z.infer<typeof segmentSchema>
export type SegmentInput = z.infer<typeof segmentInputSchema>

function validateNoOverlaps(inputs: SegmentInput[]): void {
  const sorted = [...inputs].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.start < sorted[i - 1]!.end) {
      throw unprocessable('Segments must not overlap')
    }
  }
}

export default class SegmentService {
  public static async findByChapter(db: Database, chapterId: string): Promise<Segment[]> {
    const rows = await db.query.segment.findMany({
      where: (t, { eq: e }) => e(t.chapterId, chapterId),
      orderBy: asc(segment.start),
    })

    return rows.map(row => ({
      id: row.id,
      chapterId: row.chapterId,
      start: row.start,
      end: row.end,
    }))
  }

  public static async replace(
    db: Database,
    chapterId: string,
    inputs: SegmentInput[],
  ): Promise<Segment[]> {
    validateNoOverlaps(inputs)

    return await db.transaction(async tx => {
      await tx.delete(segment).where(eq(segment.chapterId, chapterId))

      if (inputs.length === 0) return []
      const rows = await tx
        .insert(segment)
        .values(inputs.map(input => ({ ...input, chapterId })))
        .returning()

      if (rows.length !== inputs.length) throw internalError()
      return rows
        .map(row => ({ id: row.id, chapterId: row.chapterId, start: row.start, end: row.end }))
        .sort((a, b) => a.start - b.start)
    })
  }
}
