import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { notFound } from '../error'
import { authorize, getBatchAccess, getBatchListAccess, requireAccess, tryGetActorProfile } from '../utils/auth'
import {
  createBatch,
  createBatchSchema,
  findBatchById,
  findBatchByIdWithMembers,
  findBatches,
  listBatchesQuerySchema,
  setClassSlots,
  setClassSlotsSchema,
  updateBatch,
  updateBatchSchema,
} from '../services/batch'

const router = Router()

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const query = parseQuery(listBatchesQuerySchema, req)
    const { profile } = await tryGetActorProfile(req, ctx.db)
    const access = await requireAccess(
      getBatchListAccess(req, { allBatchesPermission: { batch: ['update'] } }, profile?.id),
    )

    const result = await findBatches(ctx.db, { ...query, access })
    res.status(200).json({ ok: true, data: result })
  }),
)

router.get(
  '/:batchId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const { profile } = await tryGetActorProfile(req, ctx.db)
    await requireAccess(
      getBatchAccess(req, ctx.db, batchId, {
        schoolPermission: { batch: ['update'] },
        batchPermission: { enrollment: ['read'] },
      }, profile?.id),
    )

    const batchDetail = await findBatchByIdWithMembers(ctx.db, batchId)
    if (!batchDetail) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: batchDetail })
  }),
)

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const data = parseBody(createBatchSchema, req)
    await authorize(req, { scope: 'school', permissions: { batch: ['create'] } })
    const created = await createBatch(ctx.db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:batchId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const updates = parseBody(updateBatchSchema, req)
    await authorize(req, { scope: 'school', permissions: { batch: ['update'] } })
    const existing = await findBatchById(ctx.db, batchId)
    if (!existing) {
      throw notFound()
    }

    const updated = await updateBatch(ctx.db, batchId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.put(
  '/:batchId/schedule',
  schoolRoute(async ({ req, res, ctx }) => {
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const { slots } = parseBody(setClassSlotsSchema, req)
    await authorize(req, { scope: 'school', permissions: { batch: ['update'] } })
    const existing = await findBatchById(ctx.db, batchId)
    if (!existing) {
      throw notFound()
    }

    const updated = await setClassSlots(ctx.db, batchId, slots)
    res.status(200).json({ ok: true, data: updated })
  }),
)

export default router
