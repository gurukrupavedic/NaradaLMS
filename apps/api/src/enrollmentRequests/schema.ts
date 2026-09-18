import * as z from 'zod'

import { enrollmentRequestStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { isoInstant } from '../utils/validate'

const PAGE_SIZE = 20

export const enrollmentRequestStatusSchema = z.enum(enrollmentRequestStatus.enumValues)

// The admin review list needs to show who's asking to join what without a second round-trip per
// row — `studentName`/`batchCode`/`trackName` are joined in by the repository
// (`db.query.enrollmentRequest.findMany({ with: ... })`), the same "don't make the client re-fan-out
// per row" shape as `dashboard/service.ts` ([[project_batch_n1_incident]]), not applicant-supplied
// like `registration`'s own denormalized fields (the requester already has a `profile` to join).
export type EnrollmentRequest = z.infer<typeof EnrollmentRequestSchema>
export const EnrollmentRequestSchema = z.object({
  id: z.uuid(),
  status: enrollmentRequestStatusSchema,
  profileId: z.uuid(),
  studentName: z.string(),
  batchId: z.uuid(),
  batchCode: z.string(),
  trackName: z.string(),
  reviewedAt: isoInstant.nullable(),
  reviewedBy: z.uuid().nullable(),
  createdAt: isoInstant,
})

export type FindEnrollmentRequestsData = z.infer<typeof FindEnrollmentRequestsSchema>
export const FindEnrollmentRequestsSchema = z.object({
  status: enrollmentRequestStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
  cursor: asCursor(z.object({ createdAt: z.coerce.date(), id: z.uuid() })),
})
