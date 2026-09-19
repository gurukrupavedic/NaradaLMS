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

// A teacher's own evaluation can mark absence or a classroom-graded level, but never `level4` —
// that grade is only ever granted by a track exam result (see exams/service.ts's recordExamResult).
export const teacherGradableLevelSchema = proficiencyLevelSchema.exclude(['level4'])

export type CreateEvaluationData = z.infer<typeof CreateEvaluationSchema>
export const CreateEvaluationSchema = EvaluationSchema.pick({
  studentId: true,
  chapterId: true,
}).extend({
  level: teacherGradableLevelSchema,
  notes: z.string().optional(),
})

// The wire shape for `POST /batches/:batchId/evaluations` — always an array, even for the grade
// dialog's own single cell. One request shape for both call sites means one validation/insert path
// in service.ts's `createEvaluations`, not a single-item endpoint and a separate bulk one.
export type CreateEvaluationsData = z.infer<typeof CreateEvaluationsSchema>
export const CreateEvaluationsSchema = z.array(CreateEvaluationSchema).min(1)
