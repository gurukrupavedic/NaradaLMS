import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

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
