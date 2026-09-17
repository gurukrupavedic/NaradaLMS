import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { SearchQuerySchema } from './schema'
import { search } from './service'

const router = Router()

// GET /search?q=... — the command palette's one endpoint. Admin-only
// (`AccessPolicy#requireCanSearch`): every category it fans out into (students, registrations)
// already gates the same way, and the two that don't have their own gate (batches, tracks,
// chapters) aren't meant to be browsable by a plain member either.
router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    access.requireCanSearch()
    const query = await parse(SearchQuerySchema, req.query)
    const results = await search({ db, school, user }, query)
    res.status(200).json({ data: results })
  }),
)

export default router
