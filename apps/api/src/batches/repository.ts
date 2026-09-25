import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm'

import { batch, batchClassSlot, enrollment, profile, type SchoolDb } from '@narada/db'

import type { BatchReadScope } from '../utils/accessPolicy'
import { paginateResponse } from '../utils/cursor'
import { findNullsLastPage } from '../utils/keyset'
import { escapeLike } from '../utils/search'
import type {
  Batch,
  BatchDetail,
  BatchWithRole,
  ClassSlot,
  CreateBatchData,
  FindBatchesData,
  OpenBatch,
  SetClassSlotsData,
} from './schema'

// Teachers first, then TAs, then students — every consumer of a roster lists staff before learners.
const ROLE_RANK: Record<BatchDetail['members'][number]['role'], number> = { instructor: 0, ta: 1, student: 2 }
function byRoleThenName(a: BatchDetail['members'][number], b: BatchDetail['members'][number]): number {
  return ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name)
}

function toClassSlot(row: typeof batchClassSlot.$inferSelect): ClassSlot {
  return { dayOfWeek: row.dayOfWeek, time: row.time, durationMinutes: row.durationMinutes }
}

type BatchRelations = {
  enrollments: {
    profileId: string
    role: BatchDetail['members'][number]['role']
    status: NonNullable<BatchWithRole['enrollmentStatus']>
    joinedAt: Date | null
    profile: { name: string; phone: string | null; email: string | null; city: string | null }
  }[]
  classSlots: (typeof batchClassSlot.$inferSelect)[]
}

const WITH_DETAIL = { enrollments: { with: { profile: true } }, classSlots: true } as const

function toBatchDetail(row: Batch & BatchRelations): BatchDetail {
  const { enrollments, classSlots, ...batchRow } = row
  return {
    ...batchRow,
    members: enrollments
      .map(e => ({
        profileId: e.profileId,
        name: e.profile.name,
        phone: e.profile.phone,
        email: e.profile.email,
        city: e.profile.city,
        role: e.role,
        joinedAt: e.joinedAt,
        status: e.status,
      }))
      .sort(byRoleThenName),
    classSlots: classSlots.map(toClassSlot),
  }
}

/** {@link toBatchDetail} plus `profileId`'s own role and status in the batch (null when not enrolled). */
function toBatchWithRole(row: Batch & BatchRelations, profileId: string): BatchWithRole {
  const own = row.enrollments.find(e => e.profileId === profileId)
  return { ...toBatchDetail(row), role: own?.role ?? null, enrollmentStatus: own?.status ?? null }
}

function batchListConditions(
  db: SchoolDb,
  { status }: FindBatchesData,
  scope: BatchReadScope,
  courseId: string,
): SQL[] {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(batch.status, status))
  }

  // Every list is the request's course's batches only.
  conditions.push(eq(batch.courseId, courseId))

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

  return conditions
}

/**
 * Lists batches visible under `scope`, ordered `(startDate desc nulls last, id asc)` with a
 * matching compound cursor (PARITY_PLAN.md §3.4/§9.1) — see `utils/keyset.ts::findNullsLastPage`.
 * The tie-break direction differs from `evaluations/repository.ts` (id ascending here, descending
 * there) because that's what the reference implementations for each actually do — not a typo.
 */
export async function findAccessible(
  db: SchoolDb,
  query: FindBatchesData,
  scope: BatchReadScope,
  courseId: string,
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const { limit, cursor } = query
  const rows = await findNullsLastPage({
    sortColumn: batch.startDate,
    idColumn: batch.id,
    idOrder: 'asc',
    conditions: batchListConditions(db, query, scope, courseId),
    cursor: cursor && { sortValue: cursor.startDate, id: cursor.id },
    limit,
    fetch: q => db.query.batch.findMany(q),
  })

  return paginateResponse(rows, limit, item => ({ startDate: item.startDate, id: item.id }))
}

/**
 * Same filtering/ordering/cursor as {@link findAccessible}, but eager-loads each batch's roster,
 * schedule, and `roleForProfileId`'s own role in one query — for `GET /profiles/:profileId/
 * batches?withDetail=true` (real gap, found migrating apps/web: `admin/page.tsx` calls this for
 * the admin's own profile to render every school batch with roster/schedule in one paginated
 * query, avoiding a per-batch fetch: that fan-out shape already exhausted the DB pool once).
 * `role` is null when `roleForProfileId` has no enrollment in that batch — real for the `all` scope (a school-wide admin/owner sees batches they don't personally teach);
 * always non-null for the `enrolled` scope, since every returned batch is, by construction, one
 * `roleForProfileId` is enrolled in.
 */
export async function findAccessibleWithDetail(
  db: SchoolDb,
  query: FindBatchesData,
  scope: BatchReadScope,
  roleForProfileId: string,
  courseId: string,
): Promise<{ items: BatchWithRole[]; nextCursor: string | null }> {
  const { limit, cursor } = query
  const rows = await findNullsLastPage({
    sortColumn: batch.startDate,
    idColumn: batch.id,
    idOrder: 'asc',
    conditions: batchListConditions(db, query, scope, courseId),
    cursor: cursor && { sortValue: cursor.startDate, id: cursor.id },
    limit,
    fetch: q => db.query.batch.findMany({ ...q, with: WITH_DETAIL }),
  })

  return paginateResponse(
    rows.map(row => toBatchWithRole(row, roleForProfileId)),
    limit,
    item => ({ startDate: item.startDate, id: item.id }),
  )
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
 * number of students. Doesn't set `eligible` — that's per-requesting-student and computed by
 * `service.ts::findOpenBatches`, not this single-domain read.
 */
export async function findOpen(db: SchoolDb, courseId: string): Promise<Omit<OpenBatch, 'eligible'>[]> {
  const rows = await db.query.batch.findMany({
    where: (t, { and: andCols, eq: eqCol, ne }) =>
      andCols(ne(t.status, 'completed'), eqCol(t.courseId, courseId)),
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
 * per-batch dashboard fan-out caused to avoid.
 */
export async function findAllMembershipsWithDetail(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<BatchWithRole[]> {
  const rows = await db.query.batch.findMany({
    where: (t, { and: andCols, eq: eqCol, inArray: inArrayCol }) =>
      andCols(
        inArrayCol(
          t.id,
          db.select({ batchId: enrollment.batchId }).from(enrollment).where(eq(enrollment.profileId, profileId)),
        ),
        eqCol(t.courseId, courseId),
      ),
    with: WITH_DETAIL,
  })

  return rows.map(row => toBatchWithRole(row, profileId))
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
  courseId: string,
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
        eq(batch.courseId, courseId),
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

/**
 * The course a track belongs to, and its position within that course — what a new batch must
 * carry as its own `courseId`, and what `service.ts::createBatch` needs to generate the code's
 * `<track order>` segment. `undefined` if there is no such track.
 */
export async function findTrackForBatch(
  db: SchoolDb,
  trackId: string,
): Promise<{ courseId: string; order: number } | undefined> {
  return db.query.track.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, trackId),
    columns: { courseId: true, order: true },
  })
}

/**
 * One past the highest `-<index>` already used among batches whose code starts with `codePrefix`
 * (everything up to but not including that trailing index) — `service.ts::createBatch`'s next
 * index. The *highest* index, not a count: a code can predate this feature or have been
 * hand-edited (`UpdateBatchSchema` still allows that) to some index this table never generated in
 * sequence, and counting rows would collide with (or reuse) one of those instead of moving past
 * it. The candidate set — batches sharing the exact same course/year/classifier/track — is always
 * small, so filtering in SQL by prefix and parsing the exact suffix in JS (rather than a Postgres
 * regex capture) is simpler for the same result.
 */
export async function nextBatchIndex(db: SchoolDb, codePrefix: string): Promise<number> {
  const rows = await db
    .select({ code: batch.code })
    .from(batch)
    .where(sql`${batch.code} LIKE ${`${escapeLike(codePrefix)}-%`}`)

  const suffix = new RegExp(`^${codePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`)
  let max = 0
  for (const row of rows) {
    const match = suffix.exec(row.code)
    if (match) {
      max = Math.max(max, Number(match[1]))
    }
  }

  return max + 1
}

/**
 * Every distinct classifier already in use in `courseId`'s batch codes — `route.ts`'s
 * `GET /batches/classifiers`, backing the create-batch form's dropdown. Parsed from `code` itself
 * (`<COURSE>-<year>-<CLASSIFIER>-<track order>-<index>`) rather than a dedicated column: codes
 * predating this feature (including ones with no classifier segment at all, or the legacy
 * `TEACH`/`REM` shapes `tools/src/parse/tracker.ts` produced) are still real batches, and this
 * only has to be a reasonable seed list for the dropdown, not an authoritative source of truth.
 */
export async function findClassifiers(db: SchoolDb, courseId: string): Promise<string[]> {
  const rows = await db.select({ code: batch.code }).from(batch).where(eq(batch.courseId, courseId))

  const classifiers = new Set<string>()
  for (const row of rows) {
    const segment = row.code.split('-').at(2)
    if (segment && !/^\d+$/.test(segment)) {
      classifiers.add(segment.toUpperCase())
    }
  }

  return [...classifiers].sort()
}

/** `courseId` must be the track's own (composite foreign key `batch_trackId_courseId_fk`), so the service fills it from {@link findTrackForBatch}. */
export async function insert(
  db: SchoolDb,
  data: Omit<CreateBatchData, 'classifier' | 'instructorIds'> & { code: string; courseId: string },
): Promise<Batch | undefined> {
  const rows = await db.insert(batch).values(data).returning()
  return rows.at(0)
}

/** Which of `profileIds` are live (not deleted) profiles — how many came back says whether any was unknown. */
export async function findExistingProfileIds(db: SchoolDb, profileIds: string[]): Promise<string[]> {
  const rows = await db
    .select({ id: profile.id })
    .from(profile)
    .where(and(inArray(profile.id, profileIds), isNull(profile.deletedAt)))
  return rows.map(row => row.id)
}

/** Seats each of `profileIds` as an `instructor` of the batch just created. */
export async function insertInstructors(
  db: SchoolDb,
  batchId: string,
  courseId: string,
  profileIds: string[],
): Promise<void> {
  await db
    .insert(enrollment)
    .values(profileIds.map(profileId => ({ batchId, courseId, profileId, role: 'instructor' as const })))
}
