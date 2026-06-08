import { Router } from 'express'
import { z } from 'zod'

import { naradaRoute, requireSchoolContext } from '../naradaRoute'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { notFound } from '../error'
import { authorize, getBatchAccess, getBatchListAccess, requireAccess } from '../utils/auth'
import {
  createBatch,
  createBatchSchema,
  findBatchById,
  findBatchByIdWithMembers,
  findBatches,
  listBatchesQuerySchema,
  updateBatch,
  updateBatchSchema,
} from '../services/batch'

const router = Router()

router.get(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const query = parseQuery(listBatchesQuerySchema, req)
    const access = await requireAccess(
      getBatchListAccess(req, db, {
        schoolPermission: { batch: ['read'] },
        allBatchesPermission: { batch: ['update'] },
      }),
    )

    const result = await findBatches(db, { ...query, access })
    res.status(200).json({ ok: true, data: result })
  }),
)

router.get(
  '/:batchId',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    await requireAccess(
      getBatchAccess(req, db, batchId, {
        schoolPermission: { batch: ['update'] },
        batchPermission: { enrollment: ['read'] },
      }),
    )

    const batchDetail = await findBatchByIdWithMembers(db, batchId)
    if (!batchDetail) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: batchDetail })
  }),
)

router.post(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const data = parseBody(createBatchSchema, req)

    await authorize(req, { scope: 'school', permissions: { batch: ['create'] } })
    const created = await createBatch(db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:batchId',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
    const updates = parseBody(updateBatchSchema, req)

    await authorize(req, { scope: 'school', permissions: { batch: ['update'] } })
    const existing = await findBatchById(db, batchId)
    if (!existing) {
      throw notFound()
    }

    const updated = await updateBatch(db, batchId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

export default router
