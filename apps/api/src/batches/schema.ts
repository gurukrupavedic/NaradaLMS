import * as z from 'zod'

import { batchStatus, enrollmentRole, enrollmentStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { httpsUrl, isoInstant, requireNonEmpty } from '../utils/validate'

const PAGE_SIZE = 20

export const batchStatusSchema = z.enum(batchStatus.enumValues)
export const batchMemberRoleSchema = z.enum(enrollmentRole.enumValues)
export const enrollmentStatusSchema = z.enum(enrollmentStatus.enumValues)

export type Batch = z.infer<typeof BatchSchema>
export const BatchSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  // The course of `trackId`'s track — derived, never client-supplied (see `CreateBatchSchema`).
  courseId: z.uuid(),
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
  email: z.email().nullable(),
  city: z.string().nullable(),
  role: batchMemberRoleSchema,
  joinedAt: isoInstant.nullable(),
  // This member's own enrollment status in this batch (active/break/dropped/inactive) — unlike
  // `BatchWithRole.enrollmentStatus` (the caller's own status), every roster consumer needs this
  // one: apps/web's mark book only ever shows `'active'` members (see reshape.ts's `buildRoster`),
  // so a student put on a break (`enrollment/service.ts::putOnBreak`) is no longer rendered there
  // without losing their `enrollment` row.
  status: enrollmentStatusSchema,
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
//
// `enrollmentStatus` is the caller's own *enrollment* status (active/break/dropped/inactive) —
// deliberately not named `status` (that's already `Batch`'s own upcoming/active/completed) and
// deliberately not on `BatchMember` in general: today, only "is my own seat here still live"
// needs answering (the dashboard's "do I have an active batch" check), not every member's status.
export type BatchWithRole = z.infer<typeof BatchWithRoleSchema>
export const BatchWithRoleSchema = BatchDetailSchema.extend({
  role: batchMemberRoleSchema.nullable(),
  enrollmentStatus: enrollmentStatusSchema.nullable(),
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

// GET /batches/open — deliberately its own shape, not `BatchDetail`: a student browsing batches to
// join should see the schedule, never the existing roster (who's already in it). `trackName` is
// denormalized onto the row (rather than making the client resolve `trackId` itself) — a student
// choosing between open batches across tracks needs to know which is which at a glance. `eligible`
// is whether the requesting student holds at least L1 on the track before this one (courses'
// first tracks are always eligible) — computed per-request in `service.ts::findOpenBatches`, not
// stored, so the "Request to join" button can be disabled up front instead of only failing the
// POST after the fact (`enrollmentRequests/service.ts::request` still enforces this server-side).
export type OpenBatch = z.infer<typeof OpenBatchSchema>
export const OpenBatchSchema = BatchSchema.extend({
  trackName: z.string(),
  classSlots: z.array(ClassSlotSchema),
  eligible: z.boolean(),
})
