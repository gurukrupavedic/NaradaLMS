import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { enrollment, profile, type SchoolDbExecutor, type SchoolProfile } from '@narada/db'
import { forbidden, internalError, notFound } from '../error'
import { requireNonEmpty } from '../utils/validate'

export type { SchoolProfile } from '@narada/db'

export const createProfileSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  city: z.string().optional(),
})

export const searchProfilesQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  excludeBatchId: z.uuid().optional(),
})

export type SearchProfilesQuery = z.infer<typeof searchProfilesQuerySchema>

const SEARCH_LIMIT = 25

// Backs the admin "enroll a student" search — there was previously no way to list/search
// profiles across the whole school at all (findProfilesByUser is scoped to one user's own
// profiles, for the login profile-picker). excludeBatchId filters out students already
// enrolled in the batch being searched for, at the query level so LIMIT stays meaningful.
export async function searchProfiles(
  db: SchoolDbExecutor,
  options: SearchProfilesQuery,
): Promise<SchoolProfile[]> {
  const alreadyEnrolled = options.excludeBatchId
    ? db
        .select({ id: enrollment.profileId })
        .from(enrollment)
        .where(eq(enrollment.batchId, options.excludeBatchId))
    : null

  return db.query.profile.findMany({
    where: (t, { ilike, and, notInArray }) => {
      const conditions = []
      if (options.query) conditions.push(ilike(t.name, `%${options.query}%`))
      if (alreadyEnrolled) conditions.push(notInArray(t.id, alreadyEnrolled))
      return conditions.length > 0 ? and(...conditions) : undefined
    },
    orderBy: (t, { asc }) => asc(t.name),
    limit: SEARCH_LIMIT,
  })
}

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
