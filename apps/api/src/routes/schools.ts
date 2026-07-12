import { Router } from 'express'
import { z } from 'zod'

import { publicRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { findSchoolById, findSchools, updateSchool, updateSchoolSchema } from '../services/school'

const router = Router()

router.get(
  '/',
  publicRoute(async ({ req, res, ctx }) => {
    await authorize(req, { scope: 'super' })
    const schools = await findSchools(ctx.db)
    res.status(200).json({ ok: true, data: schools })
  }),
)

router.patch(
  '/:schoolId',
  publicRoute(async ({ req, res, ctx }) => {
    const { schoolId } = parseParams(z.object({ schoolId: z.string().min(1) }), req)
    const updates = parseBody(updateSchoolSchema, req)

    await authorize(req, { scope: 'super' })
    const existing = await findSchoolById(ctx.db, schoolId)
    if (!existing) {
      throw notFound()
    }

    const updated = await updateSchool(ctx.db, schoolId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

export default router
