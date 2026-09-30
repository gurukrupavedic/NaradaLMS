import * as z from 'zod'

export type UploadDocSetResponse = z.infer<typeof uploadDocSetResponseSchema>
export const uploadDocSetResponseSchema = z.object({ jobId: z.string() })

export const jobStateSchema = z.enum(['queued', 'active', 'completed', 'failed'])
export type JobState = z.infer<typeof jobStateSchema>

export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>
export const jobStatusResponseSchema = z.object({
  status: jobStateSchema,
  progress: z.number(),
  result: z.object({ headingsUpserted: z.number().int(), headingsSkipped: z.number().int() }).nullable(),
  error: z.string().nullable(),
})

export type DocChapterListItem = z.infer<typeof docChapterListItemSchema>
export const docChapterListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  track: z.string(),
  verseCount: z.number().int(),
  assignedCount: z.number().int(),
})

export const listDocChaptersQuerySchema = z.object({ q: z.string().optional() })
