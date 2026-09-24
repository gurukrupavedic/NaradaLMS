import type { SchoolDbClient } from '@narada/db'

import { notFound, orNotFound, unprocessable } from '../error'
import * as chapterRepository from '../chapters/repository'
import type { AccessPolicy, ContentReadView } from '../utils/accessPolicy'
import * as repository from './repository'
import type { TrackWithChapters } from './schema'

type TrackServiceContext = { db: SchoolDbClient }

/** The one question the read path asks of `AccessPolicy` — narrow so a unit test can hand in a stub. */
type CourseContentGate = Pick<AccessPolicy, 'canReadCourseContent'>

export async function findAll(
  context: TrackServiceContext,
  view: ContentReadView,
  courseId: string,
): Promise<TrackWithChapters[]> {
  return repository.findAll(context.db, view, courseId)
}

export async function findById(
  context: TrackServiceContext,
  id: string,
  view: ContentReadView,
): Promise<TrackWithChapters> {
  return orNotFound(await repository.findById(context.db, id, view))
}

/**
 * `findById` for a *reader*: a track in a course the caller isn't part of 404s exactly like one that
 * doesn't exist — never 403 — so guessing an id can't disclose what another course teaches (the same
 * rule a draft chapter follows). The write paths use plain `findById`: they are admin-only.
 */
export async function findByIdForReader(
  context: TrackServiceContext,
  id: string,
  view: ContentReadView,
  gate: CourseContentGate,
): Promise<TrackWithChapters> {
  const track = await findById(context, id, view)
  if (!(await gate.canReadCourseContent(track.courseId))) {
    throw notFound()
  }

  return track
}

/**
 * Full reorder of a track's active (non-archived) chapters — the admin UI's ▲/▼ move sends the
 * whole post-move ordered id list, not a single swap (mirrors `resegmentChapter`'s "every script
 * together" shape for the same reason: a partial reorder can't safely know how the rest should
 * shift). `chapterIds` must be exactly the track's current active set — not a subset (a chapter
 * left out would keep a stale `order` no longer consistent with its siblings') and not a superset
 * (an id that isn't active, e.g. archived or belonging to another track). Mismatch → 422 naming
 * which ids are missing/unexpected, same style as `resegmentChapter`.
 */
export async function reorderChapters(
  context: TrackServiceContext,
  trackId: string,
  chapterIds: string[],
): Promise<TrackWithChapters> {
  await context.db.transaction(async tx => {
    orNotFound(await repository.findById(tx, trackId, { kind: 'authoring' }))

    const activeIds = (await chapterRepository.findActiveChapterIds(tx, trackId)).sort()
    const submittedIds = [...chapterIds].sort()
    const missing = activeIds.filter(id => !submittedIds.includes(id))
    const unexpected = submittedIds.filter(id => !activeIds.includes(id))
    if (missing.length > 0 || unexpected.length > 0) {
      throw unprocessable(
        `reordering requires exactly this track's active chapters` +
          (missing.length > 0 ? ` — missing: ${missing.join(', ')}` : '') +
          (unexpected.length > 0 ? ` — not an active chapter on this track: ${unexpected.join(', ')}` : ''),
      )
    }

    await chapterRepository.reorderChapters(tx, chapterIds)
  })

  return findById(context, trackId, { kind: 'authoring' })
}
