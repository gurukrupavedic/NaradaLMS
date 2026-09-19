import { Router } from 'express'
import * as z from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import * as repository from './repository'
import { findCourseBySlug } from './service'

const router = Router()

// Every course in the school. Needs a school but no session, on purpose: a course's name and slug
// are not secret (each has its own public registration link), and the public registration page has
// to be able to say "Applying to Vedam" — or offer the choice — for a visitor with no account yet.
// What a *signed-in* person may pick from is narrower: see `GET /me/courses`.
router.get(
  '/',
  schoolRoute(async ({ res, db }) => {
    const items = await repository.findAll(db)
    res.status(200).json({ data: { items } })
  }),
)

// One course by its slug — what a registration link (`/register/vedam`) resolves through.
router.get(
  '/:slug',
  schoolRoute(async ({ req, res, db }) => {
    const { slug } = await parse(z.object({ slug: z.string().min(1) }), req.params)
    res.status(200).json({ data: await findCourseBySlug(db, slug) })
  }),
)

export default router
