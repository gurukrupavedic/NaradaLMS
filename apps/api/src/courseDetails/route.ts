import { Router } from 'express'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import {
  AddToCounterSchema,
  CounterParamsSchema,
  CourseDetailsParamsSchema,
  UpdateCourseDetailsSchema,
} from './schema'
import { addToCounter, updateDetails } from './service'

// mergeParams: mounted at /profiles/:profileId/course-details in routes.ts, so this needs the parent
// path's :profileId. optionalProfileRoute (not profileRoute) because a school admin editing a
// student's details doesn't need an active profile of their own — same as editing their profile.
// Both routes are course-scoped: course-level details belong to the course the request names
// (`X-Course-Slug`), and the caller has to be part of it. Reading them is part of the profile page's
// own response (`GET /profiles/:profileId/detail`).
const router = Router({ mergeParams: true })

// Edits the course-level details (a patch). The owner or a school admin only — `service.ts` decides.
router.patch(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, user, access, getCourse }) => {
    const { profileId } = await parse(CourseDetailsParamsSchema, req.params)
    const { details } = await parse(UpdateCourseDetailsSchema, req.body)
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    const updated = await updateDetails({ db, school, course, user, access }, profileId, details)
    res.status(200).json({ data: { details: updated } })
  }),
)

// Adds to one of the course's counters — atomically, so concurrent adds each count.
router.post(
  '/counters/:key',
  optionalProfileRoute(async ({ req, res, db, school, user, access, getCourse }) => {
    const { profileId, key } = await parse(CounterParamsSchema, req.params)
    const { count } = await parse(AddToCounterSchema, req.body)
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    const result = await addToCounter({ db, school, course, user, access }, profileId, key, count)
    res.status(200).json({ data: result })
  }),
)

export default router
