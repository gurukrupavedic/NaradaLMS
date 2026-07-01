import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { profile, type SchoolDbExecutor, type SchoolProfile } from '@narada/db'
import { forbidden, internalError, notFound } from '../error'
import { requireNonEmpty } from '../utils/validate'

export type { SchoolProfile } from '@narada/db'

export const createProfileSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  city: z.string().optional(),
})

export const updateProfileSchema = requireNonEmpty(
  z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
  }),
)

export type CreateProfileData = z.infer<typeof createProfileSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>

export async function findProfileById(
  db: SchoolDbExecutor,
  profileId: string,
): Promise<SchoolProfile | undefined> {
  return db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
  })
}

export async function findProfilesByUser(
  db: SchoolDbExecutor,
  userId: string,
): Promise<SchoolProfile[]> {
  return db.query.profile.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
  })
}

export async function createProfile(
  db: SchoolDbExecutor,
  userId: string,
  data: CreateProfileData,
): Promise<SchoolProfile> {
  const rows = await db
    .insert(profile)
    .values({ userId, ...data })
    .returning()

  const row = rows.at(0)
  if (!row) {
    throw internalError()
  }

  return row
}

export async function updateProfile(
  db: SchoolDbExecutor,
  profileId: string,
  userId: string,
  data: UpdateProfileData,
): Promise<SchoolProfile> {
  const existing = await findProfileById(db, profileId)
  if (!existing) {
    throw notFound()
  }

  if (existing.userId !== userId) {
    throw forbidden()
  }

  const rows = await db.update(profile).set(data).where(eq(profile.id, profileId)).returning()
  const row = rows.at(0)
  if (!row) {
    throw internalError()
  }

  return row
}

export async function deleteProfile(
  db: SchoolDbExecutor,
  profileId: string,
  userId: string,
): Promise<void> {
  const existing = await findProfileById(db, profileId)
  if (!existing) {
    throw notFound()
  }

  if (existing.userId !== userId) {
    throw forbidden()
  }

  await db.delete(profile).where(eq(profile.id, profileId))
}
