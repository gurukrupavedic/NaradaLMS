import { z } from 'zod'

import { enrollment, type Database } from '@narada/db'

export const enrollmentSchema = z.object({
  userId: z.string(),
  batchId: z.string(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  role: z.enum(['instructor', 'ta', 'student']),
  status: z.enum(['active', 'inactive', 'completed']),
  joinedAt: z.date().nullable(),
})

export type Enrollment = z.infer<typeof enrollmentSchema>

type DbEnrollment = typeof enrollment.$inferSelect

function mapEnrollment(row: DbEnrollment): Enrollment {
  return {
    userId: row.userId,
    batchId: row.batchId,
    phone: row.phone,
    city: row.city,
    role: row.role,
    status: row.status,
    joinedAt: row.joinedAt,
  }
}

export default class EnrollmentService {
  public static async findOne(
    db: Database,
    userId: string,
    batchId: string,
  ): Promise<Enrollment | undefined> {
    const row = await db.query.enrollment.findFirst({
      where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.batchId, batchId)),
    })

    return row ? mapEnrollment(row) : undefined
  }
}
