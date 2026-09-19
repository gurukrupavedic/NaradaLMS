import type { SchoolDb } from '@narada/db'

import { badRequest, notFound } from '../error'
import * as repository from './repository'
import type { Course } from './schema'

/**
 * The course a request is *about* — one rule, used by every course-scoped read and by registration:
 * the request names it with `x-course-slug`, and it is that course. A request that names none is a
 * 400, and one that names a course the school doesn't have is a 404, so a forgotten or stale
 * selection fails loudly rather than quietly showing (or filing under) the wrong course. The slug is
 * compared lower-cased.
 *
 * There is deliberately no default — not even for a school with a single course. A rule that changed
 * with the number of courses would break every client that never sent the header the day a second
 * course was added.
 */
export async function resolveCourse(db: SchoolDb, slug: string | undefined): Promise<Course> {
  if (!slug) {
    throw badRequest('X-Course-Slug header is required')
  }

  return findCourseBySlug(db, slug)
}

/** A course by its slug (case-insensitive) — for a link that names one. A 404 if there isn't one. */
export async function findCourseBySlug(db: SchoolDb, slug: string): Promise<Course> {
  const course = await repository.findBySlug(db, slug.toLowerCase())
  if (!course) {
    throw notFound('course not found')
  }

  return course
}
