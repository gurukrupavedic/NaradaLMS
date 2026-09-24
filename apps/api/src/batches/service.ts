import { type SchoolDb, type SchoolDbClient } from '@narada/db'

import { conflict, orInternalError, orNotFound, unprocessable } from '../error'
import * as examRepository from '../exams/repository'
import * as trackRepository from '../tracks/repository'
import type { BatchReadScope } from '../utils/accessPolicy'
import { constraintNameOf, DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type {
  Batch,
  BatchDetail,
  BatchWithRole,
  ClassSlot,
  CreateBatchData,
  FindBatchesData,
  OpenBatch,
  SetClassSlotsData,
  UpdateBatchData,
} from './schema'

/** Holds the tenant-scoped client so this service can pass it straight through to repository.ts. */
type BatchServiceContext = { db: SchoolDbClient }

export async function findAllAccessible(
  context: BatchServiceContext,
  params: FindBatchesData,
  scope: BatchReadScope,
  courseId: string,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  return repository.findAccessible(context.db, params, scope, courseId)
}

export async function findAllAccessibleWithDetail(
  context: BatchServiceContext,
  params: FindBatchesData,
  scope: BatchReadScope,
  roleForProfileId: string,
  courseId: string,
): Promise<{ items: BatchWithRole[]; nextCursor: string | null }> {
  return repository.findAccessibleWithDetail(context.db, params, scope, roleForProfileId, courseId)
}

export async function findById(context: BatchServiceContext, id: string): Promise<Batch> {
  return orNotFound(await repository.findById(context.db, id))
}

export async function findByIdWithMembers(
  context: BatchServiceContext,
  id: string,
): Promise<BatchDetail> {
  return orNotFound(await repository.findByIdWithMembers(context.db, id))
}

// Retries beat asking the caller to resubmit for what's normally a same-request race (two admins
// generating a batch for the same course/year/classifier/track within moments of each other) —
// each attempt re-reads `nextBatchIndex`, so a retry moves past whatever just collided rather than
// recomputing the same losing index. Five is generous for a collision that should be rare in
// practice; a caller that exhausts it gets a real 409 rather than looping forever.
const MAX_CODE_ATTEMPTS = 5

/**
 * The batch code is generated here, not accepted from the request (see `CreateBatchSchema`'s own
 * doc comment): `<COURSE>-<year>-<CLASSIFIER>-<track order>-<index>`, the current calendar year
 * and the next unused index for that exact combination. `courseSlug` comes from the request's own
 * course context (`getCourse()` in the route) rather than a second lookup here — the route already
 * resolved it to serve this endpoint at all.
 */
export async function createBatch(
  context: BatchServiceContext,
  data: CreateBatchData,
  courseSlug: string,
): Promise<Batch> {
  const { classifier, ...rest } = data

  // A batch's course is its track's course — copied down rather than accepted from the request, and
  // the composite foreign key refuses any other value.
  const track = await repository.findTrackForBatch(context.db, data.trackId)
  if (!track) {
    throw unprocessable('unknown or invalid track')
  }

  const year = new Date().getUTCFullYear()
  const codePrefix = `${courseSlug.toUpperCase()}-${year}-${classifier}-${track.order}`

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const index = await repository.nextBatchIndex(context.db, codePrefix)
    const code = `${codePrefix}-${index}`

    try {
      return orInternalError(await repository.insert(context.db, { ...rest, code, courseId: track.courseId }))
    } catch (error) {
      const constraint = constraintNameOf(error)
      if (constraint === DbConstraint.batchTrackIdFk) {
        throw unprocessable('unknown or invalid track')
      }
      if (constraint !== DbConstraint.batchCodeUnique) {
        throw error
      }
      // A concurrent create landed this exact index first — loop and try the next one.
    }
  }

  throw conflict('could not generate a unique batch code — try again')
}

/** Every classifier already in use in `courseId`'s batch codes, for the create-batch form's dropdown. */
export async function findClassifiers(context: BatchServiceContext, courseId: string): Promise<string[]> {
  return repository.findClassifiers(context.db, courseId)
}

/**
 * Marking a batch `completed` also ends its students' active seats, in the same transaction — see
 * `repository.endActiveStudentSeats` for why. Re-opening a completed batch does not bring them back:
 * who was still enrolled at the end isn't recoverable from the roster, so that's a deliberate
 * re-enrolment rather than something to guess at.
 */
export async function updateBatch(
  context: BatchServiceContext,
  id: string,
  data: UpdateBatchData,
): Promise<Batch> {
  const write = (db: SchoolDb) =>
    withConstraintMapping(() => repository.update(db, id, data), {
      [DbConstraint.batchCodeUnique]: () => conflict('a batch with this code already exists'),
    })

  if (data.status !== 'completed') {
    return orNotFound(await write(context.db))
  }

  return context.db.transaction(async tx => {
    const row = orNotFound(await write(tx))

    await repository.endActiveStudentSeats(tx, id)
    return row
  })
}

/**
 * `eligible` (does this student hold at least L1 on the track before each batch's own) is computed
 * here rather than in `repository.findOpen`, which is single-domain and knows nothing of exams or
 * track order — two whole-course queries (not one per batch) so this stays flat regardless of how
 * many open batches there are. `enrollmentRequests/service.ts::request` re-checks this at request
 * time; this is only what lets the UI grey the button out before someone tries.
 */
export async function findOpenBatches(
  context: BatchServiceContext,
  courseId: string,
  studentId: string,
): Promise<OpenBatch[]> {
  const [rows, previousTrackByTrackId, passedTrackIds] = await Promise.all([
    repository.findOpen(context.db, courseId),
    trackRepository.findPreviousTrackMap(context.db, courseId),
    examRepository.findPassedTrackIds(context.db, studentId, courseId),
  ])

  return rows.map(row => {
    const previousTrackId = previousTrackByTrackId.get(row.trackId)
    return {
      ...row,
      eligible: previousTrackId === undefined || passedTrackIds.has(previousTrackId),
    }
  })
}

export async function setClassSlots(
  context: BatchServiceContext,
  id: string,
  data: SetClassSlotsData,
): Promise<ClassSlot[]> {
  orNotFound(await repository.findById(context.db, id))

  return context.db.transaction(async tx => {
    await repository.deleteClassSlots(tx, id)
    return repository.insertClassSlots(tx, id, data.slots)
  })
}
