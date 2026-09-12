import * as z from 'zod'

import { requireNonEmpty } from '../utils/validate'

// Projects only what a super admin needs to identify and rename a school — never `logo` or
// `metadata` (arbitrary BetterAuth-managed fields with no defined shape for this product).
export type School = z.infer<typeof SchoolSchema>
export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
})

export type UpdateSchoolData = z.infer<typeof UpdateSchoolSchema>
export const UpdateSchoolSchema = requireNonEmpty(
  z.object({
    name: z.string().min(1).optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens')
      .optional(),
  }),
)
