import { Router } from 'express'
import { z } from 'zod'

import { naradaRoute, requireSchoolContext } from '../naradaRoute'
import { getSession } from '../utils/auth'
import { parseBody, parseParams } from '../utils/validate'
import { getProfile, updateProfile, updateProfileSchema } from '../services/profile'

export const publicProfileRouter = Router()

publicProfileRouter.get(
  '/',
  naradaRoute(async ({ req, res }) => {
    const { user } = await getSession(req)

    const profile = await getProfile(user.id, user.isSuperAdmin)
    res.status(200).json({ ok: true, data: profile })
  }),
)

// mergeParams: parent path provides :batchId.
export const batchEnrollmentProfileRouter = Router({ mergeParams: true })

batchEnrollmentProfileRouter.patch(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const updates = parseBody(updateProfileSchema, req)

    const { user } = await getSession(req)
    await updateProfile(db, user.id, batchId, updates)
    res.status(200).json({ ok: true })
  }),
)
