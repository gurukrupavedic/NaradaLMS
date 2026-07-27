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

import { badRequest, forbidden, notFound } from './error'
import { SessionService, type User } from './session'
import { AccessPolicy } from './utils/accessPolicy'

type School = typeof organization.$inferSelect

/**
 * Caches the in-flight school resolution per request so `resolveSchool` performs at most one
 * lookup per request, mirroring `SessionService`'s session cache.
 */
const schoolCache = new WeakMap<Request, Promise<{ db: SchoolDbClient; school: School }>>

export type PublicRouteArgs = {
  req: Request
  res: Response
  db: PublicDbClient
}

export type SchoolRouteArgs = {
  req: Request
  res: Response
  db: SchoolDbClient
  school: School
}

export type UserRouteArgs = SchoolRouteArgs & {
  user: User
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

/** Wraps a handler that requires a valid `X-School-Slug` but no authenticated session. */
export function schoolRoute(handler: (args: SchoolRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const { db, school } = await resolveSchool(req)
    await handler({ req, res, db, school })
  }
}

/** Wraps a handler that requires a valid school and an authenticated user, but no active profile. */
export function userRoute(handler: (args: UserRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    requireSchoolSlug(req)
    const user = await SessionService.getCurrentUser(req)
    const { db, school } = await resolveSchool(req)

    await handler({ req, res, db, school, user })
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
    await handler({ req, res, db, school, user, profile, access })
  }
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
 * Resolves the required `X-Profile-Id` header to a profile in this school, rejecting a profile
 * that doesn't exist or belongs to a different user (never trust a caller-supplied profile ID).
 */
async function resolveProfile(req: Request, db: SchoolDb, user: User) {
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    throw badRequest('X-Profile-Id header is required')
  }

  const profile = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
  })

  if (!profile || profile.userId !== user.id) {
    throw forbidden()
  }

  return profile
}
