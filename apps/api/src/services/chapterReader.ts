import { chapter, type SchoolDbExecutor } from '@narada/db'

type DbChapter = typeof chapter.$inferSelect

export type ChapterReadView = { kind: 'authoring' } | { kind: 'learnerPreview' }

export type Chapter = DbChapter

function canReadDrafts(view: ChapterReadView): boolean {
  return view.kind === 'authoring'
}

export function chapterResponse(row: DbChapter): Chapter {
  return row
}

export async function findChapterById(
  db: SchoolDbExecutor,
  chapterId: string,
  view: ChapterReadView,
): Promise<Chapter | undefined> {
  const row = await db.query.chapter.findFirst({
    where: (t, { and: a, eq: e }) =>
      canReadDrafts(view) ? e(t.id, chapterId) : a(e(t.id, chapterId), e(t.status, 'published')),
  })

  if (!row) return undefined
  return chapterResponse(row)
}
