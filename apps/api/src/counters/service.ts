import { COUNTER_DAILY_MAX, type SchoolDbClient } from '@narada/db'
import { counterFieldFor } from '@narada/profile-fields'

import { notFound, orNotFound, unprocessable } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { todayIn } from '../utils/calendarDate'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
import * as repository from './repository'
import type { CounterDay, CounterSummary, FindCounterQuery } from './schema'

/** `course` is the one the request names (`X-Course-Slug`): a counter belongs to a course. */
type CounterServiceContext = {
  db: SchoolDbClient
  school: { slug: string }
  course: { id: string; slug: string }
}
type CounterWriteContext = CounterServiceContext & { user: User; access: AccessPolicy }

/**
 * Which counters exist is declared per school *and course* (`@narada/profile-fields`). One the
 * course doesn't keep is no such resource, so it 404s rather than 403s — a student in a course
 * without japam has nothing to be forbidden from.
 */
function requireCounter(
  context: CounterServiceContext,
  key: string,
): repository.CounterScope['counterKey'] {
  if (!counterFieldFor(context.school.slug, context.course.slug, key)) {
    throw notFound()
  }

  return key
}

const scopeOf = (
  context: CounterServiceContext,
  profileId: string,
  key: string,
): repository.CounterScope => ({
  profileId,
  courseId: context.course.id,
  counterKey: requireCounter(context, key),
})

/**
 * Viewing is gated by the route (`access.requireCanViewProfile`); this only needs the profile to
 * exist, for its time zone. `today` comes back with the numbers because it is the student's today,
 * which the client can't work out from its own clock.
 */
export async function summary(
  context: CounterServiceContext,
  profileId: string,
  key: string,
  query: FindCounterQuery,
): Promise<CounterSummary> {
  const scope = scopeOf(context, profileId, key)
  const target = orNotFound(await repository.findLoggableProfile(context.db, profileId, null))

  return {
    today: todayIn(target.countryTimeZone),
    ...(await repository.summarize(context.db, scope, query)),
  }
}

/**
 * Who may write: the profile's own owner, or a school admin for anyone's — the same split as
 * `profiles/service.ts::updateProfile`, enforced by the same ownership predicate in SQL, so someone
 * else's profile 404s exactly as a missing one does. Returns the scope to write to and the
 * profile's time zone.
 */
async function requireWritable(context: CounterWriteContext, profileId: string, key: string) {
  const scope = scopeOf(context, profileId, key)
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  const target = orNotFound(
    await repository.findLoggableProfile(context.db, profileId, ownerUserId),
  )
  return { scope, target }
}

const CAP_EXCEEDED = () => unprocessable(`a day's count can't exceed ${COUNTER_DAILY_MAX}`)
const FUTURE_DAY = () => unprocessable('a future day can’t be logged')

/** Adds to a day — today (the student's) unless a past `loggedOn` is given. */
export async function log(
  context: CounterWriteContext,
  profileId: string,
  key: string,
  data: { count: number; loggedOn?: string },
): Promise<CounterDay> {
  const { scope, target } = await requireWritable(context, profileId, key)
  const today = todayIn(target.countryTimeZone)
  const loggedOn = data.loggedOn ?? today
  if (loggedOn > today) {
    throw FUTURE_DAY()
  }

  return withConstraintMapping(() => repository.addToDay(context.db, scope, loggedOn, data.count), {
    [DbConstraint.counterLogCountValid]: CAP_EXCEEDED,
  })
}

/** Sets a day's total outright — how a miscount is corrected. */
export async function setDay(
  context: CounterWriteContext,
  profileId: string,
  key: string,
  loggedOn: string,
  count: number,
): Promise<CounterDay> {
  const { scope, target } = await requireWritable(context, profileId, key)
  if (loggedOn > todayIn(target.countryTimeZone)) {
    throw FUTURE_DAY()
  }

  return withConstraintMapping(() => repository.setDay(context.db, scope, loggedOn, count), {
    [DbConstraint.counterLogCountValid]: CAP_EXCEEDED,
  })
}
