import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { userIdSchema } from '@narada/auth/ids'
import { enrollment, type SchoolDatabase } from '@narada/db'
import { conflict, internalError, notFound } from '../error'

export const enrollSchema = z.object({
  userId: userIdSchema,
  role: z.enum(['instructor', 'ta', 'student']),
})

export type Enrollment = typeof enrollment.$inferSelect
export type EnrollData = z.infer<typeof enrollSchema>

export default class EnrollmentService {
  public static async findOne(
    db: SchoolDatabase,
    userId: string,
    batchId: string,
  ): Promise<Enrollment | undefined> {
    const row = await db.query.enrollment.findFirst({
      where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.batchId, batchId)),
    })

    return row
  }

  public static async enroll(db: SchoolDatabase, batchId: string, data: EnrollData): Promise<Enrollment> {
    const existing = await EnrollmentService.findOne(db, data.userId, batchId)
    if (existing) throw conflict()
    const rows = await db
      .insert(enrollment)
      .values({ batchId, userId: data.userId, role: data.role })
      .returning()

    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  }

  public static async unenroll(db: SchoolDatabase, batchId: string, userId: string): Promise<void> {
    const rows = await db
      .delete(enrollment)
      .where(and(eq(enrollment.batchId, batchId), eq(enrollment.userId, userId)))
      .returning()

    if (rows.length === 0) {
      throw notFound()
    }
  }
}
