import { and, asc, eq, exists, inArray } from 'drizzle-orm'

import { enrollment, profile, track, trackTa, type SchoolDb } from '@narada/db'

import type { TrackTa, TrackTaCandidate } from './schema'

// What a listed TA exposes to students — shared by the list and the insert's return value.
const TA_COLUMNS = {
  trackId: trackTa.trackId,
  profileId: trackTa.profileId,
  name: profile.name,
  phone: profile.phone,
  country: profile.country,
  countryTimeZone: profile.countryTimeZone,
}

// "Currently a TA" — a live TA seat in some batch of the course. A TA who has stepped down (or
// whose seat went inactive) drops off the list without the row needing cleanup.
function activeTaOf(courseId: string) {
  return and(
    eq(enrollment.courseId, courseId),
    eq(enrollment.role, 'ta'),
    eq(enrollment.status, 'active'),
  )
}

/** Every listed TA across the course's tracks, still holding an active TA seat, by name. */
export async function findAllInCourse(db: SchoolDb, courseId: string): Promise<TrackTa[]> {
  return db
    .select(TA_COLUMNS)
    .from(trackTa)
    .innerJoin(track, eq(track.id, trackTa.trackId))
    .innerJoin(profile, eq(profile.id, trackTa.profileId))
    .where(
      and(
        eq(track.courseId, courseId),
        exists(
          db
            .select({ one: enrollment.profileId })
            .from(enrollment)
            .where(and(eq(enrollment.profileId, trackTa.profileId), activeTaOf(courseId))),
        ),
      ),
    )
    .orderBy(asc(profile.name), asc(profile.id))
}

/** The course's active TAs (distinct), by name — the pool a track's list is drawn from. */
export async function findActiveTas(db: SchoolDb, courseId: string): Promise<TrackTaCandidate[]> {
  const rows = await db
    .select({
      profileId: profile.id,
      name: profile.name,
      country: profile.country,
      countryTimeZone: profile.countryTimeZone,
    })
    .from(enrollment)
    .innerJoin(profile, eq(profile.id, enrollment.profileId))
    .where(activeTaOf(courseId))
    .groupBy(profile.id, profile.name, profile.country, profile.countryTimeZone)
    .orderBy(asc(profile.name), asc(profile.id))
  return rows
}

export async function isActiveTa(db: SchoolDb, courseId: string, profileId: string): Promise<boolean> {
  const rows = await db
    .select({ one: enrollment.profileId })
    .from(enrollment)
    .where(and(eq(enrollment.profileId, profileId), activeTaOf(courseId)))
    .limit(1)
  return rows.length > 0
}

export async function findListedProfileIds(db: SchoolDb, trackId: string): Promise<string[]> {
  const rows = await db
    .select({ profileId: trackTa.profileId })
    .from(trackTa)
    .where(eq(trackTa.trackId, trackId))
  return rows.map(row => row.profileId)
}

export async function insert(db: SchoolDb, trackId: string, profileId: string): Promise<TrackTa | undefined> {
  await db.insert(trackTa).values({ trackId, profileId })
  const rows = await db
    .select(TA_COLUMNS)
    .from(trackTa)
    .innerJoin(profile, eq(profile.id, trackTa.profileId))
    .where(and(eq(trackTa.trackId, trackId), inArray(trackTa.profileId, [profileId])))
  return rows.at(0)
}

/** Whether a row was actually removed — the service turns `false` into a 404. */
export async function remove(db: SchoolDb, trackId: string, profileId: string): Promise<boolean> {
  const rows = await db
    .delete(trackTa)
    .where(and(eq(trackTa.trackId, trackId), eq(trackTa.profileId, profileId)))
    .returning({ profileId: trackTa.profileId })
  return rows.length > 0
}
