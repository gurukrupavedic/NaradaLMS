import { and, asc, eq, gt, inArray, type SQL } from 'drizzle-orm'

import { batch, enrollment, type SchoolDb } from '@narada/db'

import type { BatchReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import type { Batch, CreateBatchData, FindBatchesData, UpdateBatchData } from './schema'

/** Lists batches visible under `scope`, applying the read scope as a SQL predicate rather than filtering in application code. */
export async function findAccessible(
  db: SchoolDb,
  { status, limit, cursor }: FindBatchesData,
  scope: BatchReadScope,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(batch.status, status))
  }

  if (cursor) {
    conditions.push(gt(batch.id, cursor.id))
  }

  if (scope.kind === 'enrolled') {
    // Restrict to batches the caller's profile is enrolled in, rather than every batch in the
    // school — the caller has no school-admin visibility, only per-enrollment visibility.
    conditions.push(
      inArray(
        batch.id,
        db
          .select({ batchId: enrollment.batchId })
          .from(enrollment)
          .where(eq(enrollment.profileId, scope.profileId)),
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

export async function findById(db: SchoolDb, id: string): Promise<Batch | undefined> {
  return db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

export async function insert(db: SchoolDb, data: CreateBatchData): Promise<Batch | undefined> {
  const rows = await db.insert(batch).values(data).returning()
  return rows.at(0)
}

export async function update(
  db: SchoolDb,
  id: string,
  data: UpdateBatchData,
): Promise<Batch | undefined> {
  const rows = await db.update(batch).set(data).where(eq(batch.id, id)).returning()
  return rows.at(0)
}
