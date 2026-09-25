import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import {
  CounterDayParamsSchema,
  CounterParamsSchema,
  FindCounterSchema,
  LogCounterSchema,
  SetCounterDaySchema,
} from './schema'
import { log, setDay, summary } from './service'

// mergeParams: mounted at /profiles/:profileId/counters in routes.ts, so this needs the parent
// path's :profileId. optionalProfileRoute (not profileRoute) because a school admin logging for or
// reading a student's counter doesn't need an active profile of their own — same as editing their
// profile. Every route is course-scoped: a counter belongs to the course the request names
// (`X-Course-Slug`), and the caller has to be part of it — the same rule as the profile page's own
// course-scoped data.
const router = Router({ mergeParams: true })

// Anyone who may view the profile may see its counters — the student, a teacher who shares a batch
// with them, a school admin — by the same rule as the profile page itself.
router.get(
  '/:key',
  optionalProfileRoute(async ({ req, res, db, school, access, getCourse }) => {
    const { profileId, key } = await parse(CounterParamsSchema, req.params)
    const query = await parse(FindCounterSchema, req.query)
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    await access.requireCanViewProfile(profileId)
    res.status(200).json({ data: await summary({ db, school, course }, profileId, key, query) })
  }),
)

// Adds to a day. The owner or a school admin only — `service.ts` decides which.
router.post(
  '/:key',
  optionalProfileRoute(async ({ req, res, db, school, user, access, getCourse }) => {
    const { profileId, key } = await parse(CounterParamsSchema, req.params)
    const data = await parse(LogCounterSchema, req.body)
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    const day = await log({ db, school, course, user, access }, profileId, key, data)
    res.status(200).json({ data: day })
  }),
)

// Sets a day's total (a correction; 0 clears it).
router.put(
  '/:key/:loggedOn',
  optionalProfileRoute(async ({ req, res, db, school, user, access, getCourse }) => {
    const { profileId, key, loggedOn } = await parse(CounterDayParamsSchema, req.params)
    const { count } = await parse(SetCounterDaySchema, req.body)
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    const day = await setDay({ db, school, course, user, access }, profileId, key, loggedOn, count)
    res.status(200).json({ data: day })
  }),
)

export default router
