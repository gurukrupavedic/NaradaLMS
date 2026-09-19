import type { SchoolDb, SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type { CreateEnrollmentData } from './schema'
import type { Enrollment } from './repository'

export { hasSharedInstructorEnrollment } from './repository'

// A student can only be examined on a chapter belonging to a track they're enrolled in as a
// student, and that enrollment must be unambiguous — used when the batch itself is *not* yet
// known and must be found by searching every batch on the chapter's track (exam creation,
// DD-012: the resolved batchId becomes the immutable assessment context stored on the new row).
// Direct evaluation creation is a different shape of the same underlying invariant — there the
// batch is already given (from the URL), so it's validated, not searched for — see
// `assertStudentEnrolledInBatch` below.
export async function resolveQualifyingBatch(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<string> {
  const qualifying = await repository.findQualifyingBatches(db, studentId, trackId)
  if (qualifying.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this chapter')
  }

  if (qualifying.length > 1) {
    throw unprocessable("student is enrolled in multiple batches for this chapter's track")
  }

  const [only] = qualifying
  if (!only) {
    throw internalError()
  }

  return only.batchId
}

// The evaluation-creation counterpart to `resolveQualifyingBatch`: the batch is already known
// (from the URL, PARITY_PLAN.md §10.5), so this validates the student holds a `student`
// enrollment in *that specific batch* rather than searching for one across a track.
export async function assertStudentEnrolledInBatch(
  db: SchoolDb,
  studentId: string,
  batchId: string,
): Promise<void> {
  const enrollment = await repository.findEnrollment(db, studentId, batchId)
  if (!enrollment || enrollment.role !== 'student') {
    throw unprocessable('student is not enrolled in this batch')
  }
}

// A student holds at most one `active` batch seat per course. The partial unique index
// `enrollment_one_active_student_seat_per_course` is the guarantee (it also settles two racing
// requests); this is just its 409, shared by every path that can seat a student.
const seatConflict = () =>
  conflict('this student already has an active batch in this course — move or remove them first')

const seatConflictMapping = {
  [DbConstraint.enrollmentOneActiveSeatPerCourse]: seatConflict,
}

/**
 * Adds a profile to a batch's roster. 404 if the target profile or batch doesn't exist; 409 if they
 * already hold a live (`'active'`) seat here or, for a student, already hold an active seat in
 * another batch of the same course.
 *
 * A profile with an existing but non-active row (on a break — see `putOnBreak` below — or
 * dropped/inactive) isn't a conflict: this reactivates that same row in place (status back to
 * `'active'`, role set to whatever was just requested) rather than erroring, since
 * `profiles/repository.ts::search`'s `excludeBatchId` filter now only excludes `'active'` members,
 * so a break student shows back up as an addable candidate here in the first place. Reactivating is
 * seating like any other: it takes the same 409 if the student has since joined another batch in
 * this course, because a break means "not in any batch right now", not "still holding a seat".
 */
export async function enroll(
  db: SchoolDb,
  batchId: string,
  data: CreateEnrollmentData,
): Promise<Enrollment> {
  if (!(await repository.profileExists(db, data.profileId))) {
    throw notFound()
  }

  const courseId = await repository.findBatchCourseId(db, batchId)
  if (!courseId) {
    throw notFound()
  }

  const existing = await repository.findEnrollment(db, data.profileId, batchId)
  if (existing) {
    if (existing.status === 'active') {
      throw conflict('profile is already enrolled in this batch')
    }

    const reactivated = await withConstraintMapping(
      () => repository.reactivateEnrollment(db, batchId, data.profileId, data.role),
      seatConflictMapping,
    )
    if (!reactivated) {
      throw internalError()
    }

    return reactivated
  }

  const row = await withConstraintMapping(
    () => repository.insertEnrollment(db, batchId, courseId, data),
    seatConflictMapping,
  )
  if (!row) {
    throw internalError()
  }

  return row
}

/** Removes a profile from a batch's roster. 404 if no such enrollment exists. */
export async function unenroll(db: SchoolDb, batchId: string, profileId: string): Promise<void> {
  const removed = await repository.deleteEnrollment(db, batchId, profileId)
  if (!removed) {
    throw notFound()
  }
}

/**
 * Puts a student's enrollment in this batch on a break: `apps/web`'s roster views only render
 * `'active'` members, so they drop off the mark book teachers see — but, unlike `unenroll`, the
 * enrollment row itself survives (same "status transition, not delete" shape as a profile
 * deactivation — see `repository.ts::findQualifyingBatches`'s own doc comment), so their history
 * stays intact and `enroll` above can reactivate them later (see its own doc comment) instead of
 * re-enrolling from scratch. 404 if no such enrollment exists.
 */
export async function putOnBreak(db: SchoolDb, batchId: string, profileId: string): Promise<void> {
  const updated = await repository.updateEnrollmentStatus(db, batchId, profileId, 'break')
  if (!updated) {
    throw notFound()
  }
}

/**
 * Moves a profile from one batch to another, preserving whatever role they already held, in a
 * single transaction — the two-step unenroll-then-enroll an admin might otherwise do by hand
 * could leave the roster with neither if the second half failed. 404 if the profile isn't
 * enrolled in `fromBatchId`; 409 if they're already enrolled in `toBatchId` (this also covers
 * `fromBatchId === toBatchId`, since that enrollment is found there too before anything is
 * deleted).
 */
export async function moveEnrollment(
  db: SchoolDbClient,
  fromBatchId: string,
  toBatchId: string,
  profileId: string,
): Promise<Enrollment> {
  return db.transaction(async tx => {
    const current = await repository.findEnrollment(tx, profileId, fromBatchId)
    if (!current) {
      throw notFound()
    }

    if (await repository.findEnrollment(tx, profileId, toBatchId)) {
      throw conflict('profile is already enrolled in the destination batch')
    }

    const toCourseId = await repository.findBatchCourseId(tx, toBatchId)
    if (!toCourseId) {
      throw notFound()
    }

    // The old seat is released before the new one is taken, inside the one transaction — moving
    // within a course must never trip the one-active-seat index against the seat being left.
    const removed = await repository.deleteEnrollment(tx, fromBatchId, profileId)
    if (!removed) {
      throw internalError()
    }

    const row = await withConstraintMapping(
      () => repository.insertEnrollment(tx, toBatchId, toCourseId, { profileId, role: current.role }),
      seatConflictMapping,
    )
    if (!row) {
      throw internalError()
    }

    return row
  })
}
