import { z } from 'zod'
import { asc, eq, sql } from 'drizzle-orm'

import { track, chapter, type SchoolDbExecutor } from '@narada/db'
import { internalError, unprocessable } from '../error'
import { chapterResponse, type Chapter, type ChapterReadView } from './chapterReader'
import { requireNonEmpty } from '../utils/validate'

type TrackChapter = Chapter

export const createTrackSchema = z.object({
  name: z.string().min(1),
})

export const updateTrackSchema = requireNonEmpty(
  z.object({
    name: z.string().min(1).optional(),
  }),
)

export const reorderTracksSchema = z.object({
  ids: z.array(z.uuid()),
})

export type Track = typeof track.$inferSelect
export type TrackWithChapters = Track & { chapters: TrackChapter[] }
export type CreateTrackData = z.infer<typeof createTrackSchema>
export type UpdateTrackData = z.infer<typeof updateTrackSchema>
export type ReorderTracksData = z.infer<typeof reorderTracksSchema>

type DbChapter = typeof chapter.$inferSelect

async function trackWithChaptersResponse(
  row: Track & { chapters: DbChapter[] },
): Promise<TrackWithChapters> {
  return { ...row, chapters: await Promise.all(row.chapters.map(chapterResponse)) }
}

export async function findTracks(
  db: SchoolDbExecutor,
  view: ChapterReadView,
): Promise<TrackWithChapters[]> {
  const rows = await db.query.track.findMany({
    orderBy: asc(track.order),
    with: {
      chapters: {
        orderBy: asc(chapter.order),
        where: view.kind === 'authoring' ? undefined : (t, { eq }) => eq(t.status, 'published'),
      },
    },
  })

  return Promise.all(rows.map(trackWithChaptersResponse))
}

export async function findTrackById(
  db: SchoolDbExecutor,
  trackId: string,
  view: ChapterReadView,
): Promise<TrackWithChapters | undefined> {
  const row = await db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, trackId),
    with: {
      chapters: {
        orderBy: asc(chapter.order),
        where: view.kind === 'authoring' ? undefined : (t, { eq }) => eq(t.status, 'published'),
      },
    },
  })

  return row ? trackWithChaptersResponse(row) : undefined
}

export async function createTrack(db: SchoolDbExecutor, data: CreateTrackData): Promise<Track> {
  const rows = await db
    .insert(track)
    .values({ ...data, order: await nextTrackOrder(db) })
    .returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

export async function updateTrack(
  db: SchoolDbExecutor,
  trackId: string,
  data: UpdateTrackData,
): Promise<Track> {
  const rows = await db.update(track).set(data).where(eq(track.id, trackId)).returning()
  const row = rows.at(0)
  if (!row) throw internalError()
  return row
}

export async function reorderTracks(
  db: SchoolDbExecutor,
  data: ReorderTracksData,
): Promise<Track[]> {
  const existing = await db.query.track.findMany({ columns: { id: true } })
  assertSameIds(
    existing.map(row => row.id),
    data.ids,
  )

  return await db.transaction(async tx => {
    for (const [index, id] of data.ids.entries()) {
      await tx
        .update(track)
        .set({ order: -(index + 1) })
        .where(eq(track.id, id))
    }

    const rows: Track[] = []
    for (const [index, id] of data.ids.entries()) {
      const updated = await tx
        .update(track)
        .set({ order: index + 1 })
        .where(eq(track.id, id))
        .returning()
      const row = updated.at(0)
      if (!row) throw internalError()
      rows.push(row)
    }

    return rows
  })
}

async function nextTrackOrder(db: SchoolDbExecutor): Promise<number> {
  const rows = await db
    .select({ next: sql<number>`coalesce(max(${track.order}), 0) + 1` })
    .from(track)
  return rows.at(0)?.next ?? 1
}

function assertSameIds(existing: string[], requested: string[]): void {
  if (existing.length !== requested.length) {
    throw unprocessable('Reorder request must include every track exactly once')
  }

  const requestedIds = new Set(requested)
  if (requestedIds.size !== requested.length || existing.some(id => !requestedIds.has(id))) {
    throw unprocessable('Reorder request must include every track exactly once')
  }
}
