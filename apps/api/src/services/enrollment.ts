import { db, enrollment } from '@narada/db'

export type Enrollment = typeof enrollment.$inferSelect

export default class EnrollmentService {
  public static async findOne(userId: string, batchId: string): Promise<Enrollment | undefined> {
    return db.query.enrollment.findFirst({
      where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.batchId, batchId)),
    })
  }
}
