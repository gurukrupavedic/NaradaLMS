import * as z from 'zod'

import { batchStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const batchStatusSchema = z.enum(batchStatus.enumValues)

export type Batch = z.infer<typeof BatchSchema>
export const BatchSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  code: z.string().min(1),
  status: batchStatusSchema,
  startDate: z.coerce.date().nullable(),
  meetingUrl: z.url().nullable(),
})

export type FindBatchesData = z.infer<typeof FindBatchesSchema>
export const FindBatchesSchema = BatchSchema.pick({
  status: true,
})
  .partial()
  .safeExtend({
    limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
    cursor: asCursor(z.object({ id: z.uuid() })),
  })

export type CreateBatchData = z.infer<typeof CreateBatchSchema>
export const CreateBatchSchema = BatchSchema.pick({
  trackId: true,
  code: true,
  startDate: true,
  meetingUrl: true,
}).partial({
  startDate: true,
  meetingUrl: true,
})

export type UpdateBatchData = z.infer<typeof UpdateBatchSchema>
export const UpdateBatchSchema = requireNonEmpty(
  BatchSchema.pick({
    trackId: true,
    code: true,
    status: true,
    startDate: true,
    meetingUrl: true,
  }).partial(),
)
