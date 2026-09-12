import type { SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'
import type { TrackCertification, TrackWithChapters } from './schema'

// Archived is invisible in every view, not just learner-preview — an archived chapter is hidden,
// not merely draft (see `packages/db/src/schema/school.ts`'s `chapter.archived` doc comment).

export async function findAll(db: SchoolDb, view: ContentReadView): Promise<TrackWithChapters[]> {
  return db.query.track.findMany({
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
 * Every certification result ever recorded for this student, across every track — full history,
 * not deduped to "current" (mirrors `evaluations/repository.ts::findAllForStudent`: achievements
 * outlive enrollment, and "the" current result per track is for the caller to reduce, same as it
 * already does for chapter evaluations).
 */
export async function findCertificationsForStudent(
  db: SchoolDb,
  studentId: string,
): Promise<TrackCertification[]> {
  return db.query.trackCertification.findMany({
    where: (t, { eq }) => eq(t.studentId, studentId),
    orderBy: (t, { desc }) => desc(t.evaluatedAt),
  })
}
