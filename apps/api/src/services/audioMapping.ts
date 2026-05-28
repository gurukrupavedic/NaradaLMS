import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { audioMapping, type SchoolDatabase } from '@narada/db'
import { unprocessable } from '../error'

const mappingInputSchema = z
  .object({
    segmentId: z.uuid(),
    audioStart: z.number().nonnegative(),
    audioEnd: z.number().positive(),
  })
  .refine(data => data.audioEnd > data.audioStart, {
    message: 'audioEnd must be greater than audioStart',
  })

export const putMappingsSchema = z.array(mappingInputSchema)

export type AudioMapping = typeof audioMapping.$inferSelect
export type MappingInput = z.infer<typeof mappingInputSchema>

function validateNoOverlaps(inputs: MappingInput[]): void {
  const mappings = [...inputs].sort((a, b) => a.audioStart - b.audioStart)
  for (let i = 1; i < mappings.length; i++) {
    if (mappings[i]!.audioStart < mappings[i - 1]!.audioEnd) {
      throw unprocessable()
    }
  }
}

export default class AudioMappingService {
  public static async replace(
    db: SchoolDatabase,
    audioAssetId: string,
    chapterId: string,
    inputs: MappingInput[],
  ): Promise<AudioMapping[]> {
    validateNoOverlaps(inputs)
    const segmentIds = inputs.map(i => i.segmentId)
    if (segmentIds.length > 0) {
      const existing = await db.query.segment.findMany({
        where: (t, { and, inArray }) => and(inArray(t.id, segmentIds), eq(t.chapterId, chapterId)),
        columns: { id: true },
      })

      if (existing.length !== segmentIds.length) {
        throw unprocessable()
      }
    }

    return await db.transaction(async tx => {
      await tx.delete(audioMapping).where(eq(audioMapping.audioAssetId, audioAssetId))
      if (inputs.length === 0) {
        return []
      }

      const rows = await tx
        .insert(audioMapping)
        .values(inputs.map(i => ({ ...i, audioAssetId })))
        .returning()

      return rows.sort((a, b) => a.audioStart - b.audioStart)
    })
  }
}
