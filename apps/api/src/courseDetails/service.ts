import type { SchoolDbClient } from '@narada/db'
import {
  COUNTER_MAX,
  courseCounterFor,
  courseFieldsFor,
  type Details,
} from '@narada/profile-fields'

import { notFound, orNotFound, unprocessable } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { mergeDetailsPatch } from '../utils/details'
import * as repository from './repository'

/** `course` is the one the request names (`X-Course-Slug`): course-level details belong to a course. */
type CourseDetailsContext = {
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
async function requireWritableProfile(context: CourseDetailsContext, profileId: string) {
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  orNotFound(await repository.findWritableProfile(context.db, profileId, ownerUserId))
}

/**
 * Edits the profile's course-level details: the patch laid over what's stored and re-validated as a
 * whole against this course's rules (`courseFieldsFor`), in a transaction that first locks the row.
 * A course that declares no course-level fields has nothing to edit, so it 404s.
 */
export async function updateDetails(
  context: CourseDetailsContext,
  profileId: string,
  patch: Details,
): Promise<Details> {
  const fields = courseFieldsFor(context.school.slug, context.course.slug)
  if (fields.length === 0) {
    throw notFound()
  }

  await requireWritableProfile(context, profileId)
  return context.db.transaction(async tx => {
    const current = await repository.lockDetails(tx, profileId, context.course.id)
    return repository.replaceDetails(
      tx,
      profileId,
      context.course.id,
      mergeDetailsPatch(fields, current, patch),
    )
  })
}

/** Adds to one of this course's counters and returns its new total. */
export async function addToCounter(
  context: CourseDetailsContext,
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
