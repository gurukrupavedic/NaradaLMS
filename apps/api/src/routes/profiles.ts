import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { getSession, requireOrgMember } from '../utils/auth'
import { parseBody, parseParams } from '../utils/validate'
import {
  createProfile,
  createProfileSchema,
  deleteProfile,
  findProfilesByUser,
  updateProfile,
  updateProfileSchema,
} from '../services/schoolProfile'

const router = Router()

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { user } = await getSession(req)
    const profiles = await findProfilesByUser(ctx.db, user.id)
    res.status(200).json({ ok: true, data: profiles })
  }),
)

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { user } = await getSession(req)
    await requireOrgMember(req, ctx.school.id)
    const data = parseBody(createProfileSchema, req)
    const created = await createProfile(ctx.db, user.id, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:profileId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { profileId } = parseParams(z.object({ profileId: z.uuid() }), req)
    const { user } = await getSession(req)
    const data = parseBody(updateProfileSchema, req)
    const updated = await updateProfile(ctx.db, profileId, user.id, data)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.delete(
  '/:profileId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { profileId } = parseParams(z.object({ profileId: z.uuid() }), req)
    const { user } = await getSession(req)
    await deleteProfile(ctx.db, profileId, user.id)
    res.status(204).send()
  }),
)

export default router
