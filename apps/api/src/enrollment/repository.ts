import { and, eq, inArray, isNull } from 'drizzle-orm'

import { batch, enrollment, profile, type SchoolDb } from '@narada/db'

import type { CreateEnrollmentData } from './schema'

export type Enrollment = typeof enrollment.$inferSelect

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
): Promise<{ role: Enrollment['role']; status: Enrollment['status'] } | undefined> {
  return db.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.profileId, profileId), eq(t.batchId, batchId)),
    columns: { role: true, status: true },
  })
}

/** Which of `profileIds` hold a `student` enrollment in `batchId`. */
export async function findStudentIdsInBatch(
  db: SchoolDb,
  profileIds: string[],
  batchId: string,
): Promise<Set<string>> {
  if (profileIds.length === 0) {
    return new Set()
  }

  const rows = await db
    .select({ profileId: enrollment.profileId })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.batchId, batchId),
        eq(enrollment.role, 'student'),
        inArray(enrollment.profileId, profileIds),
      ),
    )
  return new Set(rows.map(row => row.profileId))
}

export async function profileExists(db: SchoolDb, profileId: string): Promise<boolean> {
  const row = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
    columns: { id: true },
  })

  return row !== undefined
}

/** The course a batch belongs to — what an `enrollment` row must carry as its own `courseId`. `undefined` if there is no such batch. */
export async function findBatchCourseId(
  db: SchoolDb,
  batchId: string,
): Promise<string | undefined> {
  const row = await db.query.batch.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, batchId),
    columns: { courseId: true },
  })

  return row?.courseId
}

/**
 * `courseId` must be the batch's own — the composite foreign key `enrollment_batchId_courseId_fk`
 * rejects anything else — so callers get it from {@link findBatchCourseId} rather than accepting it
 * from a request.
 */
export async function insertEnrollment(
  db: SchoolDb,
  batchId: string,
  courseId: string,
  data: CreateEnrollmentData,
): Promise<Enrollment | undefined> {
  const rows = await db
    .insert(enrollment)
    .values({ batchId, courseId, profileId: data.profileId, role: data.role })
    .returning()

  return rows.at(0)
}

/** The batch (if any) where this profile currently holds an `active` student seat in `courseId` — the seat the one-per-course rule is about. */
export async function findActiveStudentSeatInCourse(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<{ batchId: string } | undefined> {
  const rows = await db
    .select({ batchId: enrollment.batchId })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.profileId, profileId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.role, 'student'),
        eq(enrollment.status, 'active'),
      ),
    )
    .limit(1)

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

/** Returns whether a row was actually updated — the service turns `false` into a 404. Unlike
 * `deleteEnrollment`, the row survives with its new status (see `enrollment/service.ts::putOnBreak`
 * for why a break isn't a delete). */
export async function updateEnrollmentStatus(
  db: SchoolDb,
  batchId: string,
  profileId: string,
  status: Enrollment['status'],
): Promise<boolean> {
  const rows = await db
    .update(enrollment)
    .set({ status })
    .where(and(eq(enrollment.batchId, batchId), eq(enrollment.profileId, profileId)))
    .returning({ profileId: enrollment.profileId })

  return rows.length > 0
}

/** Reactivates an existing (non-active) enrollment row in place, setting both its status back to
 * `'active'` and its role to whatever the caller just asked for — see `enrollment/service.ts::enroll`'s
 * doc comment for why re-adding someone who's on a break goes through this instead of `insertEnrollment`. */
export async function reactivateEnrollment(
  db: SchoolDb,
  batchId: string,
  profileId: string,
  role: Enrollment['role'],
): Promise<Enrollment | undefined> {
  const rows = await db
    .update(enrollment)
    .set({ status: 'active', role })
    .where(and(eq(enrollment.batchId, batchId), eq(enrollment.profileId, profileId)))
    .returning()

  return rows.at(0)
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
