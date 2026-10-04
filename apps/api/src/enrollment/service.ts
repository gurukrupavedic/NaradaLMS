import type { SchoolDb, SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, orInternalError, orNotFound, unprocessable } from '../error'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type { ChangeRoleData, CreateEnrollmentData, SetEnrollmentScoresData } from './schema'
import type { Enrollment } from './repository'

export { findStudentIdsInBatch, hasSharedInstructorEnrollment, isEnrolledInAnyBatch } from './repository'

// A student can only be examined on a track they're enrolled in as a student. Which batch that
// was isn't recorded on the exam, so any enrollment on the track qualifies. Direct evaluation
// creation is a different shape of the same invariant — there the batch is already given (from
// the URL), so it's validated, not searched for — see `assertStudentEnrolledInBatch` below.
export async function assertEnrolledInTrack(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<void> {
  const qualifying = await repository.findQualifyingBatches(db, studentId, trackId)
  if (qualifying.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this track')
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

  const courseId = orNotFound(await repository.findBatchCourseId(db, batchId))

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

/**
 * Puts a student's enrollment in this batch on a break: `apps/web`'s roster views only render
 * `'active'` members, so they drop off the mark book teachers see — but the
 * enrollment row itself survives (a status transition, not a delete), so their history
 * stays intact and `enroll` above can reactivate them later (see its own doc comment) instead of
 * re-enrolling from scratch. 404 if no such enrollment exists.
 */
export async function putOnBreak(db: SchoolDb, batchId: string, profileId: string): Promise<void> {
  orNotFound(await repository.updateEnrollmentStatus(db, batchId, profileId, 'break'))
}

/**
 * Sets a learner's attendance / recitation / backlog scores in this batch. 404 if they aren't a
 * student or class TA of it (an instructor has no scores to set).
 */
export async function setScores(
  db: SchoolDb,
  batchId: string,
  profileId: string,
  scores: SetEnrollmentScoresData,
  updatedBy: string,
): Promise<Enrollment> {
  return orNotFound(await repository.updateScores(db, batchId, profileId, scores, updatedBy))
}

/**
 * Moves a profile from one batch to another, preserving whatever role they already held, in a
 * single transaction — a separate remove-then-enroll could leave the roster with neither if the
 * second half failed. 404 if the profile isn't
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
    const current = orNotFound(await repository.findEnrollment(tx, profileId, fromBatchId))

    if (await repository.findEnrollment(tx, profileId, toBatchId)) {
      throw conflict('profile is already enrolled in the destination batch')
    }

    const toCourseId = orNotFound(await repository.findBatchCourseId(tx, toBatchId))

    // The old seat is released before the new one is taken, inside the one transaction — moving
    // within a course must never trip the one-active-seat index against the seat being left.
    orInternalError(await repository.deleteEnrollment(tx, fromBatchId, profileId))

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

/**
 * Promotes a student to TA, or steps a TA back to student, in place — the same enrollment row, so
 * their marks and history carry over. 404 if they have no live seat here; 422 if they are a teacher
 * (teachers are added and removed, never converted). Stepping a TA down takes the same
 * one-active-student-seat-per-course 409 as any other seating, since a TA seat doesn't count
 * against that limit but a student seat does.
 */
export async function changeRole(
  db: SchoolDb,
  batchId: string,
  profileId: string,
  data: ChangeRoleData,
): Promise<Enrollment> {
  const current = orNotFound(await repository.findEnrollment(db, profileId, batchId))
  if (current.status !== 'active') {
    throw notFound()
  }
  if (current.role === 'instructor') {
    throw unprocessable("a teacher's role can't be changed — remove them instead")
  }

  const updated = await withConstraintMapping(
    () => repository.updateEnrollmentRole(db, batchId, profileId, data.role),
    seatConflictMapping,
  )
  return orInternalError(updated)
}

/**
 * Takes a teacher off a batch. 404 if they aren't one of its teachers; 409 if they are the last —
 * a batch is never left without a teacher (the create-batch form enforces the same floor).
 */
export async function removeInstructor(
  db: SchoolDbClient,
  batchId: string,
  profileId: string,
): Promise<void> {
  await db.transaction(async tx => {
    const instructorIds = await repository.lockActiveInstructorIds(tx, batchId)
    if (!instructorIds.includes(profileId)) {
      throw notFound()
    }
    if (instructorIds.length <= 1) {
      throw conflict("a batch can't be left without a teacher")
    }

    orInternalError(await repository.deleteEnrollment(tx, batchId, profileId))
  })
}
