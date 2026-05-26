import { z } from 'zod'
import { and, asc, eq, gt, inArray } from 'drizzle-orm'

import { batch, enrollment, type Database } from '@narada/db'
import { asCursor, paginateResponse } from '../utils/cursor'
import { internalError, notFound } from '../error'
import type { BatchAccess } from '../utils/auth'

const PAGE_SIZE = 20

export const batchSchema = z.object({
  id: z.string(),
  code: z.string(),
  trackId: z.string(),
  startDate: z.string().nullable(),
  status: z.enum(['upcoming', 'active', 'completed']),
  scheduledAt: z.date().nullable(),
  meetingUrl: z.string().nullable(),
})

export const batchMemberSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  role: z.enum(['instructor', 'ta', 'student']),
  status: z.enum(['active', 'inactive', 'completed']),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  joinedAt: z.date().nullable(),
})

export const batchDetailSchema = batchSchema.extend({
  members: z.array(batchMemberSchema),
})

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

export const updateBatchSchema = z
  .object({
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
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export const listBatchesQuerySchema = z.object({
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  cursor: asCursor(z.object({ id: z.string() })).optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
})

export type Batch = z.infer<typeof batchSchema>
export type BatchMember = z.infer<typeof batchMemberSchema>
export type BatchDetail = z.infer<typeof batchDetailSchema>
export type CreateBatchData = z.infer<typeof createBatchSchema>
export type UpdateBatchData = z.infer<typeof updateBatchSchema>
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>

type DbBatch = typeof batch.$inferSelect

function mapBatch(row: DbBatch): Batch {
  return {
    id: row.id,
    code: row.code,
    trackId: row.trackId,
    startDate: row.startDate,
    status: row.status,
    scheduledAt: row.scheduledAt,
    meetingUrl: row.meetingUrl,
  }
}

export default class BatchService {
  public static async findAll(
    db: Database,
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
    if (cursor) conditions.push(gt(batch.id, cursor.id))
    const rows = await db.query.batch.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: asc(batch.id),
      limit: limit + 1,
    })

    return paginateResponse(rows.map(mapBatch), limit, item => ({ id: item.id }))
  }

  public static async findById(db: Database, batchId: string): Promise<Batch | undefined> {
    const row = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
    })

    return row ? mapBatch(row) : undefined
  }

  public static async findByIdWithMembers(
    db: Database,
    batchId: string,
  ): Promise<BatchDetail | undefined> {
    const row = await db.query.batch.findFirst({
      where: (t, { eq }) => eq(t.id, batchId),
      with: { enrollments: { with: { user: true } } },
    })

    if (!row) return undefined
    return {
      ...mapBatch(row),
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

  public static async create(db: Database, data: CreateBatchData): Promise<Batch> {
    const rows = await db.insert(batch).values(data).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return mapBatch(row)
  }

  public static async update(db: Database, batchId: string, data: UpdateBatchData): Promise<Batch> {
    const rows = await db.update(batch).set(data).where(eq(batch.id, batchId)).returning()
    const row = rows.at(0)
    if (!row) throw notFound()
    return mapBatch(row)
  }
}
