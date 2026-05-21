import { enrollment, type Database } from '@narada/db'

export type Enrollment = typeof enrollment.$inferSelect

export default class EnrollmentService {
  public static async findOne(
    db: Database,
    userId: string,
    batchId: string,
  ): Promise<Enrollment | undefined> {
    return db.query.enrollment.findFirst({
      where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.batchId, batchId)),
    })
  }
}
