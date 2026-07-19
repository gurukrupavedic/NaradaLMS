import { type SchoolDbClient } from '@narada/db'

import { internalError, notFound } from '../error'
import type { BatchReadScope } from '../utils/accessPolicy'
import * as repository from './repository'
import type { Batch, CreateBatchData, FindBatchesData, UpdateBatchData } from './schema'

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

export async function createBatch(
  context: BatchServiceContext,
  data: CreateBatchData,
): Promise<Batch> {
  const row = await repository.insert(context.db, data)
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
  const row = await repository.update(context.db, id, data)
  if (!row) {
    throw notFound()
  }

  return row
}
