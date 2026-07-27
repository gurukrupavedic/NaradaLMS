import * as z from 'zod'

import { examStatus, proficiencyLevel } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant, requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const proficiencyLevelSchema = z.enum(proficiencyLevel.enumValues)
export const examStatusSchema = z.enum(examStatus.enumValues)

export type Exam = z.infer<typeof ExamSchema>
export const ExamSchema = z.object({
  id: z.uuid(),
  chapterId: z.uuid(),
  studentId: z.uuid(),
  batchId: z.uuid().nullable(),
  scheduledAt: isoInstant,
  status: examStatusSchema,
  evaluationId: z.uuid().nullable(),
  performedAt: isoInstant.nullable(),
})

export type FindExamsData = z.infer<typeof FindExamsSchema>
export const FindExamsSchema = ExamSchema.pick({
  status: true,
})
  .partial()
  .safeExtend({
    limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
    cursor: asCursor(z.object({ scheduledAt: z.coerce.date(), id: z.uuid() })),
  })

export type CreateExamData = z.infer<typeof CreateExamSchema>
export const CreateExamSchema = ExamSchema.pick({
  chapterId: true,
  studentId: true,
  scheduledAt: true,
})

export type UpdateExamData = z.infer<typeof UpdateExamSchema>
export const UpdateExamSchema = requireNonEmpty(
  ExamSchema.pick({
    scheduledAt: true,
  })
    .partial()
    .safeExtend({
      status: examStatusSchema.exclude(['completed']).optional(),
    }),
)

export type RecordExamResultData = z.infer<typeof RecordExamResultSchema>
export const RecordExamResultSchema = z.object({
  level: proficiencyLevelSchema,
  notes: z.string().optional(),
})
