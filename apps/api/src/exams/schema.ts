import * as z from 'zod'

import { examOutcome, examStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant, requireNonEmpty } from '../utils/validate'
import { proficiencyLevelSchema } from '../evaluations/schema'
import { TrackSchema } from '../tracks/schema'
import { ProfileSchema } from '../profiles/schema'
import { EXAM_MARK_MAX } from './grading'

const PAGE_SIZE = 20

export const examStatusSchema = z.enum(examStatus.enumValues)
export const examOutcomeSchema = z.enum(examOutcome.enumValues)

export type Exam = z.infer<typeof ExamSchema>
export const ExamSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  studentId: z.uuid(),
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
    // `scheduledAt` for the by-time sorts; `trackOrder` + `studentName` for `sort=track`.
    cursor: asCursor(
      z.object({
        scheduledAt: z.coerce.date().optional(),
        trackOrder: z.number().int().optional(),
        studentName: z.string().optional(),
        id: z.uuid(),
      }),
    ),
    // The student dashboard's "Sitting history" (apps/web's fetchExams) sends this to force
    // `AccessPolicy.getOwnExamScope()` — strictly the caller's own sittings — instead of the
    // default `getExamVisibility()`, which widens to a TA/instructor's students' sittings too
    // (correct for a grading queue, wrong for what's presented as "my own" history).
    mine: z.coerce.boolean().optional().default(false),
    // Admin exams screen (apps/web's fetchAdminSittings): matches the sitting's student by name,
    // email or phone, the same substring/multi-word matching `profiles/repository.ts::search`
    // already does.
    query: z.string().trim().min(1).optional(),
    // Same screen's "Awaiting" vs "Graded" split: `true` restricts to exams with a recorded
    // result, `false` to exams with none (and not cancelled — a cancelled sitting is neither).
    // Omitted keeps today's behavior of returning both. `z.stringbool()`, not `z.coerce.boolean()`
    // — the caller needs a real `false` here (unlike `mine` above, which is only ever sent as
    // `true`), and `Boolean('false') === true` would make that impossible.
    graded: z.stringbool().optional(),
    // `scheduledAt` order, forward (soonest-first — the default) or reverse (most-recently-sat-first),
    // or `track`: by the track's own order, then the student's name — what the admin grading
    // screen groups its sections by. Ties fall through to the exam id.
    sort: z.enum(['asc', 'desc', 'track']).optional().default('asc'),
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
  track: TrackSchema.pick({ id: true, name: true, order: true }),
  result: ExamResultSchema.nullable(),
  // The admin exams screen's student name column — see examRelations in packages/db for why
  // this is eager-loaded here instead of cross-referenced client-side.
  student: ProfileSchema.pick({ id: true, name: true }),
})
