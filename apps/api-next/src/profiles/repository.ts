import { and, eq } from 'drizzle-orm'

import { profile, type PublicDb, type SchoolDb } from '@narada/db'

import type { CreateProfileData, Profile, UpdateProfileData } from './schema'

export async function findByUserId(db: SchoolDb, userId: string): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
  })
}

/** Public-schema lookup: does `userId` have any organization membership at all? */
export async function findMembership(
  db: PublicDb,
  organizationId: string,
  userId: string,
): Promise<{ id: string } | undefined> {
  return db.query.member.findFirst({
    where: (t, { and, eq }) => and(eq(t.organizationId, organizationId), eq(t.userId, userId)),
    columns: { id: true },
  })
}

export async function insert(
  db: SchoolDb,
  values: CreateProfileData & { userId: string; phone: string | null; city: string | null },
): Promise<Profile | undefined> {
  const rows = await db.insert(profile).values(values).returning()
  return rows.at(0)
}

/** The `userId` predicate enforces ownership in SQL; a foreign-owned profile matches zero rows rather than being fetched and checked afterward. */
export async function updateOwned(
  db: SchoolDb,
  id: string,
  userId: string,
  data: UpdateProfileData,
): Promise<Profile | undefined> {
  const rows = await db
    .update(profile)
    .set(data)
    .where(and(eq(profile.id, id), eq(profile.userId, userId)))
    .returning()

  return rows.at(0)
}

/** Same ownership predicate as {@link updateOwned}; an empty result means either a missing or a foreign-owned profile. */
export async function deleteOwned(
  db: SchoolDb,
  id: string,
  userId: string,
): Promise<{ id: string }[]> {
  return db
    .delete(profile)
    .where(and(eq(profile.id, id), eq(profile.userId, userId)))
    .returning({ id: profile.id })
}
