import { Request, Response, NextFunction } from 'express'

import { db, organization } from '@narada/db'
import { badRequest, notFound } from '../error'

export type School = typeof organization.$inferSelect

export async function resolveSchoolSlug(req: Request, res: Response, next: NextFunction) {
  const schoolSlug = req.get('x-school-slug')
  if (!schoolSlug) {
    throw badRequest()
  }

  const school = await db.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, schoolSlug),
  })

  if (!school) {
    throw notFound()
  }

  // See `apps/api/types/express.d.ts` for the type declaration
  // override used here.
  res.locals.school = school
  next()
}
