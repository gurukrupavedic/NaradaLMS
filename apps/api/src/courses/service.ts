import type { SchoolDb } from '@narada/db'

import { notFound, unprocessable } from '../error'
import * as repository from './repository'
import type { Course } from './schema'

/**
 * The course a request is *about* — one rule, used by every course-scoped read and by registration:
 *
 * - **`x-course-slug` names a course:** that course. A slug that isn't a course is a 404, so a stale
 *   or mistyped selection fails loudly rather than quietly showing an empty school.
 * - **No header, the school has exactly one course:** that course. It is unambiguous, and it is what
 *   lets a single-course school (SLMTS today) work without the app sending anything.
 * - **No header, several courses:** a 422. Silently showing everything mixed together, or filing an
 *   applicant under whichever course sorts first, would be a quiet, hard-to-spot mistake; the caller
 *   has to say which.
 * - **No header, no courses at all:** `undefined` — a brand-new school. There is nothing to scope, so
 *   reads come back empty rather than as an error.
 *
 * The slug is compared lower-cased.
 */
export async function findRequestCourse(
  db: SchoolDb,
  slug: string | undefined,
): Promise<Course | undefined> {
  if (slug) {
    const course = await repository.findBySlug(db, slug.toLowerCase())
    if (!course) {
      throw notFound('course not found')
    }

    return course
  }

  const courses = await repository.findAll(db)
  const [only] = courses
  if (only && courses.length === 1) {
    return only
  }

  if (courses.length > 1) {
    throw unprocessable('this school has several courses — say which with the x-course-slug header')
  }

  return undefined
}

/** {@link findRequestCourse} for something that *creates* a course-owned row (a registration): there has to be a course to file it under. */
export async function resolveCourse(db: SchoolDb, slug: string | undefined): Promise<Course> {
  const course = await findRequestCourse(db, slug)
  if (!course) {
    throw unprocessable('this school has no courses yet')
  }

  return course
}

/** A course by its slug, for a link that names one (`/register/vedam`). A 404 if there isn't one. */
export async function findCourseBySlug(db: SchoolDb, slug: string): Promise<Course> {
  const course = await repository.findBySlug(db, slug.toLowerCase())
  if (!course) {
    throw notFound('course not found')
  }

  return course
}
