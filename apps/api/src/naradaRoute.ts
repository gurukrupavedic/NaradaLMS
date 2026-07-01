import type { Request, RequestHandler, Response } from 'express'

import { publicDb, type PublicDatabase, type SchoolDatabase } from '@narada/db'
import { badRequest, internalError } from './error'
import type { SchoolContext } from './middlewares/school'
import { getActorProfile, type AuthenticatedSession } from './utils/auth'
import type { SchoolProfile } from '@narada/db'

export type NaradaContext =
  | { kind: 'public'; db: PublicDatabase }
  | { kind: 'school'; school: SchoolContext; db: SchoolDatabase }

export type PublicRouteContext = Extract<NaradaContext, { kind: 'public' }>
export type SchoolRouteContext = Extract<NaradaContext, { kind: 'school' }>

export type PublicRouteArgs = {
  req: Request
  res: Response
  ctx: PublicRouteContext
}

export type SchoolRouteArgs = {
  req: Request
  res: Response
  ctx: SchoolRouteContext
}

export type ProfileRouteArgs = SchoolRouteArgs & {
  user: AuthenticatedSession['user']
  profile: SchoolProfile
}

const contexts = new WeakMap<Request, NaradaContext>()

export function setNaradaContext(req: Request, ctx: NaradaContext): void {
  contexts.set(req, ctx)
}

export function getNaradaContext(req: Request): NaradaContext {
  const ctx = contexts.get(req)
  if (!ctx) {
    throw internalError()
  }

  return ctx
}

function requireSchoolContext(ctx: NaradaContext): SchoolRouteContext {
  if (ctx.kind !== 'school') {
    throw badRequest('X-School-Slug header is required')
  }

  return ctx
}

export function publicRoute(handler: (args: PublicRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    await handler({ req, res, ctx: { kind: 'public', db: publicDb } })
  }
}

export function schoolRoute(handler: (args: SchoolRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    await handler({ req, res, ctx: requireSchoolContext(getNaradaContext(req)) })
  }
}

export function profileRoute(handler: (args: ProfileRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const ctx = requireSchoolContext(getNaradaContext(req))
    const { user, profile } = await getActorProfile(req, ctx.db)
    await handler({ req, res, ctx, user, profile })
  }
}
