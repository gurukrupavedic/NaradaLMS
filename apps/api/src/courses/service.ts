import type { SchoolDb } from '@narada/db'

import { notFound, unprocessable } from '../error'
import * as repository from './repository'
import type { Course } from './schema'

/**
 * Works out which course a request that *creates* something course-owned (a registration, today)
 * is for. `slug` is the value of the `x-course-slug` header when the caller sent one.
 *
 * With no slug, a school that has exactly one course is unambiguous, so that course is used — this
 * is what lets today's single-course (Vedam) web app keep working without sending anything. Once
 * a school has several, a missing slug is a 422 rather than a guess: silently filing an applicant
 * under whichever course sorts first would be a quiet, hard-to-spot mistake.
 */
export async function resolveCourse(db: SchoolDb, slug: string | undefined): Promise<Course> {
  if (slug) {
    const course = await repository.findBySlug(db, slug)
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

  if (courses.length === 0) {
    throw unprocessable('this school has no courses yet')
  }

  throw unprocessable('this school has several courses — say which with the x-course-slug header')
}
