import type { SchoolDb } from '@narada/db'

import { notFound, unprocessable } from '../error'
import * as repository from './repository'
import type { Course } from './schema'

/**
 * The course a request is *about*, for reads — from the `x-course-slug` header the web proxy stamps
 * from the hostname (`vedam.slmts.naradas.app`). Unlike {@link resolveCourse} this never guesses:
 * no header means "no course context" and the read stays school-wide, which is what keeps every
 * caller that doesn't send one (an API client, a hostname outside the scheme) working exactly as
 * before. A header naming a course that doesn't exist is a 404, so a mistyped subdomain fails
 * loudly instead of quietly showing an empty school.
 *
 * Hostnames are case-insensitive, so the slug is compared lower-cased.
 */
export async function findRequestCourse(
  db: SchoolDb,
  slug: string | undefined,
): Promise<Course | undefined> {
  if (!slug) {
    return undefined
  }

  const course = await repository.findBySlug(db, slug.toLowerCase())
  if (!course) {
    throw notFound('course not found')
  }

  return course
}

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
    const course = await findRequestCourse(db, slug)
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
