import { JAPAM_DAILY_MAX, type SchoolDbClient } from '@narada/db'
import { schoolHasFeature } from '@narada/profile-fields'

import { notFound, orNotFound, unprocessable } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { todayIn } from '../utils/calendarDate'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type { FindJapamQuery, JapamDay, JapamSummary } from './schema'

type JapamServiceContext = { db: SchoolDbClient; school: { slug: string } }
type JapamWriteContext = JapamServiceContext & { user: User; access: AccessPolicy }

/** Japam is a per-school feature (`@narada/profile-fields`): for a school without it there is no
 * such resource, so it 404s rather than 403s — RR's students have nothing to be forbidden from. */
function requireJapam(context: JapamServiceContext): void {
  if (!schoolHasFeature(context.school.slug, 'japam')) {
    throw notFound()
  }
}

/**
 * Viewing is gated by the route (`access.requireCanViewProfile`); this only needs the profile to
 * exist, for its time zone. `today` comes back with the numbers because it is the student's today,
 * which the client can't work out from its own clock.
 */
export async function summary(
  context: JapamServiceContext,
  profileId: string,
  query: FindJapamQuery,
): Promise<JapamSummary> {
  requireJapam(context)
  const target = orNotFound(await repository.findLoggableProfile(context.db, profileId, null))

  return {
    today: todayIn(target.countryTimeZone),
    ...(await repository.summarize(context.db, profileId, query)),
  }
}

/**
 * Who may write: the profile's own owner, or a school admin for anyone's — the same split as
 * `profiles/service.ts::updateProfile`, enforced by the same ownership predicate in SQL, so someone
 * else's profile 404s exactly as a missing one does. Returns the profile's time zone.
 */
async function requireWritable(context: JapamWriteContext, profileId: string) {
  requireJapam(context)
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  return orNotFound(await repository.findLoggableProfile(context.db, profileId, ownerUserId))
}

const CAP_EXCEEDED = () => unprocessable(`a day's japam can't exceed ${JAPAM_DAILY_MAX}`)

/** Adds to a day — today (the student's) unless a past `loggedOn` is given. */
export async function log(
  context: JapamWriteContext,
  profileId: string,
  data: { count: number; loggedOn?: string },
): Promise<JapamDay> {
  const target = await requireWritable(context, profileId)
  const today = todayIn(target.countryTimeZone)
  const loggedOn = data.loggedOn ?? today
  if (loggedOn > today) {
    throw unprocessable('japam can’t be logged for a future date')
  }

  return withConstraintMapping(
    () => repository.addToDay(context.db, profileId, loggedOn, data.count),
    { [DbConstraint.japamLogCountValid]: CAP_EXCEEDED },
  )
}

/** Sets a day's total outright — how a miscount is corrected. */
export async function setDay(
  context: JapamWriteContext,
  profileId: string,
  loggedOn: string,
  count: number,
): Promise<JapamDay> {
  const target = await requireWritable(context, profileId)
  if (loggedOn > todayIn(target.countryTimeZone)) {
    throw unprocessable('japam can’t be logged for a future date')
  }

  return withConstraintMapping(() => repository.setDay(context.db, profileId, loggedOn, count), {
    [DbConstraint.japamLogCountValid]: CAP_EXCEEDED,
  })
}
