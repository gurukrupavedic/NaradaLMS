import type { Request, RequestHandler, Response } from 'express'

import type { PublicDatabase, SchoolDatabase } from '@narada/db'
import { badRequest, internalError } from './error'
import type { SchoolContext } from './middlewares/school'

export type NaradaContext =
  | { kind: 'public'; db: PublicDatabase }
  | { kind: 'school'; school: SchoolContext; db: SchoolDatabase }

export type NaradaRouteArgs = {
  req: Request
  res: Response
  ctx: NaradaContext
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

export function requireSchoolContext(
  ctx: NaradaContext,
): Extract<NaradaContext, { kind: 'school' }> {
  if (ctx.kind !== 'school') {
    throw badRequest('X-School-Slug header is required')
  }

  return ctx
}

export function naradaRoute(handler: (args: NaradaRouteArgs) => Promise<void>): RequestHandler {
  return async (req, res) => {
    await handler({ req, res, ctx: getNaradaContext(req) })
  }
}
