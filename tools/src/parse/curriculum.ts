import type { ChapterRow, TrackRow } from '../seed-types'
import { stableId, type Sheet } from './sheet'

/**
 * Reads the tracker sheet's header. Chapter columns run from the one after "Time zone" to the end,
 * and an "L4 Cert Status" column closes each track. Chapters are addressed by column index, never by
 * title: titles can repeat, and would collapse into one.
 */
export function parseCurriculum(tracker: Sheet, course: string) {
  const firstChapter = tracker.headers.indexOf('time zone') + 1
  if (firstChapter === 0) throw new Error(`${tracker.name} has no "Time zone" column`)
  const certColumns = tracker.headers.flatMap((h, i) => (h.startsWith('l4 cert status') ? [i] : []))
  if (certColumns.at(-1) !== tracker.headers.length - 1) {
    throw new Error(`${tracker.name}: expected an "L4 Cert Status" column to close every track and the sheet`)
  }

  const tracks: TrackRow[] = []
  const chapters: ChapterRow[] = []
  const chapterColumns: { index: number; chapterId: string }[] = []
  let start = firstChapter
  certColumns.forEach((certColumn, i) => {
    const order = i + 1
    const track: TrackRow = { id: stableId('track', course, order), courseSlug: course, name: `Track ${order}`, order }
    tracks.push(track)
    let chapterOrder = 1
    for (let column = start; column < certColumn; column++) {
      const title = tracker.titles[column]
      if (!title) continue
      const code = `${order}.${chapterOrder}`
      const chapter: ChapterRow = {
        id: stableId('chapter', course, code),
        trackId: track.id,
        code,
        title,
        status: 'published',
        order: chapterOrder++,
        script: null,
      }
      chapters.push(chapter)
      chapterColumns.push({ index: column, chapterId: chapter.id })
    }
    start = certColumn + 1
  })

  return { tracks, chapters, chapterColumns }
}
