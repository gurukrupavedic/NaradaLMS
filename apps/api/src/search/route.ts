import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { SearchQuerySchema } from './schema'
import { search } from './service'

const router = Router()

// GET /search?q=... — the command palette's one endpoint, open to any signed-in school member
// (not just an admin): what a search actually turns up is scoped per category by the same
// `AccessPolicy` methods that already gate browsing the rest of the app (see `service.ts`'s
// `SearchAccessScope` doc comment), so nobody sees more through search than they could by
// clicking around normally.
router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    access.requireSchoolMember()
    const query = await parse(SearchQuerySchema, req.query)
    const results = await search({ db, school, user }, query, {
      batches: access.getBatchVisibility(),
      content: access.getContentReadView(),
      canReviewRegistrations: access.isSchoolAdmin(),
    })
    res.status(200).json({ data: results })
  }),
)

export default router
