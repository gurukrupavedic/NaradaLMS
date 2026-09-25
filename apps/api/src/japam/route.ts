import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import {
  FindJapamSchema,
  JapamDayParamsSchema,
  JapamParamsSchema,
  LogJapamSchema,
  SetJapamDaySchema,
} from './schema'
import { log, setDay, summary } from './service'

// mergeParams: mounted at /profiles/:profileId/japam in routes.ts, so this needs the parent path's
// :profileId. optionalProfileRoute (not profileRoute) because a school admin logging for or reading
// a student's japam doesn't need an active profile of their own — same as editing their profile.
const router = Router({ mergeParams: true })

// Anyone who may view the profile may see its japam — the student, a teacher who shares a batch
// with them, a school admin — by the same rule as the profile page itself.
router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, access }) => {
    const { profileId } = await parse(JapamParamsSchema, req.params)
    const query = await parse(FindJapamSchema, req.query)
    await access.requireCanViewProfile(profileId)
    res.status(200).json({ data: await summary({ db, school }, profileId, query) })
  }),
)

// Adds to a day. The owner or a school admin only — `service.ts` decides which.
router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(JapamParamsSchema, req.params)
    const data = await parse(LogJapamSchema, req.body)
    const day = await log({ db, school, user, access }, profileId, data)
    res.status(200).json({ data: day })
  }),
)

// Sets a day's total (a correction; 0 clears it).
router.put(
  '/:loggedOn',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId, loggedOn } = await parse(JapamDayParamsSchema, req.params)
    const { count } = await parse(SetJapamDaySchema, req.body)
    const day = await setDay({ db, school, user, access }, profileId, loggedOn, count)
    res.status(200).json({ data: day })
  }),
)

export default router
