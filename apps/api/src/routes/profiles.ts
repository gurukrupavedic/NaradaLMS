import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { notFound } from '../error'
import { getProfileBatchListAccess, getSession, requireAccess, requireOrgMember, tryGetActorProfile } from '../utils/auth'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { findBatches, findBatchesWithDetail, listBatchesQuerySchema } from '../services/batch'
import {
  createProfile,
  createProfileSchema,
  deleteProfile,
  findProfileById,
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

const profileBatchesQuerySchema = listBatchesQuerySchema.extend({
  // Eagerly includes each batch's roster, schedule, and the target profile's own enrollment role
  // in the same query, for callers (the dashboard) that need every batch's detail anyway — avoids
  // fanning out a GET /batches/:id per item, which is what was exhausting the DB connection pool.
  withDetail: z.coerce.boolean().optional().default(false),
})

router.get(
  '/:profileId/batches',
  schoolRoute(async ({ req, res, ctx }) => {
    const { profileId } = parseParams(z.object({ profileId: z.uuid() }), req)
    const query = parseQuery(profileBatchesQuerySchema, req)
    const { profile } = await tryGetActorProfile(req, ctx.db)

    const target = await findProfileById(ctx.db, profileId)
    if (!target) {
      throw notFound()
    }

    const access = await requireAccess(
      getProfileBatchListAccess(
        req,
        ctx.db,
        profileId,
        { allBatchesPermission: { batch: ['update'] } },
        profile?.id,
      ),
    )

    const result = query.withDetail
      ? await findBatchesWithDetail(ctx.db, { ...query, access, roleForProfileId: profileId })
      : await findBatches(ctx.db, { ...query, access })
    res.status(200).json({ ok: true, data: result })
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
