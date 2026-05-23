import { asc, eq } from 'drizzle-orm'

import { track, chapter, type Database } from '@narada/db'
import { internalError } from '../error'

type Chapter = typeof chapter.$inferSelect
export type Track = typeof track.$inferSelect
export type TrackWithChapters = Track & { chapters: Chapter[] }

export default class TrackService {
  public static async findAll(db: Database, includeDrafts: boolean): Promise<TrackWithChapters[]> {
    return db.query.track.findMany({
      orderBy: asc(track.order),
      with: {
        chapters: {
          orderBy: asc(chapter.order),
          where: includeDrafts ? undefined : (t, { eq }) => eq(t.status, 'published'),
        },
      },
    })
  }

  public static async findById(
    db: Database,
    trackId: string,
    includeDrafts: boolean,
  ): Promise<TrackWithChapters | undefined> {
    return db.query.track.findFirst({
      where: (t, { eq }) => eq(t.id, trackId),
      with: {
        chapters: {
          orderBy: asc(chapter.order),
          where: includeDrafts ? undefined : (t, { eq }) => eq(t.status, 'published'),
        },
      },
    })
  }

  public static async create(db: Database, name: string): Promise<Track> {
    const rows = await db.insert(track).values({ name }).returning()
    const createdTrack = rows.at(0)
    if (createdTrack === undefined) {
      throw internalError()
    }

    return createdTrack
  }

  public static async update(
    db: Database,
    trackId: string,
    data: Partial<Pick<Track, 'name' | 'order'>>,
  ): Promise<Track | undefined> {
    const rows = await db.update(track).set(data).where(eq(track.id, trackId)).returning()
    const updatedTrack = rows.at(0)
    if (updatedTrack === undefined) {
      throw internalError()
    }

    return updatedTrack
  }
}
