import { and, eq, inArray, or } from 'drizzle-orm'

import { course, enrollment, registration, type SchoolDb } from '@narada/db'

import type { Course } from './schema'

export async function findAll(db: SchoolDb): Promise<Course[]> {
  return db.query.course.findMany({ orderBy: (t, { asc }) => asc(t.slug) })
}

/**
 * The courses a profile is part of: any course it has an enrollment in (whatever the status — a
 * student who finished their batch still has their record there), plus the course of the
 * registration that created it. That second source matters: a newly approved applicant has a profile
 * but no batch yet, and the course they applied to is where they go to find one.
 */
export async function findForProfile(db: SchoolDb, profileId: string): Promise<Course[]> {
  return db
    .select({ id: course.id, slug: course.slug, name: course.name })
    .from(course)
    .where(
      or(
        inArray(
          course.id,
          db
            .select({ id: enrollment.courseId })
            .from(enrollment)
            .where(eq(enrollment.profileId, profileId)),
        ),
        inArray(
          course.id,
          db
            .select({ id: registration.courseId })
            .from(registration)
            .where(eq(registration.convertedProfileId, profileId)),
        ),
      ),
    )
    .orderBy(course.slug)
}

/**
 * Whether a profile is part of one course — the same two relationships as {@link findForProfile}
 * (an enrollment in it, whatever the status; or the registration that created the profile), asked as
 * a yes/no for a single course. Kept beside `findForProfile` so the dropdown and the content gate can
 * never disagree about what "part of a course" means; a test holds them to it.
 */
export async function isProfilePartOfCourse(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<boolean> {
  const [enrolled, registered] = await Promise.all([
    db
      .select({ batchId: enrollment.batchId })
      .from(enrollment)
      .where(and(eq(enrollment.profileId, profileId), eq(enrollment.courseId, courseId)))
      .limit(1),
    db
      .select({ id: registration.id })
      .from(registration)
      .where(and(eq(registration.convertedProfileId, profileId), eq(registration.courseId, courseId)))
      .limit(1),
  ])

  return enrolled.length > 0 || registered.length > 0
}

export async function findBySlug(db: SchoolDb, slug: string): Promise<Course | undefined> {
  return db.query.course.findFirst({ where: (t, { eq }) => eq(t.slug, slug) })
}
