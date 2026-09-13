import { and, eq, inArray, isNull, sql } from 'drizzle-orm'

import { batch, enrollment, profile, type SchoolDb } from '@narada/db'

import type { CreateEnrollmentData } from './schema'

export type Enrollment = typeof enrollment.$inferSelect

/** Active student headcount per batch, for capacity checks (`enrollment/service.ts::selfEnroll`,
 * `batches/repository.ts::findOpen`) — 'break'/'dropped'/'inactive' don't hold a seat, and a TA/
 * instructor never counted against a batch's *student* capacity to begin with. Batches with no
 * enrollment at all are simply absent from the returned map, not present with a `0` — every call
 * site already treats a missing entry as zero (`?? 0`). */
export async function countActiveStudentEnrollments(
  db: SchoolDb,
  batchIds: string[],
): Promise<Map<string, number>> {
  if (batchIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ batchId: enrollment.batchId, count: sql<number>`count(*)::int` })
    .from(enrollment)
    .where(
      and(inArray(enrollment.batchId, batchIds), eq(enrollment.role, 'student'), eq(enrollment.status, 'active')),
    )
    .groupBy(enrollment.batchId)

  return new Map(rows.map(row => [row.batchId, row.count]))
}

// Deliberately returns every qualifying batch rather than `.limit(1)`-ing to one — the caller
// (`resolveQualifyingBatch`) must reject ambiguity when a student qualifies for more than one
// batch, not silently pick one (DD-012 §1).
//
// Requires the target student's own profile to still be active (DD-011 §4.6): profile
// deactivation deliberately leaves `enrollment` rows untouched so historical queries keep
// working, which means a deactivated student's stale enrollment would otherwise still "qualify"
// them for a brand-new exam/evaluation.
export async function findQualifyingBatches(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<{ batchId: string }[]> {
  return db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .innerJoin(batch, eq(enrollment.batchId, batch.id))
    .innerJoin(profile, eq(enrollment.profileId, profile.id))
    .where(
      and(
        eq(enrollment.profileId, studentId),
        eq(enrollment.role, 'student'),
        eq(batch.trackId, trackId),
        isNull(profile.deletedAt),
      ),
    )
}

export async function findEnrollment(
  db: SchoolDb,
  profileId: string,
  batchId: string,
): Promise<{ role: typeof enrollment.$inferSelect.role } | undefined> {
  return db.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.profileId, profileId), eq(t.batchId, batchId)),
    columns: { role: true },
  })
}

export async function profileExists(db: SchoolDb, profileId: string): Promise<boolean> {
  const row = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
    columns: { id: true },
  })

  return row !== undefined
}

export async function insertEnrollment(
  db: SchoolDb,
  batchId: string,
  data: CreateEnrollmentData,
): Promise<Enrollment | undefined> {
  const rows = await db
    .insert(enrollment)
    .values({ batchId, profileId: data.profileId, role: data.role })
    .returning()

  return rows.at(0)
}

/** Returns whether a row was actually deleted — the service turns `false` into a 404. */
export async function deleteEnrollment(
  db: SchoolDb,
  batchId: string,
  profileId: string,
): Promise<boolean> {
  const rows = await db
    .delete(enrollment)
    .where(and(eq(enrollment.batchId, batchId), eq(enrollment.profileId, profileId)))
    .returning({ profileId: enrollment.profileId })

  return rows.length > 0
}

// True when instructorProfileId currently holds an instructor/ta enrollment in a batch that
// studentProfileId is also (or was also) enrolled in — the gate for letting a teacher view a
// student's full batch history rather than just the roster of a batch they share right now.
export async function hasSharedInstructorEnrollment(
  db: SchoolDb,
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
