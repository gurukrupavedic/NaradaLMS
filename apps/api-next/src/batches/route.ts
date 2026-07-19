import { Router } from 'express'
import * as z from 'zod'

import { profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateBatchSchema, FindBatchesSchema, UpdateBatchSchema } from './schema'
import { createBatch, findAllAccessible, findById, updateBatch } from './service'

const router = Router()

router.get(
  '/',
  profileRoute(async ({ req, res, db, access }) => {
    const query = await parse(FindBatchesSchema, req.query)
    const visibility = await access.getBatchVisibility()
    const batches = await findAllAccessible(query, visibility, db)
    res.status(200).json({ data: batches })
  }),
)

router.get(
  '/:batchId',
  profileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanReadBatch(batchId)
    const batch = await findById(batchId, db)
    res.status(200).json({ data: batch })
  }),
)

router.post(
  '/',
  profileRoute(async ({ req, res, db, access }) => {
    await access.requireCanCreateBatch()
    const data = await parse(CreateBatchSchema, req.body)
    const batch = await createBatch(data, db)
    res.status(201).json({ data: batch })
  }),
)

router.patch(
  '/:batchId',
  profileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const data = await parse(UpdateBatchSchema, req.body)
    const batch = await updateBatch(batchId, data, db)
    res.status(200).json({ data: batch })
  }),
)

export default router
