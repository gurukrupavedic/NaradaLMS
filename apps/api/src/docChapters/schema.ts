import * as z from 'zod'

export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>
export const presignUploadResponseSchema = z.object({
  uploadId: z.string(),
  uploads: z.object({
    sa: z.object({ uploadUrl: z.string() }),
    te: z.object({ uploadUrl: z.string() }),
    en: z.object({ uploadUrl: z.string() }),
  }),
})

export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequestSchema>
export const confirmUploadRequestSchema = z.object({ uploadId: z.uuid() })

export type ConfirmUploadResponse = z.infer<typeof confirmUploadResponseSchema>
export const confirmUploadResponseSchema = z.object({ jobId: z.string() })

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
