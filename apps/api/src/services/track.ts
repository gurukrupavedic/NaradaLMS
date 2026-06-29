import { asc } from 'drizzle-orm'

import { track, chapter, type SchoolDbExecutor } from '@narada/db'
import { chapterResponse, type Chapter, type ChapterReadView } from './chapterReader'

type TrackChapter = Chapter
type DbChapter = typeof chapter.$inferSelect

export type Track = typeof track.$inferSelect
export type TrackWithChapters = Track & { chapters: TrackChapter[] }

function trackWithChaptersResponse(row: Track & { chapters: DbChapter[] }): TrackWithChapters {
  return { ...row, chapters: row.chapters.map(chapterResponse) }
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

  return rows.map(trackWithChaptersResponse)
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
