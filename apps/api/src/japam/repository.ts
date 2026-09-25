import { and, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'

import { japamLog, profile, type SchoolDb } from '@narada/db'

import type { FindJapamQuery, JapamDay } from './schema'

/**
 * The profile's time zone, if it's a profile the caller may log for. `ownerUserId` is
 * `null` for a school admin (any active profile) and the caller's own user id otherwise, so someone
 * else's profile matches nothing — the same ownership predicate `profiles/repository.ts::update`
 * uses. A deactivated profile matches nothing either: its log is history, not something to add to.
 */
export async function findLoggableProfile(
  db: SchoolDb,
  profileId: string,
  ownerUserId: string | null,
): Promise<{ countryTimeZone: string | null } | undefined> {
  const rows = await db
    .select({ countryTimeZone: profile.countryTimeZone })
    .from(profile)
    .where(
      and(
        eq(profile.id, profileId),
        isNull(profile.deletedAt),
        ownerUserId ? eq(profile.userId, ownerUserId) : undefined,
      ),
    )
  return rows.at(0)
}

/**
 * Adds `count` to the day, creating it if need be — one atomic statement, so concurrent logs
 * (two devices, a student and an admin) each land rather than the later one overwriting the
 * earlier. `updatedAt` is set by hand: an `ON CONFLICT DO UPDATE` bypasses the column's
 * `$onUpdateFn`. Throws the `japamLog_count_valid` violation if that takes the day past its cap.
 */
export async function addToDay(
  db: SchoolDb,
  profileId: string,
  loggedOn: string,
  count: number,
): Promise<JapamDay> {
  const rows = await db
    .insert(japamLog)
    .values({ profileId, loggedOn, count })
    .onConflictDoUpdate({
      target: [japamLog.profileId, japamLog.loggedOn],
      set: { count: sql`${japamLog.count} + ${count}`, updatedAt: new Date() },
    })
    .returning({ loggedOn: japamLog.loggedOn, count: japamLog.count })
  return rows[0]!
}

/** Sets the day's total outright (a correction). 0 removes the row: no row means nothing logged. */
export async function setDay(
  db: SchoolDb,
  profileId: string,
  loggedOn: string,
  count: number,
): Promise<JapamDay> {
  if (count === 0) {
    await db
      .delete(japamLog)
      .where(and(eq(japamLog.profileId, profileId), eq(japamLog.loggedOn, loggedOn)))
    return { loggedOn, count: 0 }
  }

  const rows = await db
    .insert(japamLog)
    .values({ profileId, loggedOn, count })
    .onConflictDoUpdate({
      target: [japamLog.profileId, japamLog.loggedOn],
      set: { count, updatedAt: new Date() },
    })
    .returning({ loggedOn: japamLog.loggedOn, count: japamLog.count })
  return rows[0]!
}

/** The days in the window (newest first), their sum, and the profile's lifetime sum. */
export async function summarize(
  db: SchoolDb,
  profileId: string,
  { from, to }: FindJapamQuery,
): Promise<{ total: number; lifetime: number; days: JapamDay[] }> {
  const conditions: SQL[] = [eq(japamLog.profileId, profileId)]
  if (from) conditions.push(gte(japamLog.loggedOn, from))
  if (to) conditions.push(lte(japamLog.loggedOn, to))

  const days = await db
    .select({ loggedOn: japamLog.loggedOn, count: japamLog.count })
    .from(japamLog)
    .where(and(...conditions))
    .orderBy(desc(japamLog.loggedOn))

  // `sum` of an integer column comes back as a bigint, which node-postgres hands over as a string.
  const [everything] = await db
    .select({ lifetime: sql<string>`coalesce(sum(${japamLog.count}), 0)` })
    .from(japamLog)
    .where(eq(japamLog.profileId, profileId))

  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    lifetime: Number(everything?.lifetime ?? 0),
    days,
  }
}
