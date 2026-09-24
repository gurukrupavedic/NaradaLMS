import type { SchoolDbClient } from '@narada/db'

import { conflict, forbidden, internalError, orInternalError, orNotFound, unprocessable } from '../error'
import type { AccessPolicy, ExamSlotRequestReadScope } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as examRepository from '../exams/repository'
import { exists as trackExists } from '../tracks/repository'
import { createExam } from '../exams/service'
import * as repository from './repository'
import type {
  ExamSlot,
  ExamSlotRequest,
  ExamSlotRequestWithDetail,
  ExamSlotWithDetail,
  FindExamSlotRequestsData,
  FindExamSlotsData,
  OpenExamSlotData,
} from './schema'

type ExamSlotServiceContext = { db: SchoolDbClient }

export async function findManySlots(
  context: ExamSlotServiceContext,
  params: FindExamSlotsData,
  courseId: string,
): Promise<{ items: ExamSlotWithDetail[]; nextCursor: string | null }> {
  return repository.findManySlots(context.db, params, courseId)
}

export async function findSlotById(context: ExamSlotServiceContext, id: string): Promise<ExamSlot> {
  return orNotFound(await repository.findSlotById(context.db, id))
}

/** The `GET /exam-slots/:examSlotId` read path — see `repository.ts::findSlotByIdWithDetail`'s own doc comment. */
export async function findSlotByIdWithDetail(
  context: ExamSlotServiceContext,
  id: string,
): Promise<ExamSlotWithDetail> {
  return orNotFound(await repository.findSlotByIdWithDetail(context.db, id))
}

/**
 * The tracks `studentId` may currently request a sitting on — the same rule `request` below
 * enforces (`exams/repository.ts::isCertifiedAcrossTrack`), exposed up front so the student UI can
 * disable the button instead of letting them click into a 403.
 */
export async function findEligibleTrackIds(
  context: ExamSlotServiceContext,
  studentId: string,
  courseId: string,
): Promise<string[]> {
  return examRepository.findEligibleTrackIds(context.db, studentId, courseId)
}

export async function findManyRequests(
  context: ExamSlotServiceContext,
  params: FindExamSlotRequestsData,
  scope: ExamSlotRequestReadScope,
  courseId: string,
): Promise<{ items: ExamSlotRequestWithDetail[]; nextCursor: string | null }> {
  return repository.findManyRequests(context.db, params, scope, courseId)
}

export async function findRequestById(context: ExamSlotServiceContext, id: string): Promise<ExamSlotRequest> {
  return orNotFound(await repository.findRequestById(context.db, id))
}

/** The `GET /exam-slots/requests/:examSlotRequestId` read path — see `repository.ts::findRequestByIdWithDetail`'s own doc comment. */
export async function findRequestByIdWithDetail(
  context: ExamSlotServiceContext,
  id: string,
): Promise<ExamSlotRequestWithDetail> {
  return orNotFound(await repository.findRequestByIdWithDetail(context.db, id))
}

/**
 * Opens a new bookable appointment on a track — school-admin (or super-admin) only, the same gate
 * as booking an exam directly (`AccessPolicy#requireCanCreateExam`). Deliberately independent of
 * `batch`: a sitting belongs to no batch, and the student's enrollment on the track is only checked
 * once a request on this slot is approved (`approve` below), the same way it is for a direct-admin
 * exam.
 */
export async function openSlot(
  context: ExamSlotServiceContext & { access: AccessPolicy },
  data: OpenExamSlotData,
  openedBy: string,
): Promise<ExamSlot> {
  context.access.requireCanCreateExam()

  if (!(await trackExists(context.db, data.trackId))) {
    throw unprocessable('track not found')
  }

  return orInternalError(await repository.insertSlot(context.db, { ...data, openedBy }))
}

/**
 * A student's own request to sit `slotId` — eligible only once they've reached L3 on every
 * gradable chapter of the slot's track (chapter mastery, not a prior exam result — see
 * `exams/repository.ts::isCertifiedAcrossTrack`'s doc comment for how that differs from
 * `hasPassedTrack`). `studentId` is always the caller's own profile, not something a route should
 * ever take from the request body — this is self-service, not an admin booking on someone's
 * behalf (that's `exams/service.ts::createExam`, unchanged by this module).
 *
 * Claiming the slot's one seat is a compare-and-set on its own status (`open` → `requested`)
 * inside the same transaction as inserting the request row, so a lost race against another
 * student's simultaneous request never leaves the slot claimed with no request to show for it —
 * and the loser sees a 409 ("no longer open"), not a silent double-booking.
 */
export async function request(
  context: ExamSlotServiceContext,
  slotId: string,
  studentId: string,
): Promise<ExamSlotRequest> {
  const slot = await findSlotById(context, slotId)

  if (!(await examRepository.isCertifiedAcrossTrack(context.db, studentId, slot.trackId))) {
    throw forbidden('you need L3 on every chapter of this track before requesting a sitting')
  }

  if (await repository.findPendingRequestForStudentTrack(context.db, studentId, slot.trackId)) {
    throw conflict('you already have a pending request for this track')
  }

  return context.db.transaction(async tx => {
    const claimed = await repository.updateSlotStatusGuarded(tx, slotId, 'requested', 'open')
    if (!claimed) {
      throw conflict('this slot is no longer open')
    }

    const inserted = await withConstraintMapping(
      () => repository.insertRequest(tx, { slotId, trackId: slot.trackId, studentId }),
      {
        [DbConstraint.examSlotRequestOnePendingPerStudentTrack]: () =>
          conflict('you already have a pending request for this track'),
      },
    )
    if (!inserted) {
      throw internalError()
    }

    return inserted
  })
}

/**
 * Approving books the real sitting first (`exams/service.ts::createExam`, which re-checks
 * school-admin authorization on its own) and only then moves the slot to `booked` and the request
 * to `approved` — mirroring `enrollmentRequests/service.ts::review`'s own ordering: if
 * `createExam` throws partway, this request and its slot are untouched and still
 * `pending`/`requested`, so simply retrying the approval picks up where it left off rather than
 * leaving a request marked approved with no exam behind it.
 */
export async function approve(
  context: ExamSlotServiceContext & { access: AccessPolicy },
  id: string,
  reviewedBy: string | null,
): Promise<ExamSlotRequest> {
  context.access.requireCanCreateExam()

  const existing = await findRequestById(context, id)
  if (existing.status !== 'pending') {
    throw conflict('this request has already been reviewed')
  }

  const slot = await findSlotById(context, existing.slotId)

  const exam = await createExam(context, {
    trackId: existing.trackId,
    studentId: existing.studentId,
    scheduledAt: slot.scheduledAt,
  })

  const booked = await repository.updateSlotStatusGuarded(context.db, slot.id, 'booked', 'requested')
  if (!booked) {
    // The slot could only have left 'requested' via this very request's own approval or
    // rejection — both already ruled out by the `pending` guard above.
    throw internalError()
  }

  const reviewed = await repository.transitionRequestStatus(context.db, id, 'approved', reviewedBy, exam.id)
  if (!reviewed) {
    throw conflict('this request has already been reviewed')
  }

  return reviewed
}

/** Rejecting frees the slot (back to `open`) instead of leaving it stuck at `requested` forever. */
export async function reject(
  context: ExamSlotServiceContext & { access: AccessPolicy },
  id: string,
  reviewedBy: string | null,
): Promise<ExamSlotRequest> {
  context.access.requireCanCreateExam()

  const existing = await findRequestById(context, id)
  if (existing.status !== 'pending') {
    throw conflict('this request has already been reviewed')
  }

  orInternalError(await repository.updateSlotStatusGuarded(context.db, existing.slotId, 'open', 'requested'))

  const reviewed = await repository.transitionRequestStatus(context.db, id, 'rejected', reviewedBy, null)
  if (!reviewed) {
    throw conflict('this request has already been reviewed')
  }

  return reviewed
}

/**
 * Withdraws a slot outright (an examiner is no longer free, a track was retired, ...) — school-admin
 * only. Only ever allowed from `open` or `requested`: a `booked` slot has already produced a real
 * `exam` row, which is the source of truth from there on — cancel *that* sitting instead
 * (`exams/service.ts::updateExam` with `status: 'cancelled'`), rather than this reaching in to do
 * it too and giving the same outcome two different call paths.
 *
 * Cancelling a `requested` slot also rejects the pending request holding it (inside the same
 * transaction as the slot's own status change) — otherwise that request would sit `pending`
 * forever, pointing at a slot that no longer exists to book, and would keep blocking the student
 * from requesting any other slot on this track (`examSlotRequest_one_pending_per_student_track_uidx`).
 */
export async function cancelSlot(
  context: ExamSlotServiceContext & { access: AccessPolicy },
  id: string,
  cancelledBy: string | null,
): Promise<ExamSlot> {
  context.access.requireCanCreateExam()

  const existing = await findSlotById(context, id)
  if (existing.status !== 'open' && existing.status !== 'requested') {
    throw conflict(
      existing.status === 'booked'
        ? 'this slot is already booked — cancel the exam itself instead'
        : 'this slot has already been cancelled',
    )
  }

  return context.db.transaction(async tx => {
    const cancelled = await repository.updateSlotStatusGuarded(tx, id, 'cancelled', existing.status)
    if (!cancelled) {
      throw conflict('this slot changed status concurrently')
    }

    if (existing.status === 'requested') {
      const pending = await repository.findPendingRequestForSlot(tx, id)
      if (!pending) {
        // A `requested` slot always has exactly one pending request holding it — the CAS above,
        // guarded by the very same `existing.status`, just confirmed nothing else moved it away
        // from `requested` in the meantime.
        throw internalError()
      }

      await repository.transitionRequestStatus(tx, pending.id, 'rejected', cancelledBy, null)
    }

    return cancelled
  })
}
