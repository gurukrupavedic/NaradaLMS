import * as z from 'zod'

import { proficiencyLevelSchema } from '../evaluations/schema'
import { DetailsSchema } from '../utils/details'
import { requireNonEmpty } from '../utils/validate'

export const CourseProfileParamsSchema = z.object({ profileId: z.uuid() })
export const CounterParamsSchema = CourseProfileParamsSchema.extend({
  key: z.string().min(1).max(64),
})

/**
 * The answers every course collects, as real columns (`courseAnswerColumns` in
 * `packages/db/src/schema/school.ts`): a registration carries them for the course applied to, and
 * they land on that student's `courseProfile` row when it's approved. The school-specific rest
 * goes in `details`.
 */
export const courseAnswerShape = {
  learningGoal: z.string().trim().min(1).nullable(),
  currentProficiency: proficiencyLevelSchema.nullable(),
  comments: z.string().trim().min(1).nullable(),
}

/** One student's record in one course. A student with no row yet reads as all-empty. */
export type CourseProfile = z.infer<typeof CourseProfileSchema>
export const CourseProfileSchema = z.object({
  ...courseAnswerShape,
  details: DetailsSchema,
})

/** What a student with no row yet in a course reads as. */
export const EMPTY_COURSE_PROFILE: CourseProfile = {
  learningGoal: null,
  currentProficiency: null,
  comments: null,
  details: {},
}

// An edit: only the fields sent change. `details` is itself a *patch* (only the keys sent change,
// a blank string clears one) and must say something if it's present.
export type UpdateCourseProfileData = z.infer<typeof UpdateCourseProfileSchema>
export const UpdateCourseProfileSchema = requireNonEmpty(
  z
    .object(courseAnswerShape)
    .partial()
    .extend({
      details: DetailsSchema.refine(
        patch => Object.keys(patch).length > 0,
        'no fields to update',
      ).optional(),
    }),
)

// How much to *add*. Adding (rather than setting) is what makes two devices, or a student and an
// admin, counting at once both land. Capped per request, and the running total at `COUNTER_MAX`.
export const MAX_ADD = 1_000_000
export type AddToCounterData = z.infer<typeof AddToCounterSchema>
export const AddToCounterSchema = z.object({ count: z.number().int().min(1).max(MAX_ADD) })
