import type { SchoolDb } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
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

/** Adds a profile to a batch's roster. 404 if the target profile doesn't exist; 409 if already enrolled. */
export async function enroll(
  db: SchoolDb,
  batchId: string,
  data: CreateEnrollmentData,
): Promise<Enrollment> {
  if (!(await repository.profileExists(db, data.profileId))) {
    throw notFound()
  }

  if (await repository.findEnrollment(db, data.profileId, batchId)) {
    throw conflict('profile is already enrolled in this batch')
  }

  const row = await repository.insertEnrollment(db, batchId, data)
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
