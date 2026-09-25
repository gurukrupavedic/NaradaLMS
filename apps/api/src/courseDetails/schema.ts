import * as z from 'zod'

import { DetailsSchema } from '../utils/details'

export const CourseDetailsParamsSchema = z.object({ profileId: z.uuid() })
export const CounterParamsSchema = CourseDetailsParamsSchema.extend({
  key: z.string().min(1).max(64),
})

// A *patch*: only the keys sent change (a blank string clears one). `{}` would change nothing.
export type UpdateCourseDetailsData = z.infer<typeof UpdateCourseDetailsSchema>
export const UpdateCourseDetailsSchema = z.object({
  details: DetailsSchema.refine(patch => Object.keys(patch).length > 0, 'no fields to update'),
})

// How much to *add*. Adding (rather than setting) is what makes two devices, or a student and an
// admin, counting at once both land. Capped per request, and the running total at `COUNTER_MAX`.
export const MAX_ADD = 1_000_000
export type AddToCounterData = z.infer<typeof AddToCounterSchema>
export const AddToCounterSchema = z.object({ count: z.number().int().min(1).max(MAX_ADD) })
