import * as z from 'zod'

import { batchStatus, enrollmentRole } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { httpsUrl, isoInstant, requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const batchStatusSchema = z.enum(batchStatus.enumValues)
export const batchMemberRoleSchema = z.enum(enrollmentRole.enumValues)

export type Batch = z.infer<typeof BatchSchema>
export const BatchSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  code: z.string().min(1),
  status: batchStatusSchema,
  startDate: isoInstant.nullable(),
  meetingUrl: httpsUrl.nullable(),
})

// "View a batch" includes "see who's in it" — this is a capability, not just a richer response
// shape, so it lives on the same GET /batches/:batchId a caller already uses (see PARITY_PLAN.md
// §1.2: no reason this needs to be a separate endpoint just because apps/api/src also happens to
// inline it here).
export type BatchMember = z.infer<typeof BatchMemberSchema>
export const BatchMemberSchema = z.object({
  profileId: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  role: batchMemberRoleSchema,
  joinedAt: isoInstant.nullable(),
})

export type ClassSlot = z.infer<typeof ClassSlotSchema>
export const ClassSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM'),
  durationMinutes: z.number().int().positive(),
})

export type SetClassSlotsData = z.infer<typeof SetClassSlotsSchema>
export const SetClassSlotsSchema = z.object({
  slots: z
    .array(ClassSlotSchema)
    .max(7)
    .refine(slots => new Set(slots.map(slot => slot.dayOfWeek)).size === slots.length, {
      message: 'a batch can only have one class slot per day of week',
    }),
})

export type BatchDetail = z.infer<typeof BatchDetailSchema>
export const BatchDetailSchema = BatchSchema.extend({
  members: z.array(BatchMemberSchema),
  classSlots: z.array(ClassSlotSchema),
})

// A BatchDetail plus a specific profile's own role in it, distinct from any entry in `members`
// (which is every member's role). Backs the dashboard's "my batches" list (always a real role,
// since that list is always scoped to batches the profile is actually enrolled in) and
// `GET /profiles/:profileId/batches?withDetail=true` (nullable: a school-wide admin/owner's "all
// batches" view includes batches they don't personally teach).
export type BatchWithRole = z.infer<typeof BatchWithRoleSchema>
export const BatchWithRoleSchema = BatchDetailSchema.extend({
  role: batchMemberRoleSchema.nullable(),
})

export type FindBatchesData = z.infer<typeof FindBatchesSchema>
export const FindBatchesSchema = BatchSchema.pick({
  status: true,
})
  .partial()
  .safeExtend({
    limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
    cursor: asCursor(z.object({ startDate: z.coerce.date().nullable(), id: z.uuid() })),
  })

export type CreateBatchData = z.infer<typeof CreateBatchSchema>
export const CreateBatchSchema = BatchSchema.pick({
  trackId: true,
  code: true,
  startDate: true,
  meetingUrl: true,
}).partial({
  startDate: true,
  meetingUrl: true,
})

// No `trackId` — a batch's track is set once at creation; the real API never allowed moving it
// after the fact, and nothing downstream (schedule, enrollment, evaluations) expects it to move.
export type UpdateBatchData = z.infer<typeof UpdateBatchSchema>
export const UpdateBatchSchema = requireNonEmpty(
  BatchSchema.pick({
    code: true,
    status: true,
    startDate: true,
    meetingUrl: true,
  }).partial(),
)
