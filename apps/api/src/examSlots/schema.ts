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
  courseId: z.uuid(),
  scheduledAt: isoInstant,
  status: examSlotStatusSchema,
  openedBy: z.uuid(),
  createdAt: isoInstant,
})

export type OpenExamSlotData = z.infer<typeof OpenExamSlotSchema>
export const OpenExamSlotSchema = ExamSlotSchema.pick({
  scheduledAt: true,
})

export type FindExamSlotsData = z.infer<typeof FindExamSlotsSchema>
export const FindExamSlotsSchema = z.object({
  status: examSlotStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
  cursor: asCursor(z.object({ scheduledAt: z.coerce.date(), id: z.uuid() })),
})

// What a student sends to claim a slot: which track they're sitting. The slot itself is generic.
export type RequestExamSlotData = z.infer<typeof RequestExamSlotSchema>
export const RequestExamSlotSchema = z.object({ trackId: z.uuid() })

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
// round-trip per row.
export type ExamSlotRequestWithDetail = z.infer<typeof ExamSlotRequestWithDetailSchema>
export const ExamSlotRequestWithDetailSchema = ExamSlotRequestSchema.extend({
  trackName: z.string(),
  studentName: z.string(),
  slotScheduledAt: isoInstant,
})
