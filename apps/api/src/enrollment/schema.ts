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

// Each score is a teacher's -1/0/1 call; null clears it back to "not assessed". Partial on
// purpose: the grid changes one cell at a time, and an omitted key must leave that score alone.
const scoreSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullable()

export type SetEnrollmentScoresData = z.infer<typeof SetEnrollmentScoresSchema>
export const SetEnrollmentScoresSchema = z
  .object({
    attendanceScore: scoreSchema,
    recitationScore: scoreSchema,
    backlogScore: scoreSchema,
  })
  .partial()
  .strict()
  .refine(data => Object.keys(data).length > 0, { message: 'at least one score is required' })
