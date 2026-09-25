import { and, eq, isNull, sql } from 'drizzle-orm'

import { courseProfile, profile, type SchoolDb } from '@narada/db'
import type { Details } from '@narada/profile-fields'

/**
 * The profile, if it's one the caller may write to. `ownerUserId` is `null` for a school admin (any
 * active profile) and the caller's own user id otherwise, so someone else's profile matches nothing —
 * the same ownership predicate `profiles/repository.ts::update` uses. A deactivated profile matches
 * nothing either: an edit can't revive one.
 */
export async function findWritableProfile(
  db: SchoolDb,
  profileId: string,
  ownerUserId: string | null,
): Promise<{ id: string } | undefined> {
  const rows = await db
    .select({ id: profile.id })
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

/** The course-level details, or `undefined` for a profile with no course-level row yet. */
export async function findDetails(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<Details | undefined> {
  const rows = await db
    .select({ details: courseProfile.details })
    .from(courseProfile)
    .where(and(eq(courseProfile.profileId, profileId), eq(courseProfile.courseId, courseId)))
  return rows.at(0)?.details
}

/**
 * Creates the row if it isn't there (a student an admin put on a roster has none), then returns its
 * details, row-locked for `service.ts::updateDetails`'s transaction — an edit is a
 * read-merge-validate-write, so two concurrent edits must queue rather than each merge onto the same
 * stale copy and one silently undo the other. The relational query API has no `FOR UPDATE`, so this
 * uses the plain query builder, like `profiles/repository.ts::findDetailsForUpdate`.
 */
export async function lockDetails(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<Details> {
  await db.insert(courseProfile).values({ profileId, courseId }).onConflictDoNothing()
  const rows = await db
    .select({ details: courseProfile.details })
    .from(courseProfile)
    .where(and(eq(courseProfile.profileId, profileId), eq(courseProfile.courseId, courseId)))
    .for('update')
  return rows[0]!.details
}

export async function replaceDetails(
  db: SchoolDb,
  profileId: string,
  courseId: string,
  details: Details,
): Promise<Details> {
  const rows = await db
    .update(courseProfile)
    .set({ details })
    .where(and(eq(courseProfile.profileId, profileId), eq(courseProfile.courseId, courseId)))
    .returning({ details: courseProfile.details })
  return rows[0]!.details
}

/** Creates the row for a newly approved student. Idempotent, so a retried approval doesn't fail. */
export async function insert(
  db: SchoolDb,
  values: { profileId: string; courseId: string; details: Details },
): Promise<void> {
  await db.insert(courseProfile).values(values).onConflictDoNothing()
}

/**
 * Adds `count` to the counter under `key`, creating the row and the key if need be — one atomic
 * statement (`jsonb_set` on the value it reads in the same `UPDATE`), so concurrent adds (two
 * devices, a student and an admin) each land rather than the later one overwriting the earlier.
 * Returns the new total, or `undefined` when that would take it past `max` (the row is left as it was).
 */
export async function addToCounter(
  db: SchoolDb,
  profileId: string,
  courseId: string,
  key: string,
  count: number,
  max: number,
): Promise<number | undefined> {
  const current = sql`coalesce((${courseProfile.details}->>${key})::bigint, 0)`
  const rows = await db
    .insert(courseProfile)
    .values({ profileId, courseId, details: { [key]: count } })
    .onConflictDoUpdate({
      target: [courseProfile.profileId, courseProfile.courseId],
      set: {
        details: sql`jsonb_set(${courseProfile.details}, ARRAY[${key}]::text[], to_jsonb(${current} + ${count}))`,
        updatedAt: new Date(),
      },
      setWhere: sql`${current} + ${count} <= ${max}`,
    })
    .returning({ total: sql<string>`(${courseProfile.details}->>${key})::bigint` })
  return rows.length > 0 ? Number(rows[0]!.total) : undefined
}
