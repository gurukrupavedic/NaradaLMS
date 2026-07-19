import { and, eq } from 'drizzle-orm'

import { profile, publicDb, type organization, type SchoolDbExecutor } from '@narada/db'

import { forbidden, internalError, notFound } from '../error'
import type { User } from '../session'
import type { CreateProfileData, Profile, UpdateProfileData } from './schema'

type School = typeof organization.$inferSelect

export async function findByUserId(userId: string, db: SchoolDbExecutor): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
  })
}

export async function createProfile(
  school: School,
  user: User,
  data: CreateProfileData,
  db: SchoolDbExecutor,
): Promise<Profile> {
  if (!user.isSuperAdmin) {
    const membership = await publicDb.query.member.findFirst({
      where: (t, { and, eq }) => and(eq(t.organizationId, school.id), eq(t.userId, user.id)),
      columns: { id: true },
    })

    if (!membership) {
      throw forbidden()
    }
  }

  const rows = await db
    .insert(profile)
    .values({ userId: user.id, phone: null, city: null, ...data })
    .returning()

  const row = rows.at(0)
  if (!row) {
    throw internalError()
  }

  return row
}

export async function updateProfile(
  id: string,
  userId: string,
  data: UpdateProfileData,
  db: SchoolDbExecutor,
): Promise<Profile> {
  const rows = await db
    .update(profile)
    .set(data)
    .where(and(eq(profile.id, id), eq(profile.userId, userId)))
    .returning()

  const row = rows.at(0)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function deleteById(id: string, userId: string, db: SchoolDbExecutor): Promise<void> {
  const rows = await db
    .delete(profile)
    .where(and(eq(profile.id, id), eq(profile.userId, userId)))
    .returning({ id: profile.id })

  if (rows.length === 0) {
    throw notFound()
  }
}
