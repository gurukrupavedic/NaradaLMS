import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

import { track, chapter, type Database } from '@narada/db'
import { internalError } from '../error'

export const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
})

export const trackChapterSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'published']),
  order: z.number(),
  script: z.enum(['te', 'sa', 'en']).nullable(),
  textUrl: z.string().nullable(),
})

export const trackWithChaptersSchema = trackSchema.extend({
  chapters: z.array(trackChapterSchema),
})

export const createTrackSchema = z.object({
  name: z.string().min(1),
})

export const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().positive().optional(),
})

export type Track = z.infer<typeof trackSchema>
export type TrackChapter = z.infer<typeof trackChapterSchema>
export type TrackWithChapters = z.infer<typeof trackWithChaptersSchema>
export type CreateTrackData = z.infer<typeof createTrackSchema>
export type UpdateTrackData = z.infer<typeof updateTrackSchema>

type DbTrack = typeof track.$inferSelect
type DbChapter = typeof chapter.$inferSelect

function mapChapter(row: DbChapter): TrackChapter {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    textUrl: row.textUrl,
  }
}

function mapTrack(row: DbTrack): Track {
  return { id: row.id, name: row.name, order: row.order }
}

function mapTrackWithChapters(row: DbTrack & { chapters: DbChapter[] }): TrackWithChapters {
  return { ...mapTrack(row), chapters: row.chapters.map(mapChapter) }
}

export default class TrackService {
  public static async findAll(db: Database, includeDrafts: boolean): Promise<TrackWithChapters[]> {
    const rows = await db.query.track.findMany({
      orderBy: asc(track.order),
      with: {
        chapters: {
          orderBy: asc(chapter.order),
          where: includeDrafts ? undefined : (t, { eq }) => eq(t.status, 'published'),
        },
      },
    })

    return rows.map(mapTrackWithChapters)
  }

  public static async findById(
    db: Database,
    trackId: string,
    includeDrafts: boolean,
  ): Promise<TrackWithChapters | undefined> {
    const row = await db.query.track.findFirst({
      where: (t, { eq }) => eq(t.id, trackId),
      with: {
        chapters: {
          orderBy: asc(chapter.order),
          where: includeDrafts ? undefined : (t, { eq }) => eq(t.status, 'published'),
        },
      },
    })

    return row ? mapTrackWithChapters(row) : undefined
  }

  public static async create(db: Database, data: CreateTrackData): Promise<Track> {
    const rows = await db.insert(track).values(data).returning()
    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    return mapTrack(row)
  }

  public static async update(
    db: Database,
    trackId: string,
    data: UpdateTrackData,
  ): Promise<Track> {
    const rows = await db.update(track).set(data).where(eq(track.id, trackId)).returning()
    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    return mapTrack(row)
  }
}
