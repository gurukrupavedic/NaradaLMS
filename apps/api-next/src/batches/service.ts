import { type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound, unprocessable } from '../error'
import type { BatchReadScope } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type {
  Batch,
  BatchDetail,
  ClassSlot,
  CreateBatchData,
  FindBatchesData,
  SetClassSlotsData,
  UpdateBatchData,
} from './schema'

/** Holds the tenant-scoped client so this service can pass it straight through to repository.ts. */
type BatchServiceContext = { db: SchoolDbClient }

export async function findAllAccessible(
  context: BatchServiceContext,
  params: FindBatchesData,
  scope: BatchReadScope,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  return repository.findAccessible(context.db, params, scope)
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
  const row = await withConstraintMapping(() => repository.insert(context.db, data), {
    [DbConstraint.batchTrackIdFk]: () => unprocessable('unknown or invalid track'),
    [DbConstraint.batchCodeUnique]: () => conflict('a batch with this code already exists'),
  })

  if (!row) {
    throw internalError()
  }

  return row
}

export async function updateBatch(
  context: BatchServiceContext,
  id: string,
  data: UpdateBatchData,
): Promise<Batch> {
  const row = await withConstraintMapping(() => repository.update(context.db, id, data), {
    [DbConstraint.batchCodeUnique]: () => conflict('a batch with this code already exists'),
  })

  if (!row) {
    throw notFound()
  }

  return row
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
