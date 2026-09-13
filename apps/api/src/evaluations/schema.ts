import * as z from 'zod'

import { proficiencyLevel } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant } from '../utils/validate'

const PAGE_SIZE = 20

export const proficiencyLevelSchema = z.enum(proficiencyLevel.enumValues)

export type Evaluation = z.infer<typeof EvaluationSchema>
export const EvaluationSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
  chapterId: z.uuid(),
  batchId: z.uuid().nullable(),
  level: proficiencyLevelSchema,
  notes: z.string().nullable(),
  evaluatorId: z.uuid(),
  evaluatedAt: isoInstant.nullable(),
})

export type FindEvaluationsData = z.infer<typeof FindEvaluationsSchema>
export const FindEvaluationsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
  cursor: asCursor(z.object({ evaluatedAt: z.coerce.date().nullable(), id: z.uuid() })),
})

export type CreateEvaluationData = z.infer<typeof CreateEvaluationSchema>
export const CreateEvaluationSchema = EvaluationSchema.pick({
  studentId: true,
  chapterId: true,
  level: true,
}).extend({
  notes: z.string().optional(),
})
