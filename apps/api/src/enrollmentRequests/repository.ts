import { and, asc, desc, eq, gt, inArray, lt, or, type SQL } from 'drizzle-orm'

import { enrollmentRequest, type SchoolDb, type SchoolDbExecutor } from '@narada/db'

import { paginateResponse } from '../utils/cursor'
import type { EnrollmentRequest, FindEnrollmentRequestsData } from './schema'

const WITH_DISPLAY_FIELDS = {
  profile: { columns: { name: true } },
  batch: { columns: { code: true }, with: { track: { columns: { name: true } } } },
} as const

type JoinedRow = {
  id: string
  status: EnrollmentRequest['status']
  profileId: string
  batchId: string
  reviewedAt: Date | null
  reviewedBy: string | null
  createdAt: Date
  profile: { name: string }
  batch: { code: string; track: { name: string } }
}

function toEnrollmentRequest(row: JoinedRow): EnrollmentRequest {
  return {
    id: row.id,
    status: row.status,
    profileId: row.profileId,
    studentName: row.profile.name,
    batchId: row.batchId,
    batchCode: row.batch.code,
    trackName: row.batch.track.name,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt,
  }
}

/** `batchIds: null` means "every batch" (a school admin) — matches `exams/repository.ts`'s own
 * "an empty scope for 'all' is a different thing from an empty `inArray`" reasoning: an actual
 * empty array would produce an impossible `IN ()` filter, so the caller (`service.ts::findAll`)
 * never passes one — `AccessPolicy.getEnrollmentRequestVisibility` throws instead. */
export async function findAll(
  db: SchoolDb,
  { status, limit, cursor }: FindEnrollmentRequestsData,
  batchIds: string[] | null,
): Promise<{ items: EnrollmentRequest[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(enrollmentRequest.status, status))
  }

  if (batchIds) {
    conditions.push(inArray(enrollmentRequest.batchId, batchIds))
  }

  if (cursor) {
    conditions.push(
      or(
        lt(enrollmentRequest.createdAt, cursor.createdAt),
        and(eq(enrollmentRequest.createdAt, cursor.createdAt), gt(enrollmentRequest.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.enrollmentRequest.findMany({
    where: and(...conditions),
    orderBy: [desc(enrollmentRequest.createdAt), asc(enrollmentRequest.id)],
    limit: limit + 1,
    with: WITH_DISPLAY_FIELDS,
  })

  return paginateResponse(rows.map(toEnrollmentRequest), limit, item => ({
    createdAt: item.createdAt,
    id: item.id,
  }))
}

export async function findById(db: SchoolDbExecutor, id: string): Promise<EnrollmentRequest | undefined> {
  const row = await db.query.enrollmentRequest.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
    with: WITH_DISPLAY_FIELDS,
  })

  return row && toEnrollmentRequest(row)
}

/** Backs the "don't let a student pile up duplicate requests for the same batch" guard in
 * `service.ts::request` — a rejected or already-approved request doesn't block a fresh one. */
export async function findPending(
  db: SchoolDbExecutor,
  profileId: string,
  batchId: string,
): Promise<{ id: string } | undefined> {
  return db.query.enrollmentRequest.findFirst({
    where: (t, { and: andCols, eq: eqCol }) =>
      andCols(eqCol(t.profileId, profileId), eqCol(t.batchId, batchId), eqCol(t.status, 'pending')),
    columns: { id: true },
  })
}

/** Every batch this profile has a live request pending on — `dashboard/service.ts` folds this into
 * its own fixed-query-count fetch ([[project_batch_n1_incident]]) rather than the dashboard screen
 * making a second round-trip per open batch. */
export async function findPendingBatchIdsForProfile(db: SchoolDb, profileId: string): Promise<string[]> {
  const rows = await db.query.enrollmentRequest.findMany({
    where: (t, { and: andCols, eq: eqCol }) => andCols(eqCol(t.profileId, profileId), eqCol(t.status, 'pending')),
    columns: { batchId: true },
  })

  return rows.map(row => row.batchId)
}

export async function insert(
  db: SchoolDbExecutor,
  batchId: string,
  profileId: string,
): Promise<{ id: string } | undefined> {
  const rows = await db
    .insert(enrollmentRequest)
    .values({ batchId, profileId })
    .returning({ id: enrollmentRequest.id })

  return rows.at(0)
}

/** Transitions a still-`pending` request to `status`, recording who reviewed it and when — same
 * "double review is a no-op update, not a silent overwrite" shape as `registrations/repository.ts`'s
 * own `transitionStatus`. */
export async function transitionStatus(
  db: SchoolDbExecutor,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<{ id: string } | undefined> {
  const rows = await db
    .update(enrollmentRequest)
    .set({ status, reviewedAt: new Date(), reviewedBy })
    .where(and(eq(enrollmentRequest.id, id), eq(enrollmentRequest.status, 'pending')))
    .returning({ id: enrollmentRequest.id })

  return rows.at(0)
}
