import * as z from 'zod'

import { enrollmentRole } from '@narada/db'

export const enrollmentRoleSchema = z.enum(enrollmentRole.enumValues)

export type CreateEnrollmentData = z.infer<typeof CreateEnrollmentSchema>
export const CreateEnrollmentSchema = z.object({
  profileId: z.uuid(),
  role: enrollmentRoleSchema,
})
