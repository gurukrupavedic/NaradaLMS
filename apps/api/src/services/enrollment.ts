import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'

import { enrollment, type SchoolDbExecutor } from '@narada/db'
import { conflict, internalError, notFound } from '../error'

export const enrollSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(['instructor', 'ta', 'student']),
})

export type Enrollment = typeof enrollment.$inferSelect
export type EnrollData = z.infer<typeof enrollSchema>

export async function findEnrollment(
  db: SchoolDbExecutor,
  profileId: string,
  batchId: string,
): Promise<Enrollment | undefined> {
  return db.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.profileId, profileId), eq(t.batchId, batchId)),
  })
}

export async function enrollProfile(
  db: SchoolDbExecutor,
  batchId: string,
  data: EnrollData,
): Promise<Enrollment> {
  const profileExists = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, data.profileId),
    columns: { id: true },
  })

  if (!profileExists) {
    throw notFound()
  }

  const existing = await findEnrollment(db, data.profileId, batchId)
  if (existing) {
    throw conflict()
  }

  const rows = await db
    .insert(enrollment)
    .values({ batchId, profileId: data.profileId, role: data.role })
    .returning()

  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

// True when instructorProfileId has ever taught (instructor/ta role) a batch that
// studentProfileId is also (or was also) enrolled in — the gate for letting a teacher view a
// student's full batch history rather than just the roster of a batch they share right now.
export async function hasSharedInstructorEnrollment(
  db: SchoolDbExecutor,
  instructorProfileId: string,
  studentProfileId: string,
): Promise<boolean> {
  const instructorBatchIds = db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.profileId, instructorProfileId),
        inArray(enrollment.role, ['instructor', 'ta']),
      ),
    )

  const shared = await db.query.enrollment.findFirst({
    where: (t, { and, eq, inArray }) =>
      and(eq(t.profileId, studentProfileId), inArray(t.batchId, instructorBatchIds)),
    columns: { batchId: true },
  })

  return shared !== undefined
}

export async function unenrollProfile(
  db: SchoolDbExecutor,
  batchId: string,
  profileId: string,
): Promise<void> {
  const rows = await db
    .delete(enrollment)
    .where(and(eq(enrollment.batchId, batchId), eq(enrollment.profileId, profileId)))
    .returning()

  if (rows.length === 0) {
    throw notFound()
  }
}
