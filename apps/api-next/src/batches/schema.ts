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

export type BatchDetail = z.infer<typeof BatchDetailSchema>
export const BatchDetailSchema = BatchSchema.extend({
  members: z.array(BatchMemberSchema),
})

// Backs the dashboard's "my batches" list: a BatchDetail plus the *caller's own* role in it,
// distinct from any entry in `members` (which is every member's role). Always a real role, never
// null — every consumer of this type only ever asks for a profile's own enrolled batches, where a
// role is guaranteed to exist by definition.
export type BatchWithRole = z.infer<typeof BatchWithRoleSchema>
export const BatchWithRoleSchema = BatchDetailSchema.extend({
  role: batchMemberRoleSchema,
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

export type UpdateBatchData = z.infer<typeof UpdateBatchSchema>
export const UpdateBatchSchema = requireNonEmpty(
  BatchSchema.pick({
    trackId: true,
    code: true,
    status: true,
    startDate: true,
    meetingUrl: true,
  }).partial(),
)
