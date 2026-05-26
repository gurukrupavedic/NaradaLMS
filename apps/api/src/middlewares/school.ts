import { Request, Response, NextFunction } from 'express'

import { organization, publicDb, getScopedDatabase } from '@narada/db'
import { badRequest, notFound } from '../error'

export type School = typeof organization.$inferSelect
export type SchoolScopedLocals = Express.Locals & { school: School }

export async function resolveDb(req: Request, res: Response, next: NextFunction) {
  const schoolSlug = req.get('x-school-slug')
  if (!schoolSlug) {
    res.locals.db = publicDb
    return next()
  }

  const school = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, schoolSlug),
  })

  if (!school) {
    throw notFound()
  }

  res.locals.school = school
  res.locals.db = getScopedDatabase(school.slug)
  next()
}

export function requireSchool(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.school) {
    throw badRequest('X-School-Slug header is required')
  }

  next()
}
