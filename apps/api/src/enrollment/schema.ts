import * as z from 'zod'

import { enrollmentRole } from '@narada/db'

export const enrollmentRoleSchema = z.enum(enrollmentRole.enumValues)

export type CreateEnrollmentData = z.infer<typeof CreateEnrollmentSchema>
export const CreateEnrollmentSchema = z.object({
  profileId: z.uuid(),
  role: enrollmentRoleSchema,
})

export type MoveEnrollmentData = z.infer<typeof MoveEnrollmentSchema>
export const MoveEnrollmentSchema = z.object({
  toBatchId: z.uuid(),
})

// Instructors are never changed in place — they are added and removed — so the only role change
// is between the two learner roles: a student promoted to TA, or a TA stepped back to student.
export type ChangeRoleData = z.infer<typeof ChangeRoleSchema>
export const ChangeRoleSchema = z.object({
  role: z.enum(['student', 'ta']),
})
