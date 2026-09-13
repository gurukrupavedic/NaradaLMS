import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { getBatchAccess, requireAccess, tryGetActorProfile } from '../utils/auth'
import { findBatchById } from '../services/batch'
import { enrollSchema, enrollProfile, unenrollProfile } from '../services/enrollment'

// mergeParams: parent path provides :batchId.
const router = Router({ mergeParams: true })

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const data = parseBody(enrollSchema, req)
    const { profile } = await tryGetActorProfile(req, ctx.db)
    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { enrollment: ['create'] },
        batchPermission: { enrollment: ['create'] },
      }, profile?.id),
    )

    const batch = await findBatchById(ctx.db, batchId)
    if (!batch) {
      throw notFound()
    }

    const enrolled = await enrollProfile(ctx.db, batchId, data)
    res.status(201).json({ ok: true, data: enrolled })
  }),
)

router.delete(
  '/:profileId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId, profileId } = parseParams(
      z.object({ batchId: z.uuid(), profileId: z.uuid() }),
      req,
    )

    const { profile } = await tryGetActorProfile(req, ctx.db)
    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { enrollment: ['remove'] },
        batchPermission: { enrollment: ['remove'] },
      }, profile?.id),
    )

    await unenrollProfile(ctx.db, batchId, profileId)
    res.status(204).send()
  }),
)

export default router
