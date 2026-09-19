import { eq, inArray, or } from 'drizzle-orm'

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

export async function findBySlug(db: SchoolDb, slug: string): Promise<Course | undefined> {
  return db.query.course.findFirst({ where: (t, { eq }) => eq(t.slug, slug) })
}
