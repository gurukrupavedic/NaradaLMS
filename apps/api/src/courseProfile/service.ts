import type { SchoolDbClient } from '@narada/db'
import { COUNTER_MAX, courseCounterFor, courseFieldsFor } from '@narada/profile-fields'

import { notFound, orNotFound, unprocessable } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { mergeDetailsPatch } from '../utils/details'
import * as repository from './repository'
import type { CourseProfile, UpdateCourseProfileData } from './schema'

/** `course` is the one the request names (`X-Course-Slug`): a course profile belongs to a course. */
type CourseProfileContext = {
  db: SchoolDbClient
  school: { slug: string }
  course: { id: string; slug: string }
  user: User
  access: AccessPolicy
}

/**
 * Who may write: the profile's own owner, or a school admin for anyone's — the same split as
 * `profiles/service.ts::updateProfile`, enforced by the same ownership predicate in SQL, so someone
 * else's profile 404s exactly as a missing one does.
 */
async function requireWritableProfile(context: CourseProfileContext, profileId: string) {
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  orNotFound(await repository.findWritableProfile(context.db, profileId, ownerUserId))
}

/**
 * Edits the profile's record in this course: the columns sent are replaced, and the `details` patch
 * is laid over what's stored and re-validated as a whole against this course's rules
 * (`courseFieldsFor`) — all in a transaction that first locks the row. A key this course doesn't
 * declare is refused, so a course with no course-level fields still takes the three columns.
 */
export async function updateCourseProfile(
  context: CourseProfileContext,
  profileId: string,
  data: UpdateCourseProfileData,
): Promise<CourseProfile> {
  const { details: detailsPatch, ...columns } = data
  const fields = courseFieldsFor(context.school.slug, context.course.slug)

  await requireWritableProfile(context, profileId)
  return context.db.transaction(async tx => {
    const current = await repository.lock(tx, profileId, context.course.id)
    return repository.update(tx, profileId, context.course.id, {
      ...columns,
      ...(detailsPatch && { details: mergeDetailsPatch(fields, current.details, detailsPatch) }),
    })
  })
}

/** Adds to one of this course's counters and returns its new total. */
export async function addToCounter(
  context: CourseProfileContext,
  profileId: string,
  key: string,
  count: number,
): Promise<{ key: string; total: number }> {
  if (!courseCounterFor(context.school.slug, context.course.slug, key)) {
    throw notFound()
  }

  await requireWritableProfile(context, profileId)
  const total = await repository.addToCounter(
    context.db,
    profileId,
    context.course.id,
    key,
    count,
    COUNTER_MAX,
  )
  if (total === undefined) {
    throw unprocessable(`a count can't exceed ${COUNTER_MAX}`)
  }

  return { key, total }
}
