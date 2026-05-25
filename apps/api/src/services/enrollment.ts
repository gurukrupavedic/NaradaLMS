import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { enrollment, type Database } from '@narada/db'
import { conflict, notFound } from '../error'
import assert from 'node:assert'

export const enrollmentSchema = z.object({
  userId: z.string(),
  batchId: z.string(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  role: z.enum(['instructor', 'ta', 'student']),
  status: z.enum(['active', 'inactive', 'completed']),
  joinedAt: z.date().nullable(),
})

export const enrollSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['instructor', 'ta', 'student']),
})

export type Enrollment = z.infer<typeof enrollmentSchema>
export type EnrollData = z.infer<typeof enrollSchema>

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

  public static async enroll(db: Database, batchId: string, data: EnrollData): Promise<Enrollment> {
    const existing = await EnrollmentService.findOne(db, data.userId, batchId)
    if (existing) {
      throw conflict()
    }

    const rows = await db
      .insert(enrollment)
      .values({ batchId, userId: data.userId, role: data.role })
      .returning()

    const row = rows.at(0)
    assert(row !== undefined, '`insert` should always return a row')
    return mapEnrollment(row)
  }

  public static async unenroll(db: Database, batchId: string, userId: string): Promise<void> {
    const rows = await db
      .delete(enrollment)
      .where(and(eq(enrollment.batchId, batchId), eq(enrollment.userId, userId)))
      .returning()

    if (rows.length === 0) {
      throw notFound()
    }
  }
}
