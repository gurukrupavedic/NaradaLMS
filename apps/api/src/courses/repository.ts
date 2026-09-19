import type { SchoolDb } from '@narada/db'

import type { Course } from './schema'

export async function findAll(db: SchoolDb): Promise<Course[]> {
  return db.query.course.findMany({ orderBy: (t, { asc }) => asc(t.slug) })
}

export async function findBySlug(db: SchoolDb, slug: string): Promise<Course | undefined> {
  return db.query.course.findFirst({ where: (t, { eq }) => eq(t.slug, slug) })
}
