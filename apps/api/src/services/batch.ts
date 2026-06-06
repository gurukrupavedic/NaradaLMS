import { z } from 'zod'
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { batch, enrollment, type SchoolDatabase } from '@narada/db'
import { compoundCursor, paginateResponse, uuidCursorField } from '../utils/cursor'
import { internalError, notFound } from '../error'
import type { BatchAccess } from '../utils/auth'
import { requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

type BatchMember = {
  userId: string
  userName: string
  userEmail: string
  role: (typeof enrollment.$inferSelect)['role']
  status: (typeof enrollment.$inferSelect)['status']
  phone: string | null
  city: string | null
  joinedAt: Date | null
}

export const createBatchSchema = z.object({
  code: z.string().min(1),
  trackId: z.uuid(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  scheduledAt: z.iso
    .datetime()
    .transform(v => new Date(v))
    .optional(),
  meetingUrl: z.string().url().optional(),
})

export const updateBatchSchema = requireNonEmpty(
  z.object({
    code: z.string().min(1).optional(),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
      .optional(),
    scheduledAt: z.iso
      .datetime()
      .transform(v => new Date(v))
      .optional(),
    meetingUrl: z.string().url().optional(),
  }),
)

export const listBatchesQuerySchema = z.object({
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  cursor: compoundCursor({ startDate: z.string().nullable(), id: uuidCursorField() }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export type Batch = typeof batch.$inferSelect
export type BatchDetail = Batch & { members: BatchMember[] }
export type CreateBatchData = z.infer<typeof createBatchSchema>
export type UpdateBatchData = z.infer<typeof updateBatchSchema>
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>

export default class BatchService {
  public static async findAll(
    db: SchoolDatabase,
    options: ListBatchesQuery & { access: BatchAccess },
  ): Promise<{ items: Batch[]; nextCursor: string | null }> {
    const { access, status, cursor, limit } = options

    const conditions = []
    if (access.kind === 'enrolled') {
      const enrolledBatchIds = db
        .select({ id: enrollment.batchId })
        .from(enrollment)
        .where(eq(enrollment.userId, access.userId))

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

  public static async findById(db: SchoolDatabase, batchId: string): Promise<Batch | undefined> {
    const row = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    return row
  }

  public static async findByIdWithMembers(
    db: SchoolDatabase,
    batchId: string,
  ): Promise<BatchDetail | undefined> {
    const row = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
      with: { enrollments: { with: { user: true } } },
    })

    if (!row) return undefined
    return {
      ...row,
      members: row.enrollments.map(e => ({
        userId: e.userId,
        userName: e.user.name,
        userEmail: e.user.email,
        role: e.role,
        status: e.status,
        phone: e.phone,
        city: e.city,
        joinedAt: e.joinedAt,
      })),
    }
  }

  public static async create(db: SchoolDatabase, data: CreateBatchData): Promise<Batch> {
    const rows = await db.insert(batch).values(data).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  }

  public static async update(db: SchoolDatabase, batchId: string, data: UpdateBatchData): Promise<Batch> {
    const rows = await db.update(batch).set(data).where(eq(batch.id, batchId)).returning()
    const row = rows.at(0)
    if (!row) throw notFound()
    return row
  }
}
