import type { SchoolDbClient } from '@narada/db'

import { conflict, orInternalError, orNotFound, unprocessable } from '../error'
import * as examRepository from '../exams/repository'
import { existsInCourse as trackExistsInCourse } from '../tracks/repository'
import type { AccessPolicy } from '../utils/accessPolicy'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type { AddTrackTaData, TrackTa, TrackTaCandidate } from './schema'

type TrackTaServiceContext = { db: SchoolDbClient }
type AdminContext = TrackTaServiceContext & { access: Pick<AccessPolicy, 'requireCanManageTrackTas'> }

/** Every track's listed TAs for the course, in one read — the client groups them by `trackId`. */
export async function findAll(context: TrackTaServiceContext, courseId: string): Promise<TrackTa[]> {
  return repository.findAllInCourse(context.db, courseId)
}

/**
 * The TAs an admin may add to `trackId`'s list: active TAs in the course with L3+ on every gradable
 * chapter of the track, not already listed. Admin only — it exposes who is a TA and how far along
 * they are.
 */
export async function findCandidates(
  { db, access }: AdminContext,
  trackId: string,
  courseId: string,
): Promise<TrackTaCandidate[]> {
  access.requireCanManageTrackTas()
  orNotFound((await trackExistsInCourse(db, trackId, courseId)) || null)

  const [tas, listed] = await Promise.all([
    repository.findActiveTas(db, courseId),
    repository.findListedProfileIds(db, trackId),
  ])
  const certified = new Set(
    await examRepository.findCertifiedProfileIds(
      db,
      trackId,
      tas.map(ta => ta.profileId),
    ),
  )
  return tas.filter(ta => certified.has(ta.profileId) && !listed.includes(ta.profileId))
}

/**
 * Lists `profileId` as a TA for `trackId`. 404 for a track outside this course; 422 unless they are
 * an active TA here and at L3+ on every chapter of the track (the same rule `findCandidates` offers
 * from, re-checked since the client's list may be stale); 409 if already listed.
 */
export async function add(
  { db, access }: AdminContext,
  data: AddTrackTaData,
  courseId: string,
): Promise<TrackTa> {
  access.requireCanManageTrackTas()
  orNotFound((await trackExistsInCourse(db, data.trackId, courseId)) || null)

  if (!(await repository.isActiveTa(db, courseId, data.profileId))) {
    throw unprocessable('only an active TA of this course can be listed')
  }
  const certified = await examRepository.findCertifiedProfileIds(db, data.trackId, [data.profileId])
  if (certified.length === 0) {
    throw unprocessable('a TA must have L3 on every chapter of the track to be listed')
  }

  const row = await withConstraintMapping(() => repository.insert(db, data.trackId, data.profileId), {
    [DbConstraint.trackTaPrimaryKey]: () => conflict('this TA is already listed for the track'),
  })
  return orInternalError(row)
}

export async function remove(
  { db, access }: AdminContext,
  trackId: string,
  profileId: string,
  courseId: string,
): Promise<void> {
  access.requireCanManageTrackTas()
  orNotFound((await trackExistsInCourse(db, trackId, courseId)) || null)
  orNotFound((await repository.remove(db, trackId, profileId)) || null)
}
