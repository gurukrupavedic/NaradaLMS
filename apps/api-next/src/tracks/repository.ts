import type { SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'
import type { TrackWithChapters } from './schema'

export async function findAll(db: SchoolDb, view: ContentReadView): Promise<TrackWithChapters[]> {
  return db.query.track.findMany({
    orderBy: (t, { asc }) => asc(t.order),
    with: {
      chapters: {
        orderBy: (c, { asc }) => asc(c.order),
        where: view.kind === 'authoring' ? undefined : (c, { eq }) => eq(c.status, 'published'),
      },
    },
  })
}

export async function findById(
  db: SchoolDb,
  id: string,
  view: ContentReadView,
): Promise<TrackWithChapters | undefined> {
  return db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      chapters: {
        orderBy: (c, { asc }) => asc(c.order),
        where: view.kind === 'authoring' ? undefined : (c, { eq }) => eq(c.status, 'published'),
      },
    },
  })
}
