import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, schoolRoute } from '../naradaRoute'
import { resolveCourse } from '../courses/service'
import { parse } from '../utils/validate'
import { CreateRegistrationSchema, FindRegistrationsSchema } from './schema'
import { approve, findAll, findById, reject, submit } from './service'

const router = Router()

// Public: a prospective student has no account and no school session at this point — only a
// valid school (X-School-Slug) is required, same as any other schoolRoute endpoint.
router.post(
  '/',
  schoolRoute(async ({ req, res, db }) => {
    const data = await parse(CreateRegistrationSchema, req.body)
    // The course being applied to comes from the request's course context, not the body. With one
    // course it is that course; see `resolveCourse`.
    const course = await resolveCourse(db, req.get('x-course-slug'))
    const created = await submit({ db }, data, course.id)
    res.status(201).json({ data: created })
  }),
)

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    access.requireCanReviewRegistrations()
    const query = await parse(FindRegistrationsSchema, req.query)
    const result = await findAll({ db }, query, (await getCourse()).id)
    res.status(200).json({ data: result })
  }),
)

router.get(
  '/:registrationId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    access.requireCanReviewRegistrations()
    const { registrationId } = await parse(z.object({ registrationId: z.uuid() }), req.params)
    const row = await findById({ db }, registrationId)
    res.status(200).json({ data: row })
  }),
)

function reviewHandler(action: typeof approve | typeof reject) {
  return optionalProfileRoute(async ({ req, res, db, school, access, profile }) => {
    access.requireCanReviewRegistrations()
    const { registrationId } = await parse(z.object({ registrationId: z.uuid() }), req.params)
    const row = await action({ db, school }, registrationId, profile?.id ?? null)
    res.status(200).json({ data: row })
  })
}

router.post('/:registrationId/approve', reviewHandler(approve))
router.post('/:registrationId/reject', reviewHandler(reject))

export default router
