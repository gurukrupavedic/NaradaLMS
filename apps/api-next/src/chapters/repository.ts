import type { SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'
import type { Chapter } from './schema'

export async function findById(
  db: SchoolDb,
  id: string,
  view: ContentReadView,
): Promise<Chapter | undefined> {
  return db.query.chapter.findFirst({
    where: (t, { and, eq }) =>
      view.kind === 'authoring' ? eq(t.id, id) : and(eq(t.id, id), eq(t.status, 'published')),
  })
}
