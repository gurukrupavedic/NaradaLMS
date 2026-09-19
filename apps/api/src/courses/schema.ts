import * as z from 'zod'

export type Course = z.infer<typeof CourseSchema>
export const CourseSchema = z.object({
  id: z.uuid(),
  // What a hostname or the `x-course-slug` header carries — `vedam` for `vedam.slmts.naradas.app`.
  slug: z.string().min(1),
  name: z.string().min(1),
})
