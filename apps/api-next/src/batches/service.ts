import { and, asc, eq, gt, inArray, type SQL } from 'drizzle-orm'

import { batch, enrollment, type SchoolDbExecutor } from '@narada/db'

import { internalError, notFound } from '../error'
import type { BatchReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import type { Batch, CreateBatchData, FindBatchesData, UpdateBatchData } from './schema'

export async function findAllAccessible(
  { status, limit, cursor }: FindBatchesData,
  access: BatchReadScope,
  db: SchoolDbExecutor,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const conditions: SQL[] = []

  if (status) {
    conditions.push(eq(batch.status, status))
  }

  if (cursor) {
    conditions.push(gt(batch.id, cursor.id))
  }

  if (access.kind === 'enrolled') {
    conditions.push(
      inArray(
        batch.id,
        db
          .select({ batchId: enrollment.batchId })
          .from(enrollment)
          .where(eq(enrollment.profileId, access.profileId)),
      ),
    )
  }

  const rows = await db.query.batch.findMany({
    where: and(...conditions),
    orderBy: asc(batch.id),
    limit: limit + 1,
  })

  return paginateResponse(rows, limit, item => ({ id: item.id }))
}

export async function findById(id: string, db: SchoolDbExecutor): Promise<Batch> {
  const row = await db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })

  if (!row) {
    throw notFound()
  }

  return row
}

export async function createBatch(data: CreateBatchData, db: SchoolDbExecutor): Promise<Batch> {
  const rows = await db.insert(batch).values(data).returning()
  const row = rows.at(0)
  if (!row) {
    throw internalError()
  }

  return row
}

export async function updateBatch(
  id: string,
  data: UpdateBatchData,
  db: SchoolDbExecutor,
): Promise<Batch> {
  const rows = await db.update(batch).set(data).where(eq(batch.id, id)).returning()
  const row = rows.at(0)
  if (!row) {
    throw notFound()
  }

  return row
}
