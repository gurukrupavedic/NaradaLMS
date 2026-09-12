import { and, asc, desc, eq, gt, lt, or, type SQL } from 'drizzle-orm'

import { registration, type SchoolDb } from '@narada/db'

import { paginateResponse } from '../utils/cursor'
import type { CreateRegistrationData, FindRegistrationsData, Registration } from './schema'

/** `createdAt` is never null (unlike `batch.startDate`/`evaluation.evaluatedAt`), so this needs
 * only the single-phase ordered-cursor query, not those domains' null-aware two-phase split. */
export async function findAll(
  db: SchoolDb,
  { status, limit, cursor }: FindRegistrationsData,
): Promise<{ items: Registration[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(registration.status, status))
  }

  if (cursor) {
    conditions.push(
      or(
        lt(registration.createdAt, cursor.createdAt),
        and(eq(registration.createdAt, cursor.createdAt), gt(registration.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.registration.findMany({
    where: and(...conditions),
    orderBy: [desc(registration.createdAt), asc(registration.id)],
    limit: limit + 1,
  })

  return paginateResponse(rows, limit, item => ({ createdAt: item.createdAt, id: item.id }))
}

export async function findById(db: SchoolDb, id: string): Promise<Registration | undefined> {
  return db.query.registration.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
  })
}

export async function insert(
  db: SchoolDb,
  data: CreateRegistrationData,
): Promise<Registration | undefined> {
  const rows = await db.insert(registration).values(data).returning()
  return rows.at(0)
}

/** Transitions a still-`pending` registration to `status`, recording who reviewed it and when.
 * The `eq(status, 'pending')` predicate makes a double approve/reject a no-op update (0 rows)
 * rather than silently overwriting an earlier reviewer/timestamp. */
export async function transitionStatus(
  db: SchoolDb,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<Registration | undefined> {
  const rows = await db
    .update(registration)
    .set({ status, reviewedAt: new Date(), reviewedBy })
    .where(and(eq(registration.id, id), eq(registration.status, 'pending')))
    .returning()

  return rows.at(0)
}
