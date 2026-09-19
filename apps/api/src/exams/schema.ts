import * as z from 'zod'

import { examOutcome, examStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant, requireNonEmpty } from '../utils/validate'
import { proficiencyLevelSchema } from '../evaluations/schema'
import { TrackSchema } from '../tracks/schema'
import { EXAM_MARK_MAX } from './grading'

const PAGE_SIZE = 20

export const examStatusSchema = z.enum(examStatus.enumValues)
export const examOutcomeSchema = z.enum(examOutcome.enumValues)

export type Exam = z.infer<typeof ExamSchema>
export const ExamSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  studentId: z.uuid(),
  batchId: z.uuid(),
  scheduledAt: isoInstant,
  status: examStatusSchema,
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
  trackId: true,
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

// What an evaluator enters for a completed sitting: the five marks and an optional note. The
// children's bonus, total and outcome are never sent — the server derives all three (see
// grading.ts), so a client can't assert a result the marks don't add up to, and can't override the
// age-based bonus.
const mark = (max: number) => z.number().int().min(0).max(max)

export type RecordExamResultData = z.infer<typeof RecordExamResultSchema>
export const RecordExamResultSchema = z.object({
  aksharaShuddhi: mark(EXAM_MARK_MAX.aksharaShuddhi),
  swaraShuddhi: mark(EXAM_MARK_MAX.swaraShuddhi),
  niyantranaAnargalata: mark(EXAM_MARK_MAX.niyantranaAnargalata),
  shraavyata: mark(EXAM_MARK_MAX.shraavyata),
  pratishakyaGrammar: mark(EXAM_MARK_MAX.pratishakyaGrammar),
  notes: z.string().optional(),
})

// One recorded sitting's marks, as `examResult` stores them plus the level the outcome grants —
// derived (grading.ts::levelForOutcome), null for a `reappear`. `outcome` names the distinction
// (Athi Uttamam, Prathama Sreni, ...); `level` is what it means for the student's standing.
export type ExamResult = z.infer<typeof ExamResultSchema>
export const ExamResultSchema = z.object({
  examId: z.uuid(),
  aksharaShuddhi: z.number().int(),
  swaraShuddhi: z.number().int(),
  niyantranaAnargalata: z.number().int(),
  shraavyata: z.number().int(),
  pratishakyaGrammar: z.number().int(),
  childrenBonus: z.number().int(),
  total: z.number().int(),
  outcome: examOutcomeSchema,
  level: proficiencyLevelSchema.nullable(),
  notes: z.string().nullable(),
  evaluatorId: z.uuid(),
  evaluatedAt: isoInstant,
})

// A result plus the track it was sat on — the dashboard's flat, all-tracks history has no
// surrounding exam to say which track a result belongs to.
export type StudentExamResult = ExamResult & { trackId: string }

// Enough to render an exam on its own — a bare Exam row has only `trackId`, no track name or
// result. `result` is null until the sitting is completed.
export type ExamWithDetail = z.infer<typeof ExamWithDetailSchema>
export const ExamWithDetailSchema = ExamSchema.extend({
  track: TrackSchema.pick({ id: true, name: true }),
  result: ExamResultSchema.nullable(),
})
