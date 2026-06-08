import { Router } from 'express'
import { z } from 'zod'

import { userIdSchema } from '@narada/auth/ids'
import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { getBatchAccess, requireAccess } from '../utils/auth'
import { findBatchById } from '../services/batch'
import { enrollSchema, enrollUser, unenrollUser } from '../services/enrollment'

// mergeParams: parent path provides :batchId.
const router = Router({ mergeParams: true })

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const data = parseBody(enrollSchema, req)
    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { enrollment: ['create'] },
        batchPermission: { enrollment: ['create'] },
      }),
    )

    const batch = await findBatchById(ctx.db, batchId)
    if (!batch) {
      throw notFound()
    }

    const enrolled = await enrollUser(ctx.db, batchId, data)
    res.status(201).json({ ok: true, data: enrolled })
  }),
)

router.delete(
  '/:userId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId, userId } = parseParams(
      z.object({ batchId: z.uuid(), userId: userIdSchema }),
      req,
    )

    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { enrollment: ['remove'] },
        batchPermission: { enrollment: ['remove'] },
      }),
    )

    await unenrollUser(ctx.db, batchId, userId)
    res.status(204).send()
  }),
)

export default router
