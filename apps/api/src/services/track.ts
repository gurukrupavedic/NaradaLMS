import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

import { track, chapter, type SchoolDatabase } from '@narada/db'
import { internalError } from '../error'
import { chapterResponse, type Chapter, type ChapterReadView } from './chapterReader'
import { requireNonEmpty } from '../utils/validate'

type TrackChapter = Chapter

export const createTrackSchema = z.object({
  name: z.string().min(1),
})

export const updateTrackSchema = requireNonEmpty(
  z.object({
    name: z.string().min(1).optional(),
    order: z.number().int().positive().optional(),
  }),
)

export type Track = typeof track.$inferSelect
export type TrackWithChapters = Track & { chapters: TrackChapter[] }
export type CreateTrackData = z.infer<typeof createTrackSchema>
export type UpdateTrackData = z.infer<typeof updateTrackSchema>

type DbChapter = typeof chapter.$inferSelect

async function trackWithChaptersResponse(
  row: Track & { chapters: DbChapter[] },
): Promise<TrackWithChapters> {
  return { ...row, chapters: await Promise.all(row.chapters.map(chapterResponse)) }
}

export default class TrackService {
  public static async findAll(db: SchoolDatabase, view: ChapterReadView): Promise<TrackWithChapters[]> {
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

  public static async findById(
    db: SchoolDatabase,
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

  public static async create(db: SchoolDatabase, data: CreateTrackData): Promise<Track> {
    const rows = await db.insert(track).values(data).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  }

  public static async update(db: SchoolDatabase, trackId: string, data: UpdateTrackData): Promise<Track> {
    const rows = await db.update(track).set(data).where(eq(track.id, trackId)).returning()
    const row = rows.at(0)
    if (!row) throw internalError()
    return row
  }
}
