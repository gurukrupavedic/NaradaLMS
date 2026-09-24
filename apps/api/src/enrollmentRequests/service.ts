import type { SchoolDbClient } from '@narada/db'

import * as batchesRepository from '../batches/repository'
import { conflict, forbidden, orInternalError, orNotFound } from '../error'
import * as enrollmentRepository from '../enrollment/repository'
import { enroll } from '../enrollment/service'
import * as examRepository from '../exams/repository'
import * as trackRepository from '../tracks/repository'
import * as repository from './repository'
import type { EnrollmentRequest, FindEnrollmentRequestsData } from './schema'

type EnrollmentRequestServiceContext = { db: SchoolDbClient }

export async function findAll(
  context: EnrollmentRequestServiceContext,
  params: FindEnrollmentRequestsData,
  batchIds: string[] | null,
  courseId: string,
): Promise<{ items: EnrollmentRequest[]; nextCursor: string | null }> {
  return repository.findAll(context.db, params, batchIds, courseId)
}

export async function findById(context: EnrollmentRequestServiceContext, id: string): Promise<EnrollmentRequest> {
  return orNotFound(await repository.findById(context.db, id))
}

/**
 * A student asking to join a batch (POST /batches/:batchId/enroll) — any batch not yet marked
 * `completed` can be requested; seating them waits on an admin/instructor's `approve` below
 * instead of happening here.
 *
 * Runs inside one transaction with the batch row locked (`findByIdForUpdate`) so two racing
 * requests for the same profile+batch (a doubled-up click) can't both pass the "not already
 * enrolled / not already pending" checks before either commits.
 */
export async function request(db: SchoolDbClient, batchId: string, profileId: string): Promise<EnrollmentRequest> {
  return db.transaction(async tx => {
    const batchRow = orNotFound(await batchesRepository.findByIdForUpdate(tx, batchId))

    if (batchRow.status === 'completed') {
      throw conflict('batch has already completed')
    }

    if (await enrollmentRepository.findEnrollment(tx, profileId, batchId)) {
      throw conflict('already enrolled in this batch')
    }

    // One live batch per course: asking for a second one while holding an active seat can only
    // fail at approval, so say so now. (The unique index still settles the race at approval; this
    // is the early, friendly version.)
    if (await enrollmentRepository.findActiveStudentSeatInCourse(tx, profileId, batchRow.courseId)) {
      throw conflict(
        'you already have an active batch in this course — ask an admin to move you instead',
      )
    }

    if (await repository.findPending(tx, profileId, batchId)) {
      throw conflict('a request to join this batch is already pending')
    }

    // Gate on the track before this one, if any — the course's first track has no prerequisite.
    // "at least L1" is any recorded result other than `reappear` (grading.ts::levelForOutcome).
    const previousTrack = await trackRepository.findPreviousTrack(tx, batchRow.trackId)
    if (previousTrack && !(await examRepository.hasPassedTrack(tx, profileId, previousTrack.id))) {
      throw forbidden('you need at least L1 in the previous track to join this batch')
    }

    const inserted = orInternalError(await repository.insert(tx, batchId, profileId))

    return orInternalError(await repository.findById(tx, inserted.id))
  })
}

/**
 * Approving seats the student first (`enrollment/service.ts::enroll` — 404 if the profile
 * somehow no longer exists, 409 if they're already actively enrolled) and only then flips this
 * request to `'approved'`, mirroring `registrations/service.ts::review`'s own ordering: if
 * `enroll` throws partway, the request is untouched and still `pending`, so simply retrying the
 * approval picks up where it left off rather than leaving a request marked approved with nobody
 * actually seated.
 */
async function review(
  context: EnrollmentRequestServiceContext,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<EnrollmentRequest> {
  const existing = orNotFound(await repository.findById(context.db, id))

  if (status === 'approved') {
    await enroll(context.db, existing.batchId, { profileId: existing.profileId, role: 'student' })
  }

  const row = await repository.transitionStatus(context.db, id, status, reviewedBy)
  if (!row) {
    // The precheck above ruled out "no such request" — the only other way transitionStatus
    // updates 0 rows is a request that's already been reviewed (its `pending` guard failed).
    throw conflict('enrollment request has already been reviewed')
  }

  return orInternalError(await repository.findById(context.db, id))
}

export async function approve(
  context: EnrollmentRequestServiceContext,
  id: string,
  reviewedBy: string | null,
): Promise<EnrollmentRequest> {
  return review(context, id, 'approved', reviewedBy)
}

export async function reject(
  context: EnrollmentRequestServiceContext,
  id: string,
  reviewedBy: string | null,
): Promise<EnrollmentRequest> {
  return review(context, id, 'rejected', reviewedBy)
}
