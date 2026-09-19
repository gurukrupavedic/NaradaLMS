import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import * as repository from './repository'

const router = Router()

// The courses the caller may pick from — what the course dropdown lists. A school admin sees every
// course; anyone else sees only the ones their own profile is part of (an enrollment in any status,
// or the registration that created the profile). The same rule gates course content
// (`AccessPolicy#canReadCourseContent`), so what is offered here is what may be read.
router.get(
  '/',
  optionalProfileRoute(async ({ res, db, access }) => {
    const scope = access.getCourseVisibility()
    const items =
      scope.kind === 'all'
        ? await repository.findAll(db)
        : await repository.findForProfile(db, scope.profileId)
    res.status(200).json({ data: { items } })
  }),
)

export default router
