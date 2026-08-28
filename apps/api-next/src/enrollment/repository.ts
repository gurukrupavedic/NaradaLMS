import { and, eq, inArray, isNull } from 'drizzle-orm'

import { batch, enrollment, profile, type SchoolDb } from '@narada/db'

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
