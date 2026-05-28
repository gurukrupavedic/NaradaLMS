import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { chapter, segment, type SchoolDatabase } from '@narada/db'
import { internalError, notFound } from '../error'
import { chapterResponse, type Chapter } from './chapterReader'

export const createChapterSchema = z.object({
  trackId: z.uuid(),
  title: z.string().min(1),
  code: z.string().min(1),
})

export const updateChapterSchema = z
  .object({
    title: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    status: z.enum(['draft', 'published']).optional(),
    order: z.number().int().positive().optional(),
    trackId: z.uuid().optional(),
    script: z.enum(['te', 'sa', 'en']).optional(),
    textObjectKey: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export type CreateChapterData = z.infer<typeof createChapterSchema>
export type UpdateChapterData = z.infer<typeof updateChapterSchema>

export default class ChapterService {
  public static async create(db: SchoolDatabase, data: CreateChapterData): Promise<Chapter> {
    const rows = await db.insert(chapter).values(data).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return chapterResponse(row)
  }

  public static async update(
    db: SchoolDatabase,
    chapterId: string,
    data: UpdateChapterData,
  ): Promise<Chapter> {
    const rows = await db.update(chapter).set(data).where(eq(chapter.id, chapterId)).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return chapterResponse(row)
  }

  public static async applyScript(
    db: SchoolDatabase,
    chapterId: string,
    scriptType: 'te' | 'sa' | 'en',
    objectKey: string,
  ): Promise<Chapter> {
    const existing = await db.query.chapter.findFirst({
      where: (t, { eq }) => eq(t.id, chapterId),
    })

    if (!existing) {
      throw notFound()
    }

    // The presign route writes the R2 object before this transaction runs, so there is a
    // brief window where the new object exists but the chapter row still points at the old key.
    return await db.transaction(async tx => {
      await tx.delete(segment).where(eq(segment.chapterId, chapterId))
      const rows = await tx
        .update(chapter)
        .set({ script: scriptType, textObjectKey: objectKey })
        .where(eq(chapter.id, chapterId))
        .returning()

      const row = rows.at(0)
      if (!row) throw internalError()
      return chapterResponse(row)
    })
  }
}
