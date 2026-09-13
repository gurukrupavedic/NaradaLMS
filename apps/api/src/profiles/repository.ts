import { and, eq, isNull, notInArray } from 'drizzle-orm'

import { enrollment, profile, type PublicDb, type SchoolDb } from '@narada/db'

import type { CreateProfileData, Profile, SearchProfilesQuery, UpdateProfileData } from './schema'

const SEARCH_LIMIT = 25

/**
 * Explicit projection matching `Profile` exactly. `profile.deletedAt` is an internal lifecycle
 * column (DD-011) and is deliberately never returned to API consumers, which serialize these
 * rows directly.
 */
const profileColumns = {
  id: profile.id,
  userId: profile.userId,
  name: profile.name,
  phone: profile.phone,
  city: profile.city,
  updatedAt: profile.updatedAt,
  createdAt: profile.createdAt,
}

/** Lists only active profiles; a soft-deleted profile (DD-011) is invisible to its own owner. */
export async function findByUserId(db: SchoolDb, userId: string): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { and, eq, isNull }) => and(eq(t.userId, userId), isNull(t.deletedAt)),
    columns: { deletedAt: false },
  })
}

export async function findById(db: SchoolDb, id: string): Promise<Profile | undefined> {
  return db.query.profile.findFirst({
    where: (t, { and, eq, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
    columns: { deletedAt: false },
  })
}

/**
 * Backs the admin "enroll a student" search — the only reason to search across every profile in
 * the school rather than just one's own (`findByUserId`). `excludeBatchId` filters out profiles
 * already enrolled in that batch at the query level, so `SEARCH_LIMIT` still returns useful
 * candidates rather than being eaten by already-enrolled matches.
 */
export async function search(db: SchoolDb, options: SearchProfilesQuery): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { and, ilike, isNull: isNullCol }) => {
      const conditions = [isNullCol(t.deletedAt)]
      if (options.query) {
        conditions.push(ilike(t.name, `%${options.query}%`))
      }

      if (options.excludeBatchId) {
        conditions.push(
          notInArray(
            t.id,
            db
              .select({ profileId: enrollment.profileId })
              .from(enrollment)
              .where(eq(enrollment.batchId, options.excludeBatchId)),
          ),
        )
      }

      return and(...conditions)
    },
    orderBy: (t, { asc }) => asc(t.name),
    limit: SEARCH_LIMIT,
    columns: { deletedAt: false },
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
  const rows = await db.insert(profile).values(values).returning(profileColumns)
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
    .returning(profileColumns)

  return rows.at(0)
}

/**
 * Deactivates an owned profile (DD-011): stamps `deletedAt` only. Every other column — name,
 * phone, city — and every `enrollment`/`exam`/`evaluation` row referencing this profile stay
 * exactly as they were, so historical queries ("which batches was this user in", "what did they
 * score there") keep working after deactivation. The `deletedAt IS NULL` predicate makes a
 * repeat call match zero rows, so the service's 404 covers missing, foreign-owned, and
 * already-deactivated alike.
 */
export async function softDeleteOwned(
  db: SchoolDb,
  id: string,
  userId: string,
): Promise<{ id: string }[]> {
  return db
    .update(profile)
    .set({ deletedAt: new Date() })
    .where(and(eq(profile.id, id), eq(profile.userId, userId), isNull(profile.deletedAt)))
    .returning({ id: profile.id })
}

/**
 * Admin-deactivation (DD-011 §9): identical to `softDeleteOwned` minus the `userId` predicate,
 * since here the actor is a school admin acting on someone else's profile, not the owner. The
 * `deletedAt IS NULL` predicate keeps the same idempotent-safe contract — a repeat call or an
 * unknown id both match zero rows.
 */
export async function softDeleteById(db: SchoolDb, id: string): Promise<{ id: string }[]> {
  return db
    .update(profile)
    .set({ deletedAt: new Date() })
    .where(and(eq(profile.id, id), isNull(profile.deletedAt)))
    .returning({ id: profile.id })
}
