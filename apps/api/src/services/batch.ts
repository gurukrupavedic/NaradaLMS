import { z } from 'zod'
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { batch, batchClassSlot, enrollment, type SchoolDbExecutor } from '@narada/db'
import {
  compoundCursor,
  nullableDateCursorField,
  paginateResponse,
  uuidCursorField,
} from '../utils/cursor'
import { internalError, notFound } from '../error'
import type { BatchAccess } from '../utils/auth'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

type BatchMember = {
  profileId: string
  name: string
  phone: string | null
  city: string | null
  role: (typeof enrollment.$inferSelect)['role']
  joinedAt: Date | null
}

export type ClassSlot = {
  dayOfWeek: number
  time: string
  durationMinutes: number
}

export const classSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM'),
  durationMinutes: z.number().int().positive(),
})

export const setClassSlotsSchema = z.object({
  slots: z
    .array(classSlotSchema)
    .max(7)
    .refine(slots => new Set(slots.map(slot => slot.dayOfWeek)).size === slots.length, {
      message: 'a batch can only have one class slot per day of week',
    }),
})

export const createBatchSchema = z.object({
  trackId: z.uuid(),
  code: z.string().min(1),
  startDate: z.iso
    .datetime()
    .transform(value => new Date(value))
    .optional(),
  meetingUrl: z.string().url().optional(),
})

export const updateBatchSchema = requireNonEmpty(
  z.object({
    code: z.string().min(1).optional(),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
    startDate: z.iso
      .datetime()
      .transform(value => new Date(value))
      .optional(),
    meetingUrl: z.string().url().optional(),
  }),
)

export const listBatchesQuerySchema = z.object({
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  cursor: compoundCursor({
    startDate: nullableDateCursorField(),
    id: uuidCursorField(),
  }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export type Batch = typeof batch.$inferSelect
export type BatchDetail = Batch & { members: BatchMember[]; classSlots: ClassSlot[] }
export type CreateBatchData = z.infer<typeof createBatchSchema>
export type UpdateBatchData = z.infer<typeof updateBatchSchema>
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>
export type SetClassSlotsData = z.infer<typeof setClassSlotsSchema>

function toClassSlot(row: typeof batchClassSlot.$inferSelect): ClassSlot {
  return { dayOfWeek: row.dayOfWeek, time: row.time, durationMinutes: row.durationMinutes }
}

export async function findBatches(
  db: SchoolDbExecutor,
  options: ListBatchesQuery & { access: BatchAccess },
): Promise<{ items: Batch[]; nextCursor: string | null }> {
  const { access, status, cursor, limit } = options

  const conditions = []
  if (access.kind === 'enrolled') {
    const enrolledBatchIds = db
      .select({ id: enrollment.batchId })
      .from(enrollment)
      .where(eq(enrollment.profileId, access.profileId))

    conditions.push(inArray(batch.id, enrolledBatchIds))
  } else if (access.kind === 'singleBatch') {
    conditions.push(eq(batch.id, access.enrollment.batchId))
  }

  if (status) conditions.push(eq(batch.status, status))
  if (cursor?.startDate === null) {
    conditions.push(isNull(batch.startDate), gt(batch.id, cursor.id))
    const rows = await db.query.batch.findMany({
      where: and(...conditions),
      orderBy: asc(batch.id),
      limit: limit + 1,
    })

    return paginateResponse(rows, limit, item => ({ startDate: item.startDate, id: item.id }))
  }

  const nonNullConditions = [...conditions, isNotNull(batch.startDate)]
  if (cursor) {
    const cursorWhere = or(
      lt(batch.startDate, cursor.startDate),
      and(eq(batch.startDate, cursor.startDate), gt(batch.id, cursor.id)),
    )
    if (cursorWhere) nonNullConditions.push(cursorWhere)
  }

  const rows = await db.query.batch.findMany({
    where: and(...nonNullConditions),
    orderBy: [sql`${batch.startDate} desc nulls last`, asc(batch.id)],
    limit: limit + 1,
  })

  if (rows.length <= limit) {
    const nullRows = await db.query.batch.findMany({
      where: and(...conditions, isNull(batch.startDate)),
      orderBy: asc(batch.id),
      limit: limit + 1 - rows.length,
    })

    rows.push(...nullRows)
  }

  return paginateResponse(rows, limit, item => ({ startDate: item.startDate, id: item.id }))
}

export type BatchWithRole = BatchDetail & { role: BatchMember['role'] | null }

// Same filtering as findBatches, but eager-loads each batch's roster, schedule, and the target
// profile's own role in one query — for callers (the dashboard) that need every batch's detail
// anyway, this avoids an N-request fan-out of findBatchByIdWithMembers per list item, which is
// what was exhausting the DB connection pool once a profile's batch list stopped being small.
export async function findBatchesWithDetail(
  db: SchoolDbExecutor,
  options: ListBatchesQuery & { access: BatchAccess; roleForProfileId: string },
): Promise<{ items: BatchWithRole[]; nextCursor: string | null }> {
  const { access, status, cursor, limit, roleForProfileId } = options

  const conditions = []
  if (access.kind === 'enrolled') {
    const enrolledBatchIds = db
      .select({ id: enrollment.batchId })
      .from(enrollment)
      .where(eq(enrollment.profileId, access.profileId))

    conditions.push(inArray(batch.id, enrolledBatchIds))
  } else if (access.kind === 'singleBatch') {
    conditions.push(eq(batch.id, access.enrollment.batchId))
  }

  if (status) conditions.push(eq(batch.status, status))

  function toBatchWithRole(row: {
    enrollments: { profileId: string; role: BatchMember['role']; joinedAt: Date | null; profile: { name: string; phone: string | null; city: string | null } }[]
    classSlots: (typeof batchClassSlot.$inferSelect)[]
  } & Batch): BatchWithRole {
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
      })),
      classSlots: classSlots.map(toClassSlot),
      role: enrollments.find(e => e.profileId === roleForProfileId)?.role ?? null,
    }
  }

  if (cursor?.startDate === null) {
    conditions.push(isNull(batch.startDate), gt(batch.id, cursor.id))
    const rows = await db.query.batch.findMany({
      where: and(...conditions),
      orderBy: asc(batch.id),
      limit: limit + 1,
      with: { enrollments: { with: { profile: true } }, classSlots: true },
    })

    return paginateResponse(rows.map(toBatchWithRole), limit, item => ({
      startDate: item.startDate,
      id: item.id,
    }))
  }

  const nonNullConditions = [...conditions, isNotNull(batch.startDate)]
  if (cursor) {
    const cursorWhere = or(
      lt(batch.startDate, cursor.startDate),
      and(eq(batch.startDate, cursor.startDate), gt(batch.id, cursor.id)),
    )
    if (cursorWhere) nonNullConditions.push(cursorWhere)
  }

  const rows = await db.query.batch.findMany({
    where: and(...nonNullConditions),
    orderBy: [sql`${batch.startDate} desc nulls last`, asc(batch.id)],
    limit: limit + 1,
    with: { enrollments: { with: { profile: true } }, classSlots: true },
  })

  if (rows.length <= limit) {
    const nullRows = await db.query.batch.findMany({
      where: and(...conditions, isNull(batch.startDate)),
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

// One query for "every batch any of these profiles has ever been enrolled in," keyed by
// profileId — backs the dashboard's "past batches per taught student" panel, which used to be
// one HTTP round-trip per student (exactly the fan-out shape that exhausted the connection pool
// once already; see findBatchesWithDetail above). Bare Batch rows, not BatchWithRole — this is a
// cross-reference list, not a roster view, so no members/classSlots eager-load needed here.
export async function findBatchesForProfiles(
  db: SchoolDbExecutor,
  profileIds: string[],
): Promise<Map<string, Batch[]>> {
  const map = new Map<string, Batch[]>()
  if (profileIds.length === 0) return map

  const rows = await db
    .select({ profileId: enrollment.profileId, batch })
    .from(enrollment)
    .innerJoin(batch, eq(batch.id, enrollment.batchId))
    .where(inArray(enrollment.profileId, profileIds))

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

export async function findBatchById(
  db: SchoolDbExecutor,
  batchId: string,
): Promise<Batch | undefined> {
  return db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, batchId),
  })
}

export async function findBatchByIdWithMembers(
  db: SchoolDbExecutor,
  batchId: string,
): Promise<BatchDetail | undefined> {
  const row = await db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.id, batchId),
    with: { enrollments: { with: { profile: true } }, classSlots: true },
  })

  if (!row) return undefined
  return {
    ...row,
    members: row.enrollments.map(e => ({
      profileId: e.profileId,
      name: e.profile.name,
      phone: e.profile.phone,
      city: e.profile.city,
      role: e.role,
      joinedAt: e.joinedAt,
    })),
    classSlots: row.classSlots.map(toClassSlot),
  }
}

export async function setClassSlots(
  db: SchoolDbExecutor,
  batchId: string,
  slots: ClassSlot[],
): Promise<ClassSlot[]> {
  return db.transaction(async tx => {
    await tx.delete(batchClassSlot).where(eq(batchClassSlot.batchId, batchId))
    if (slots.length === 0) return []

    const rows = await tx
      .insert(batchClassSlot)
      .values(slots.map(slot => ({ ...slot, batchId })))
      .returning()

    return rows.map(toClassSlot)
  })
}

export async function createBatch(db: SchoolDbExecutor, data: CreateBatchData): Promise<Batch> {
  const rows = await db.insert(batch).values(data).returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

export async function updateBatch(
  db: SchoolDbExecutor,
  batchId: string,
  data: UpdateBatchData,
): Promise<Batch> {
  const rows = await db.update(batch).set(data).where(eq(batch.id, batchId)).returning()
  const row = rows.at(0)
  if (!row) throw notFound()
  return row
}
