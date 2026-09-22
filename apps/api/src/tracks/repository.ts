import type { SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'
import type { TrackWithChapters } from './schema'

// Archived is invisible in every view, not just learner-preview — an archived chapter is hidden,
// not merely draft (see `packages/db/src/schema/school.ts`'s `chapter.archived` doc comment).

export async function findAll(
  db: SchoolDb,
  view: ContentReadView,
  courseId: string,
): Promise<TrackWithChapters[]> {
  return db.query.track.findMany({
    where: (t, { eq }) => (eq(t.courseId, courseId)),
    orderBy: (t, { asc }) => asc(t.order),
    with: {
      chapters: {
        orderBy: (c, { asc }) => asc(c.order),
        where: (c, { and, eq }) => and(view.kind === 'authoring' ? undefined : eq(c.status, 'published'), eq(c.archived, false)),
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
        where: (c, { and, eq }) => and(view.kind === 'authoring' ? undefined : eq(c.status, 'published'), eq(c.archived, false)),
      },
    },
  })
}

/**
 * The track immediately before `trackId` in its course, by `order` — `undefined` for the course's
 * first track (nothing is a prerequisite to it) or an unknown `trackId`. Ordering by `order` rather
 * than assuming `order - 1` tolerates gaps; tracks are static seeded content with no reorder API, so
 * `order` is trusted as the course's real track sequence.
 */
export async function findPreviousTrack(
  db: SchoolDb,
  trackId: string,
): Promise<{ id: string } | undefined> {
  const current = await db.query.track.findFirst({
    where: (t, { eq }) => eq(t.id, trackId),
    columns: { courseId: true, order: true },
  })
  if (!current) {
    return undefined
  }

  return db.query.track.findFirst({
    where: (t, { and, eq, lt }) => and(eq(t.courseId, current.courseId), lt(t.order, current.order)),
    orderBy: (t, { desc }) => desc(t.order),
    columns: { id: true },
  })
}

/**
 * Every track in `courseId` mapped to the id of the track immediately before it — the bulk
 * counterpart to {@link findPreviousTrack}, one query for the whole course instead of one per
 * batch (backs `batches/service.ts::findOpenBatches`'s eligibility check across every open batch at
 * once). A track missing from the map is the course's first — nothing prerequisite to it.
 */
export async function findPreviousTrackMap(db: SchoolDb, courseId: string): Promise<Map<string, string>> {
  const rows = await db.query.track.findMany({
    where: (t, { eq }) => eq(t.courseId, courseId),
    orderBy: (t, { asc }) => asc(t.order),
    columns: { id: true },
  })

  const map = new Map<string, string>()
  for (let i = 1; i < rows.length; i++) {
    map.set(rows[i]!.id, rows[i - 1]!.id)
  }
  return map
}
