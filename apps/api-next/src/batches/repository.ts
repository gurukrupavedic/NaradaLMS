import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm'

import { batch, enrollment, type SchoolDb } from '@narada/db'

import type { BatchReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import type { Batch, CreateBatchData, FindBatchesData, UpdateBatchData } from './schema'

/**
 * Lists batches visible under `scope`, ordered `(startDate desc nulls last, id asc)` with a
 * matching compound cursor (PARITY_PLAN.md §3.4/§9.1) — a direct port of
 * `apps/api/src/services/batch.ts::findBatches`'s null-aware two-phase query, in the same shape
 * as `evaluations/repository.ts::findEvaluations`. The tie-break direction differs between the
 * two domains (id ascending here, descending there) because that's what the reference
 * implementations for each actually do — not a typo, verified against both.
 */
export async function findAccessible(
  db: SchoolDb,
  { status, limit, cursor }: FindBatchesData,
  scope: BatchReadScope,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const baseConditions: SQL[] = []
  if (status) {
    baseConditions.push(eq(batch.status, status))
  }

  if (scope.kind === 'enrolled') {
    // Restrict to batches the caller's profile is enrolled in, rather than every batch in the
    // school — the caller has no school-admin visibility, only per-enrollment visibility.
    baseConditions.push(
      inArray(
        batch.id,
        db
          .select({ batchId: enrollment.batchId })
          .from(enrollment)
          .where(eq(enrollment.profileId, scope.profileId)),
      ),
    )
  }

  if (cursor?.startDate === null) {
    const rows = await db.query.batch.findMany({
      where: and(...baseConditions, isNull(batch.startDate), gt(batch.id, cursor.id)),
      orderBy: asc(batch.id),
      limit: limit + 1,
    })

    return paginateResponse(rows, limit, item => ({ startDate: item.startDate, id: item.id }))
  }

  const nonNullConditions = [...baseConditions, isNotNull(batch.startDate)]
  if (cursor) {
    // `or()` is only typed as possibly-undefined for a zero-argument call; both branches here are
    // always-defined `SQL`, so the result is never undefined.
    nonNullConditions.push(
      or(
        lt(batch.startDate, cursor.startDate),
        and(eq(batch.startDate, cursor.startDate), gt(batch.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.batch.findMany({
    where: and(...nonNullConditions),
    orderBy: [sql`${batch.startDate} desc nulls last`, asc(batch.id)],
    limit: limit + 1,
  })

  if (rows.length <= limit) {
    const nullRows = await db.query.batch.findMany({
      where: and(...baseConditions, isNull(batch.startDate)),
      orderBy: asc(batch.id),
      limit: limit + 1 - rows.length,
    })

    rows.push(...nullRows)
  }

  return paginateResponse(rows, limit, item => ({ startDate: item.startDate, id: item.id }))
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
