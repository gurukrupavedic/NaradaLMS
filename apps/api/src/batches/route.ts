import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateBatchSchema, FindBatchesSchema, SetClassSlotsSchema, UpdateBatchSchema } from './schema'
import { createBatch, findAllAccessible, findByIdWithMembers, setClassSlots, updateBatch } from './service'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const query = await parse(FindBatchesSchema, req.query)
    const visibility = await access.getBatchVisibility()
    const batches = await findAllAccessible({ db }, query, visibility)
    res.status(200).json({ data: batches })
  }),
)

router.get(
  '/:batchId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanReadBatch(batchId)
    const batch = await findByIdWithMembers({ db }, batchId)
    res.status(200).json({ data: batch })
  }),
)

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    await access.requireCanCreateBatch()
    const data = await parse(CreateBatchSchema, req.body)
    const batch = await createBatch({ db }, data)
    res.status(201).json({ data: batch })
  }),
)

router.patch(
  '/:batchId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const data = await parse(UpdateBatchSchema, req.body)
    const batch = await updateBatch({ db }, batchId, data)
    res.status(200).json({ data: batch })
  }),
)

router.put(
  '/:batchId/schedule',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const data = await parse(SetClassSlotsSchema, req.body)
    const classSlots = await setClassSlots({ db }, batchId, data)
    res.status(200).json({ data: classSlots })
  }),
)

export default router
