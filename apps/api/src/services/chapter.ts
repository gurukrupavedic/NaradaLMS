import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'

import { chapter, segment, type SchoolDatabase } from '@narada/db'
import { internalError, notFound, unprocessable } from '../error'
import { chapterResponse, type Chapter } from './chapterReader'
import { requireNonEmpty } from '../utils/validate'

export const createChapterSchema = z.object({
  trackId: z.uuid(),
  title: z.string().min(1),
  code: z.string().min(1),
})

export const updateChapterSchema = requireNonEmpty(
  z.object({
    title: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    status: z.enum(['draft', 'published']).optional(),
    trackId: z.uuid().optional(),
    script: z.enum(['te', 'sa', 'en']).optional(),
    textObjectKey: z.string().optional(),
  }),
)

export const reorderChaptersSchema = z.object({
  ids: z.array(z.uuid()),
})

export type CreateChapterData = z.infer<typeof createChapterSchema>
export type UpdateChapterData = z.infer<typeof updateChapterSchema>
export type ReorderChaptersData = z.infer<typeof reorderChaptersSchema>

export async function createChapter(db: SchoolDatabase, data: CreateChapterData): Promise<Chapter> {
  const rows = await db
    .insert(chapter)
    .values({ ...data, order: await nextChapterOrder(db, data.trackId) })
    .returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return chapterResponse(row)
}

export async function updateChapter(
  db: SchoolDatabase,
  chapterId: string,
  data: UpdateChapterData,
): Promise<Chapter> {
  const existing = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: { trackId: true },
  })
  if (!existing) throw notFound()

  const movedTrackId = data.trackId && data.trackId !== existing.trackId ? data.trackId : undefined
  const rows = await db
    .update(chapter)
    .set({
      ...data,
      ...(movedTrackId ? { order: await nextChapterOrder(db, movedTrackId) } : {}),
    })
    .where(eq(chapter.id, chapterId))
    .returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return chapterResponse(row)
}

export async function reorderChapters(
  db: SchoolDatabase,
  trackId: string,
  data: ReorderChaptersData,
): Promise<Chapter[]> {
  const existing = await db.query.chapter.findMany({
    where: (t, { eq }) => eq(t.trackId, trackId),
    columns: { id: true },
  })
  assertSameIds(
    existing.map(row => row.id),
    data.ids,
  )

  return await db.transaction(async tx => {
    for (const [index, id] of data.ids.entries()) {
      await tx
        .update(chapter)
        .set({ order: -(index + 1) })
        .where(eq(chapter.id, id))
    }

    const rows: Chapter[] = []
    for (const [index, id] of data.ids.entries()) {
      const updated = await tx
        .update(chapter)
        .set({ order: index + 1 })
        .where(eq(chapter.id, id))
        .returning()
      const row = updated.at(0)
      if (!row) throw internalError()
      rows.push(await chapterResponse(row))
    }

    return rows
  })
}

export async function applyChapterScript(
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

async function nextChapterOrder(db: SchoolDatabase, trackId: string): Promise<number> {
  const rows = await db
    .select({ next: sql<number>`coalesce(max(${chapter.order}), 0) + 1` })
    .from(chapter)
    .where(eq(chapter.trackId, trackId))
  return rows.at(0)?.next ?? 1
}

function assertSameIds(existing: string[], requested: string[]): void {
  if (existing.length !== requested.length) {
    throw unprocessable('Reorder request must include every chapter in the track exactly once')
  }

  const requestedIds = new Set(requested)
  if (requestedIds.size !== requested.length || existing.some(id => !requestedIds.has(id))) {
    throw unprocessable('Reorder request must include every chapter in the track exactly once')
  }
}
