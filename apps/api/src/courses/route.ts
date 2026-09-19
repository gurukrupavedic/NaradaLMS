import { Router } from 'express'

import { schoolRoute } from '../naradaRoute'
import * as repository from './repository'

const router = Router()

// Every course in the school — what a course switcher needs, and what tells the web app whether a
// hostname's course exists. Needs a school but no session: the public registration page is
// course-specific too, and a visitor has no account yet.
router.get(
  '/',
  schoolRoute(async ({ res, db }) => {
    const items = await repository.findAll(db)
    res.status(200).json({ data: { items } })
  }),
)

export default router
