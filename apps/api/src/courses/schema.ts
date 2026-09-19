import * as z from 'zod'

export type Course = z.infer<typeof CourseSchema>
export const CourseSchema = z.object({
  id: z.uuid(),
  // The first path segment of the course's pages, which the web app sends as `x-course-slug` — `vedam`.
  slug: z.string().min(1),
  name: z.string().min(1),
})
