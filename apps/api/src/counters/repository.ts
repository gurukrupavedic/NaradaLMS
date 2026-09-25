import { and, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'

import { counterLog, profile, type SchoolDb } from '@narada/db'

import type { CounterDay, FindCounterQuery } from './schema'

/** Which counter a row belongs to: one profile's one counter in one course. */
export type CounterScope = { profileId: string; courseId: string; counterKey: string }

const inScope = (scope: CounterScope) =>
  and(
    eq(counterLog.profileId, scope.profileId),
    eq(counterLog.courseId, scope.courseId),
    eq(counterLog.counterKey, scope.counterKey),
  )

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
 * `$onUpdateFn`. Throws the `counterLog_count_valid` violation if that takes the day past its cap.
 */
export async function addToDay(
  db: SchoolDb,
  scope: CounterScope,
  loggedOn: string,
  count: number,
): Promise<CounterDay> {
  const rows = await db
    .insert(counterLog)
    .values({ ...scope, loggedOn, count })
    .onConflictDoUpdate({
      target: [
        counterLog.profileId,
        counterLog.courseId,
        counterLog.counterKey,
        counterLog.loggedOn,
      ],
      set: { count: sql`${counterLog.count} + ${count}`, updatedAt: new Date() },
    })
    .returning({ loggedOn: counterLog.loggedOn, count: counterLog.count })
  return rows[0]!
}

/** Sets the day's total outright (a correction). 0 removes the row: no row means nothing logged. */
export async function setDay(
  db: SchoolDb,
  scope: CounterScope,
  loggedOn: string,
  count: number,
): Promise<CounterDay> {
  if (count === 0) {
    await db.delete(counterLog).where(and(inScope(scope), eq(counterLog.loggedOn, loggedOn)))
    return { loggedOn, count: 0 }
  }

  const rows = await db
    .insert(counterLog)
    .values({ ...scope, loggedOn, count })
    .onConflictDoUpdate({
      target: [
        counterLog.profileId,
        counterLog.courseId,
        counterLog.counterKey,
        counterLog.loggedOn,
      ],
      set: { count, updatedAt: new Date() },
    })
    .returning({ loggedOn: counterLog.loggedOn, count: counterLog.count })
  return rows[0]!
}

/** The days in the window (newest first), their sum, and the counter's lifetime sum. */
export async function summarize(
  db: SchoolDb,
  scope: CounterScope,
  { from, to }: FindCounterQuery,
): Promise<{ total: number; lifetime: number; days: CounterDay[] }> {
  const conditions: SQL[] = []
  if (from) conditions.push(gte(counterLog.loggedOn, from))
  if (to) conditions.push(lte(counterLog.loggedOn, to))

  const days = await db
    .select({ loggedOn: counterLog.loggedOn, count: counterLog.count })
    .from(counterLog)
    .where(and(inScope(scope), ...conditions))
    .orderBy(desc(counterLog.loggedOn))

  // `sum` of an integer column comes back as a bigint, which node-postgres hands over as a string.
  const [everything] = await db
    .select({ lifetime: sql<string>`coalesce(sum(${counterLog.count}), 0)` })
    .from(counterLog)
    .where(inScope(scope))

  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    lifetime: Number(everything?.lifetime ?? 0),
    days,
  }
}
