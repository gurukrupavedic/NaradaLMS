import { Request, Response, NextFunction } from 'express'

import { organization, publicDb, getScopedDatabase } from '@narada/db'
import { badRequest, notFound } from '../error'

export type School = typeof organization.$inferSelect

async function findOrganizationBySlug(slug: string) {
  return publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })
}

export async function resolveSchoolSlug(req: Request, res: Response, next: NextFunction) {
  const schoolSlug = req.get('x-school-slug')
  if (!schoolSlug) {
    throw badRequest()
  }

  const school = await findOrganizationBySlug(schoolSlug)
  if (!school) {
    throw notFound()
  }

  res.locals.school = school
  res.locals.db = getScopedDatabase(school.slug)
  next()
}
