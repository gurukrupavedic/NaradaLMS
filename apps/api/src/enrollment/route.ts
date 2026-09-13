import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateEnrollmentSchema } from './schema'
import { enroll, unenroll } from './service'

// mergeParams: mounted at /batches/:batchId/members in routes.ts — this router needs the parent
// mount path's :batchId, not just its own path segments. optionalProfileRoute (not profileRoute)
// because school admins manage rosters without needing an active profile, matching
// apps/api/src/routes/enrollment.ts's schoolRoute + tryGetActorProfile.
const router = Router({ mergeParams: true })

const BatchParamsSchema = z.object({ batchId: z.uuid() })
const MemberParamsSchema = BatchParamsSchema.extend({ profileId: z.uuid() })

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(BatchParamsSchema, req.params)
    access.requireCanCreateEnrollment(batchId)
    const data = await parse(CreateEnrollmentSchema, req.body)
    const enrolled = await enroll(db, batchId, data)
    res.status(201).json({ data: enrolled })
  }),
)

router.delete(
  '/:profileId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    access.requireCanRemoveEnrollment(batchId)
    await unenroll(db, batchId, profileId)
    res.status(204).send()
  }),
)

export default router
