import { and, asc, eq, gt, inArray } from 'drizzle-orm'

import { examSchedule, examSlot, type SchoolDb } from '@narada/db'

import type { ExamSchedule, ExamScheduleData } from './schema'

export async function findAll(db: SchoolDb, courseId: string): Promise<ExamSchedule[]> {
  return db.query.examSchedule.findMany({
    where: (t, { eq: eqCol }) => eqCol(t.courseId, courseId),
    orderBy: [asc(examSchedule.dayOfWeek), asc(examSchedule.startTime)],
  })
}

export async function findById(db: SchoolDb, id: string): Promise<ExamSchedule | undefined> {
  return db.query.examSchedule.findFirst({ where: (t, { eq: eqCol }) => eqCol(t.id, id) })
}

export async function insert(
  db: SchoolDb,
  data: ExamScheduleData & { courseId: string; createdBy: string },
): Promise<ExamSchedule | undefined> {
  const rows = await db.insert(examSchedule).values(data).returning()
  return rows.at(0)
}

export async function update(db: SchoolDb, id: string, data: ExamScheduleData): Promise<ExamSchedule | undefined> {
  const rows = await db.update(examSchedule).set(data).where(eq(examSchedule.id, id)).returning()
  return rows.at(0)
}

export async function remove(db: SchoolDb, id: string): Promise<void> {
  await db.delete(examSchedule).where(eq(examSchedule.id, id))
}

/**
 * Inserts one open slot per instant, skipping any that already exist for this schedule — including
 * cancelled ones, so a sitting an admin cancelled is never regenerated
 * (`examSlot_scheduleId_scheduledAt_uidx`).
 */
export async function insertGeneratedSlots(
  db: SchoolDb,
  schedule: Pick<ExamSchedule, 'id' | 'courseId' | 'createdBy'>,
  instants: Date[],
): Promise<void> {
  if (instants.length === 0) return

  await db
    .insert(examSlot)
    .values(
      instants.map(scheduledAt => ({
        courseId: schedule.courseId,
        scheduleId: schedule.id,
        scheduledAt,
        openedBy: schedule.createdBy,
      })),
    )
    .onConflictDoNothing()
}

/** Removes this schedule's future slots that nobody has claimed — the ones a changed rule can
 * safely rebuild. */
export async function deleteFutureOpenSlots(db: SchoolDb, scheduleId: string, after: Date): Promise<void> {
  await db
    .delete(examSlot)
    .where(
      and(eq(examSlot.scheduleId, scheduleId), eq(examSlot.status, 'open'), gt(examSlot.scheduledAt, after)),
    )
}

/** Times of this schedule's future slots a student has already claimed or booked. */
export async function findFutureCommittedTimes(db: SchoolDb, scheduleId: string, after: Date): Promise<Date[]> {
  const rows = await db
    .select({ scheduledAt: examSlot.scheduledAt })
    .from(examSlot)
    .where(
      and(
        eq(examSlot.scheduleId, scheduleId),
        inArray(examSlot.status, ['requested', 'booked']),
        gt(examSlot.scheduledAt, after),
      ),
    )
  return rows.map(row => row.scheduledAt)
}
