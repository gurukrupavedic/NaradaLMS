import { Request, Response, NextFunction } from 'express'

import { organization, publicDb, getScopedDatabase } from '@narada/db'
import { notFound } from '../error'
import { setNaradaContext } from '../naradaRoute'

export type SchoolContext = typeof organization.$inferSelect

export async function resolveDb(req: Request, res: Response, next: NextFunction) {
  const schoolSlug = req.get('x-school-slug')
  if (!schoolSlug) {
    setNaradaContext(req, { kind: 'public', db: publicDb })
    return next()
  }

  const school = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, schoolSlug),
  })

  if (!school) {
    throw notFound()
  }

  setNaradaContext(req, { kind: 'school', school, db: getScopedDatabase(school.id) })
  next()
}
