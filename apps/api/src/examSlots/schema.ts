import * as z from 'zod'

import { examSlotRequestStatus, examSlotStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant } from '../utils/validate'

const PAGE_SIZE = 20

export const examSlotStatusSchema = z.enum(examSlotStatus.enumValues)
export const examSlotRequestStatusSchema = z.enum(examSlotRequestStatus.enumValues)

export type ExamSlot = z.infer<typeof ExamSlotSchema>
export const ExamSlotSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  scheduledAt: isoInstant,
  status: examSlotStatusSchema,
  openedBy: z.uuid(),
  createdAt: isoInstant,
})

export type OpenExamSlotData = z.infer<typeof OpenExamSlotSchema>
export const OpenExamSlotSchema = ExamSlotSchema.pick({
  trackId: true,
  scheduledAt: true,
})

export type FindExamSlotsData = z.infer<typeof FindExamSlotsSchema>
export const FindExamSlotsSchema = z.object({
  trackId: z.uuid().optional(),
  status: examSlotStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
  cursor: asCursor(z.object({ scheduledAt: z.coerce.date(), id: z.uuid() })),
})

// A bare `ExamSlot` row has only `trackId`, not enough to render on its own in a list that spans
// several tracks — `trackName` is eager-loaded by the repository (`db.query.examSlot.findMany({
// with: ... })`), the same "don't make the client re-fan-out per row" shape as
// `enrollmentRequests/schema.ts`'s own `EnrollmentRequest`.
export type ExamSlotWithDetail = z.infer<typeof ExamSlotWithDetailSchema>
export const ExamSlotWithDetailSchema = ExamSlotSchema.extend({
  trackName: z.string(),
})

// A student's request to claim an open `examSlot`. `examId` is null until (and unless) the
// request is approved — see `service.ts::approve`.
export type ExamSlotRequest = z.infer<typeof ExamSlotRequestSchema>
export const ExamSlotRequestSchema = z.object({
  id: z.uuid(),
  slotId: z.uuid(),
  trackId: z.uuid(),
  studentId: z.uuid(),
  status: examSlotRequestStatusSchema,
  reviewedAt: isoInstant.nullable(),
  reviewedBy: z.uuid().nullable(),
  examId: z.uuid().nullable(),
  createdAt: isoInstant,
})

export type FindExamSlotRequestsData = z.infer<typeof FindExamSlotRequestsSchema>
export const FindExamSlotRequestsSchema = z.object({
  status: examSlotRequestStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
  cursor: asCursor(z.object({ createdAt: z.coerce.date(), id: z.uuid() })),
})

// The admin review queue (and a student's own "my requests") needs to show who's asking about
// which track, and when the slot they're asking for is actually scheduled, without a second
// round-trip per row — same reasoning as `ExamSlotWithDetail` above.
export type ExamSlotRequestWithDetail = z.infer<typeof ExamSlotRequestWithDetailSchema>
export const ExamSlotRequestWithDetailSchema = ExamSlotRequestSchema.extend({
  trackName: z.string(),
  studentName: z.string(),
  slotScheduledAt: isoInstant,
})
