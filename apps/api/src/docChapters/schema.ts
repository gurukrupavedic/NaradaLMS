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

export const scriptKeySchema = z.enum(['sa', 'te', 'en'])
export type ScriptKey = z.infer<typeof scriptKeySchema>

/** A segment's per-script text — a script this segment has no confident text for yet is simply absent, never present with empty text. */
export type DocChapterSegment = z.infer<typeof docChapterSegmentSchema>
export const docChapterSegmentSchema = z.object({
  id: z.uuid(),
  order: z.number().int(),
  chapterId: z.uuid().nullable(),
  flaggedForReview: z.boolean(),
  scripts: z.object({
    sa: z.string().optional(),
    te: z.string().optional(),
    en: z.string().optional(),
  }),
})

export type DocChapterDetail = z.infer<typeof docChapterDetailSchema>
export const docChapterDetailSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  track: z.string(),
  segments: z.array(docChapterSegmentSchema),
})

export type SplitSegmentRequest = z.infer<typeof splitSegmentRequestSchema>
export const splitSegmentRequestSchema = z.object({
  script: scriptKeySchema,
  // The number of words that stay in the first of the two resulting segments — must leave at
  // least one word for the second segment too, so a wordIndex of 0 (or >= the word count) is
  // rejected at the service layer, where the actual word count is known.
  wordIndex: z.number().int().min(1),
})
