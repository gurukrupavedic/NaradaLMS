import { Router } from 'express'
import { z } from 'zod'

import { userIdSchema } from '@narada/auth/ids'
import { naradaRoute, requireSchoolContext } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { getBatchAccess, requireAccess } from '../utils/auth'
import { findBatchById } from '../services/batch'
import { enrollSchema, enrollUser, unenrollUser } from '../services/enrollment'

// mergeParams: parent path provides :batchId.
const router = Router({ mergeParams: true })

router.post(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const data = parseBody(enrollSchema, req)
    await requireAccess(
      getBatchAccess(req, db, batchId, {
        schoolPermission: { enrollment: ['create'] },
        batchPermission: { enrollment: ['create'] },
      }),
    )

    const batch = await findBatchById(db, batchId)
    if (!batch) {
      throw notFound()
    }

    const enrolled = await enrollUser(db, batchId, data)
    res.status(201).json({ ok: true, data: enrolled })
  }),
)

router.delete(
  '/:userId',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { batchId, userId } = parseParams(
      z.object({ batchId: z.uuid(), userId: userIdSchema }),
      req,
    )

    await requireAccess(
      getBatchAccess(req, db, batchId, {
        schoolPermission: { enrollment: ['remove'] },
        batchPermission: { enrollment: ['remove'] },
      }),
    )

    await unenrollUser(db, batchId, userId)
    res.status(204).send()
  }),
)

export default router
