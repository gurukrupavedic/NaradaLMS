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

import { badRequest, forbidden } from './error'
import { SessionService, type User } from './session'
import { AccessPolicy } from './utils/accessPolicy'

type School = typeof organization.$inferSelect

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
    const [{ db, school }, user] = await Promise.all([
      resolveSchool(req),
      SessionService.getCurrentUser(req),
    ])

    await handler({ req, res, db, school, user })
  }
}

/** Wraps a handler that requires a valid school, authenticated user, and the caller's own active profile. */
export function profileRoute(handler: (args: ProfileRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const [{ db, school }, user] = await Promise.all([
      resolveSchool(req),
      SessionService.getCurrentUser(req),
    ])
    const profile = await resolveProfile(req, db, user)

    const access = await AccessPolicy.load({ db, school, user, profile })
    await handler({ req, res, db, school, user, profile, access })
  }
}

/** Resolves the required `X-School-Slug` header to its school row and scoped database client. */
async function resolveSchool(req: Request): Promise<{ db: SchoolDbClient; school: School }> {
  const slug = req.get('x-school-slug')
  if (!slug) {
    throw badRequest('X-School-Slug header is required')
  }

  const school = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })

  if (!school) {
    throw badRequest('school not found')
  }

  const db = getSchoolDb(school.id)
  return { db, school }
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
