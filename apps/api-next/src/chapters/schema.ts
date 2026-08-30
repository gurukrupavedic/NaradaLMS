import * as z from 'zod'

import { chapterStatus, script } from '@narada/db'

export const chapterStatusSchema = z.enum(chapterStatus.enumValues)
export const chapterScriptSchema = z.enum(script.enumValues)

export type Chapter = z.infer<typeof ChapterSchema>
export const ChapterSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  code: z.string(),
  title: z.string(),
  status: chapterStatusSchema,
  order: z.number().int(),
  script: chapterScriptSchema.nullable(),
})
