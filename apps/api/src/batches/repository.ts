import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm'

import { batch, batchClassSlot, enrollment, type SchoolDb } from '@narada/db'

import type { BatchReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
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

function toClassSlot(row: typeof batchClassSlot.$inferSelect): ClassSlot {
  return { dayOfWeek: row.dayOfWeek, time: row.time, durationMinutes: row.durationMinutes }
}

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
  courseId?: string,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const baseConditions: SQL[] = []
  if (status) {
    baseConditions.push(eq(batch.status, status))
  }

  // The request's course, when it names one — every list below is then that course's batches only.
  if (courseId) {
    baseConditions.push(eq(batch.courseId, courseId))
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

/**
 * Same filtering/ordering/cursor as {@link findAccessible}, but eager-loads each batch's roster,
 * schedule, and `roleForProfileId`'s own role in one query — for `GET /profiles/:profileId/
 * batches?withDetail=true` (real gap, found migrating apps/web: `admin/page.tsx` calls this for
 * the admin's own profile to render every school batch with roster/schedule in one paginated
 * query, avoiding a per-batch fetch — the exact fan-out shape [[project_batch_n1_incident]]
 * already broke once). A direct port of `apps/api/src/services/batch.ts::findBatchesWithDetail`.
 * `role` is null when `roleForProfileId` has no enrollment in that batch — real for the `all`
 * scope (a school-wide admin/owner sees batches they don't personally teach); always non-null for
 * the `enrolled` scope, since every returned batch is, by construction, one `roleForProfileId` is
 * enrolled in.
 */
export async function findAccessibleWithDetail(
  db: SchoolDb,
  { status, limit, cursor }: FindBatchesData,
  scope: BatchReadScope,
  roleForProfileId: string,
  courseId?: string,
): Promise<{ items: BatchWithRole[]; nextCursor: string | null }> {
  const baseConditions: SQL[] = []
  if (status) {
    baseConditions.push(eq(batch.status, status))
  }

  if (courseId) {
    baseConditions.push(eq(batch.courseId, courseId))
  }

  if (scope.kind === 'enrolled') {
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

  function toBatchWithRole(row: {
    enrollments: {
      profileId: string
      role: BatchWithRole['members'][number]['role']
      status: NonNullable<BatchWithRole['enrollmentStatus']>
      joinedAt: Date | null
      profile: { name: string; phone: string | null; city: string | null }
    }[]
    classSlots: (typeof batchClassSlot.$inferSelect)[]
  } & Batch): BatchWithRole {
    const { enrollments, classSlots, ...batchRow } = row
    const own = enrollments.find(e => e.profileId === roleForProfileId)
    return {
      ...batchRow,
      members: enrollments.map(e => ({
        profileId: e.profileId,
        name: e.profile.name,
        phone: e.profile.phone,
        city: e.profile.city,
        role: e.role,
        joinedAt: e.joinedAt,
        status: e.status,
      })),
      classSlots: classSlots.map(toClassSlot),
      role: own?.role ?? null,
      enrollmentStatus: own?.status ?? null,
    }
  }

  if (cursor?.startDate === null) {
    const rows = await db.query.batch.findMany({
      where: and(...baseConditions, isNull(batch.startDate), gt(batch.id, cursor.id)),
      orderBy: asc(batch.id),
      limit: limit + 1,
      with: { enrollments: { with: { profile: true } }, classSlots: true },
    })

    return paginateResponse(rows.map(toBatchWithRole), limit, item => ({
      startDate: item.startDate,
      id: item.id,
    }))
  }

  const nonNullConditions = [...baseConditions, isNotNull(batch.startDate)]
  if (cursor) {
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
    with: { enrollments: { with: { profile: true } }, classSlots: true },
  })

  if (rows.length <= limit) {
    const nullRows = await db.query.batch.findMany({
      where: and(...baseConditions, isNull(batch.startDate)),
      orderBy: asc(batch.id),
      limit: limit + 1 - rows.length,
      with: { enrollments: { with: { profile: true } }, classSlots: true },
    })

    rows.push(...nullRows)
  }

  return paginateResponse(rows.map(toBatchWithRole), limit, item => ({
    startDate: item.startDate,
    id: item.id,
  }))
}

export async function findById(db: SchoolDb, id: string): Promise<Batch | undefined> {
  return db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  })
}

/** Row-locking read for `enrollmentRequests/service.ts::request`'s transaction — the relational
 * query API (`db.query.batch.findFirst`) has no `FOR UPDATE`, so this drops to the plain query
 * builder. Locking the batch row serializes concurrent request attempts on it, so two racing calls
 * for the same profile can't both pass the "not already enrolled / not already pending" checks
 * before either commits. */
export async function findByIdForUpdate(db: SchoolDb, id: string): Promise<Batch | undefined> {
  const rows = await db.select().from(batch).where(eq(batch.id, id)).for('update')
  return rows.at(0)
}

/**
 * Every batch a student can request to join: any batch not yet marked `completed` — no separate
 * "open" state to opt a batch into. No seat cap to check against — every joinable batch takes any
 * number of students.
 */
export async function findOpen(db: SchoolDb, courseId?: string): Promise<OpenBatch[]> {
  const rows = await db.query.batch.findMany({
    where: (t, { and: andCols, eq: eqCol, ne }) =>
      andCols(ne(t.status, 'completed'), courseId ? eqCol(t.courseId, courseId) : undefined),
    with: { classSlots: true, track: true },
    orderBy: (t, { asc: ascCol }) => ascCol(t.code),
  })

  return rows.map(row => {
    const { classSlots, track: trackRow, ...batchRow } = row
    return {
      ...batchRow,
      trackName: trackRow.name,
      classSlots: classSlots.map(toClassSlot),
    }
  })
}

/** Batch detail plus its roster and recurring schedule — one relational query, not a fan-out. */
export async function findByIdWithMembers(db: SchoolDb, id: string): Promise<BatchDetail | undefined> {
  const row = await db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: { enrollments: { with: { profile: true } }, classSlots: true },
  })

  if (!row) {
    return undefined
  }

  const { enrollments, classSlots, ...batchRow } = row
  return {
    ...batchRow,
    members: enrollments.map(e => ({
      profileId: e.profileId,
      name: e.profile.name,
      phone: e.profile.phone,
      city: e.profile.city,
      role: e.role,
      joinedAt: e.joinedAt,
      status: e.status,
    })),
    classSlots: classSlots.map(toClassSlot),
  }
}

/**
 * Deletes a batch's entire current recurring schedule. Paired with {@link insertClassSlots} by
 * the service inside one transaction — a full replace rather than a diff/upsert, matching the
 * reference implementation and keeping "what does this batch meet on" a single source of truth
 * instead of a client-computed diff that could drift.
 */
export async function deleteClassSlots(db: SchoolDb, batchId: string): Promise<void> {
  await db.delete(batchClassSlot).where(eq(batchClassSlot.batchId, batchId))
}

export async function insertClassSlots(
  db: SchoolDb,
  batchId: string,
  slots: SetClassSlotsData['slots'],
): Promise<ClassSlot[]> {
  if (slots.length === 0) {
    return []
  }

  const rows = await db
    .insert(batchClassSlot)
    .values(slots.map(slot => ({ ...slot, batchId })))
    .returning()

  return rows.map(toClassSlot)
}

/**
 * Every batch `profileId` is enrolled in, with roster detail and `profileId`'s own role in each
 * — backs the dashboard's "my batches" list. Unlike `findAccessible`'s paginated `enrolled`
 * scope, this always returns everything in one query: a single profile's own enrollment count is
 * naturally small and bounded, so there's no real pagination need here, only the N+1 the old
 * per-batch dashboard fan-out caused (see [[project_batch_n1_incident]]) to avoid.
 */
export async function findAllMembershipsWithDetail(
  db: SchoolDb,
  profileId: string,
  courseId?: string,
): Promise<BatchWithRole[]> {
  const rows = await db.query.batch.findMany({
    where: (t, { and: andCols, eq: eqCol, inArray: inArrayCol }) =>
      andCols(
        inArrayCol(
          t.id,
          db.select({ batchId: enrollment.batchId }).from(enrollment).where(eq(enrollment.profileId, profileId)),
        ),
        courseId ? eqCol(t.courseId, courseId) : undefined,
      ),
    with: { enrollments: { with: { profile: true } }, classSlots: true },
  })

  return rows.map(row => {
    const { enrollments, classSlots, ...batchRow } = row
    // The outer `where` only selects batches with a real enrollment row for `profileId`, so
    // `?? null` here is unreachable in practice — kept only because `BatchWithRole.role` is
    // nullable in general (the `all`-scope case in `findAccessibleWithDetail` genuinely needs
    // that), not because this function can ever actually produce it.
    const own = enrollments.find(e => e.profileId === profileId)
    return {
      ...batchRow,
      members: enrollments.map(e => ({
        profileId: e.profileId,
        name: e.profile.name,
        phone: e.profile.phone,
        city: e.profile.city,
        role: e.role,
        joinedAt: e.joinedAt,
        status: e.status,
      })),
      classSlots: classSlots.map(toClassSlot),
      role: own?.role ?? null,
      enrollmentStatus: own?.status ?? null,
    }
  })
}

/**
 * Every batch each of `profileIds` has ever been enrolled in (current or past — no status
 * filter), bucketed per profile. Backs the dashboard's "past batches by student" panel for a
 * teacher's roster. Bare `Batch` rows, not `BatchDetail`: this is a cross-reference list, not a
 * roster view, so no per-batch member eager-load is needed.
 */
export async function findAllForProfiles(
  db: SchoolDb,
  profileIds: string[],
  courseId?: string,
): Promise<Map<string, Batch[]>> {
  const map = new Map<string, Batch[]>()
  if (profileIds.length === 0) {
    return map
  }

  const rows = await db
    .select({ profileId: enrollment.profileId, batch })
    .from(enrollment)
    .innerJoin(batch, eq(batch.id, enrollment.batchId))
    .where(
      and(
        inArray(enrollment.profileId, profileIds),
        courseId ? eq(batch.courseId, courseId) : undefined,
      ),
    )

  for (const row of rows) {
    const list = map.get(row.profileId)
    if (list) {
      list.push(row.batch)
    } else {
      map.set(row.profileId, [row.batch])
    }
  }

  return map
}

/** The course a track belongs to — what a new batch must carry as its own `courseId`. `undefined` if there is no such track. */
export async function findTrackCourseId(db: SchoolDb, trackId: string): Promise<string | undefined> {
  const row = await db.query.track.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, trackId),
    columns: { courseId: true },
  })

  return row?.courseId
}

/** `courseId` must be the track's own (composite foreign key `batch_trackId_courseId_fk`), so the service fills it from {@link findTrackCourseId}. */
export async function insert(
  db: SchoolDb,
  data: CreateBatchData & { courseId: string },
): Promise<Batch | undefined> {
  const rows = await db.insert(batch).values(data).returning()
  return rows.at(0)
}

/**
 * Ends every `active` student seat in a batch — what marking the batch `completed` does to its
 * roster. Without this a finished batch would keep its students' one-seat-per-course slot, and they
 * could never join their next batch. Only students: instructors and TAs aren't limited to one batch
 * per course, and the teaching history views still list a completed batch under its staff.
 */
export async function endActiveStudentSeats(db: SchoolDb, batchId: string): Promise<void> {
  await db
    .update(enrollment)
    .set({ status: 'inactive', leftDate: sql`coalesce(${enrollment.leftDate}, now())` })
    .where(
      and(
        eq(enrollment.batchId, batchId),
        eq(enrollment.role, 'student'),
        eq(enrollment.status, 'active'),
      ),
    )
}

export async function update(
  db: SchoolDb,
  id: string,
  data: UpdateBatchData,
): Promise<Batch | undefined> {
  const rows = await db.update(batch).set(data).where(eq(batch.id, id)).returning()
  return rows.at(0)
}
