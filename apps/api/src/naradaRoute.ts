import type { Request, RequestHandler, Response } from 'express'

import {
  getSchoolDb,
  publicDb,
  type organization,
  type PublicDbClient,
  type SchoolDb,
  type SchoolDbClient,
  type SchoolProfile,
} from '@narada/db'

import { resolveCourse } from './courses/service'
import type { Course } from './courses/schema'
import { badRequest, forbidden, notFound } from './error'
import { SessionService, type User } from './session'
import { AccessPolicy } from './utils/accessPolicy'

type School = typeof organization.$inferSelect

/**
 * Caches the in-flight school resolution per request so `resolveSchool` performs at most one
 * lookup per request, mirroring `SessionService`'s session cache.
 */
const schoolCache = new WeakMap<Request, Promise<{ db: SchoolDbClient; school: School }>>

/** Same idea for the course context: at most one lookup per request, and none at all for a handler that never asks. */
const courseCache = new WeakMap<Request, Promise<Course>>()

export type PublicRouteArgs = {
  req: Request
  res: Response
  db: PublicDbClient
}

export type AuthRouteArgs = PublicRouteArgs & {
  user: User
}

export type SchoolRouteArgs = {
  req: Request
  res: Response
  db: SchoolDbClient
  school: School
  /**
   * The course this request is about, from `x-course-slug` — a 400 when the request names none, a
   * 404 when it names one that doesn't exist (see `courses/service.ts::resolveCourse`). Lazy: a
   * handler that doesn't care never pays for the lookup.
   */
  getCourse: () => Promise<Course>
}

export type UserRouteArgs = SchoolRouteArgs & {
  user: User
}

export type OptionalProfileRouteArgs = UserRouteArgs & {
  access: AccessPolicy
  profile: SchoolProfile | undefined
}

export type ProfileRouteArgs = UserRouteArgs & {
  access: AccessPolicy
  profile: SchoolProfile
}

/** Wraps a handler that needs only the public database — no school header, no session. */
export function publicRoute(handler: (args: PublicRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    await handler({ req, res, db: publicDb })
  }
}

/**
 * Wraps a handler that requires an authenticated session but no school context — for the auth
 * bootstrap response (which schools does this user belong to?) that necessarily runs *before* a
 * school is selected, so `schoolRoute`/`userRoute` (both require `X-School-Slug`) don't fit.
 */
export function authRoute(handler: (args: AuthRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const user = await SessionService.getCurrentUser(req)
    await handler({ req, res, db: publicDb, user })
  }
}

/** Wraps a handler that requires a valid `X-School-Slug` but no authenticated session. */
export function schoolRoute(handler: (args: SchoolRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const { db, school } = await resolveSchool(req)
    await handler({ req, res, db, school, getCourse: () => resolveCourseContext(req, db) })
  }
}

/** Wraps a handler that requires a valid school and an authenticated user, but no active profile. */
export function userRoute(handler: (args: UserRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    requireSchoolSlug(req)
    const user = await SessionService.getCurrentUser(req)
    const { db, school } = await resolveSchool(req)

    await handler({ req, res, db, school, user, getCourse: () => resolveCourseContext(req, db) })
  }
}

/**
 * Wraps a handler that requires a valid school and authenticated user, and resolves the caller's
 * own active profile if `X-Profile-Id` is supplied — but does not require it. For school-wide
 * capabilities (batch list/create/schedule, exam list), a school
 * admin doesn't need an active profile at all; `AccessPolicy`'s own checks already handle
 * `profile: undefined` correctly (`isSchoolAdmin()` doesn't consult it), so this wrapper's only
 * job is to stop *forcing* one where none is needed.
 */
export function optionalProfileRoute(
  handler: (args: OptionalProfileRouteArgs) => Promise<void>,
): RequestHandler {
  return async (req, res) => {
    requireSchoolSlug(req)
    const user = await SessionService.getCurrentUser(req)
    const { db, school } = await resolveSchool(req)
    const profile = await resolveOptionalProfile(req, db, user)

    const access = await AccessPolicy.load({ db, school, user, profile })
    await handler({
      req,
      res,
      db,
      school,
      user,
      profile,
      access,
      getCourse: () => resolveCourseContext(req, db),
    })
  }
}

/** Wraps a handler that requires a valid school, authenticated user, and the caller's own active profile. */
export function profileRoute(handler: (args: ProfileRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    requireSchoolSlug(req)
    const user = await SessionService.getCurrentUser(req)
    const { db, school } = await resolveSchool(req)
    const profile = await resolveProfile(req, db, user)

    const access = await AccessPolicy.load({ db, school, user, profile })
    await handler({
      req,
      res,
      db,
      school,
      user,
      profile,
      access,
      getCourse: () => resolveCourseContext(req, db),
    })
  }
}

function resolveCourseContext(req: Request, db: SchoolDb): Promise<Course> {
  const cached = courseCache.get(req)
  if (cached) {
    return cached
  }

  const promise = resolveCourse(db, req.get('x-course-slug'))
  courseCache.set(req, promise)
  return promise
}

/** Validates the presence of the `X-School-Slug` header synchronously, before any I/O. */
function requireSchoolSlug(req: Request): string {
  const slug = req.get('x-school-slug')
  if (!slug) {
    throw badRequest('X-School-Slug header is required')
  }

  return slug
}

/** Resolves the required `X-School-Slug` header to its school row and scoped database client. */
function resolveSchool(req: Request): Promise<{ db: SchoolDbClient; school: School }> {
  const cached = schoolCache.get(req)
  if (cached) {
    return cached
  }

  const slug = requireSchoolSlug(req) // synchronous, before the promise is created or cached
  const promise = (async () => {
    const school = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, slug),
    })

    if (!school) {
      throw notFound('school not found')
    }

    const db = getSchoolDb(school.id)
    return { db, school }
  })()

  schoolCache.set(req, promise)
  return promise
}

/**
 * Resolves `X-Profile-Id` to a profile in this school if the header is present, rejecting a
 * profile that doesn't exist, belongs to a different user (never trust a caller-supplied profile
 * ID) — the single choke point for every `optionalProfileRoute`/`profileRoute`-gated read and
 * write. Returns
 * `undefined`, rather than throwing, when the header is simply absent — `optionalProfileRoute`'s
 * whole point.
 */
async function resolveOptionalProfile(
  req: Request,
  db: SchoolDb,
  user: User,
): Promise<SchoolProfile | undefined> {
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    return undefined
  }

  const profile = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
  })

  if (!profile || profile.userId !== user.id) {
    throw forbidden()
  }

  return profile
}

/**
 * Same as {@link resolveOptionalProfile}, but requires the header instead of treating its
 * absence as "no profile" — `resolveOptionalProfile` only ever returns `undefined` when the
 * header is missing (every other invalid case already throws), so that's the only case left to
 * reject here.
 */
async function resolveProfile(req: Request, db: SchoolDb, user: User): Promise<SchoolProfile> {
  const profile = await resolveOptionalProfile(req, db, user)
  if (!profile) {
    throw badRequest('X-Profile-Id header is required')
  }

  return profile
}
