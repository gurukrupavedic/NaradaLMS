import { type SchoolDb, type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import * as examRepository from '../exams/repository'
import * as trackRepository from '../tracks/repository'
import type { BatchReadScope } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
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
  const row = await repository.findById(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function findByIdWithMembers(
  context: BatchServiceContext,
  id: string,
): Promise<BatchDetail> {
  const row = await repository.findByIdWithMembers(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function createBatch(
  context: BatchServiceContext,
  data: CreateBatchData,
): Promise<Batch> {
  // A batch's course is its track's course — copied down rather than accepted from the request, and
  // the composite foreign key refuses any other value.
  const courseId = await repository.findTrackCourseId(context.db, data.trackId)
  if (!courseId) {
    throw unprocessable('unknown or invalid track')
  }

  const row = await withConstraintMapping(
    () => repository.insert(context.db, { ...data, courseId }),
    {
      [DbConstraint.batchTrackIdFk]: () => unprocessable('unknown or invalid track'),
      [DbConstraint.batchCodeUnique]: () => conflict('a batch with this code already exists'),
    },
  )

  if (!row) {
    throw internalError()
  }

  return row
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
    const row = await write(context.db)
    if (!row) {
      throw notFound()
    }

    return row
  }

  return context.db.transaction(async tx => {
    const row = await write(tx)
    if (!row) {
      throw notFound()
    }

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
  const existing = await repository.findById(context.db, id)
  if (!existing) {
    throw notFound()
  }

  return context.db.transaction(async tx => {
    await repository.deleteClassSlots(tx, id)
    return repository.insertClassSlots(tx, id, data.slots)
  })
}
