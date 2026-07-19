import type { Request, RequestHandler, Response } from 'express'

import {
  getScopedDatabase,
  publicDb,
  type organization,
  type PublicDatabase,
  type SchoolDatabase,
  type SchoolDbExecutor,
  type SchoolProfile,
} from '@narada/db'

import { badRequest, forbidden } from './error'
import { SessionService, type User } from './session'
import { AccessPolicy } from './utils/accessPolicy'

type School = typeof organization.$inferSelect

export type PublicRouteArgs = {
  req: Request
  res: Response
  db: PublicDatabase
}

export type SchoolRouteArgs = {
  req: Request
  res: Response
  db: SchoolDatabase
  school: School
}

export type UserRouteArgs = SchoolRouteArgs & {
  user: User
}

export type ProfileRouteArgs = UserRouteArgs & {
  access: AccessPolicy
  profile: SchoolProfile
}

export function publicRoute(handler: (args: PublicRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    await handler({ req, res, db: publicDb })
  }
}

export function schoolRoute(handler: (args: SchoolRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const { db, school } = await resolveSchool(req)
    await handler({ req, res, db, school })
  }
}

export function userRoute(handler: (args: UserRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const [{ db, school }, user] = await Promise.all([
      resolveSchool(req),
      SessionService.getCurrentUser(req),
    ])

    await handler({ req, res, db, school, user })
  }
}

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

async function resolveSchool(req: Request): Promise<{ db: SchoolDatabase; school: School }> {
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

  const db = getScopedDatabase(school.id)
  return { db, school }
}

async function resolveProfile(req: Request, db: SchoolDbExecutor, user: User) {
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
