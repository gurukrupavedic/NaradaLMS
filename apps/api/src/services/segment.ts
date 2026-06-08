import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { segment, type SchoolDatabase } from '@narada/db'
import { internalError, unprocessable } from '../error'

export const segmentInputSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .refine(data => data.end > data.start, { message: 'end must be greater than start' })

export const putSegmentsSchema = z.array(segmentInputSchema)

export type Segment = typeof segment.$inferSelect
export type SegmentInput = z.infer<typeof segmentInputSchema>

function validateNoOverlaps(inputs: SegmentInput[]): void {
  const sorted = [...inputs].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.start < sorted[i - 1]!.end) {
      throw unprocessable('Segments must not overlap')
    }
  }
}

export async function replaceSegments(
  db: SchoolDatabase,
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
    return rows.sort((a, b) => a.start - b.start)
  })
}
