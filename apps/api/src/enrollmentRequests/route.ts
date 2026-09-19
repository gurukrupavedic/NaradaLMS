import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { FindEnrollmentRequestsSchema } from './schema'
import { approve, findAll, findById, reject } from './service'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const scope = access.getEnrollmentRequestVisibility()
    const query = await parse(FindEnrollmentRequestsSchema, req.query)
    const result = await findAll(
      { db },
      query,
      scope.kind === 'all' ? null : scope.batchIds,
      (await getCourse())?.id,
    )
    res.status(200).json({ data: result })
  }),
)

router.get(
  '/:enrollmentRequestId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { enrollmentRequestId } = await parse(z.object({ enrollmentRequestId: z.uuid() }), req.params)
    const row = await findById({ db }, enrollmentRequestId)
    access.requireCanCreateEnrollment(row.batchId)
    res.status(200).json({ data: row })
  }),
)

function reviewHandler(action: typeof approve | typeof reject) {
  return optionalProfileRoute(async ({ req, res, db, access, profile }) => {
    const { enrollmentRequestId } = await parse(z.object({ enrollmentRequestId: z.uuid() }), req.params)
    // Same fetch-then-check-batchId shape as `requireCanReadExam` — approving/rejecting is
    // gated on the *target request's own batch*, which isn't known until it's loaded.
    const existing = await findById({ db }, enrollmentRequestId)
    access.requireCanCreateEnrollment(existing.batchId)
    const row = await action({ db }, enrollmentRequestId, profile?.id ?? null)
    res.status(200).json({ data: row })
  })
}

router.post('/:enrollmentRequestId/approve', reviewHandler(approve))
router.post('/:enrollmentRequestId/reject', reviewHandler(reject))

export default router
