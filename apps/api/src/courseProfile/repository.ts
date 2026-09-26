import { and, eq, sql } from 'drizzle-orm'

import { courseProfile, profile, type SchoolDb } from '@narada/db'

import type { CourseProfile } from './schema'

/**
 * The profile, if it's one the caller may write to. `ownerUserId` is `null` for a school admin (any
 * profile) and the caller's own user id otherwise, so someone else's profile matches nothing —
 * the same ownership predicate `profiles/repository.ts::update` uses.
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
      and(eq(profile.id, profileId), ownerUserId ? eq(profile.userId, ownerUserId) : undefined),
    )
  return rows.at(0)
}

const courseProfileColumns = {
  learningGoal: courseProfile.learningGoal,
  currentProficiency: courseProfile.currentProficiency,
  comments: courseProfile.comments,
  details: courseProfile.details,
}

const forCourse = (profileId: string, courseId: string) =>
  and(eq(courseProfile.profileId, profileId), eq(courseProfile.courseId, courseId))

/** The profile's record in the course, or `undefined` for one with no row there yet. */
export async function find(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<CourseProfile | undefined> {
  const rows = await db
    .select(courseProfileColumns)
    .from(courseProfile)
    .where(forCourse(profileId, courseId))
  return rows.at(0)
}

/**
 * Creates the row if it isn't there (a student an admin put on a roster has none), then returns it,
 * row-locked for `service.ts::updateCourseProfile`'s transaction — an edit is a
 * read-merge-validate-write, so two concurrent edits must queue rather than each merge onto the same
 * stale copy and one silently undo the other. The relational query API has no `FOR UPDATE`, so this
 * uses the plain query builder, like `profiles/repository.ts::findDetailsForUpdate`.
 */
export async function lock(
  db: SchoolDb,
  profileId: string,
  courseId: string,
): Promise<CourseProfile> {
  await db.insert(courseProfile).values({ profileId, courseId }).onConflictDoNothing()
  const rows = await db
    .select(courseProfileColumns)
    .from(courseProfile)
    .where(forCourse(profileId, courseId))
    .for('update')
  return rows[0]!
}

/** Writes the given fields (`details` whole — the service has already merged and validated it). */
export async function update(
  db: SchoolDb,
  profileId: string,
  courseId: string,
  values: Partial<CourseProfile>,
): Promise<CourseProfile> {
  const rows = await db
    .update(courseProfile)
    .set(values)
    .where(forCourse(profileId, courseId))
    .returning(courseProfileColumns)
  return rows[0]!
}

/** Creates the row for a newly approved student. Idempotent, so a retried approval doesn't fail. */
export async function insert(
  db: SchoolDb,
  values: { profileId: string; courseId: string } & Partial<CourseProfile>,
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
